import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { relationshipsApi } from '../../../../services/relationshipsApi';
import { formatDate } from '../../../../utils/dateUtils';
import { User } from '../../types';
import { getStyles } from './styles';
import { i18n } from '../../../../i18n';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { logger } from '../../../../utils/logger';
import { onSendingStateChange } from '../../../../services/pendingMessages';
import { splitEmojis } from '../../../../utils/splitEmojis';
import { EmojiAvatar, PressableButton } from '../../../../components/ui';

interface ContactItemProps {
  item: User;
  navigation: any;
  userId?: string;
  onRelationshipUpdate?: () => void;
}

// Função de comparação separada para o React.memo
const arePropsEqual = (
  prevProps: ContactItemProps,
  nextProps: ContactItemProps
) => {
  const prevContact = prevProps.item;
  const nextContact = nextProps.item;

  if (prevContact.id !== nextContact.id) return false;

  if (
    prevContact.nickname !== nextContact.nickname ||
    prevContact.profileEmoji !== nextContact.profileEmoji ||
    prevContact.relationshipStatus !== nextContact.relationshipStatus ||
    (prevContact as any).deviceName !== (nextContact as any).deviceName
  ) {
    return false;
  }

  const prevMsg = prevContact.lastMessage;
  const nextMsg = nextContact.lastMessage;

  if ((!prevMsg && nextMsg) || (prevMsg && !nextMsg)) return false;

  if (prevMsg && nextMsg) {
    if (prevMsg.emoji !== nextMsg.emoji) return false;
    if (prevMsg.pending !== nextMsg.pending) return false;
    if (prevMsg.senderId !== nextMsg.senderId) return false;

    const prevTime =
      prevMsg.createdAt instanceof Date
        ? prevMsg.createdAt.getTime()
        : new Date(prevMsg.createdAt).getTime();
    const nextTime =
      nextMsg.createdAt instanceof Date
        ? nextMsg.createdAt.getTime()
        : new Date(nextMsg.createdAt).getTime();

    if (prevTime !== nextTime) return false;
  }

  return true;
};

/**
 * Componente otimizado para renderizar cada item de contato.
 * Usa item.profileEmoji e item.nickname diretamente (single source of truth).
 */
const ContactItem = React.memo(
  ({ item, navigation, userId, onRelationshipUpdate }: ContactItemProps) => {
    const { language, languageVersion } = useLanguage();
    const themeColors = useThemeColors();
    const contactItemStyles = useMemo(
      () => getStyles(themeColors),
      [themeColors]
    );

    // ── Relationship status ───────────────────────────────────────────────────
    const isPending = item.relationshipStatus === 'pending';
    const isPendingRequestSentByMe =
      isPending && !!userId && item.initiatedBy === userId;
    const isReceivedByMe = isPending && !!userId && item.initiatedBy !== userId;

    const [isActivelySending, setIsActivelySending] = useState(false);

    useEffect(() => {
      const unsub = onSendingStateChange(sending => {
        setIsActivelySending(sending.has(item.id));
      });
      return unsub;
    }, [item.id]);

    const [actionLoading, setActionLoading] = useState<
      'accept' | 'reject' | null
    >(null);
    const [localStatus, setLocalStatus] = useState<string | undefined>(
      item.relationshipStatus
    );

    useEffect(() => {
      setLocalStatus(item.relationshipStatus);
    }, [item.relationshipStatus]);

    const isLocallyPending = localStatus === 'pending';

    // ── Profile — derived directly from item (no intermediate cache) ──────────
    const isUnavailable = item.profileEmoji === '🚫';
    const displayNickname = isUnavailable
      ? 'Usuário indisponível'
      : item.nickname;
    const displayEmoji = item.profileEmoji;

    // ── Last message — single local mirror kept in sync with item.lastMessage ─
    const [lastMessage, setLastMessage] = useState(item.lastMessage);

    useEffect(() => {
      if (item.lastMessage !== lastMessage) {
        setLastMessage(item.lastMessage);
      }
    }, [item.lastMessage]);

    // ── Accept / Reject handlers ──────────────────────────────────────────────
    const handleAccept = useCallback(async () => {
      if (!item.relationshipId) return;
      setActionLoading('accept');
      try {
        await relationshipsApi.update(parseInt(item.relationshipId), 'accept');
        setLocalStatus('accepted');
        onRelationshipUpdate?.();
      } catch (e) {
        logger.error('[ContactItem] Erro ao aceitar:', e);
      } finally {
        setActionLoading(null);
      }
    }, [item.relationshipId, onRelationshipUpdate]);

    const handleReject = useCallback(async () => {
      if (!item.relationshipId) return;
      setActionLoading('reject');
      try {
        await relationshipsApi.update(parseInt(item.relationshipId), 'reject');
        setLocalStatus('rejected');
        onRelationshipUpdate?.();
      } catch (e) {
        logger.error('[ContactItem] Erro ao recusar:', e);
      } finally {
        setActionLoading(null);
      }
    }, [item.relationshipId, onRelationshipUpdate]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handlePress = useCallback(() => {
      if (isLocallyPending) return;
      navigation.navigate('Chat', {
        contact: {
          ...item,
          nickname: displayNickname,
          profileEmoji: displayEmoji,
          blockedByMe: item.isBlocked ?? false,
          lastInteractionAt:
            item.lastInteractionAt instanceof Date
              ? item.lastInteractionAt.getTime()
              : item.lastInteractionAt,
          lastMessage: lastMessage
            ? {
                ...lastMessage,
                createdAt:
                  lastMessage.createdAt instanceof Date
                    ? lastMessage.createdAt.getTime()
                    : lastMessage.createdAt,
              }
            : null,
        },
      });
    }, [
      navigation,
      item,
      displayNickname,
      displayEmoji,
      lastMessage,
      isLocallyPending,
    ]);

    // ── Derived display values ────────────────────────────────────────────────
    const hasLastMessage = Boolean(
      lastMessage &&
      typeof lastMessage === 'object' &&
      Object.keys(lastMessage).length > 0
    );

    const formattedTime =
      hasLastMessage && lastMessage ? formatDate(lastMessage.createdAt) : '';

    const isLastMsgSentByMe =
      hasLastMessage && !!userId && lastMessage?.senderId === userId;
    const isPendingSent =
      hasLastMessage &&
      lastMessage?.pending === true &&
      lastMessage.senderId !== item.id;

    const statusLabel = useMemo(() => {
      if (!hasLastMessage) return '';
      if (isActivelySending) return i18n.t('chat.sending');
      return formattedTime;
    }, [
      hasLastMessage,
      isActivelySending,
      formattedTime,
      language,
      languageVersion,
    ]);

    // ── Memoized styles ───────────────────────────────────────────────────────
    const avatarStyles = useMemo(
      () => [
        contactItemStyles.avatarEmoji,
        isUnavailable ? { opacity: 0.7 } : null,
      ],
      [isUnavailable, contactItemStyles]
    );

    const nameStyles = useMemo(
      () => [
        contactItemStyles.contactName,
        isUnavailable
          ? { textDecorationLine: 'line-through' as 'line-through' }
          : null,
      ],
      [isUnavailable, contactItemStyles]
    );

    const deviceName = !isUnavailable
      ? ((item as any).deviceName as string | undefined)
      : undefined;

    const contentKey = useMemo(
      () =>
        `${item.id}-${displayNickname}-${deviceName ?? ''}-${displayEmoji}-${localStatus}-${
          lastMessage
            ? `${lastMessage.emoji}-${lastMessage.pending ? 'pending' : 'sent'}-${lastMessage.senderId}`
            : 'no-message'
        }-${isLastMsgSentByMe}-${language}-${languageVersion}`,
      [
        item.id,
        displayNickname,
        deviceName,
        displayEmoji,
        lastMessage,
        localStatus,
        isLastMsgSentByMe,
        language,
        languageVersion,
      ]
    );

    const renderedContent = useMemo(
      () => (
        <View
          style={[
            contactItemStyles.contactItemContent,
            isLocallyPending && contactItemStyles.pendingRow,
          ]}
        >
          {/* Avatar */}
          <EmojiAvatar
            emoji={displayEmoji}
            containerSize={50}
            fontSize={42}
            style={contactItemStyles.avatarContainer}
            textStyle={[avatarStyles, isLocallyPending && { opacity: 0.6 }]}
          />

          {/* Nick + horário */}
          <View style={contactItemStyles.contactInfo}>
            <Text style={nameStyles} numberOfLines={1} ellipsizeMode='tail'>
              {displayNickname}
            </Text>
            {!isLocallyPending && (
              <Text style={contactItemStyles.timeText}>{statusLabel}</Text>
            )}

            {isLocallyPending && isPendingRequestSentByMe && (
              <Text style={contactItemStyles.pendingSentLabel}>
                ⏳ Aguardando resposta...
              </Text>
            )}

            {isLocallyPending && isReceivedByMe && (
              <View style={contactItemStyles.pendingActionsRow}>
                <PressableButton
                  style={contactItemStyles.acceptButton}
                  onPress={handleAccept}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'accept' ? (
                    <ActivityIndicator size='small' color='#fff' />
                  ) : (
                    <Text style={contactItemStyles.acceptButtonText}>
                      ✓ Aceitar
                    </Text>
                  )}
                </PressableButton>
                <PressableButton
                  style={contactItemStyles.rejectButton}
                  onPress={handleReject}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'reject' ? (
                    <ActivityIndicator size='small' color='#fff' />
                  ) : (
                    <Text style={contactItemStyles.rejectButtonText}>
                      ✗ Recusar
                    </Text>
                  )}
                </PressableButton>
              </View>
            )}
          </View>

          {/* Balão com rabixo e emoji na ponta */}
          {!isLocallyPending &&
            lastMessage &&
            (() => {
              const msgEmoji =
                typeof lastMessage.emoji === 'string' &&
                lastMessage.emoji.trim()
                  ? lastMessage.emoji
                  : '…';
              const msgEmojiList = splitEmojis(msgEmoji);
              // Emoji do remetente (perfil ou chat customizado) na ponta do rabixo
              const tipEmoji = lastMessage.senderEmoji ?? '';

              const emojiContent = msgEmojiList.map((char, i) => (
                <View key={i} style={contactItemStyles.bubbleEmojiWrapper}>
                  <Text style={contactItemStyles.bubbleEmoji} numberOfLines={1}>
                    {char}
                  </Text>
                </View>
              ));

              return isLastMsgSentByMe ? (
                <View style={contactItemStyles.bubbleSentRow}>
                  {tipEmoji ? (
                    <Text style={contactItemStyles.tailEmojiLeft}>
                      {tipEmoji}
                    </Text>
                  ) : null}
                  <View style={contactItemStyles.tailLeft} />
                  <View
                    style={[
                      contactItemStyles.bubble,
                      contactItemStyles.bubbleSent,
                      isPendingSent && contactItemStyles.bubblePending,
                    ]}
                  >
                    {emojiContent}
                  </View>
                </View>
              ) : (
                <View style={contactItemStyles.bubbleReceivedRow}>
                  <View
                    style={[
                      contactItemStyles.bubble,
                      contactItemStyles.bubbleReceived,
                    ]}
                  >
                    {emojiContent}
                  </View>
                  <View style={contactItemStyles.tailRight} />
                  {tipEmoji ? (
                    <Text style={contactItemStyles.tailEmojiRight}>
                      {tipEmoji}
                    </Text>
                  ) : null}
                </View>
              );
            })()}
        </View>
      ),
      [
        contentKey,
        contactItemStyles,
        avatarStyles,
        nameStyles,
        statusLabel,
        displayEmoji,
        displayNickname,
        lastMessage,
        isLastMsgSentByMe,
        isPendingSent,
        language,
        languageVersion,
        isLocallyPending,
        isPendingRequestSentByMe,
        isReceivedByMe,
        actionLoading,
        handleAccept,
        handleReject,
      ]
    );

    return (
      <TouchableRipple
        onPress={handlePress}
        style={contactItemStyles.contactItem}
        testID={`contact-${item.id}`}
      >
        {renderedContent}
      </TouchableRipple>
    );
  },
  arePropsEqual
);

export default ContactItem;
