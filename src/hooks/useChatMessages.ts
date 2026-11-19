import { useState, useCallback, useRef, useEffect } from 'react';
import { AuthUser } from '../services/authApi';
import { messagesApi, ApiMessage } from '../services/messagesApi';
import {
  loadLocalMessages,
  saveLocalMessages,
  updateLocalMessage,
  savePendingMessage,
  loadPendingMessages,
  removePendingMessage,
  deleteLocalMessage,
} from '../services/localMessages';
import { onPendingMessageConfirmed } from '../services/pendingMessages';
import {
  updateContactLastMessage,
  clearContactLastMessage,
} from '../services/contacts';
import { wsService } from '../services/wsService';
import { logger } from '../utils/logger';

export interface Message {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  senderEmoji: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  _isNewReceived?: boolean;
}

export interface Contact {
  id: string;
  nickname: string;
  profileEmoji: string;
  deviceName?: string;
  blockedByMe?: boolean;
  blockedByContact?: boolean;
  isDeleted?: boolean;
  isSystemBot?: boolean;
}

interface UseChatMessagesProps {
  user: AuthUser | null;
  contact: Contact;
  userProfile?: any;
  senderEmojiOverride?: string;
  onStreakMessage?: (date: Date) => void;
}

export function apiMessageToMessage(
  m: ApiMessage,
  fallbackSenderEmoji: string
): Message {
  return {
    id: String(m.id),
    emoji: m.emoji || '❓',
    senderId: String(m.sender_id),
    receiverId: String(m.receiver_id),
    chatId: [m.sender_id, m.receiver_id].sort().join('_'),
    senderEmoji: m.sender_emoji || fallbackSenderEmoji,
    createdAt: new Date(m.created_at),
    pending: false,
    delivered: true,
  };
}

/** Ordena newest-first para o FlatList invertido */
function newestFirst(msgs: Message[]): Message[] {
  return [...msgs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const useChatMessages = ({
  user,
  contact,
  userProfile,
  senderEmojiOverride,
  onStreakMessage,
}: UseChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mountedRef = useRef(true);
  const fetchInFlightRef = useRef(false);

  // Primitivo estável — evita que todo o objeto user recrie callbacks
  const userUid = user?.uid ?? null;

  // Emoji do remetente: prefere customização por chat, depois perfil global
  const myEmoji =
    senderEmojiOverride ||
    userProfile?.profileEmoji ||
    userProfile?.profile_emoji ||
    '😊';
  // Ref sempre atualizada — fetchFromApi lê o valor corrente sem precisar ser recriado
  const myEmojiRef = useRef(myEmoji);
  useEffect(() => {
    myEmojiRef.current = myEmoji;
  }, [myEmoji]);

  // Emoji histórico do contato (fallback para mensagens recebidas)
  const contactEmoji = contact.profileEmoji || '👤';
  const contactIdNum = parseInt(contact.id, 10);
  const chatId = [userUid ?? '', contact.id].sort().join('_');

  // ─── Carga inicial do AsyncStorage + fila de pendentes ───────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [local, pending] = await Promise.all([
        loadLocalMessages(chatId),
        loadPendingMessages(chatId),
      ]);
      if (!cancelled) {
        const byId = new Map<string, Message>(local.map(m => [m.id, m]));
        for (const p of pending) {
          if (!byId.has(p.id)) byId.set(p.id, p);
        }
        setMessages(newestFirst([...byId.values()]));
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // ─── Poll da API — busca mensagens novas do banco ─────────────────────────────
  const fetchFromApi = useCallback(async () => {
    if (!userUid || isNaN(contactIdNum)) return;
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      const apiMessages = await messagesApi.list(contactIdNum);
      if (!mountedRef.current || apiMessages.length === 0) return;

      // Escolhe o fallback correto: mensagens minhas → meu emoji; recebidas → emoji do contato
      const incoming = apiMessages.map(m => {
        const fallback =
          String(m.sender_id) === String(userUid)
            ? myEmojiRef.current
            : contactEmoji;
        return apiMessageToMessage(m, fallback);
      });

      // Persiste localmente (merge — evita duplicatas)
      await saveLocalMessages(chatId, incoming);

      if (!mountedRef.current) return;

      // Atualiza UI: merge idempotente — pendentes gerenciadas pela fila separada
      setMessages(prev => {
        const byId = new Map(prev.map(m => [m.id, m]));
        let changed = false;
        for (const m of incoming) {
          if (!byId.has(m.id)) {
            byId.set(m.id, m);
            changed = true;
          }
        }
        if (!changed) return prev;
        return newestFirst([...byId.values()]);
      });

      // Atualiza lastMessage do contato no storage (cobre mensagens recebidas com chat aberto)
      const newestIncoming = newestFirst(incoming)[0];
      if (newestIncoming) {
        updateContactLastMessage(
          userUid,
          contact.id,
          newestIncoming,
          true
        ).catch(() => {});
      }

      // Marca como lida → backend deleta do banco (relay cumprido)
      await messagesApi.markRead(contactIdNum).catch(() => {});
    } catch (err) {
      logger.error('[useChatMessages] Erro no poll:', err as Error);
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [userUid, contactIdNum, chatId, contactEmoji]);

  // Carga inicial da API — sincroniza mensagens perdidas enquanto o app estava fechado
  useEffect(() => {
    mountedRef.current = true;
    fetchFromApi();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchFromApi]);

  // Mensagem deletada via WS → remove do estado, storage local e atualiza lastMessage
  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = wsService.on(
      'message.deleted',
      async (payload: any) => {
        if (!payload?.message_id) return;
        const msgId = String(payload.message_id);
        if (!mountedRef.current) return;
        setMessages(prev => prev.filter(m => m.id !== msgId));
        await deleteLocalMessage(chatId, msgId).catch(() => {});
        const remaining = await loadLocalMessages(chatId).catch(
          () => [] as typeof messages
        );
        if (remaining.length > 0) {
          const newest = [...remaining].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          updateContactLastMessage(userUid, contact.id, newest, true).catch(
            () => {}
          );
        } else {
          clearContactLastMessage(userUid, contact.id).catch(() => {});
        }
      }
    );
    return unsubscribe;
  }, [userUid, chatId, contact.id]);

  // Mensagem nova recebida via WS → adiciona direto ao estado sem chamar REST
  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = wsService.on('message.new', (payload: any) => {
      if (!payload?.sender_id) return;
      if (String(payload.sender_id) !== String(contact.id)) return;
      const msg: Message = {
        id: String(payload.id),
        emoji: payload.emoji || '❓',
        senderId: String(payload.sender_id),
        receiverId: String(payload.receiver_id ?? userUid),
        chatId,
        senderEmoji: payload.sender_emoji || contactEmoji,
        createdAt: new Date(payload.created_at),
        pending: false,
        delivered: true,
      };
      if (!mountedRef.current) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return newestFirst([msg, ...prev]);
      });
      saveLocalMessages(chatId, [msg]).catch(() => {});
      updateContactLastMessage(userUid, contact.id, msg, true).catch(() => {});
      messagesApi.markRead(contactIdNum).catch(() => {});
      onStreakMessage?.(msg.createdAt);
    });
    return unsubscribe;
  }, [
    userUid,
    contact.id,
    chatId,
    contactEmoji,
    contactIdNum,
    onStreakMessage,
  ]);

  // Reconexão WS → busca mensagens perdidas durante a queda
  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = wsService.on('__ws_status', (payload: any) => {
      if (payload?.status === 'connected') fetchFromApi();
    });
    return unsubscribe;
  }, [userUid, fetchFromApi]);

  /** Adiciona mensagem otimista (pending) — persiste na fila de pendentes e atualiza lastMessage */
  const addMessage = useCallback(
    (message: Message) => {
      setMessages(prev => [message, ...prev]);
      if (message.pending) {
        savePendingMessage(chatId, message).catch(() => {});
      } else {
        saveLocalMessages(chatId, [message]).catch(() => {});
      }
      if (user?.uid) {
        updateContactLastMessage(user.uid, contact.id, message, true).catch(
          () => {}
        );
      }
    },
    [chatId, user?.uid, contact.id]
  );

  /** Substitui pending pela mensagem confirmada — atualiza UI, fila, storage e lastMessage */
  const confirmMessage = useCallback(
    (pendingId: string, confirmed: Message) => {
      setMessages(prev => {
        const without = prev.filter(
          m => m.id !== pendingId && m.id !== confirmed.id
        );
        return newestFirst([confirmed, ...without]);
      });
      removePendingMessage(chatId, pendingId).catch(() => {});
      updateLocalMessage(chatId, pendingId, confirmed).catch(() => {});
      if (user?.uid) {
        updateContactLastMessage(user.uid, contact.id, confirmed, true).catch(
          () => {}
        );
      }
    },
    [chatId, user?.uid, contact.id]
  );

  /** Remove uma mensagem pelo id — também limpa da fila de pendentes */
  const removeMessage = useCallback(
    (id: string) => {
      setMessages(prev => prev.filter(m => m.id !== id));
      removePendingMessage(chatId, id).catch(() => {});
    },
    [chatId]
  );

  /** Apaga uma mensagem enviada (até 5 min) — otimista, restaura em caso de erro */
  const recallMessage = useCallback(
    async (id: string) => {
      const snapshot = messages.find(m => m.id === id);
      setMessages(prev => prev.filter(m => m.id !== id));
      await deleteLocalMessage(chatId, id).catch(() => {});
      // Atualiza lastMessage do contato com a mensagem mais recente restante
      const remaining = await loadLocalMessages(chatId).catch(
        () => [] as Message[]
      );
      if (user?.uid) {
        if (remaining.length > 0) {
          const newest = [...remaining].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          updateContactLastMessage(user.uid, contact.id, newest, true).catch(
            () => {}
          );
        } else {
          clearContactLastMessage(user.uid, contact.id).catch(() => {});
        }
      }
      try {
        await messagesApi.recallMessage(
          parseInt(id, 10),
          parseInt(contact.id, 10)
        );
      } catch (err) {
        logger.error(
          '[useChatMessages] Erro ao apagar mensagem:',
          err as Error
        );
        if (snapshot) {
          setMessages(prev => newestFirst([snapshot, ...prev]));
          saveLocalMessages(chatId, [snapshot]).catch(() => {});
          if (user?.uid) {
            updateContactLastMessage(
              user.uid,
              contact.id,
              snapshot,
              true
            ).catch(() => {});
          }
        }
        throw err;
      }
    },
    [chatId, messages, user?.uid, contact.id]
  );

  // Retry em background (WS reconectou, chat ainda aberto) → swap atômico pendente→confirmada
  // Feito aqui com a mensagem já pronta: sem piscar, sem desaparecer.
  useEffect(() => {
    return onPendingMessageConfirmed(
      (confirmedChatId, pendingId, confirmed) => {
        if (confirmedChatId !== chatId) return;
        setMessages(prev => {
          const without = prev.filter(
            m => m.id !== pendingId && m.id !== confirmed.id
          );
          return newestFirst([confirmed as Message, ...without]);
        });
      }
    );
  }, [chatId]);

  /** Limpa todas as mensagens da UI (usar junto com clearLocalMessages) */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    addMessage,
    confirmMessage,
    removeMessage,
    recallMessage,
    clearMessages,
  };
};
