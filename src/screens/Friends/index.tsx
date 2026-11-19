import React, {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  BackHandler,
  Platform,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Text, TouchableRipple } from 'react-native-paper';
import { ScreenHeader } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { i18n } from '../../i18n';
import { useContacts } from './hooks/useContacts';
import { useConnectivity } from './hooks/useConnectivity';
import ContactItem from './components/ContactItem';
import EmptyState from './components/EmptyState';
import HeaderRight from './components/HeaderRight';
import AddButton from './components/AddButton';
import { useTheme } from '../../contexts/ThemeContext';
import { getStyles } from './styles';
import { getStyles as getContactItemStyles } from './components/ContactItem/styles';
import { User } from './types';
import { syncMessages } from '../../services/messageSync';
import { logger } from '../../utils/logger';
import { useWsStatus } from '../../hooks/useWsStatus';
import { AppBanner } from '../../components/AppBanner';
import { useAppBanner } from '../../hooks/useAppBanner';
import { StatusStrip } from '../../components/StatusStrip';
import { wsService } from '../../services/wsService';
import { triggerDeviceContactsSync } from '../../hooks/useContactsSync';
import { groupsApi } from '../../services/groupsApi';
import { Group } from '../../types/groups';
import { formatDate } from '../../utils/dateUtils';
import { splitEmojis } from '../../utils/splitEmojis';

const FOCUS_RELOAD_COOLDOWN_MS = 60_000;
const DEVICE_SYNC_COOLDOWN_MS = 300_000; // 5 min — sincronização pesada de contatos do dispositivo
const GROUPS_RELOAD_COOLDOWN_MS = 60_000;

type ListItem =
  { type: 'contact'; data: User } | { type: 'group'; data: Group };

export const Friends: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const userId = user?.uid;
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const contactItemStyles = useMemo(
    () => getContactItemStyles(colors),
    [colors]
  );
  const isFocused = useIsFocused();
  const lastFocusLoadRef = useRef<number>(0);
  const lastDeviceSyncRef = useRef<number>(0);
  const lastGroupsLoadRef = useRef<number>(0);

  const [groups, setGroups] = useState<Group[]>([]);

  const {
    contacts: contactsFromHook,
    loading,
    refreshing,
    isDeviceOffline,
    reloadContacts: loadContacts,
    onRefresh: onContactsRefresh,
    forceUpdate,
  } = useContacts(userId);

  const { isConnected } = useConnectivity();
  const isConnectedRef = useRef(isConnected);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  const hasConnections = loading
    ? undefined
    : contactsFromHook.some(c => c.lastMessage != null && !c.isBlocked) ||
      groups.length > 0;
  const { banner, dismiss } = useAppBanner(hasConnections);
  const wsStatus = useWsStatus();

  const loadGroups = useCallback(async () => {
    if (!userId) return;
    try {
      const g = await groupsApi.list();
      setGroups(g);
    } catch {
      // falha silenciosa
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      lastFocusLoadRef.current = Date.now();
      loadContacts();
      loadGroups();
    }
  }, [userId, loadContacts, loadGroups]);

  useEffect(() => {
    if (!isFocused || !userId) return;

    const now = Date.now();

    // Sincronização pesada de contatos do dispositivo — no máximo 1x a cada 5 min
    if (now - lastDeviceSyncRef.current > DEVICE_SYNC_COOLDOWN_MS) {
      lastDeviceSyncRef.current = now;
      triggerDeviceContactsSync();
    }

    // Reload de grupos — no máximo 1x por minuto
    if (now - lastGroupsLoadRef.current > GROUPS_RELOAD_COOLDOWN_MS) {
      lastGroupsLoadRef.current = now;
      loadGroups();
    }

    const sinceLastLoad = now - lastFocusLoadRef.current;
    const needsReload = sinceLastLoad > FOCUS_RELOAD_COOLDOWN_MS;

    if (needsReload) {
      lastFocusLoadRef.current = now;
      loadContacts();
    } else {
      // Refresh rápido do storage local para capturar mensagens recebidas enquanto Chat estava aberto
      forceUpdate();
    }

    if (wsService.isConnected) {
      wsService.send('sync.last_messages');
    } else if (isConnectedRef.current && needsReload) {
      syncMessages(userId)
        .then(changed => {
          if (changed) loadContacts();
        })
        .catch(err =>
          logger.error('[FriendsScreen] Fallback syncMessages erro:', err)
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, userId, loadContacts, loadGroups, forceUpdate]);

  useEffect(() => {
    if (!userId) return;
    const unsub = wsService.on('relationship.updated', () => {
      loadContacts();
    });
    return unsub;
  }, [userId, loadContacts]);

  // Quando o WS reconecta enquanto Friends está na tela, sincroniza últimas mensagens
  const isFocusedRef = useRef(isFocused);
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    if (!userId) return;
    const unsub = wsService.on('__ws_status', (payload: any) => {
      if (payload?.status === 'connected' && isFocusedRef.current) {
        wsService.send('sync.last_messages');
        forceUpdate();
      }
    });
    return unsub;
  }, [userId, forceUpdate]);

  useEffect(() => {
    if (!userId) return;

    const unsub = wsService.on('group.message.new', (payload: any) => {
      setGroups(prev =>
        prev
          .map(g =>
            g.id === payload.group_id
              ? {
                  ...g,
                  last_emoji: payload.emoji,
                  last_sender_id: payload.sender_id,
                  last_sender_emoji: payload.sender_emoji ?? null,
                  last_sender_nickname: payload.sender_nickname ?? '',
                  last_message_at: payload.created_at,
                }
              : g
          )
          .sort((a, b) =>
            (b.last_message_at ?? b.created_at) >
            (a.last_message_at ?? a.created_at)
              ? 1
              : -1
          )
      );
    });

    const unsubCreated = wsService.on('group.created', () => {
      loadGroups();
    });

    const unsubUpdated = wsService.on('group.updated', (payload: any) => {
      setGroups(prev =>
        prev.map(g =>
          g.id === payload.group_id
            ? {
                ...g,
                name: payload.group_name ?? g.name,
                emoji: payload.group_emoji ?? g.emoji,
              }
            : g
        )
      );
    });

    const unsubRemoved = wsService.on(
      'group.member_removed',
      (payload: any) => {
        if (String(payload.user_id) === userId && payload.removed) {
          setGroups(prev => prev.filter(g => g.id !== payload.group_id));
        }
      }
    );

    const unsubDeleted = wsService.on('group.deleted', (payload: any) => {
      setGroups(prev => prev.filter(g => g.id !== payload.group_id));
    });

    return () => {
      unsub();
      unsubCreated();
      unsubUpdated();
      unsubRemoved();
      unsubDeleted();
    };
  }, [userId, loadGroups]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  const filteredContacts = useMemo(
    () => contactsFromHook.filter(c => c.lastMessage != null && !c.isBlocked),
    [contactsFromHook]
  );

  const unifiedList = useMemo<ListItem[]>(() => {
    const getTime = (item: ListItem): number => {
      if (item.type === 'contact') {
        const msg = item.data.lastMessage;
        return msg ? new Date(msg.createdAt).getTime() : 0;
      }
      return new Date(
        item.data.last_message_at ?? item.data.created_at
      ).getTime();
    };

    const items: ListItem[] = [
      ...filteredContacts.map(c => ({ type: 'contact' as const, data: c })),
      ...groups.map(g => ({ type: 'group' as const, data: g })),
    ];

    return items.sort((a, b) => getTime(b) - getTime(a));
  }, [filteredContacts, groups]);

  const onRefresh = useCallback(async () => {
    await Promise.all([onContactsRefresh(), loadGroups()]);
  }, [onContactsRefresh, loadGroups]);

  const keyExtractor = useCallback(
    (item: ListItem) =>
      item.type === 'contact' ? item.data.id : `group-${item.data.id}`,
    []
  );

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [styles]
  );

  const renderEmpty = useCallback(
    () => <EmptyState loading={loading} />,
    [loading]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'contact') {
        return (
          <ContactItem
            item={item.data}
            navigation={navigation}
            userId={userId}
            onRelationshipUpdate={loadContacts}
          />
        );
      }

      const group = item.data;
      const hasMsg = !!group.last_emoji;
      const isFromMe =
        group.last_sender_id !== undefined &&
        String(group.last_sender_id) === userId;
      const tipEmoji = group.last_sender_emoji ?? '';
      const msgEmoji = group.last_emoji ?? '';
      const msgEmojiList = splitEmojis(msgEmoji);
      const timeStr = group.last_message_at
        ? formatDate(group.last_message_at)
        : '';

      const groupEmojiContent = msgEmojiList.map((char, i) => (
        <View key={i} style={contactItemStyles.bubbleEmojiWrapper}>
          <Text style={contactItemStyles.bubbleEmoji} numberOfLines={1}>
            {char}
          </Text>
        </View>
      ));

      return (
        <TouchableRipple
          style={contactItemStyles.contactItem}
          onPress={() =>
            navigation.navigate('GroupChat', {
              groupId: group.id,
              groupName: group.name,
              groupEmoji: group.emoji,
            })
          }
        >
          <View style={contactItemStyles.contactItemContent}>
            <View style={contactItemStyles.avatarContainer}>
              <Text style={contactItemStyles.avatarEmoji}>{group.emoji}</Text>
            </View>

            <View style={contactItemStyles.contactInfo}>
              <Text style={contactItemStyles.contactName} numberOfLines={1}>
                {group.name}
              </Text>
              <Text style={contactItemStyles.timeText}>
                {hasMsg
                  ? timeStr
                  : i18n.t('groups.membersCount', {
                      count: group.member_count,
                    })}
              </Text>
            </View>

            {hasMsg &&
              (isFromMe ? (
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
                    ]}
                  >
                    {groupEmojiContent}
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
                    {groupEmojiContent}
                  </View>
                  <View style={contactItemStyles.tailRight} />
                  {tipEmoji ? (
                    <Text style={contactItemStyles.tailEmojiRight}>
                      {tipEmoji}
                    </Text>
                  ) : null}
                </View>
              ))}
          </View>
        </TouchableRipple>
      );
    },
    [navigation, userId, loadContacts, contactItemStyles]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title={i18n.t('friends.title')}
          titleExtra={
            wsStatus === 'connecting' && (
              <ActivityIndicator
                size={10}
                color={colors.neutral700}
                style={headerStyles.spinner}
              />
            )
          }
          right={
            <View style={styles.headerRight}>
              <HeaderRight
                navigation={navigation}
                pendingMessages={0}
                isDeviceOffline={isDeviceOffline}
              />
              <AddButton navigation={navigation} />
            </View>
          }
        />
        <AppBanner banner={banner} onDismiss={dismiss} />
        <StatusStrip navigation={navigation} />

        <FlatList
          data={unifiedList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2f95dc']}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          keyboardShouldPersistTaps='handled'
          testID='contacts-list'
          style={styles.container}
        />
      </View>
    </SafeAreaView>
  );
};

const headerStyles = StyleSheet.create({
  spinner: {
    marginTop: 2,
    marginLeft: 10,
  },
});
