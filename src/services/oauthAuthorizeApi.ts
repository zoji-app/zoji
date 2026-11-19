/**
 * oauthAuthorizeApi — aprovação de conexão MCP direto pelo app, usando a
 * sessão já logada (sem OTP). Mesmos endpoints que zoji-site/OAuthAuthorize.tsx
 * chama depois do login OTP — ver zoji-api/controllers/OAuthController.php
 * (clientInfo/approve). O app só é mais um caller autenticado do mesmo fluxo.
 */
import { api } from './apiClient';

export interface OAuthClientInfo {
  client_name: string;
  redirect_uris: string[];
}

export interface ApproveAuthorizationParams {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  state?: string;
  // Presente no fluxo de QR — o backend usa a sessão de pareamento como fonte
  // da verdade pros parâmetros, ignorando os campos acima quando ele vem preenchido.
  pairing_token?: string;
}

export const oauthAuthorizeApi = {
  getClientInfo: async (clientId: string): Promise<OAuthClientInfo> => {
    const { data } = await api.get<OAuthClientInfo>(
      `/oauth/clients/${clientId}`
    );
    return data;
  },

  approve: async (
    params: ApproveAuthorizationParams
  ): Promise<{ redirect_url: string }> => {
    const { data } = await api.post<{ redirect_url: string }>(
      '/oauth/authorize/approve',
      params
    );
    return data;
  },
};
