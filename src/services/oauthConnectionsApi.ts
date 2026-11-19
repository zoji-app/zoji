/**
 * oauthConnectionsApi — agentes de IA (MCP) conectados à conta via OAuth.
 * Ver zoji-api/controllers/OAuthController.php (connections/revokeConnection).
 */
import { api } from './apiClient';

export interface OAuthConnection {
  id: number;
  client_name: string;
  scope: string[];
  created_at: string;
  last_used_at: string | null;
}

export const oauthConnectionsApi = {
  /** Lista os agentes de IA atualmente conectados à conta do usuário. */
  list: async (): Promise<OAuthConnection[]> => {
    const { data } = await api.get<OAuthConnection[]>(
      '/user/oauth-connections'
    );
    return data;
  },

  /** Revoga o acesso de um agente conectado. */
  revoke: async (connectionId: number): Promise<void> => {
    await api.delete(`/user/oauth-connections/${connectionId}`);
  },

  /**
   * Reduz o escopo de um agente já conectado — nunca amplia (pra ganhar mais
   * acesso o agente precisa reconectar via consentimento). Só passa a valer
   * pro agente no próximo refresh de token (até ~1h, não é instantâneo).
   */
  updateScope: async (
    connectionId: number,
    scopes: string[]
  ): Promise<string[]> => {
    const { data } = await api.put<{ scope: string[] }>(
      `/user/oauth-connections/${connectionId}/scope`,
      { scope: scopes.join(' ') }
    );
    return data.scope;
  },
};
