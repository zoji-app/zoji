import { NativeModules, Platform } from 'react-native';
import type { OwnStatus, FriendStatus } from './statusApi';
import { API_BASE_URL } from './apiClient';

interface WidgetPayload {
  ownEmoji: string | null;
  friends: {
    userId: number;
    nickname: string;
    statusEmoji: string;
    profileEmoji: string;
  }[];
}

// Salva credenciais para o widget buscar dados em background (Android: SharedPreferences, iOS: App Group UserDefaults)
export function saveWidgetCredentials(refreshToken: string): void {
  try {
    if (Platform.OS === 'android') {
      NativeModules.ZojiWidgetModule?.saveCredentials?.(
        refreshToken,
        API_BASE_URL
      );
    } else if (Platform.OS === 'ios') {
      NativeModules.ZojiWidgetModule?.saveCredentials?.(refreshToken);
    }
  } catch {}
}

/** @deprecated use saveWidgetCredentials */
export function saveAndroidWidgetCredentials(refreshToken: string): void {
  saveWidgetCredentials(refreshToken);
}

// Remove dados do widget ao deslogar — exibe tela de login em ambas as plataformas
export function clearWidgetStatus(): void {
  try {
    NativeModules.ZojiWidgetModule?.clearStatus?.();
  } catch {}
}

// Espelha a escolha de tema (Sistema/Claro/Escuro) pro widget — por padrão
// ele só segue o tema do sistema; "system" mantém esse comportamento.
export function setWidgetThemeMode(
  mode: 'system' | 'light' | 'dark' | 'zoji'
): void {
  try {
    NativeModules.ZojiWidgetModule?.setThemeMode?.(mode);
  } catch {}
}

// Força reload do widget iOS sem alterar dados — chamado ao voltar ao foreground
export function refreshiOSWidget(): void {
  if (Platform.OS === 'ios') {
    try {
      NativeModules.ZojiWidgetModule?.refreshWidget?.();
    } catch {}
  }
}

// Lê o token de push dedicado do WidgetKit (iOS 26+, ver ZojiWidgetPushHandler
// na extensão) — null em Android, em devices < iOS 26, ou se o SO ainda não
// entregou o token pra extensão.
export async function getWidgetPushToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const token = await NativeModules.ZojiWidgetModule?.getWidgetPushToken?.();
    return token || null;
  } catch {
    return null;
  }
}

export function syncWidgetStatus(
  own: OwnStatus | null,
  friends: FriendStatus[]
): void {
  try {
    const payload: WidgetPayload = {
      ownEmoji: own?.emoji ?? null,
      friends: friends.map(f => ({
        userId: f.userId,
        nickname: f.nickname ?? '',
        statusEmoji: f.statusEmoji,
        profileEmoji: f.profileEmoji ?? '',
      })),
    };
    NativeModules.ZojiWidgetModule?.updateStatus(JSON.stringify(payload));
  } catch {}
}
