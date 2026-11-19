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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Menu } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { EmojiKeyboardIOS } from '../../components/EmojiKeyboardIOS';
import { EmojiPickerIOS } from '../../components/EmojiKeyboardIOS/EmojiPickerIOS';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { colors as staticColors } from '../../theme/colors';
import { PressableButton } from '../../components/ui';
import { groupsApi } from '../../services/groupsApi';
import { getChatEmoji, setChatEmoji } from '../../services/localMessages';
import { GroupMessage } from '../../types/groups';
import { wsService } from '../../services/wsService';
import { useFilteredEmojis } from '../../hooks/useFilteredEmojis';
import {
  findBlockedSequence,
  getEmojiBlocklist,
  BlockedEntry,
} from '../../services/emojiBlocklist';
import { splitEmojis } from '../../utils/splitEmojis';
import { useTheme } from '../../contexts/ThemeContext';
import { getChatStyles } from './styles';
import { Ionicons } from '@expo/vector-icons';

const MAX_EMOJIS = 4;

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

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

export const GroupChat: React.FC<Props> = ({ route, navigation }) => {
  const {
    groupId,
    groupName: initialGroupName,
    groupEmoji: initialGroupEmoji,
  } = route.params;
  const { user } = useAuth();
  const { addToast } = useToast();
  const { colors } = useTheme();
  const chatStyles = useMemo(() => getChatStyles(colors), [colors]);
  const groupStyles = useMemo(() => getGroupStyles(colors), [colors]);
  const filteredEmojis = useFilteredEmojis('messages');
  const filteredChatEmojis = useFilteredEmojis('profile');

  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupEmoji, setGroupEmoji] = useState(initialGroupEmoji);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<(string | null)[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const hideFloatingDateRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!viewableItems.length) return;
    let oldest = viewableItems[0].item as GroupMessage;
    for (const vi of viewableItems) {
      if (
        new Date((vi.item as GroupMessage).created_at) <
        new Date(oldest.created_at)
      ) {
        oldest = vi.item;
      }
    }
    setFloatingDate(formatDateLabel(new Date(oldest.created_at)));
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    if (hideFloatingDateRef.current) clearTimeout(hideFloatingDateRef.current);
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (hideFloatingDateRef.current) clearTimeout(hideFloatingDateRef.current);
    hideFloatingDateRef.current = setTimeout(() => setFloatingDate(null), 1500);
  }, []);
  const [isChatEmojiPickerVisible, setIsChatEmojiPickerVisible] =
    useState(false);

  // Tick a cada minuto para reavaliar quais mensagens ainda estão dentro do prazo de exclusão
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Inverted FlatList requires newest-first data so the list starts at the bottom
  // without any explicit scrollToEnd calls (same pattern as individual Chat).
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const flatListRef = useRef<FlatList>(null);
  const selectedEmojisRef = useRef<(string | null)[]>([]);
  const blocklistRef = useRef<BlockedEntry[]>([]);

  const globalEmoji = user?.profile_emoji ?? '😊';
  const [groupChatEmoji, setGroupChatEmojiState] = useState(globalEmoji);

  useEffect(() => {
    getEmojiBlocklist().then(entries => {
      blocklistRef.current = entries;
    });
  }, []);

  // Carregar emoji personalizado do grupo
  useEffect(() => {
    if (!user?.uid) return;
    getChatEmoji(user.uid, `group_${groupId}`).then(saved => {
      if (saved) setGroupChatEmojiState(saved);
    });
  }, [user?.uid, groupId]);

  const handleChatEmojiSelect = useCallback(
    async (emojiObj: EmojiObject) => {
      if (!user?.uid) return;
      const emoji = emojiObj.emoji;
      setGroupChatEmojiState(emoji);
      setIsChatEmojiPickerVisible(false);
      await setChatEmoji(user.uid, `group_${groupId}`, emoji);
    },
    [user?.uid, groupId]
  );

  const handleResetChatEmoji = useCallback(async () => {
    if (!user?.uid) return;
    setGroupChatEmojiState(globalEmoji);
    await setChatEmoji(user.uid, `group_${groupId}`, null);
  }, [user?.uid, groupId, globalEmoji]);

  // Carregar mensagens + info do grupo
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [msgs, group] = await Promise.all([
          groupsApi.getMessages(groupId, { limit: 50 }),
          groupsApi.get(groupId),
        ]);
        if (!mounted) return;
        setMessages(msgs);
        setGroupName(group.name);
        setGroupEmoji(group.emoji);
        setIsAdmin(group.role === 'admin');
        setIsMuted(group.is_muted ?? false);
      } catch {
        if (mounted) addToast('error', i18n.t('groups.loadError'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [groupId]);

  // WS: receber novas mensagens
  useEffect(() => {
    const unsub = wsService.on('group.message.new', (payload: any) => {
      if (payload?.group_id !== groupId) return;
      const newMsg: GroupMessage = {
        id: payload.id,
        group_id: payload.group_id,
        sender_id: payload.sender_id,
        sender_nickname: payload.sender_nickname ?? '',
        sender_emoji: payload.sender_emoji ?? null,
        emoji: payload.emoji,
        created_at: payload.created_at,
      };
      setMessages(prev => [...prev, newMsg]);
    });

    // Atualizações de nome/emoji do grupo
    const unsubUpdated = wsService.on('group.updated', (payload: any) => {
      if (payload?.group_id !== groupId) return;
      if (payload.group_name) setGroupName(payload.group_name);
      if (payload.group_emoji) setGroupEmoji(payload.group_emoji);
    });

    // Usuário removido do grupo
    const unsubRemoved = wsService.on(
      'group.member_removed',
      (payload: any) => {
        if (payload?.group_id !== groupId) return;
        if (String(payload.user_id) === user?.uid && payload.removed) {
          addToast('info', i18n.t('groups.youLeft'));
          navigation.goBack();
        }
      }
    );

    // Grupo apagado
    const unsubDeleted = wsService.on('group.deleted', (payload: any) => {
      if (payload?.group_id !== groupId) return;
      addToast('info', i18n.t('groups.groupDeleted'));
      navigation.goBack();
    });

    // Mensagem de grupo apagada por quem enviou
    const unsubMsgDeleted = wsService.on(
      'group.message.deleted',
      (payload: any) => {
        if (payload?.group_id !== groupId) return;
        setMessages(prev =>
          prev.filter(m => String(m.id) !== String(payload.message_id))
        );
      }
    );

    // Membro promovido a admin
    const unsubPromoted = wsService.on(
      'group.member_promoted',
      (payload: any) => {
        if (payload?.group_id !== groupId) return;
        if (String(payload.user_id) === user?.uid) {
          setIsAdmin(true);
        }
      }
    );

    // Membro silenciado
    const unsubMuted = wsService.on('group.member_muted', (payload: any) => {
      if (payload?.group_id !== groupId) return;
      if (String(payload.user_id) === user?.uid) {
        setIsMuted(true);
        addToast('info', i18n.t('groups.mutedToast'));
      }
    });

    // Silêncio removido
    const unsubUnmuted = wsService.on(
      'group.member_unmuted',
      (payload: any) => {
        if (payload?.group_id !== groupId) return;
        if (String(payload.user_id) === user?.uid) {
          setIsMuted(false);
          addToast('success', i18n.t('groups.unmutedToast'));
        }
      }
    );

    return () => {
      unsub();
      unsubUpdated();
      unsubRemoved();
      unsubDeleted();
      unsubMsgDeleted();
      unsubPromoted();
      unsubMuted();
      unsubUnmuted();
    };
  }, [groupId, user?.uid]);

  const handleEmojiSelected = useCallback(
    (emojiObj: EmojiObject) => {
      const prev = selectedEmojisRef.current;
      let slotIndex = -1;
      for (let i = 0; i < MAX_EMOJIS; i++) {
        if (!prev[i]) {
          slotIndex = i;
          break;
        }
      }
      if (slotIndex === -1) return;

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

  const handleSend = useCallback(async () => {
    const toSend = selectedEmojis.filter((e): e is string => !!e);
    if (toSend.length === 0 || isSending) return;

    selectedEmojisRef.current = [];
    setSelectedEmojis([]);
    setIsEmojiPickerVisible(false);
    setIsSending(true);

    const emojiStr = toSend.join('');
    const pendingId = `pending_${Date.now()}_${Math.random()}`;
    const optimistic: GroupMessage = {
      id: pendingId,
      group_id: groupId,
      sender_id: Number(user?.uid ?? 0),
      sender_nickname: user?.nickname ?? '',
      sender_emoji: groupChatEmoji,
      emoji: emojiStr,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const msg = await groupsApi.sendMessage(
        groupId,
        emojiStr,
        groupChatEmoji
      );
      setMessages(prev =>
        prev.map(m => (m.id === pendingId ? { ...msg, pending: false } : m))
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== pendingId));
      addToast('error', i18n.t('toast.messageNotSent'));
    } finally {
      setIsSending(false);
    }
  }, [selectedEmojis, isSending, groupId, groupChatEmoji, user, addToast]);

  const recallGroupMessage = useCallback(
    async (messageId: string) => {
      const snapshot = messages.find(m => String(m.id) === messageId);
      setMessages(prev => prev.filter(m => String(m.id) !== messageId));
      try {
        await groupsApi.recallMessage(parseInt(messageId, 10));
      } catch {
        if (snapshot)
          setMessages(prev =>
            [...prev, snapshot].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
          );
        throw new Error('recall_failed');
      }
    },
    [messages]
  );

  const handleLeave = () => {
    Alert.alert(
      i18n.t('groups.leaveGroup'),
      i18n.t('groups.leaveGroupConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.leaveGroup'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.leave(groupId);
              navigation.goBack();
            } catch (err: any) {
              const msg = err?.response?.data?.error;
              if (msg === 'Transfira a administração antes de sair') {
                addToast('error', i18n.t('groups.leaveTransferAdmin'));
              } else {
                addToast('error', i18n.t('groups.leaveError'));
              }
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      i18n.t('groups.deleteGroup'),
      i18n.t('groups.deleteGroupConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('groups.deleteGroup'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupsApi.delete(groupId);
              navigation.goBack();
            } catch {
              addToast('error', i18n.t('common.error'));
            }
          },
        },
      ]
    );
  };

  const shouldShowDateSeparator = (
    current: GroupMessage,
    next: GroupMessage | undefined
  ) => {
    if (!next) return true;
    return (
      new Date(current.created_at).toDateString() !==
      new Date(next.created_at).toDateString()
    );
  };

  const formatDate = formatDateLabel;

  const renderMessage = ({
    item: message,
    index,
  }: {
    item: GroupMessage;
    index: number;
  }) => {
    const isFromMe = String(message.sender_id) === user?.uid;
    // In inverted mode, index+1 is the older adjacent message — the separator
    // marks the boundary between two different days going upward in the list.
    const showSeparator = shouldShowDateSeparator(
      message,
      reversedMessages[index + 1]
    );
    const msgSenderEmoji = message.sender_emoji ?? '👤';
    const canDelete =
      isFromMe &&
      !message.pending &&
      Date.now() - new Date(message.created_at).getTime() < 5 * 60 * 1000;

    return (
      <View>
        {showSeparator && (
          <View style={chatStyles.dateSeparator}>
            <View style={chatStyles.dateLine} />
            <Text style={chatStyles.dateText}>
              {formatDate(new Date(message.created_at))}
            </Text>
            <View style={chatStyles.dateLine} />
          </View>
        )}
        <View
          style={[
            chatStyles.messageContainer,
            isFromMe ? chatStyles.myMessage : chatStyles.otherMessage,
          ]}
        >
          <View style={chatStyles.senderContainer}>
            <Text style={chatStyles.senderEmoji}>{msgSenderEmoji}</Text>
          </View>
          <View style={chatStyles.messageWrapper}>
            {!isFromMe && (
              <Text style={groupStyles.senderName} numberOfLines={1}>
                {message.sender_nickname}
              </Text>
            )}
            <View style={canDelete ? chatStyles.bubbleRow : undefined}>
              {canDelete && (
                <TouchableOpacity
                  style={chatStyles.recallButton}
                  onPress={() =>
                    recallGroupMessage(String(message.id)).catch(() =>
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
                  chatStyles.messageContent,
                  isFromMe
                    ? chatStyles.myMessageContent
                    : chatStyles.otherMessageContent,
                  message.pending && chatStyles.pendingMessageContent,
                ]}
              >
                <View style={chatStyles.emojiRow}>
                  {splitEmojis(message.emoji).map((char, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.5}
                      onPress={() => handleTapSingleEmoji(char)}
                    >
                      <View style={chatStyles.emojiWrapper}>
                        <Text
                          style={[
                            chatStyles.emoji,
                            message.pending && chatStyles.pendingEmoji,
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
                chatStyles.timeText,
                isFromMe ? chatStyles.timeRight : chatStyles.timeLeft,
                message.pending && chatStyles.pendingTimeText,
              ]}
            >
              {new Date(message.created_at).toLocaleTimeString([], {
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

  return (
    <SafeAreaView style={chatStyles.safeArea}>
      <KeyboardAvoidingView
        style={chatStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={chatStyles.header}>
          <View style={chatStyles.headerLeft}>
            <IconButton
              icon='arrow-left'
              size={24}
              iconColor={colors.primary700}
              style={chatStyles.backButton}
              onPress={() => navigation.goBack()}
            />
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => navigation.navigate('GroupDetails', { groupId })}
            >
              <Text style={chatStyles.headerEmoji}>{groupEmoji}</Text>
              <View style={chatStyles.headerTitleContainer}>
                <Text style={chatStyles.headerTitle} numberOfLines={1}>
                  {groupName}
                </Text>
                <Text style={chatStyles.headerDeviceName}>
                  {i18n.t('groups.tapForDetails')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={chatStyles.headerRight}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon='dots-vertical'
                  size={24}
                  iconColor={colors.primary700}
                  style={chatStyles.menuButton}
                  onPress={() => setMenuVisible(true)}
                />
              }
              contentStyle={chatStyles.menuContent}
            >
              {isAdmin && (
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    handleDelete();
                  }}
                  title={i18n.t('groups.deleteGroup')}
                  leadingIcon='delete-outline'
                />
              )}
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  handleLeave();
                }}
                title={i18n.t('groups.leaveGroup')}
                leadingIcon='exit-to-app'
              />
            </Menu>
          </View>
        </View>

        {/* Messages */}
        <View style={chatStyles.messagesWrapper}>
          {isLoading ? (
            <View style={chatStyles.loadingContainer}>
              <ActivityIndicator size='large' color={colors.primary700} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={reversedMessages}
              renderItem={renderMessage}
              keyExtractor={item => String(item.id)}
              extraData={minuteTick}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={chatStyles.messagesList}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              onScrollBeginDrag={handleScrollBeginDrag}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={handleScrollEnd}
              ListEmptyComponent={
                <View style={chatStyles.emptyChat}>
                  <Text style={chatStyles.emptyChatText}>
                    {i18n.t('groups.noMessages')}
                  </Text>
                  <Text style={chatStyles.emptyChatText}>
                    {i18n.t('groups.sendFirstMessage')}
                  </Text>
                </View>
              }
            />
          )}
          {floatingDate && (
            <View style={chatStyles.floatingDateContainer} pointerEvents='none'>
              <View style={chatStyles.floatingDatePill}>
                <Text style={chatStyles.floatingDateText}>{floatingDate}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={chatStyles.footerContrastContainer}>
          {isMuted ? (
            <View style={groupStyles.mutedBanner}>
              <Text style={groupStyles.mutedBannerText}>
                🔇 {i18n.t('groups.mutedBanner')}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              chatStyles.inputContainer,
              isMuted && groupStyles.inputContainerMuted,
            ]}
          >
            <View style={chatStyles.inputLeftContainer}>
              <IconButton
                icon='emoticon-happy-outline'
                size={26}
                iconColor={
                  isEmojiPickerVisible
                    ? colors.primary700
                    : colors.textSecondary
                }
                style={chatStyles.emojiButton}
                onPress={() => setIsEmojiPickerVisible(v => !v)}
                disabled={isSending || isMuted}
              />
            </View>

            <View style={chatStyles.selectedEmojisWrapper}>
              <View style={chatStyles.selectedEmojisContainer}>
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
                        chatStyles.emojiSlot,
                        emoji
                          ? chatStyles.emojiSlotFilled
                          : chatStyles.emojiSlotEmpty,
                      ]}
                      onPress={handleSlotPress}
                      activeOpacity={0.6}
                    >
                      {emoji && (
                        <Text style={chatStyles.selectedEmojiText}>
                          {emoji}
                        </Text>
                      )}
                    </PressableButton>
                  );
                })}
              </View>
            </View>

            {isSending ? (
              <View style={chatStyles.sendButtonLoading}>
                <ActivityIndicator size='small' color={colors.primary700} />
              </View>
            ) : (
              <IconButton
                icon='send'
                size={24}
                iconColor={
                  selectedEmojis.some(Boolean)
                    ? colors.primary700
                    : colors.messageOut
                }
                style={[
                  chatStyles.sendButton,
                  !selectedEmojis.some(Boolean) &&
                    chatStyles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!selectedEmojis.some(Boolean) || isMuted}
              />
            )}

            <TouchableOpacity
              onPress={() => {
                if (groupChatEmoji !== globalEmoji) {
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
              <Text style={chatStyles.userProfileEmoji}>{groupChatEmoji}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isEmojiPickerVisible && (
          <View style={chatStyles.emojiKeyboardContainer}>
            <EmojiKeyboardIOS
              onEmojiSelected={handleEmojiSelected}
              emojisByCategory={filteredEmojis}
              emojiSize={35}
            />
          </View>
        )}

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

const getGroupStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    senderName: {
      fontSize: 12,
      color: colors.primary700,
      fontWeight: '600',
      marginBottom: 2,
      marginLeft: 12,
    },
    mutedBanner: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.pageBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    mutedBannerText: {
      fontSize: 13,
      color: colors.neutral700,
      textAlign: 'center',
    },
    inputContainerMuted: {
      opacity: 0.35,
    },
  });
