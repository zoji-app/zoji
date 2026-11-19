import { api } from './apiClient';

export interface FriendStatus {
  userId: number;
  nickname: string | null;
  profileEmoji: string | null;
  statusEmoji: string;
  statusCreatedAt: string;
  statusExpiresAt: string;
}

export interface OwnStatus {
  emoji: string;
  expiresAt: string;
}

export interface StatusResponse {
  own: OwnStatus | null;
  friends: FriendStatus[];
}

export const statusApi = {
  getFriends: async (): Promise<StatusResponse> => {
    const { data } = await api.get<StatusResponse>('/status/friends');
    return data;
  },

  set: async (emoji: string): Promise<void> => {
    await api.post('/status', { emoji });
  },

  remove: async (): Promise<void> => {
    await api.delete('/status');
  },
};
