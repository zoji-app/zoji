/**
 * useWsEvents — conecta eventos WebSocket ao estado local do app.
 *
 * Montado uma única vez dentro de AppNavigator (acesso ao useAuth).
 *
 * profile.updated → storage + ContactsManager in-memory; UI atualizada via wsService.on direto em useContacts
 * message.new     → storage + ContactsManager via updateContactLastMessage
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { wsService } from '../services/wsService';
import {
  updateContactData,
  updateContactLastMessage,
  applyLastMessageUpdatesBatch,
  clearContactLastMessage,
  loadContactsFromStorage,
  Message,
} from '../services/contacts';
import {
  deleteLocalMessage,
  loadLocalMessages,
} from '../services/localMessages';
import ContactsManagerInstance from '../services/ContactsManager';
import {
  checkAndResendAllPendingMessages,
  syncPendingMessagesToContactsList,
} from '../services/pendingMessages';
import { logger } from '../utils/logger';
import { statusApi } from '../services/statusApi';
import { syncWidgetStatus } from '../services/widgetService';
import { updateStreak, toLocalDateString } from '../services/streakService';

export function useWsEvents(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    const userId = user.uid;

    // ── message.new: buffer de curta duração ──────────────────────────────────
    // sync.last_messages (polling de 30s + reconexão) pode reenviar o último
    // recado de TODAS as conversas de uma vez via uma rajada de eventos
    // message.new. Persistir cada um individualmente (load+save completo por
    // contato) é O(n²) com muitas conversas. Agrupamos numa janela curta e
    // aplicamos tudo de uma vez com applyLastMessageUpdatesBatch.
    const pendingMessageUpdates = new Map<
      string,
      { contactId: string; lastMessage: Partial<Message> }
    >();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const FLUSH_DELAY_MS = 150;

    const flushMessageUpdates = () => {
      flushTimer = null;
      if (pendingMessageUpdates.size === 0) return;
      const updates = Array.from(pendingMessageUpdates.values());
      pendingMessageUpdates.clear();

      (updates.length === 1
        ? updateContactLastMessage(
            userId,
            updates[0].contactId,
            updates[0].lastMessage,
            true
          )
        : applyLastMessageUpdatesBatch(userId, updates, true)
      ).catch(e =>
        logger.error(
          '[WsEvents] Erro ao aplicar atualizações de última mensagem:',
          e as Error
        )
      );
    };

    const scheduleMessageUpdateFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(flushMessageUpdates, FLUSH_DELAY_MS);
    };

    // ── profile.updated ────────────────────────────────────────────────────────
    // Payload: { user_id, nickname, profile_emoji }
    // A UI (useContacts) escuta este evento diretamente no wsService.
    // Aqui apenas persistimos no storage e atualizamos o in-memory do ContactsManager.
    const unsubProfile = wsService.on('profile.updated', async payload => {
      if (!payload?.user_id) return;
      const contactId = String(payload.user_id);

      try {
        const updates = {
          nickname: payload.nickname as string | undefined,
          profileEmoji: payload.profile_emoji as string | undefined,
        };

        await updateContactData(userId, contactId, updates);

        // Atualiza o Map in-memory do CM diretamente, sem emitir eventos.
        // O estado React já foi atualizado pelo listener direto no useContacts.
        // Emitir via updateContact() pode disparar loadContacts() em paralelo,
        // causando race condition que reverte o emoji para o valor anterior.
        const existing = ContactsManagerInstance.getContact(contactId);
        if (existing) {
          ContactsManagerInstance.updateContact(contactId, {
            ...updates,
            _forceUpdate: false,
          } as any);
        }
      } catch (e) {
        logger.error('[WsEvents] Erro ao atualizar perfil via WS:', e as Error);
      }
    });

    // ── message.new ────────────────────────────────────────────────────────────
    // Payload: { id, sender_id, receiver_id, emoji, created_at, contact_id? }
    // contact_id presente quando vier de sync.last_messages (pode ser sender ou receiver)
    const unsubMessage = wsService.on('message.new', async payload => {
      if (!payload?.sender_id) return;
      const senderId = String(payload.sender_id);
      // contact_id identifica explicitamente o outro lado da conversa
      const contactId = payload.contact_id
        ? String(payload.contact_id)
        : senderId;

      try {
        // When sender_emoji is absent, fall back to the contact's profile emoji for received messages.
        // For messages sent by the user (from sync.last_messages), leave empty rather than risk
        // showing the wrong emoji — useChatSender always persists senderEmoji on outgoing messages.
        const contactEntry = ContactsManagerInstance.getContact(contactId);
        const fallbackEmoji =
          senderId !== userId ? (contactEntry?.profileEmoji ?? '') : '';
        pendingMessageUpdates.set(contactId, {
          contactId,
          lastMessage: {
            id: String(payload.id),
            emoji: payload.emoji,
            senderId,
            senderEmoji: payload.sender_emoji || fallbackEmoji,
            createdAt: new Date(payload.created_at),
            pending: false,
            delivered: true,
          },
        });
        scheduleMessageUpdateFlush();

        // Ofensiva (streak) — useChatSender/useChatMessages só contam quando a
        // tela do Chat daquele contato está aberta na hora certa. Isso cobre o
        // resto: mensagem enviada por fora do app (MCP, outro device) ou
        // recebida com o chat fechado. Só conta se for de hoje — sync.last_messages
        // pode reenviar mensagem antiga ao reconectar, e isso não deve mexer na
        // sequência (updateStreak já é idempotente por dia, sem risco de duplicar
        // quando a tela também estiver aberta e contar pelo caminho de sempre).
        const messageDate = new Date(payload.created_at);
        if (toLocalDateString(messageDate) === toLocalDateString(new Date())) {
          updateStreak(userId, contactId, messageDate).catch(() => {});
        }
      } catch (e) {
        logger.error(
          '[WsEvents] Erro ao atualizar última mensagem via WS:',
          e as Error
        );
      }
    });

    // ── message.deleted ────────────────────────────────────────────────────────
    // Payload: { message_id, sender_id }
    // Executado quando o chat do destinatário está fechado; quando aberto, useChatMessages cuida disso.
    const unsubDeleted = wsService.on(
      'message.deleted',
      async (payload: any) => {
        if (!payload?.message_id || !payload?.sender_id) return;
        const msgId = String(payload.message_id);
        const contactId = String(payload.sender_id);
        const chatId = [userId, contactId].sort().join('_');

        try {
          await deleteLocalMessage(chatId, msgId);
          const remaining = await loadLocalMessages(chatId);
          if (remaining.length > 0) {
            const newest = [...remaining].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0];
            await updateContactLastMessage(userId, contactId, newest, true);
          } else {
            await clearContactLastMessage(userId, contactId);
          }
        } catch (e) {
          logger.error(
            '[WsEvents] Erro ao processar message.deleted:',
            e as Error
          );
        }
      }
    );

    // ── startup: sync pending messages to contacts list ───────────────────────
    syncPendingMessagesToContactsList(userId).catch(() => {});

    // ── reconnect: retry pending messages + sync últimas mensagens ───────────
    const unsubStatus = wsService.on('__ws_status', async (payload: any) => {
      if (payload?.status !== 'connected') return;
      try {
        const contacts = await loadContactsFromStorage(userId);
        if (contacts.length === 0) return;
        logger.debug(
          '[WsEvents] Reconectado — verificando mensagens pendentes'
        );
        await checkAndResendAllPendingMessages(userId, contacts);
      } catch (e) {
        logger.error(
          '[WsEvents] Erro ao reenviar pendentes após reconexão:',
          e as Error
        );
      }
      wsService.send('sync.last_messages');
      logger.debug('[WsEvents] Reconectado — sync.last_messages enviado');
    });

    // ── status.updated — atualiza widget imediatamente, independente da tela ──
    // StatusStrip só existe na tela Friends; este listener garante que o widget
    // seja atualizado mesmo quando o usuário está em outra tela.
    const unsubStatusWidget = wsService.on('status.updated', async () => {
      try {
        const data = await statusApi.getFriends();
        syncWidgetStatus(data.own, data.friends);
      } catch {}
    });

    // ── Polling de 30s — sync.last_messages via WS ou força reconexão ────────
    const pollInterval = setInterval(() => {
      if (wsService.isConnected) {
        wsService.send('sync.last_messages');
      } else {
        // WS desconectado: tenta reconectar para que sync.last_messages rode no onConnect
        wsService.connect();
      }
    }, 30000);

    return () => {
      unsubProfile();
      unsubMessage();
      unsubDeleted();
      unsubStatus();
      unsubStatusWidget();
      clearInterval(pollInterval);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [user?.uid]);
}
