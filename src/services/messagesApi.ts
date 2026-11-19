/**
 * Wrapper REST para o endpoint /messages.
 */
import { api } from './apiClient';

export interface ApiMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  emoji: string;
  sender_emoji: string | null;
  read_at: string | null;
  created_at: string;
}

export const messagesApi = {
  list: async (contactId: number, before?: string): Promise<ApiMessage[]> => {
    const params: Record<string, any> = { limit: 50 };
    if (before) params.before = before;
    const { data } = await api.get<ApiMessage[]>(`/messages/${contactId}`, {
      params,
    });
    return data;
  },

  send: async (
    receiverId: number,
    emoji: string,
    senderEmoji?: string
  ): Promise<ApiMessage> => {
    const { data } = await api.post<ApiMessage>('/messages', {
      receiver_id: receiverId,
      emoji,
      sender_emoji: senderEmoji ?? null,
    });
    return data;
  },

  markRead: async (senderId: number): Promise<void> => {
    await api.put('/messages/read', { sender_id: senderId });
  },

  deleteConversation: async (contactId: number): Promise<void> => {
    await api.delete(`/messages/${contactId}`);
  },

  recallMessage: async (
    messageId: number,
    receiverId: number
  ): Promise<void> => {
    await api.delete(`/messages/${messageId}/recall`, {
      data: { receiver_id: receiverId },
    });
  },
};
