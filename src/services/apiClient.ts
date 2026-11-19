/**
 * Cliente HTTP central da aplicação.
 * Injeta o JWT em todo request autenticado e tenta renovar
 * silenciosamente quando o access token expira (HTTP 401).
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './secureTokens';
import { setBackoff, clearBackoff } from './apiBackoffStatus';
import { emitSessionExpired } from './sessionExpired';

const PRODUCTION_API_URL = 'https://api.zoji.app';
// Servidor falso de desenvolvimento (dev-server/). No emulador Android,
// use EXPO_PUBLIC_API_URL=http://10.0.2.2:8080.
const DEV_API_URL = 'http://localhost:8080';

/**
 * Builds de release sempre falam com a produção. Em desenvolvimento, o
 * padrão é o servidor falso local, para ninguém criar conta real nem
 * disparar SMS sem querer; quem precisa da produção define
 * EXPO_PUBLIC_API_URL no .env.
 */
export function resolveApiBaseUrl(
  isDev: boolean,
  fromEnv: string | undefined
): string {
  if (!isDev) return PRODUCTION_API_URL;
  const url = fromEnv?.trim().replace(/\/+$/, '');
  return url || DEV_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl(
  __DEV__,
  process.env.EXPO_PUBLIC_API_URL
);

// Só o perfil (não sensível) fica no AsyncStorage. Os tokens vão pro
// SecureStore (ver secureTokens.ts / P3-1).
export const STORAGE_KEYS = {
  USER: '@zoji:user',
} as const;

// Token em memória — evita I/O em cada request
let _accessToken: string | null = null;

export const setMemoryToken = (token: string | null) => {
  _accessToken = token;
};

export const getMemoryToken = () => _accessToken;

/** Persiste o que /auth/refresh e /auth/verify-code devolvem. */
async function persistSession(data: {
  access_token: string;
  refresh_token?: string;
  user?: { id: number; phone_number: string } & Record<string, unknown>;
}): Promise<void> {
  setMemoryToken(data.access_token);
  await setAccessToken(data.access_token);
  // P2-7: o servidor rotaciona o refresh token — salvar o novo a cada refresh.
  if (data.refresh_token) await setRefreshToken(data.refresh_token);
  if (data.user) {
    const userToSave = {
      ...data.user,
      uid: String(data.user.id),
      phoneNumber: data.user.phone_number,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userToSave));
  }
}

export async function clearSession(): Promise<void> {
  setMemoryToken(null);
  await clearTokens();
  await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  try {
    NativeModules.ZojiWidgetModule?.clearStatus?.();
  } catch {}
  emitSessionExpired();
}

/** Renova o access token usando o refresh token armazenado. */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    await persistSession(data);
    return data.access_token as string;
  } catch {
    return null;
  }
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── P3-2: retry com backoff + jitter para picos (429 / 5xx / rede) ──────────
const RETRY_MAX = 3;
const RETRY_AFTER_CAP_MS = 60_000;
// Só re-tenta o que é seguro repetir. POST de mensagem NÃO entra aqui — a
// confiabilidade dele é da fila local (pendingMessages.ts), pra não duplicar.
const IDEMPOTENT = new Set(['get', 'head', 'options', 'put', 'delete']);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function retryDelay(
  attempt: number,
  res?: { headers?: Record<string, string>; status?: number }
): number {
  if (res?.status === 429) {
    const ra = Number(
      res.headers?.['retry-after'] ?? res.headers?.['Retry-After']
    );
    if (Number.isFinite(ra) && ra > 0)
      return Math.min(ra * 1000, RETRY_AFTER_CAP_MS);
  }
  const base = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
  return base + Math.random() * base; // jitter 100%
}

function isRetryable(config: any, status?: number): boolean {
  if (!config || config._retryCount >= RETRY_MAX) return false;
  const method = (config.method ?? 'get').toLowerCase();
  const allowed = IDEMPOTENT.has(method) || config.retryable === true;
  if (!allowed) return false;
  // sem status = erro de rede/timeout; senão só 429 e 502/503/504
  return (
    status === undefined ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

// ─── Request: injeta Bearer token (da memória, sem I/O) ──────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─── Response: 401 → refresh; 429/5xx/rede → retry com backoff ───────────────
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const status = error.response?.status as number | undefined;

    // Retry de picos (não se aplica a 401, tratado abaixo).
    if (status !== 401 && isRetryable(original, status)) {
      original._retryCount = (original._retryCount ?? 0) + 1;
      const wait = retryDelay(original._retryCount, error.response);
      // P3-2, item 2: avisa a UI (banner não-bloqueante em Login/Chat).
      setBackoff(
        Date.now() + wait,
        status === 429 ? 'rate_limit' : 'server_error'
      );
      await sleep(wait);
      // api(original) reentra neste mesmo interceptor em caso de nova falha
      // (recursivo) — só volta pra cá quando a cadeia INTEIRA de tentativas
      // termina (sucesso ou esgotada), então limpar aqui sempre é seguro.
      try {
        const res = await api(original);
        clearBackoff();
        return res;
      } catch (retryErr) {
        clearBackoff();
        throw retryErr;
      }
    }

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('Sem refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        await persistSession(data);

        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        await clearSession();
      }
    }

    return Promise.reject(error);
  }
);
