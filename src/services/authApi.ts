/**
 * Serviço de autenticação próprio (substitui Firebase Auth).
 * Fluxo:
 *   1. sendCode(phone)          → backend envia SMS via Infobip
 *   2. verifyCode(phone, code)  → backend valida e retorna JWT + dados do usuário
 *   3. logout()                 → revoga refresh token no backend
 *   4. tryRestoreSession()      → tenta restaurar sessão salva no AsyncStorage
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_BASE_URL, STORAGE_KEYS, setMemoryToken } from './apiClient';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  migrateLegacyTokens,
} from './secureTokens';
import { saveWidgetCredentials, clearWidgetStatus } from './widgetService';

export interface AuthUser {
  id: number;
  /** Alias para compatibilidade com código existente que usa user.uid */
  uid: string;
  phone_number: string;
  /** Alias para compatibilidade com código existente que usa user.phoneNumber */
  phoneNumber: string;
  nickname: string | null;
  profile_emoji: string | null;
  profile_complete: boolean;
  require_consent: boolean;
}

// Normaliza o objeto vindo da API adicionando aliases de compatibilidade
function normalize(raw: any): AuthUser {
  return {
    ...raw,
    uid: String(raw.id),
    phoneNumber: raw.phone_number,
  };
}

export const authApi = {
  // ─── Enviar código OTP (WhatsApp → SMS fallback) ───────────────────────────
  async sendCode(
    phoneNumber: string,
    preferSms = false
  ): Promise<{
    success: boolean;
    channel?: 'whatsapp' | 'sms';
    error?: string;
    retryAfter?: number; // segundos até poder reenviar (do header 429 do servidor)
  }> {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/send-code`, {
        phone_number: phoneNumber,
        prefer_channel: preferSms ? 'sms' : 'auto',
      });
      return { success: true, channel: data.channel ?? 'sms' };
    } catch (err: any) {
      const msg =
        err.response?.data?.error ??
        'Erro ao enviar código. Verifique sua conexão.';
      const retryAfter: number | undefined = err.response?.data?.retry_after;
      return { success: false, error: msg, retryAfter };
    }
  },

  // ─── Verificar código e obter tokens ───────────────────────────────────────
  async verifyCode(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/verify-code`, {
        phone_number: phoneNumber,
        code,
      });

      const user = normalize(data.user);
      setMemoryToken(data.access_token);
      await setTokens(data.access_token, data.refresh_token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      saveWidgetCredentials(data.refresh_token);

      return { success: true, user };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Código inválido';
      return { success: false, error: msg };
    }
  },

  // ─── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      await clearTokens();
      setMemoryToken(null);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER,
        // Token de push do widget é por-device, não por-usuário — limpa o cache
        // de "último enviado" pra garantir que o próximo login vincule de novo.
        'zoji_widget_push_token_sent',
      ]);
      clearWidgetStatus();
    }
  },

  // ─── Restaurar sessão salva ─────────────────────────────────────────────────
  // Lê token + usuário do cache local — nenhuma chamada de rede.
  // Se o access token estiver expirado, o interceptor 401 renova automaticamente
  // na primeira chamada real da API (lazy refresh).
  async tryRestoreSession(): Promise<AuthUser | null> {
    // P3-1: migra tokens de versões antigas (AsyncStorage → SecureStore) antes
    // de qualquer leitura.
    await migrateLegacyTokens();

    const [token, refreshToken, userRaw] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
      AsyncStorage.getItem(STORAGE_KEYS.USER),
    ]);

    if (!token) return null;

    setMemoryToken(token);
    if (refreshToken) saveWidgetCredentials(refreshToken);

    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      return normalize(parsed);
    }

    // Raro: token existe mas user não foi cacheado — busca uma vez
    try {
      const { data } = await api.get('/user/profile');
      const user = normalize(data);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setMemoryToken(null);
        await clearTokens();
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      }
      return null;
    }
  },

  // ─── Recarregar perfil do usuário autenticado ──────────────────────────────
  async reloadProfile(): Promise<AuthUser | null> {
    try {
      const { data } = await api.get('/user/profile');
      const user = normalize(data);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  },

  // ─── Atualizar perfil ──────────────────────────────────────────────────────
  async updateProfile(fields: {
    nickname?: string;
    profile_emoji?: string;
    profile_complete?: boolean;
    push_token?: string;
    widget_push_token?: string;
    require_consent?: boolean;
    app_version?: string;
  }): Promise<AuthUser | null> {
    try {
      const { data } = await api.put('/user/profile', fields);
      const user = normalize(data);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  },

  // ─── Excluir conta ─────────────────────────────────────────────────────────
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete('/user/account');
      await clearTokens();
      setMemoryToken(null);
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error ?? 'Erro ao excluir conta',
      };
    }
  },
};
