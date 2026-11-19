/**
 * secureTokens — access/refresh token no Keychain (iOS) / Keystore (Android),
 * via expo-secure-store, em vez do AsyncStorage em texto plano (P3-1).
 *
 * O perfil do usuário (não sensível) continua no AsyncStorage.
 * `keychainAccessible: AFTER_FIRST_UNLOCK` — legível em background (widget,
 * push handlers) depois do 1º desbloqueio pós-boot, mas nunca com o device
 * bloqueado sem nunca ter sido desbloqueado.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// SecureStore só aceita chave [A-Za-z0-9._-] — as antigas tinham `@` e `:`.
const K_ACCESS = 'zoji_access_token';
const K_REFRESH = 'zoji_refresh_token';

// Chaves legadas no AsyncStorage (migradas uma vez).
const LEGACY_ACCESS = '@zoji:access_token';
const LEGACY_REFRESH = '@zoji:refresh_token';

const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

async function get(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, OPTS);
  } catch (e) {
    logger.error(`[secureTokens] get(${key}) falhou:`, e as Error);
    return null;
  }
}

async function set(key: string, value: string | null): Promise<void> {
  try {
    if (value == null || value === '') {
      await SecureStore.deleteItemAsync(key, OPTS);
    } else {
      await SecureStore.setItemAsync(key, value, OPTS);
    }
  } catch (e) {
    logger.error(`[secureTokens] set(${key}) falhou:`, e as Error);
  }
}

export const getAccessToken = () => get(K_ACCESS);
export const getRefreshToken = () => get(K_REFRESH);
export const setAccessToken = (v: string | null) => set(K_ACCESS, v);
export const setRefreshToken = (v: string | null) => set(K_REFRESH, v);

export async function setTokens(
  access: string,
  refresh?: string
): Promise<void> {
  await setAccessToken(access);
  if (refresh !== undefined) await setRefreshToken(refresh);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([set(K_ACCESS, null), set(K_REFRESH, null)]);
}

/**
 * Move os tokens do AsyncStorage (versões antigas do app) para o SecureStore e
 * apaga o texto plano. Idempotente e barato depois da 1ª vez.
 */
export async function migrateLegacyTokens(): Promise<void> {
  try {
    const [[, legacyAccess], [, legacyRefresh]] = await AsyncStorage.multiGet([
      LEGACY_ACCESS,
      LEGACY_REFRESH,
    ]);
    if (!legacyAccess && !legacyRefresh) return;

    if (legacyAccess) await setAccessToken(legacyAccess);
    if (legacyRefresh) await setRefreshToken(legacyRefresh);
    await AsyncStorage.multiRemove([LEGACY_ACCESS, LEGACY_REFRESH]);
    logger.debug(
      '[secureTokens] tokens migrados do AsyncStorage para SecureStore'
    );
  } catch (e) {
    logger.error('[secureTokens] migração falhou:', e as Error);
  }
}
