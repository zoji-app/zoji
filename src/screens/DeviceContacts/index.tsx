import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  AppState,
  AppStateStatus,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, EmojiAvatar } from '../../components/ui';
import {
  DeviceContact,
  getContactsWithZojiStatus,
} from '../../services/deviceContacts';
import { relationshipsApi } from '../../services/relationshipsApi';
import { logger } from '../../utils/logger';

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

export const DeviceContacts: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // loadContacts usa getPermissionsAsync (read-only) para evitar que
  // requestPermissionsAsync dispare transições de Activity no Android e
  // cause um loop via AppState: requestPermissions → inactive → active → loadContacts → ...
  const loadContacts = useCallback(
    async (isRefreshing = false) => {
      if (!user) return;
      try {
        isRefreshing ? setRefreshing(true) : setLoading(true);

        const { status } = await Contacts.getPermissionsAsync();

        if (status !== 'granted') {
          setPermissionDenied(true);
          return;
        }

        setPermissionDenied(false);

        // Sempre varre TODOS os contatos — sem cache
        const all = await getContactsWithZojiStatus(user.uid);
        setContacts(all);
        logger.debug(`[DeviceContacts] ${all.length} contatos carregados`);
      } catch (error) {
        logger.error('[DeviceContacts] Erro ao carregar:', error);
        addToast(
          'error',
          i18n.t('deviceContacts.contactsLoadError'),
          i18n.t('common.error')
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, addToast]
  );

  // Solicita permissão uma única vez ao montar a tela. Usar requestPermissionsAsync
  // dentro de loadContacts causaria um loop no Android em produção (ver loadContacts).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        loadContacts();
      } else {
        setPermissionDenied(true);
        setLoading(false);
        if (!canAskAgain) {
          addToast(
            'error',
            i18n.t('deviceContacts.permissionDenied'),
            i18n.t('common.error')
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recarrega ao navegar de volta para esta tela (exceto no mount, coberto acima)
  const isMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        return;
      }
      loadContacts();
    }, [loadContacts])
  );

  // Recarrega ao voltar de app externo (ex: app de Contatos) com a tela aberta.
  // Só dispara em transição background→active para evitar falsos positivos
  // causados por requestPermissionsAsync no Android.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appStateRef.current === 'background' &&
        next === 'active' &&
        isFocused
      ) {
        loadContacts();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [isFocused, loadContacts]);

  const handleAddContact = useCallback(
    async (contact: DeviceContact) => {
      if (!contact.phoneNumbers[0] || addingId) return;
      setAddingId(contact.id);
      try {
        await relationshipsApi.create(contact.phoneNumbers[0]);
        addToast(
          'success',
          i18n.t('addContact.success'),
          i18n.t('common.success')
        );
        // Recarrega para atualizar status
        await loadContacts();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? '';
        if (err?.response?.status === 409) {
          addToast(
            'info',
            i18n.t('addContact.errors.alreadyExists'),
            i18n.t('common.info')
          );
        } else {
          addToast(
            'error',
            msg || i18n.t('common.error'),
            i18n.t('common.error')
          );
        }
      } finally {
        setAddingId(null);
      }
    },
    [addingId, addToast, loadContacts]
  );

  const handleOpenChat = useCallback(
    (contact: DeviceContact) => {
      navigation.navigate('Chat', {
        contact: {
          id: contact.zojiUserId,
          nickname: contact.zojiProfile?.nickname || contact.name,
          profileEmoji: contact.zojiProfile?.profileEmoji || '👤',
        },
      });
    },
    [navigation]
  );

  const handleInviteContact = useCallback(async (contact: DeviceContact) => {
    const message = i18n.t('deviceContacts.inviteMessage') ?? '';
    const phone = contact.phoneNumbers[0];
    if (phone) {
      const sep = Platform.OS === 'ios' ? '&' : '?';
      const smsUrl = `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return;
      }
    }
    Share.share({ message });
  }, []);

  const handleInviteAll = useCallback(() => {
    Share.share({ message: i18n.t('deviceContacts.inviteMessage') ?? '' });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: DeviceContact }) => {
      if (!item.hasZoji) {
        return (
          <Card
            style={styles.contactItem}
            backgroundColor={colors.cardBackground}
          >
            <View style={styles.contactInfo}>
              <EmojiAvatar
                emoji='👤'
                fontSize={40}
                textStyle={styles.contactEmoji}
              />
              <View style={styles.contactDetailsContainer}>
                <Text style={styles.contactName}>{item.name}</Text>
                {item.phoneNumbers[0] ? (
                  <Text style={styles.contactPhone}>
                    {item.phoneNumbers[0]}
                  </Text>
                ) : null}
                <View style={styles.badgeContainer}>
                  <View
                    style={[styles.addedBadge, { backgroundColor: '#9E9E9E' }]}
                  >
                    <Text style={styles.addedBadgeText}>
                      {i18n.t('deviceContacts.notOnZoji')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.iconContainer}>
              <TouchableOpacity onPress={() => handleInviteContact(item)}>
                <Ionicons
                  name='share-social-outline'
                  size={24}
                  color='#9E9E9E'
                />
              </TouchableOpacity>
            </View>
          </Card>
        );
      }

      const status = item.relationshipStatus ?? 'none';
      const isFriend = status === 'friend';
      const isPendingSent = status === 'pending_sent';
      const isPendingReceived = status === 'pending_received';
      const canAdd = status === 'none';
      const isAdding = addingId === item.id;

      return (
        <Card
          style={styles.contactItem}
          backgroundColor={colors.cardBackground}
        >
          <View style={styles.contactInfo}>
            <EmojiAvatar
              emoji={item.zojiProfile?.profileEmoji || '👤'}
              fontSize={40}
              textStyle={styles.contactEmoji}
            />
            <View style={styles.contactDetailsContainer}>
              <Text style={styles.contactName}>
                {item.zojiProfile?.nickname || item.name}
              </Text>
              {item.zojiProfile?.nickname &&
                item.zojiProfile.nickname !== item.name && (
                  <Text style={styles.contactPhone}>{item.name}</Text>
                )}
              {item.phoneNumbers[0] ? (
                <Text style={styles.contactPhone}>{item.phoneNumbers[0]}</Text>
              ) : null}

              <View style={styles.badgeContainer}>
                {isFriend && (
                  <View
                    style={[
                      styles.addedBadge,
                      { backgroundColor: colors.primary700 },
                    ]}
                  >
                    <Text style={styles.addedBadgeText}>Amigo</Text>
                  </View>
                )}
                {isPendingSent && (
                  <View
                    style={[styles.addedBadge, { backgroundColor: '#FF9800' }]}
                  >
                    <Text style={styles.addedBadgeText}>Aguardando</Text>
                  </View>
                )}
                {isPendingReceived && (
                  <View
                    style={[styles.addedBadge, { backgroundColor: '#9C27B0' }]}
                  >
                    <Text style={styles.addedBadgeText}>Quer te adicionar</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.iconContainer}>
            {isFriend && (
              <TouchableOpacity onPress={() => handleOpenChat(item)}>
                <Ionicons
                  name='chatbubble-ellipses-outline'
                  size={24}
                  color={colors.primary700}
                />
              </TouchableOpacity>
            )}
            {isPendingReceived && (
              <TouchableOpacity onPress={() => handleOpenChat(item)}>
                <Ionicons
                  name='chatbubble-ellipses-outline'
                  size={24}
                  color='#9C27B0'
                />
              </TouchableOpacity>
            )}
            {canAdd && (
              <TouchableOpacity
                onPress={() => handleAddContact(item)}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size='small' color={colors.primary700} />
                ) : (
                  <Ionicons
                    name='person-add-outline'
                    size={24}
                    color={colors.primary700}
                  />
                )}
              </TouchableOpacity>
            )}
            {isPendingSent && (
              <Ionicons name='time-outline' size={24} color='#FF9800' />
            )}
          </View>
        </Card>
      );
    },
    [
      handleOpenChat,
      handleAddContact,
      handleInviteContact,
      addingId,
      styles,
      colors,
    ]
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size='large' color={colors.primary700} />
        </View>
      </SafeAreaView>
    );
  }

  if (permissionDenied) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name='people-outline' size={48} color='#ccc' />
          <Text style={styles.emptyText}>
            {i18n.t('deviceContacts.permissionRequired')}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, padding: 12 }}
            onPress={() => Linking.openSettings()}
          >
            <Text style={{ color: colors.primary700, fontWeight: '600' }}>
              Abrir Configurações
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name='people-outline' size={48} color='#ccc' />
            <Text style={styles.emptyText}>
              {i18n.t('deviceContacts.noZojiContacts')}
            </Text>
            <TouchableOpacity
              style={[
                styles.addManuallyButton,
                { backgroundColor: colors.primary700 },
              ]}
              onPress={handleInviteAll}
            >
              <Text style={styles.addManuallyButtonText}>
                {i18n.t('settings.inviteFriends')}
              </Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContacts(true)}
            colors={[colors.primary700]}
            tintColor={colors.primary700}
          />
        }
      />
    </SafeAreaView>
  );
};
