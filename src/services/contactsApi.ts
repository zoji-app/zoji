/**
 * contactsApi — chamadas REST para descoberta de contatos e bloqueios.
 */
import { api } from './apiClient';

export interface AppContact {
  id: number;
  nickname: string;
  profile_emoji: string;
  phone_hash: string;
}

export interface BlockedUser {
  id: number;
  nickname: string;
  profile_emoji: string;
}

export const contactsApi = {
  /**
   * Envia os números do dispositivo e recebe quais usuários têm o app.
   * Retorna vazio se nenhum número corresponder ou o usuário não tiver permissão.
   */
  sync: async (phoneHashes: string[]): Promise<AppContact[]> => {
    if (phoneHashes.length === 0) return [];
    const { data } = await api.post<AppContact[]>('/contacts/sync', {
      phone_hashes: phoneHashes,
    });
    return data;
  },

  /** Descobre quais contatos têm Zoji sem criar relacionamentos (usado no onboarding). */
  discover: async (phoneHashes: string[]): Promise<AppContact[]> => {
    if (phoneHashes.length === 0) return [];
    const { data } = await api.post<AppContact[]>('/contacts/discover', {
      phone_hashes: phoneHashes,
    });
    return data;
  },

  /** Verifica quais hashes correspondem a contas deletadas. */
  deletedHashes: async (phoneHashes: string[]): Promise<string[]> => {
    if (phoneHashes.length === 0) return [];
    const { data } = await api.post<{ deleted_hashes: string[] }>(
      '/contacts/deleted-hashes',
      { phone_hashes: phoneHashes }
    );
    return data.deleted_hashes;
  },

  /** Bloqueia um usuário pelo ID. */
  block: async (userId: string): Promise<void> => {
    await api.post(`/contacts/${userId}/block`);
  },

  /** Desbloqueia um usuário pelo ID. */
  unblock: async (userId: string): Promise<void> => {
    await api.delete(`/contacts/${userId}/block`);
  },

  /** Retorna a lista de usuários bloqueados pelo usuário autenticado. */
  blocked: async (): Promise<BlockedUser[]> => {
    const { data } = await api.get<BlockedUser[]>('/contacts/blocked');
    return data;
  },

  blockStatus: async (
    contactId: string
  ): Promise<{ blocked_by_me: boolean; blocked_by_them: boolean }> => {
    const { data } = await api.get(`/contacts/${contactId}/block-status`);
    return data;
  },

  /** Retorna nickname e emoji atuais de um contato. */
  getProfile: async (
    contactId: string
  ): Promise<{
    id: number;
    nickname: string;
    profile_emoji: string;
    is_system_bot?: boolean;
  }> => {
    const { data } = await api.get(`/contacts/${contactId}/profile`);
    return data;
  },
};
