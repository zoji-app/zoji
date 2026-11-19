import axios from 'axios';
import { API_BASE_URL } from './apiClient';
import { isCircuitOpen, recordSuccess, recordFailure } from './circuitBreaker';

const CIRCUIT_KEY = 'banner';

export interface AppBanner {
  id: string;
  type: 'info' | 'warning' | 'success';
  messages: { 'pt-BR': string; en: string; es: string; [key: string]: string };
  cta?: { 'pt-BR': string; en: string; es: string; [key: string]: string };
  cta_action?: 'open_notifications_settings' | 'open_url' | 'share_invite';
  cta_url?: string;
  dismissible: boolean;
  platform?: 'all' | 'ios' | 'android'; // ausente ou 'all' = todos
  cta_url_ios?: string;
  cta_url_android?: string;
  show_if?: string; // condição avaliada no cliente — ausente = sempre exibir
  show_if_params?: Record<string, string>; // parâmetros opcionais para a condição
  // Filtro extra por data de cadastro (ISO), fora do sistema de show_if de
  // propósito — apps publicados antes desse campo existir simplesmente o
  // ignoram (continuam mostrando o banner normalmente). Só apps ≥ 1.8.1
  // aplicam esse filtro. Ver useAppBanner.ts.
  created_before?: string;
}

export const fetchBanners = async (): Promise<AppBanner[]> => {
  // P3-2, item 3: banner é decorativo — depois de falhas seguidas, dá um
  // tempo antes de tentar de novo em vez de martelar uma API sofrendo.
  if (isCircuitOpen(CIRCUIT_KEY)) return [];

  try {
    const { data } = await axios.get<AppBanner[]>(
      `${API_BASE_URL}/app/banners`,
      {
        timeout: 5000,
        params: { t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }
    );
    recordSuccess(CIRCUIT_KEY);
    return Array.isArray(data) ? data : [];
  } catch {
    recordFailure(CIRCUIT_KEY);
    return [];
  }
};

export const fetchBannerPreview = async (
  id: string,
  token: string
): Promise<AppBanner | null> => {
  try {
    const { data } = await axios.get<AppBanner>(
      `${API_BASE_URL}/app/banner/preview/${encodeURIComponent(id)}`,
      { timeout: 5000, params: { token } }
    );
    return data ?? null;
  } catch {
    return null;
  }
};
