import { useState, useCallback } from 'react';
import { AuthUser } from '../services/authApi';
import { messagesApi } from '../services/messagesApi';
import { logger } from '../utils/logger';
import { Message, Contact, apiMessageToMessage } from './useChatMessages';
import {
  getEmojiBlocklist,
  findBlockedSequence,
} from '../services/emojiBlocklist';

interface UseChatSenderProps {
  user: AuthUser | null;
  contact: Contact;
  userProfile?: any;
  contactProfile?: any;
  senderEmojiOverride?: string;
  onMessageSent: (message: Message) => void;
  onMessageConfirmed: (pendingId: string, confirmed: Message) => void;
  onBlockedEmoji?: (emoji: string) => void;
  onConsentRequired?: () => void;
  onBlockedByContact?: (pendingId: string) => void;
  onStreakMessage?: (date: Date) => void;
}

export const useChatSender = ({
  user,
  contact,
  userProfile,
  senderEmojiOverride,
  onMessageSent,
  onMessageConfirmed,
  onBlockedEmoji,
  onConsentRequired,
  onBlockedByContact,
  onStreakMessage,
}: UseChatSenderProps) => {
  const [isSending, setIsSending] = useState(false);

  const canSendMessage = !!user && !!contact?.id;

  const sendEmojiMessage = useCallback(
    async (selectedEmojis: string[]) => {
      if (!user || selectedEmojis.length === 0 || isSending) return false;

      const blocklist = await getEmojiBlocklist();
      const joined = selectedEmojis.join('');
      const blocked = findBlockedSequence(joined, blocklist, 'messages');
      if (blocked) {
        onBlockedEmoji?.(blocked);
        return false;
      }

      setIsSending(true);

      const senderEmoji =
        senderEmojiOverride ||
        userProfile?.profileEmoji ||
        userProfile?.profile_emoji ||
        '😊';
      const receiverIdNum = parseInt(contact.id, 10);
      const emojiString = selectedEmojis.join('');

      // Mensagem otimista (pending) exibida imediatamente
      const optimistic: Message = {
        id: `pending_${Date.now()}_${Math.random()}`,
        emoji: emojiString,
        senderId: user.uid,
        receiverId: contact.id,
        chatId: [user.uid, contact.id].sort().join('_'),
        senderEmoji,
        createdAt: new Date(),
        pending: true,
        delivered: false,
      };
      onMessageSent(optimistic);

      try {
        const apiMsg = await messagesApi.send(
          receiverIdNum,
          emojiString,
          senderEmoji
        );
        logger.debug('[ChatSender] Mensagem enviada:', apiMsg.id);

        // Substituir pending pela mensagem confirmada (com id real do banco)
        const confirmed = apiMessageToMessage(apiMsg, senderEmoji);
        onMessageConfirmed(optimistic.id, confirmed);
        onStreakMessage?.(confirmed.createdAt);

        return true;
      } catch (err: any) {
        const apiError = err?.response?.data?.error;
        if (apiError === 'consent_required') {
          onConsentRequired?.();
        } else if (err?.response?.status === 403) {
          onBlockedByContact?.(optimistic.id);
        } else {
          logger.error('[ChatSender] Erro ao enviar mensagem:', err);
        }
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [
      user,
      contact,
      userProfile,
      senderEmojiOverride,
      isSending,
      onMessageSent,
      onMessageConfirmed,
      onBlockedEmoji,
      onConsentRequired,
      onBlockedByContact,
      onStreakMessage,
    ]
  );

  return { sendEmojiMessage, isSending, canSendMessage };
};
