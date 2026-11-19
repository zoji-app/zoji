import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppBanner, fetchBanners } from '../services/bannerApi';
import { STORAGE_KEYS } from '../services/apiClient';
import { authApi } from '../services/authApi';

type Params = Record<string, string>;
type Context = { hasConnections?: boolean };
type ConditionFn = (params?: Params, context?: Context) => Promise<boolean>;

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Registro de condições conhecidas. Adicione novas entradas aqui conforme necessário.
const CONDITIONS: Record<string, ConditionFn> = {
  notifications_disabled: async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status !== 'granted';
  },
  app_version_below: async params => {
    const target = params?.version;
    if (!target) return false;
    const current =
      Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0';
    return compareVersions(current, target) < 0;
  },
  no_connections: async (_, context) => {
    // undefined = ainda carregando → não exibe ainda
    if (context?.hasConnections === undefined) return false;
    return !context.hasConnections;
  },
};

// Segmenta por data de cadastro — campo próprio (`created_before`), fora do
// sistema de show_if de propósito: apps antigos (já publicados) não conhecem
// esse campo e simplesmente o ignoram, continuando a mostrar o banner como
// hoje (show_if normal). Só apps a partir da 1.8.1 aplicam esse filtro extra.
// Se um dia isso virasse uma condição nova de show_if, apps antigos cairiam
// no "condição desconhecida → não exibe" (evaluateCondition acima) e
// sumiriam com o banner pra todo mundo — o oposto do que se quer numa
// transição gradual de versão.
//
// GET /user/profile já devolve created_at; contas que logaram antes da
// atualização do app não têm esse campo no cache local — busca uma vez e
// persiste (self-heal).
async function isAccountCreatedBefore(dateStr: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    let user = raw ? JSON.parse(raw) : null;
    if (!user?.created_at) {
      user = await authApi.reloadProfile();
    }
    if (!user?.created_at) return false; // não deu pra determinar → não afetado
    return new Date(user.created_at) < new Date(dateStr);
  } catch {
    return false;
  }
}

async function evaluateCondition(
  showIf?: string,
  params?: Params,
  context?: Context
): Promise<boolean> {
  if (!showIf) return true;
  const fn = CONDITIONS[showIf];
  if (!fn) return false; // condição desconhecida → não exibe
  try {
    return await fn(params, context);
  } catch {
    return false;
  }
}

const DISMISSED_KEY = '@zoji:dismissed_banners';

async function getDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

async function addDismissed(id: string): Promise<void> {
  try {
    const set = await getDismissed();
    set.add(id);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {}
}

export async function clearDismissedBanners(): Promise<void> {
  await AsyncStorage.removeItem(DISMISSED_KEY);
}

export function useAppBanner(hasConnections?: boolean) {
  const [banner, setBanner] = useState<AppBanner | null>(null);
  // Guarda IDs dispensados nesta sessão para não re-exibir no foreground
  const sessionDismissed = useRef<Set<string>>(new Set());

  const check = useCallback(async () => {
    const list = await fetchBanners();
    if (!list.length) {
      setBanner(null);
      return;
    }
    const dismissed = await getDismissed();
    for (const data of list) {
      if (sessionDismissed.current.has(data.id)) continue;
      if (dismissed.has(data.id)) continue;
      const platformOk =
        !data.platform ||
        data.platform === 'all' ||
        data.platform === Platform.OS;
      if (!platformOk) continue;
      const conditionMet = await evaluateCondition(
        data.show_if,
        data.show_if_params,
        { hasConnections }
      );
      if (!conditionMet) continue;
      if (data.created_before) {
        const affected = await isAccountCreatedBefore(data.created_before);
        if (!affected) continue;
      }
      setBanner(data);
      return;
    }
    setBanner(null);
  }, [hasConnections]);

  // Roda no mount
  useEffect(() => {
    check();
  }, [check]);

  // Re-verifica quando o app volta ao foreground (captura troca de ID em tempo real)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const dismiss = useCallback(async () => {
    if (!banner) return;
    sessionDismissed.current.add(banner.id);
    await addDismissed(banner.id);
    setBanner(null);
  }, [banner]);

  return { banner, dismiss };
}
