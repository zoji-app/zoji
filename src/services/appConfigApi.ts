/**
 * appConfigApi — GET /app/config (P3-5). Gate de versão mínima + links de loja.
 * Falha silenciosa: qualquer erro → config "nunca bloqueia".
 */
import axios from 'axios';
import { API_BASE_URL } from './apiClient';

export interface AppRemoteConfig {
  min_version: string;
  latest_version: string;
  store_urls: { ios: string; android: string };
  event_mode: boolean;
}

const SAFE_DEFAULT: AppRemoteConfig = {
  min_version: '0.0.0',
  latest_version: '0.0.0',
  store_urls: {
    ios: 'https://apps.apple.com/search?term=zoji',
    android: 'https://play.google.com/store/apps/details?id=dev.de4araujo.zoji',
  },
  event_mode: false,
};

export async function fetchAppConfig(): Promise<AppRemoteConfig> {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/app/config`, {
      timeout: 8000,
    });
    return {
      min_version: String(data?.min_version ?? SAFE_DEFAULT.min_version),
      latest_version: String(
        data?.latest_version ?? SAFE_DEFAULT.latest_version
      ),
      store_urls: {
        ios: String(data?.store_urls?.ios ?? SAFE_DEFAULT.store_urls.ios),
        android: String(
          data?.store_urls?.android ?? SAFE_DEFAULT.store_urls.android
        ),
      },
      event_mode: Boolean(data?.event_mode),
    };
  } catch {
    return SAFE_DEFAULT;
  }
}
