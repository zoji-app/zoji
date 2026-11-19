import { api } from './apiClient';
import { Group, GroupMessage } from '../types/groups';

export const groupsApi = {
  list(): Promise<Group[]> {
    return api.get('/groups').then(r => r.data);
  },

  get(groupId: number): Promise<Group> {
    return api.get(`/groups/${groupId}`).then(r => r.data);
  },

  create(params: {
    name: string;
    emoji: string;
    member_ids: number[];
  }): Promise<Group> {
    return api.post('/groups', params).then(r => r.data);
  },

  update(
    groupId: number,
    params: { name?: string; emoji?: string }
  ): Promise<Group> {
    return api.put(`/groups/${groupId}`, params).then(r => r.data);
  },

  delete(groupId: number): Promise<void> {
    return api.delete(`/groups/${groupId}`).then(() => undefined);
  },

  addMember(groupId: number, userId: number): Promise<void> {
    return api
      .post(`/groups/${groupId}/members`, { user_id: userId })
      .then(() => undefined);
  },

  removeMember(groupId: number, userId: number): Promise<void> {
    return api
      .delete(`/groups/${groupId}/members/${userId}`)
      .then(() => undefined);
  },

  promoteToAdmin(groupId: number, userId: number): Promise<void> {
    return api
      .post(`/groups/${groupId}/members/${userId}/promote`)
      .then(() => undefined);
  },

  muteMember(groupId: number, userId: number): Promise<void> {
    return api
      .post(`/groups/${groupId}/members/${userId}/mute`)
      .then(() => undefined);
  },

  unmuteMember(groupId: number, userId: number): Promise<void> {
    return api
      .post(`/groups/${groupId}/members/${userId}/unmute`)
      .then(() => undefined);
  },

  leave(groupId: number): Promise<void> {
    return api.post(`/groups/${groupId}/leave`).then(() => undefined);
  },

  getMessages(
    groupId: number,
    params?: { limit?: number; before?: string }
  ): Promise<GroupMessage[]> {
    return api.get(`/groups/${groupId}/messages`, { params }).then(r => r.data);
  },

  sendMessage(
    groupId: number,
    emoji: string,
    senderEmoji: string
  ): Promise<GroupMessage> {
    return api
      .post(`/groups/${groupId}/messages`, {
        emoji,
        sender_emoji: senderEmoji,
      })
      .then(r => r.data);
  },

  recallMessage(messageId: number): Promise<void> {
    return api
      .delete(`/groups/messages/${messageId}/recall`)
      .then(() => undefined);
  },
};
