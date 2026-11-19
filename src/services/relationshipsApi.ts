/**
 * Wrapper REST para o endpoint /relationships.
 */
import { api } from './apiClient';

export interface ApiRelationship {
  id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  initiated_by: number;
  rejected_by: number | null;
  blocked_by: number | null;
  contact: {
    id: number;
    nickname: string;
    profile_emoji: string;
    phone_hash?: string;
    phone_number?: string;
    deleted?: boolean;
    is_system_bot?: boolean;
  };
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export const relationshipsApi = {
  list: async (): Promise<ApiRelationship[]> => {
    const { data } = await api.get<ApiRelationship[]>('/relationships');
    return data;
  },

  create: async (phoneNumber: string): Promise<ApiRelationship> => {
    const { data } = await api.post<ApiRelationship>('/relationships', {
      phone_number: phoneNumber,
    });
    return data;
  },

  update: async (
    id: number,
    action: 'accept' | 'reject' | 'block'
  ): Promise<void> => {
    await api.put(`/relationships/${id}`, { action });
  },

  destroy: async (id: number): Promise<void> => {
    await api.delete(`/relationships/${id}`);
  },
};
