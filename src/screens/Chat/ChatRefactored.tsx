import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Menu } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RetryBanner } from '../../components/RetryBanner';
import { BotIntroBanner } from '../../components/BotIntroBanner';
import { EmojiKeyboardIOS } from '../../components/EmojiKeyboardIOS';
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { useAuth } from '../../contexts/AuthContext';
import { useChatMessages, Message, Contact } from '../../hooks/useChatMessages';
import { useChatSender } from '../../hooks/useChatSender';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';
import { AppButton, EmojiAvatar, PressableButton } from '../../components/ui';
import { i18n } from '../../i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { logger } from '../../utils/logger';
import {
  removeContact,
  updateContactData,
  loadContactsFromStorage,
  saveContactsToStorage,
  clearContactLastMessage,
} from '../../services/contacts';
import { getChatEmoji, setChatEmoji } from '../../services/localMessages';
import { relationshipsApi } from '../../services/relationshipsApi';
import { checkAndResendPendingMessagesForContact } from '../../services/pendingMessages';
import { clearLocalMessages } from '../../services/localMessages';
import { messagesApi } from '../../services/messagesApi';
import { contactsApi } from '../../services/contactsApi';
import { wsService } from '../../services/wsService';
import { reportUser } from '../../services/reportsApi';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';
import {
  getEmojiBlocklist,
  findBlockedSequence,
  BlockedEntry,
} from '../../services/emojiBlocklist';
import { splitEmojis } from '../../utils/splitEmojis';
import { useStreak } from '../../hooks/useStreak';
import { FlameStreak } from '../../components/FlameStreak';
import { Ionicons } from '@expo/vector-icons';

const MAX_EMOJIS = 4;

type RootStackParamList = {
  Chat: { contact: Contact; returnToMain?: boolean };
  MainApp: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const formatDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString())
    return i18n.t('common.today');
  if (date.toDateString() === yesterday.toDateString())
    return i18n.t('common.yesterday');
  return date.toLocaleDateString();
};

interface EmojiObject {
  emoji: string;
  name: string;
  slug: string;
  unicode_version: string;
}

export const ChatRefactored: React.FC<Props> = ({ route, navigation }) => {
  const { contact: initialContact } = route.params;
  const { user } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const filteredMessageEmojis = useFilteredEmojis('messages');
  const filteredChatEmojis = useFilteredEmojis('profile');

  const [contact, setContact] = useState<Contact>(initialContact);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<(string | null)[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [contactRemoved, setContactRemoved] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(
    initialContact.blockedByMe ?? (initialContact as any).isBlocked ?? false
  );
  const [blockedByContact, setBlockedByContact] = useState(
    initialContact.blockedByContact ?? false
  );
  const [blockStatusLoaded, setBlockStatusLoaded] = useState(true);
  const chatId = [user?.uid ?? '', contact.id].sort().join('_');
  const globalEmoji = user?.profile_emoji ?? '😊';
  const [chatEmoji, setChatEmojiState] = useState(globalEmoji);
  const [isChatEmojiPickerVisible, setIsChatEmojiPickerVisible] =
    useState(false);

  const [isContactTyping, setIsContactTyping] = useState(false);
  const [isContactDeleted, setIsContactDeleted] = useState(
    initialContact.isDeleted === true
  );

  // Tick a cada minuto para reavaliar quais mensagens ainda estão dentro do prazo de exclusão
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const blocklistRef = useRef<BlockedEntry[]>([]);
  const selectedEmojisRef = useRef<(string | null)[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPulse = useRef(new Animated.Value(1)).current;
  // Always-current ref so fetchProfile can compare without stale closure
  const contactRef = useRef<Contact>(initialContact);
  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  useEffect(() => {
    getEmojiBlocklist().then(entries => {
      blocklistRef.current = entries;
    });
  }, []);

  // Garante que o contato esteja no contacts storage antes de qualquer mensagem.
  // Necessário quando o chat é aberto pela primeira vez via AddContact,
  // antes de syncContactsStorage ter rodado na tela de Conversas.
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const contacts = await loadContactsFromStorage(user.uid);
      if (!contacts.find(c => c.id === contact.id)) {
        await saveContactsToStorage(user.uid, [
          ...contacts,
          {
            id: contact.id,
            nickname: contact.nickname,
            profileEmoji: contact.profileEmoji ?? '👤',
            phoneNumber: '',
            lastMessage: null,
          },
        ]);
      }
    })();
  }, [user?.uid, contact.id]);

  // ── Perfil do contato: busca imediata + WS instantâneo + polling de 30s ──────
  useEffect(() => {
    if (!user?.uid || !contact.id) return;
    const contactId = contact.id;

    const refreshProfile = async () => {
      try {
        const p = await contactsApi.getProfile(contactId);
        const isSystemBot = p.is_system_bot === true;
        setContact(c => {
          if (
            c.nickname === p.nickname &&
            c.profileEmoji === p.profile_emoji &&
            c.isSystemBot === isSystemBot
          )
            return c;
          return {
            ...c,
            nickname: p.nickname,
            profileEmoji: p.profile_emoji,
            isSystemBot,
          };
        });
      } catch {}
    };

    // Busca imediata ao abrir o chat — garante dados frescos sem esperar evento
    refreshProfile();

    // WS: atualização instantânea quando disponível
    const unsubWs = wsService.on('profile.updated', (payload: any) => {
      if (!payload?.user_id || String(payload.user_id) !== contactId) return;
      setContact(c => {
        const newNickname = payload.nickname || c.nickname;
        const newEmoji = payload.profile_emoji || c.profileEmoji;
        if (c.nickname === newNickname && c.profileEmoji === newEmoji) return c;
        return { ...c, nickname: newNickname, profileEmoji: newEmoji };
      });
    });

    // WS: conta deletada em tempo real
    const unsubDeleted = wsService.on('account.deleted', (payload: any) => {
      if (String(payload?.user_id) !== contactId) return;
      setIsContactDeleted(true);
    });

    // Polling de 30s como fallback quando WS não entrega
    const pollId = setInterval(refreshProfile, 30000);

    return () => {
      unsubWs();
      unsubDeleted();
      clearInterval(pollId);
    };
  }, [user?.uid, contact.id]);

  // ── Chat emoji personalizado ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    getChatEmoji(user.uid, chatId).then(saved => {
      if (saved) setChatEmojiState(saved);
    });
  }, [user?.uid, chatId]);

  // ── Block status ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !contact.id) return;

    const checkBlockStatus = async () => {
      try {
        const status = await contactsApi.blockStatus(contact.id);
        setBlockedByMe(status.blocked_by_me);
        setBlockedByContact(status.blocked_by_them);
      } catch {
        // Mantém estado inicial em caso de falha
      } finally {
        setBlockStatusLoaded(true);
      }
    };

    checkBlockStatus();
  }, [user?.uid, contact.id]);

  // ── Enviar typing.start / typing.stop quando o teclado de emojis abre/fecha ──
  // Reenvia typing.start a cada 5s enquanto o teclado estiver aberto para que o
  // timeout de 10s do outro lado não expire enquanto o contato ainda está digitando.
  useEffect(() => {
    const targetId = parseInt(contact.id, 10);
    if (!targetId || !isEmojiPickerVisible) return;

    wsService.send('typing.start', { to: targetId });
    const interval = setInterval(() => {
      wsService.send('typing.start', { to: targetId });
    }, 5000);

    return () => {
      clearInterval(interval);
      wsService.send('typing.stop', { to: targetId });
    };
  }, [isEmojiPickerVisible, contact.id]);

  // ── Receber typing events do contato ─────────────────────────────────────────
  useEffect(() => {
    const resetTimeout = () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => setIsContactTyping(false),
        10000
      );
    };

    const unsubStart = wsService.on('typing.start', (payload: any) => {
      if (String(payload?.from) !== contact.id) return;
      setIsContactTyping(true);
      resetTimeout();
    });

    const unsubStop = wsService.on('typing.stop', (payload: any) => {
      if (String(payload?.from) !== contact.id) return;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsContactTyping(false);
    });

    return () => {
      unsubStart();
      unsubStop();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [contact.id]);

  // ── Animação de pulso no badge 💭 ─────────────────────────────────────────────
  useEffect(() => {
    if (!isContactTyping) {
      typingPulse.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(typingPulse, {
          toValue: 1.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(typingPulse, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isContactTyping, typingPulse]);

  const {
    streakData,
    streakState,
    pendingMilestone,
    onNewMessage,
    dismissMilestone,
  } = useStreak(user?.uid ?? null, contact.id);

  const {
    messages,
    isLoading,
    addMessage,
    confirmMessage,
    removeMessage,
    recallMessage,
    clearMessages,
  } = useChatMessages({
    user,
    contact,
    userProfile: user,
    senderEmojiOverride: chatEmoji !== globalEmoji ? chatEmoji : undefined,
    onStreakMessage: onNewMessage,
  });

  const { sendEmojiMessage, isSending, canSendMessage } = useChatSender({
    user,
    contact,
    userProfile: user,
    senderEmojiOverride: chatEmoji !== globalEmoji ? chatEmoji : undefined,
    contactProfile: {
      nickname: contact.nickname,
      profileEmoji: contact.profileEmoji,
    },
    onMessageSent: addMessage,
    onMessageConfirmed: confirmMessage,
    onBlockedEmoji: emoji => {
      addToast('error', i18n.t('chat.emojiBlocked', { emoji }));
    },
    onConsentRequired: () => {
      addToast('warning', i18n.t('chat.consentRequired'));
    },
    onBlockedByContact: (pendingId: string) => {
      removeMessage(pendingId);
      setBlockedByContact(true);
    },
    onStreakMessage: onNewMessage,
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    }
  }, [messages.length]);

  const handleEmojiSelected = useCallback(
    (emojiObj: EmojiObject) => {
      const prev = selectedEmojisRef.current;
      // Encontra o primeiro slot vazio (null ou além do tamanho atual)
      let slotIndex = -1;
      for (let i = 0; i < MAX_EMOJIS; i++) {
        if (!prev[i]) {
          slotIndex = i;
          break;
        }
      }
      if (slotIndex === -1) return; // todos os slots preenchidos
      const next: (string | null)[] = Array.from(
        { length: MAX_EMOJIS },
        (_, i) => prev[i] ?? null
      );
      next[slotIndex] = emojiObj.emoji;
      const sequence = next.filter(Boolean).join('');
      const blocked = findBlockedSequence(
        sequence,
        blocklistRef.current,
        'messages'
      );
      if (blocked) {
        addToast('error', i18n.t('chat.emojiBlocked', { emoji: blocked }));
        return;
      }
      selectedEmojisRef.current = next;
      setSelectedEmojis(next);
    },
    [addToast]
  );

  const removeEmoji = useCallback((index: number) => {
    const next: (string | null)[] = [...selectedEmojisRef.current];
    next[index] = null;
    selectedEmojisRef.current = next;
    setSelectedEmojis(next);
  }, []);

  const handleTapSingleEmoji = useCallback(
    (emoji: string) => {
      handleEmojiSelected({ emoji, name: '', slug: '', unicode_version: '' });
    },
    [handleEmojiSelected]
  );

  const handleSendMessage = useCallback(async () => {
    const toSend = selectedEmojis.filter((e): e is string => !!e);
    if (toSend.length === 0 || !canSendMessage || isSending) return;

    selectedEmojisRef.current = [];
    setSelectedEmojis([]);
    setIsEmojiPickerVisible(false);

    await sendEmojiMessage(toSend);
  }, [selectedEmojis, canSendMessage, isSending, sendEmojiMessage, addToast]);

  const handleClearChat = useCallback(() => {
    Alert.alert(
      i18n.t('chat.clearChatTitle'),
      i18n.t('chat.clearChatMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('chat.clearChat'),
          style: 'destructive',
          onPress: async () => {
            try {
              const contactIdNum = parseInt(contact.id, 10);
              const chatId = [user?.uid ?? '', contact.id].sort().join('_');
              await messagesApi.deleteConversation(contactIdNum);
              await clearLocalMessages(chatId);
              if (user?.uid) {
                await clearContactLastMessage(user.uid, contact.id);
                // Conta deletada: remove o contato da lista de conversas
                if (isContactDeleted) {
                  await removeContact(user.uid, contact.id);
                }
              }
              clearMessages();
              navigation.goBack();
            } catch (error) {
              logger.error('[Chat] Erro ao limpar conversa:', error as Error);
              addToast(
                'error',
                i18n.t('individualChat.errorClearingChat'),
                i18n.t('common.error')
              );
            }
          },
        },
      ]
    );
  }, [user, contact, navigation, addToast]);

  const handleBlockContact = useCallback(() => {
    Alert.alert(
      i18n.t('chat.blockContactTitle'),
      i18n.t('chat.blockContactMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('chat.blockContact'),
          style: 'destructive',
          onPress: async () => {
            try {
              await contactsApi.block(contact.id);
              if (user?.uid)
                await clearContactLastMessage(user.uid, contact.id);
              setBlockedByMe(true);
              addToast(
                'success',
                i18n.t('chat.contactBlocked'),
                i18n.t('common.success')
              );
              navigation.goBack();
            } catch (error) {
              logger.error('[Chat] Erro ao bloquear contato:', error as Error);
              addToast(
                'error',
                i18n.t('chat.blockError'),
                i18n.t('common.error')
              );
            }
          },
        },
      ]
    );
  }, [contact, navigation, addToast]);

  const handleUnblockContact = useCallback(() => {
    Alert.alert(
      i18n.t('chat.unblockContact'),
      i18n.t('chat.unblockContactMessage', {
        name: `${contact.profileEmoji} ${contact.nickname}`,
      }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('chat.unblockContact'),
          onPress: async () => {
            try {
              await contactsApi.unblock(contact.id);
              setBlockedByMe(false);
              addToast(
                'success',
                i18n.t('chat.contactUnblocked'),
                i18n.t('common.success')
              );
              checkAndResendPendingMessagesForContact(
                user?.uid ?? '',
                contact.id
              ).catch(() => {});
            } catch (error) {
              logger.error('[Chat] Erro ao desbloquear:', error as Error);
              addToast(
                'error',
                i18n.t('chat.unblockError'),
                i18n.t('common.error')
              );
            }
          },
        },
      ]
    );
  }, [contact, user?.uid, addToast]);

  const handleReportContact = useCallback(() => {
    Alert.alert(
      i18n.t('chat.reportContactTitle'),
      `${contact.profileEmoji} ${contact.nickname}`,
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('chat.reportReasonSpam'),
          onPress: () => submitReport('spam'),
        },
        {
          text: i18n.t('chat.reportReasonHarassment'),
          onPress: () => submitReport('harassment'),
        },
        {
          text: i18n.t('chat.reportReasonInappropriate'),
          onPress: () => submitReport('inappropriate_content'),
        },
      ]
    );

    async function submitReport(reason: string) {
      try {
        await reportUser(Number(contact.id), reason);
        setBlockedByMe(true);
        addToast('success', i18n.t('chat.reportSent'));
      } catch {
        addToast('error', i18n.t('chat.reportError'));
      }
    }
  }, [contact, addToast]);

  const handleChatEmojiSelect = useCallback(
    async (emojiObj: EmojiObject) => {
      if (!user?.uid) return;
      const emoji = emojiObj.emoji;
      setChatEmojiState(emoji);
      await setChatEmoji(user.uid, chatId, emoji);
      setIsChatEmojiPickerVisible(false);
    },
    [user?.uid, chatId]
  );

  const handleResetChatEmoji = useCallback(async () => {
    if (!user?.uid) return;
    setChatEmojiState(globalEmoji);
    await setChatEmoji(user.uid, chatId, null);
    setIsChatEmojiPickerVisible(false);
  }, [user?.uid, chatId, globalEmoji]);

  // ─── Floating date pill ───────────────────────────────────────────────────

  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const hideFloatingDateRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!viewableItems.length) return;
    let oldest = viewableItems[0].item as Message;
    for (const vi of viewableItems) {
      if (
        new Date((vi.item as Message).createdAt) < new Date(oldest.createdAt)
      ) {
        oldest = vi.item;
      }
    }
    setFloatingDate(formatDateLabel(new Date(oldest.createdAt)));
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    if (hideFloatingDateRef.current) clearTimeout(hideFloatingDateRef.current);
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (hideFloatingDateRef.current) clearTimeout(hideFloatingDateRef.current);
    hideFloatingDateRef.current = setTimeout(() => setFloatingDate(null), 1500);
  }, []);

  // ─── Date separator helpers ───────────────────────────────────────────────

  const shouldShowDateSeparator = (
    current: Message,
    next: Message | undefined
  ) => {
    if (!next) return true;
    return (
      new Date(current.createdAt).toDateString() !==
      new Date(next.createdAt).toDateString()
    );
  };

  const formatDate = formatDateLabel;

  // ─── Render message item ──────────────────────────────────────────────────

  const renderMessage = ({
    item: message,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isFromUser = message.senderId === user?.uid;
    const showSeparator = shouldShowDateSeparator(message, messages[index + 1]);
    const canDelete =
      isFromUser &&
      !message.pending &&
      Date.now() - new Date(message.createdAt).getTime() < 5 * 60 * 1000;

    return (
      <View>
        {showSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>
              {formatDate(new Date(message.createdAt))}
            </Text>
            <View style={styles.dateLine} />
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isFromUser ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {/* Avatar do remetente — usa o emoji histórico gravado na mensagem */}
          <EmojiAvatar
            emoji={message.senderEmoji}
            containerSize={36}
            fontSize={24}
            style={styles.senderContainer}
            textStyle={styles.senderEmoji}
          />

          <View style={styles.messageWrapper}>
            <View style={canDelete ? styles.bubbleRow : undefined}>
              {canDelete && (
                <TouchableOpacity
                  style={styles.recallButton}
                  onPress={() =>
                    recallMessage(message.id).catch(() =>
                      addToast('error', i18n.t('chat.recallError'))
                    )
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name='trash-outline'
                    size={18}
                    color={colors.error}
                  />
                </TouchableOpacity>
              )}
              <View
                style={[
                  styles.messageContent,
                  isFromUser
                    ? styles.myMessageContent
                    : styles.otherMessageContent,
                  message.pending && styles.pendingMessageContent,
                ]}
              >
                <View style={styles.emojiRow}>
                  {splitEmojis(message.emoji).map((char, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.5}
                      onPress={() => handleTapSingleEmoji(char)}
                    >
                      <View style={styles.emojiWrapper}>
                        <Text
                          style={[
                            styles.emoji,
                            message.pending && styles.pendingEmoji,
                          ]}
                          numberOfLines={1}
                        >
                          {char}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.timeText,
                isFromUser ? styles.timeRight : styles.timeLeft,
                message.pending && styles.pendingTimeText,
              ]}
            >
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {message.pending ? ' ⏳' : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── Removed contact screen ───────────────────────────────────────────────

  if (contactRemoved) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.removedContainer}>
          <Text style={styles.removedText}>
            {i18n.t('chat.contactRemoved')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <RetryBanner />
      {contact.isSystemBot && <BotIntroBanner />}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon='arrow-left'
              size={24}
              iconColor={colors.primary700}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            />
            <View style={styles.headerEmojiWrapper}>
              <Text style={styles.headerEmoji}>{contact.profileEmoji}</Text>
              {isContactTyping && (
                <Animated.Text
                  style={[
                    styles.typingBadge,
                    { transform: [{ scale: typingPulse }] },
                  ]}
                >
                  💭
                </Animated.Text>
              )}
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {contact.nickname}
              </Text>
              {contact.deviceName ? (
                <Text style={styles.headerDeviceName} numberOfLines={1}>
                  {contact.deviceName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.headerRight}>
            <FlameStreak
              streakData={streakData}
              streakState={streakState}
              pendingMilestone={pendingMilestone}
              onMilestoneDismiss={dismissMilestone}
              size={30}
              style={{ marginRight: 8, marginTop: 10 }}
            />
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon='dots-vertical'
                  size={24}
                  iconColor={colors.primary700}
                  style={styles.menuButton}
                  onPress={() => setMenuVisible(true)}
                />
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  handleClearChat();
                }}
                title={i18n.t('chat.clearChat')}
                leadingIcon='broom'
              />
              {blockedByMe ? (
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleUnblockContact();
                  }}
                  title={i18n.t('chat.unblockContact')}
                  leadingIcon='block-helper'
                />
              ) : (
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleBlockContact();
                  }}
                  title={i18n.t('chat.blockContact')}
                  leadingIcon='block-helper'
                />
              )}
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  handleReportContact();
                }}
                title={i18n.t('chat.reportContact')}
                leadingIcon='flag-outline'
              />
            </Menu>
          </View>
        </View>

        {/* ── Messages ── */}
        <View style={styles.messagesWrapper}>
          {floatingDate && (
            <View style={styles.floatingDateContainer} pointerEvents='none'>
              <View style={styles.floatingDatePill}>
                <Text style={styles.floatingDateText}>{floatingDate}</Text>
              </View>
            </View>
          )}
          {isLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color={colors.primary700} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              extraData={minuteTick}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesList}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              onScrollBeginDrag={handleScrollBeginDrag}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={handleScrollEnd}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>
                    {i18n.t('chat.noMessages')}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* ── Footer ── */}
        {isContactDeleted && (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedBannerText}>
              {i18n.t('chat.accountDeleted')}
            </Text>
          </View>
        )}
        {!isContactDeleted &&
          blockStatusLoaded &&
          (blockedByContact || blockedByMe) && (
            <View style={styles.blockedBanner}>
              {blockedByContact ? (
                <Text style={styles.blockedBannerText}>
                  {i18n.t('chat.youAreBlocked')}
                </Text>
              ) : (
                <AppButton
                  mode='contained'
                  onPress={handleUnblockContact}
                  compact
                  style={{ borderRadius: 8 }}
                >
                  {i18n.t('chat.unblockContact')}
                </AppButton>
              )}
            </View>
          )}
        {!isContactDeleted &&
          blockStatusLoaded &&
          !blockedByContact &&
          !blockedByMe && (
            <View style={styles.footerContrastContainer}>
              <View style={styles.inputContainer}>
                {/* Botão emoji */}
                <View style={styles.inputLeftContainer}>
                  <IconButton
                    icon='emoticon-happy-outline'
                    size={26}
                    iconColor={
                      isEmojiPickerVisible
                        ? colors.primary700
                        : colors.textSecondary
                    }
                    style={styles.emojiButton}
                    onPress={() => setIsEmojiPickerVisible(v => !v)}
                    disabled={isSending}
                  />
                </View>

                {/* Slots de emojis */}
                <View style={styles.selectedEmojisWrapper}>
                  <View style={styles.selectedEmojisContainer}>
                    {Array.from({ length: MAX_EMOJIS }).map((_, index) => {
                      const emoji = selectedEmojis[index];
                      const handleSlotPress = () => {
                        if (!isEmojiPickerVisible) {
                          setIsEmojiPickerVisible(true);
                          return;
                        }
                        if (emoji) removeEmoji(index);
                      };
                      return (
                        <PressableButton
                          key={index}
                          style={[
                            styles.emojiSlot,
                            emoji
                              ? styles.emojiSlotFilled
                              : styles.emojiSlotEmpty,
                          ]}
                          onPress={handleSlotPress}
                          activeOpacity={0.6}
                        >
                          {emoji && (
                            <Text style={styles.selectedEmojiText}>
                              {emoji}
                            </Text>
                          )}
                        </PressableButton>
                      );
                    })}
                  </View>
                </View>

                {/* Botão enviar */}
                {isSending ? (
                  <View style={styles.sendButtonLoading}>
                    <ActivityIndicator size='small' color={colors.primary700} />
                  </View>
                ) : (
                  <IconButton
                    icon='send'
                    size={24}
                    // Antes usava messageOut (mesma cor do fundo do botão)
                    // pra "esconder" o ícone quando desabilitado — truque que
                    // só funcionava contra o fundo claro antigo. Agora o
                    // fundo é neutro (cardBackground), então o ícone precisa
                    // de uma cor visível-mas-apagada de verdade.
                    iconColor={
                      selectedEmojis.some(Boolean)
                        ? colors.primary700
                        : colors.textSecondary
                    }
                    style={[
                      styles.sendButton,
                      !selectedEmojis.some(Boolean) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!selectedEmojis.some(Boolean)}
                  />
                )}

                {/* Emoji do chat (tocável para personalizar) */}
                <TouchableOpacity
                  onPress={() => {
                    if (chatEmoji !== globalEmoji) {
                      Alert.alert(i18n.t('chat.chooseChatEmoji'), undefined, [
                        {
                          text: i18n.t('chat.useGlobalEmoji'),
                          onPress: handleResetChatEmoji,
                        },
                        {
                          text: i18n.t('chat.chooseAnotherEmoji'),
                          onPress: () => setIsChatEmojiPickerVisible(true),
                        },
                        { text: i18n.t('common.cancel'), style: 'cancel' },
                      ]);
                    } else {
                      setIsChatEmojiPickerVisible(true);
                    }
                  }}
                >
                  <Text style={styles.userProfileEmoji}>{chatEmoji}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* ── Teclado de Emojis ── */}
        {isEmojiPickerVisible && (
          <View style={styles.emojiKeyboardContainer}>
            <EmojiKeyboardIOS
              onEmojiSelected={handleEmojiSelected}
              emojisByCategory={filteredMessageEmojis}
              emojiSize={35}
            />
          </View>
        )}

        {/* ── Picker de emoji personalizado do chat ── */}
        <EmojiPickerIOS
          open={isChatEmojiPickerVisible}
          onClose={() => setIsChatEmojiPickerVisible(false)}
          onEmojiSelected={handleChatEmojiSelect}
          emojisByCategory={filteredChatEmojis}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
