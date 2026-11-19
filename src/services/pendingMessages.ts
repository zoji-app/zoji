import {
  loadPendingMessages,
  removePendingMessage,
  updateLocalMessage,
} from './localMessages';
import { messagesApi } from './messagesApi';
import { updateContactLastMessage, loadContactsFromStorage } from './contacts';
import { hasQualityConnection } from './connectivity';
import { logger } from '../utils/logger';

// ── Confirmed message notifier (para atualizar chat aberto após retry em background) ──
// Passa a mensagem já confirmada para que o chat faça swap atômico, sem piscar.
export type ConfirmedMessageData = {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  senderEmoji: string;
  createdAt: Date;
  pending: false;
  delivered: true;
};

type PendingConfirmedListener = (
  chatId: string,
  pendingId: string,
  confirmed: ConfirmedMessageData
) => void;
const _confirmedListeners = new Set<PendingConfirmedListener>();

export const onPendingMessageConfirmed = (
  fn: PendingConfirmedListener
): (() => void) => {
  _confirmedListeners.add(fn);
  return () => _confirmedListeners.delete(fn);
};

const _notifyConfirmed = (
  chatId: string,
  pendingId: string,
  confirmed: ConfirmedMessageData
) => _confirmedListeners.forEach(fn => fn(chatId, pendingId, confirmed));

// ── Sending state notifier ────────────────────────────────────────────────────
// Tracks which contacts are actively being retried right now.
type SendingListener = (contactIds: Set<string>) => void;
const _sendingContacts = new Set<string>();
const _listeners = new Set<SendingListener>();

const _notify = () => {
  const snapshot = new Set(_sendingContacts);
  _listeners.forEach(fn => fn(snapshot));
};

export const onSendingStateChange = (fn: SendingListener): (() => void) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};

export const isSendingForContact = (contactId: string): boolean =>
  _sendingContacts.has(contactId);

export interface PendingMessageResendResult {
  success: boolean;
  message: string;
  updatedContacts: boolean;
}

/**
 * Verifica e reenvia mensagens pendentes para um contato específico.
 * Usa o mesmo storage que o chat (localMessages) com chave @zoji:messages:{chatId}
 */
export const checkAndResendPendingMessagesForContact = async (
  userId: string,
  contactId: string
): Promise<PendingMessageResendResult> => {
  if (!userId || !contactId) {
    return {
      success: false,
      message: 'Parâmetros inválidos',
      updatedContacts: false,
    };
  }

  try {
    const hasConnection = await hasQualityConnection();
    if (!hasConnection) {
      return {
        success: false,
        message: 'Sem conexão estável',
        updatedContacts: false,
      };
    }

    const chatId = [userId, contactId].sort().join('_');
    const pending = (await loadPendingMessages(chatId))
      .filter(m => m.senderId === userId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    if (pending.length === 0) {
      return {
        success: true,
        message: 'Nenhuma mensagem pendente',
        updatedContacts: false,
      };
    }

    logger.debug(
      `[PendingMessages] ${pending.length} mensagem(s) pendente(s) para ${contactId}`
    );

    _sendingContacts.add(contactId);
    _notify();

    // Atualiza o lastMessage do contato com a mensagem pendente mais recente
    // antes mesmo de enviar — garante exibição correta na lista de amigos
    const latest = pending[pending.length - 1];
    await updateContactLastMessage(
      userId,
      contactId,
      {
        createdAt:
          latest.createdAt instanceof Date
            ? latest.createdAt
            : new Date(latest.createdAt),
        emoji: latest.emoji,
        senderId: latest.senderId,
        senderEmoji: latest.senderEmoji,
        pending: true,
      },
      true
    );

    let updatedContacts = false;

    for (const msg of pending) {
      try {
        const receiverIdNum = parseInt(
          msg.receiverId ?? (msg.senderId === userId ? contactId : userId),
          10
        );
        const apiMsg = await messagesApi.send(
          receiverIdNum,
          msg.emoji,
          msg.senderEmoji
        );

        // Remove da fila de pendentes e salva no histórico confirmado
        const confirmed: ConfirmedMessageData = {
          id: String(apiMsg.id),
          emoji: msg.emoji,
          senderId: msg.senderId,
          receiverId: msg.receiverId ?? contactId,
          chatId,
          senderEmoji: msg.senderEmoji,
          createdAt:
            msg.createdAt instanceof Date
              ? msg.createdAt
              : new Date(msg.createdAt),
          pending: false,
          delivered: true,
        };
        await removePendingMessage(chatId, msg.id);
        await updateLocalMessage(chatId, msg.id, confirmed);
        _notifyConfirmed(chatId, msg.id, confirmed);

        // Atualiza lastMessage apenas para a mensagem mais recente
        if (msg.id === latest.id) {
          await updateContactLastMessage(
            userId,
            contactId,
            {
              createdAt:
                confirmed.createdAt instanceof Date
                  ? confirmed.createdAt
                  : new Date(confirmed.createdAt),
              emoji: confirmed.emoji,
              senderId: confirmed.senderId,
              senderEmoji: confirmed.senderEmoji,
              pending: false,
              delivered: true,
            },
            true
          );
          updatedContacts = true;
        }

        logger.debug(
          `[PendingMessages] Mensagem ${msg.id} reenviada com sucesso`
        );
      } catch (err) {
        logger.error(
          `[PendingMessages] Erro ao reenviar ${msg.id}:`,
          err as Error
        );
      }
    }

    _sendingContacts.delete(contactId);
    _notify();

    return {
      success: true,
      message: `${pending.length} mensagem(s) processada(s)`,
      updatedContacts,
    };
  } catch (error) {
    _sendingContacts.delete(contactId);
    _notify();
    logger.error('[PendingMessages] Erro geral:', error as Error);
    return {
      success: false,
      message: 'Erro ao processar mensagens pendentes',
      updatedContacts: false,
    };
  }
};

/**
 * Verifica e reenvia mensagens pendentes para todos os contatos.
 */
export const checkAndResendAllPendingMessages = async (
  userId: string,
  contacts: { id: string; nickname: string }[]
): Promise<boolean> => {
  if (!userId || !contacts?.length) return false;

  logger.debug(
    '[PendingMessages] Verificando pendentes para todos os contatos...'
  );
  let anyUpdated = false;

  for (const contact of contacts) {
    try {
      const result = await checkAndResendPendingMessagesForContact(
        userId,
        contact.id
      );
      if (result.updatedContacts) anyUpdated = true;
    } catch (err) {
      logger.error(
        `[PendingMessages] Erro no contato ${contact.id}:`,
        err as Error
      );
    }
  }

  return anyUpdated;
};

/**
 * Carrega pendentes do storage e atualiza o lastMessage de cada contato na lista de amigos.
 * Chame isso ao inicializar o app para garantir que mensagens travadas apareçam na lista.
 */
export const syncPendingMessagesToContactsList = async (
  userId: string
): Promise<void> => {
  try {
    const contacts = await loadContactsFromStorage(userId);
    if (!contacts.length) return;

    for (const contact of contacts) {
      const chatId = [userId, contact.id].sort().join('_');
      const pending = (await loadPendingMessages(chatId))
        .filter(m => m.senderId === userId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      if (pending.length === 0) continue;

      const latest = pending[pending.length - 1];
      const currentLast = contact.lastMessage;

      // Só atualiza se a mensagem pendente for mais recente que a última conhecida
      const pendingTime = new Date(latest.createdAt).getTime();
      const currentTime = currentLast
        ? new Date(currentLast.createdAt).getTime()
        : 0;

      if (pendingTime >= currentTime) {
        await updateContactLastMessage(
          userId,
          contact.id,
          {
            createdAt:
              latest.createdAt instanceof Date
                ? latest.createdAt
                : new Date(latest.createdAt),
            emoji: latest.emoji,
            senderId: latest.senderId,
            senderEmoji: latest.senderEmoji,
            pending: true,
          },
          true
        );
      }
    }

    logger.debug(
      '[PendingMessages] Sync de pendentes para lista de amigos concluído'
    );
  } catch (err) {
    logger.error(
      '[PendingMessages] Erro ao sincronizar pendentes:',
      err as Error
    );
  }
};
