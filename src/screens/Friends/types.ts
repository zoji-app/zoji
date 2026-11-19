import { Contact } from '../../services/contacts';

/**
 * Interface de usuário estendendo Contact para adicionar status nas mensagens
 */
export interface User extends Omit<Contact, 'lastMessage'> {
  id: string;
  nickname: string;
  profileEmoji: string;
  phoneNumber: string;
  lastMessage: {
    createdAt: Date | string;
    emoji: string;
    senderId: string;
    senderEmoji?: string;
    pending?: boolean;
    status?: 'delivered' | 'read';
  } | null;
  relationshipStatus?: string;
  relationshipId?: string;
  initiatedBy?: string;
}
