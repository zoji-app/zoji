import { api } from './apiClient';

export interface ShareTokenResponse {
  token: string;
  expiresAt: string;
}

export interface ResolveTokenResponse {
  phoneNumber: string;
  userId: number;
  nickname: string;
  profileEmoji: string;
}

export const shareTokenApi = {
  generate: async (): Promise<ShareTokenResponse> => {
    const { data } = await api.post<ShareTokenResponse>('/share-token');
    return data;
  },

  resolve: async (token: string): Promise<ResolveTokenResponse> => {
    const { data } = await api.get<ResolveTokenResponse>(
      `/share-token/${token}`
    );
    return data;
  },
};
