/**
 * Serviço de mensagens — usa REST API (substitui Firestore).
 * Mantém a mesma interface de exports para compatibilidade com Friends screen.
 */
export {
  isMessageBeingProcessed,
  markMessageAsProcessing,
  unmarkMessageAsProcessing,
  loadProcessingMessagesFromStorage,
  checkMessageProcessingStatus,
} from './messageProcessingQueue';

import { messagesApi } from './messagesApi';
import { loadContactsFromStorage, updateContactLastMessage } from './contacts';
import { default as ContactsManagerInstance } from './ContactsManager';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  senderEmoji: string;
  status?: string;
  read?: boolean;
}

export interface MessageBase {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  senderEmoji: string;
  status?: string;
  read?: boolean;
}

export type Message = ChatMessage;

// ─── Priority contacts (kept for interface compatibility) ────────────────────

let priorityContactIds: string[] = [];

export function setPriorityContacts(contactIds: string[]): void {
  priorityContactIds = [...(contactIds || [])];
}

// ─── Message listeners (polling-based) ───────────────────────────────────────

let globalPollingInterval: ReturnType<typeof setInterval> | null = null;
let globalUserId: string | null = null;
let globalContactIds: string[] = [];

/**
 * Configura polling periódico para última mensagem de cada contato.
 * Retorna função de limpeza.
 */
export function setupLastMessagesListeners(
  userId: string,
  contactIds: string[]
): () => void {
  globalUserId = userId;
  globalContactIds = contactIds;

  // Clear any existing polling
  if (globalPollingInterval) {
    clearInterval(globalPollingInterval);
    globalPollingInterval = null;
  }

  const poll = async () => {
    if (!globalUserId || globalContactIds.length === 0) return;

    try {
      // Fetch last message for each contact (limit to priority contacts to save bandwidth)
      const toFetch = globalContactIds.slice(0, 10);

      for (const contactId of toFetch) {
        try {
          const contactIdNum = parseInt(contactId, 10);
          if (isNaN(contactIdNum)) continue;

          const messages = await messagesApi.list(contactIdNum);
          if (messages.length === 0) continue;

          const last = messages[messages.length - 1];

          await updateContactLastMessage(
            globalUserId!,
            contactId,
            {
              id: String(last.id),
              emoji: last.emoji,
              senderId: String(last.sender_id),
              createdAt: new Date(last.created_at),
              pending: false,
              delivered: true,
            },
            true
          );
        } catch {}
      }

      // Notify UI
      const updatedContacts = await loadContactsFromStorage(globalUserId!);
      ContactsManagerInstance.initialize(updatedContacts);
      ContactsManagerInstance.notifyContactsChanged(false);
    } catch (err) {
      logger.error('[Messages] Erro no polling de mensagens:', err);
    }
  };

  // Start polling every 30 seconds
  globalPollingInterval = setInterval(poll, 30000);
  // Also run immediately
  poll().catch(() => {});

  return () => {
    if (globalPollingInterval) {
      clearInterval(globalPollingInterval);
      globalPollingInterval = null;
    }
  };
}

/**
 * Remove todos os listeners de mensagens.
 */
export function removeAllMessageListeners(): void {
  if (globalPollingInterval) {
    clearInterval(globalPollingInterval);
    globalPollingInterval = null;
  }
  globalContactIds = [];
}
