/**
 * Sincronização de mensagens — usa REST API (substitui Firestore).
 */
import { applyLastMessageUpdatesBatch } from './contacts';
import { messagesApi } from './messagesApi';
import { getUserRelationships, Relationship } from './relationships';
import { default as ContactsManager } from './ContactsManager';
import { logger } from '../utils/logger';
import NetInfo from '@react-native-community/netinfo';
import type { Message } from './contacts';

let isCheckingNewMessages = false;

function getContactIdFromRel(rel: Relationship, userId: string): string {
  return rel.userA === userId ? rel.userB : rel.userA;
}

/**
 * Sincroniza últimas mensagens de todos os contatos aceitos.
 * Perfis (nickname/emoji) são atualizados exclusivamente via WS (profile.updated).
 */
export const syncMessages = async (userId: string): Promise<boolean> => {
  if (!userId || isCheckingNewMessages) return false;

  isCheckingNewMessages = true;
  let hasChanges = false;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return false;

    const relationships = await getUserRelationships(userId);
    const acceptedRels = relationships.filter(r => r.status === 'accepted');

    // ── Verificar novas mensagens ──────────────────────────────────────────
    // Coleta as atualizações e aplica tudo em lote ao final (1 load + 1 save +
    // 1 notificação), em vez de 1 ciclo completo de load+save+sort+notify por
    // contato — com muitas conversas (100+) o custo por-contato vira O(n²).
    const pendingUpdates: {
      contactId: string;
      lastMessage: Partial<Message>;
    }[] = [];

    for (const rel of acceptedRels) {
      const contactId = getContactIdFromRel(rel, userId);
      const contactIdNum = parseInt(contactId, 10);
      if (isNaN(contactIdNum)) continue;

      try {
        const messages = await messagesApi.list(contactIdNum);
        if (messages.length === 0) continue;

        const last = messages[messages.length - 1];
        const senderId = String(last.sender_id);
        const contactEntry = ContactsManager.getContact(contactId);
        const fallbackEmoji =
          senderId !== userId ? (contactEntry?.profileEmoji ?? '') : '';

        pendingUpdates.push({
          contactId,
          lastMessage: {
            id: String(last.id),
            emoji: last.emoji,
            senderId,
            senderEmoji: last.sender_emoji || fallbackEmoji || undefined,
            createdAt: new Date(last.created_at),
            pending: false,
            delivered: true,
          },
        });
      } catch {}
    }

    if (pendingUpdates.length > 0) {
      hasChanges = await applyLastMessageUpdatesBatch(
        userId,
        pendingUpdates,
        true
      );
    }
  } catch (err) {
    logger.error('[MessageSync] Erro ao sincronizar mensagens:', err);
  } finally {
    isCheckingNewMessages = false;
  }

  return hasChanges;
};

export const checkNewMessages = syncMessages;
