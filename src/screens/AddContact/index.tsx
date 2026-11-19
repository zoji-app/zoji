import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
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
  Share,
  TextInput,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmojiAvatar, PlainInput, ScreenHeader } from '../../components/ui';
import { QRShareModal } from '../../components/QRShareModal';
import * as Contacts from 'expo-contacts';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { i18n } from '../../i18n';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DeviceContact,
  getContactsWithZojiStatus,
  loadDeviceContactsCache,
  saveDeviceContactsCache,
} from '../../services/deviceContacts';
import { relationshipsApi } from '../../services/relationshipsApi';
import { contactsApi } from '../../services/contactsApi';
import { shareTokenApi } from '../../services/shareTokenApi';
import { logger } from '../../utils/logger';
import { RootStackParamList } from '../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'AddContact'>;

export const AddContact: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [addingManual, setAddingManual] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);

  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const inboundToken = route.params?.token;
  const tokenHandledRef = useRef(false);

  const phoneInputRef = useRef<TextInput>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);

  const cancelledRef = useRef<DeviceContact[]>([]);
  const storageKey = user ? `cancelled_contacts_${user.uid}` : null;

  // Resolve token de QR code ao abrir via deep link
  useEffect(() => {
    if (!inboundToken || tokenHandledRef.current) return;
    tokenHandledRef.current = true;
    (async () => {
      setAddingManual(true);
      try {
        const resolved = await shareTokenApi.resolve(inboundToken);
        const formatted = resolved.phoneNumber.startsWith('+')
          ? resolved.phoneNumber
          : `+55${resolved.phoneNumber}`;
        const contactParams = {
          id: String(resolved.userId),
          nickname: resolved.nickname,
          profileEmoji: resolved.profileEmoji,
        };
        try {
          await relationshipsApi.create(formatted);
          addToast(
            'success',
            i18n.t('addContact.success'),
            i18n.t('common.success')
          );
        } catch (createErr: any) {
          if (createErr?.response?.status !== 409) throw createErr;
          // já são amigos — segue para o chat normalmente
        }
        // App já aberto: o MainApp existente está embaixo — só troca esta tela
        // pelo Chat. Recriar o MainApp com reset deixava as abas em branco
        // (só o rodapé) ao voltar do chat no iOS. Cold start via QR: a pilha
        // começa só com AddContact, então o reset monta o MainApp embaixo.
        if (navigation.canGoBack()) {
          navigation.replace('Chat', { contact: contactParams });
        } else {
          navigation.reset({
            index: 1,
            routes: [
              { name: 'MainApp' },
              { name: 'Chat', params: { contact: contactParams } },
            ],
          });
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 410) {
          addToast(
            'error',
            'Este convite expirou ou já foi usado',
            i18n.t('common.error')
          );
        } else if (status === 404) {
          addToast('error', 'Convite inválido', i18n.t('common.error'));
        } else {
          addToast(
            'error',
            i18n.t('addContact.errors.generic'),
            i18n.t('common.error')
          );
        }
      } finally {
        setAddingManual(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboundToken]);

  const persistCancelled = useCallback(
    async (list: DeviceContact[]) => {
      if (!storageKey) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
      } catch (e) {
        logger.error('[AddContact] Erro ao persistir cancelados:', e);
      }
    },
    [storageKey]
  );

  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (raw) cancelledRef.current = JSON.parse(raw) as DeviceContact[];
      })
      .catch(e => logger.error('[AddContact] Erro ao carregar cancelados:', e));
  }, [storageKey]);

  const applyContacts = useCallback(
    (all: DeviceContact[]) => {
      const merged = [...all];
      let cancelledChanged = false;
      cancelledRef.current = cancelledRef.current.filter(cc => {
        const found = merged.find(c => c.zojiUserId === cc.zojiUserId);
        if (!found) {
          merged.push(cc);
          return true;
        }
        if (found.relationshipStatus !== 'none') {
          cancelledChanged = true;
          return false;
        }
        return true;
      });
      if (cancelledChanged) persistCancelled(cancelledRef.current);
      setContacts(merged);
    },
    [persistCancelled]
  );

  const syncContacts = useCallback(
    async (isRefreshing = false) => {
      if (!user) return;
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (isRefreshing) setRefreshing(true);
      try {
        const all = await getContactsWithZojiStatus(user.uid);
        await saveDeviceContactsCache(user.uid, all);
        applyContacts(all);
      } catch (error) {
        logger.error('[AddContact] Erro ao sincronizar contatos:', error);
        if (isRefreshing)
          addToast(
            'error',
            i18n.t('deviceContacts.contactsLoadError'),
            i18n.t('common.error')
          );
      } finally {
        setLoadingContacts(false);
        if (isRefreshing) setRefreshing(false);
        isSyncingRef.current = false;
      }
    },
    [user, applyContacts, addToast]
  );

  const loadContacts = useCallback(
    async (isRefreshing = false) => {
      if (!user) return;

      // Sem permissão, getDeviceContacts() já devolve [] sozinho — não
      // precisa (e não pode) bloquear o resto: syncContacts() ainda busca os
      // contatos vindos da API de relacionamentos (adicionados manualmente,
      // por QR code, ou automaticamente como o bot de onboarding), que não
      // dependem da agenda do telefone.
      const { status } = await Contacts.getPermissionsAsync();
      setPermissionDenied(status !== 'granted');

      if (isRefreshing) {
        await syncContacts(true);
        return;
      }

      const cached = await loadDeviceContactsCache(user.uid);
      if (cached && cached.length > 0) {
        applyContacts(cached);
        setLoadingContacts(false);
      } else {
        setLoadingContacts(true);
        await syncContacts(false);
        setLoadingContacts(false);
      }
    },
    [user, syncContacts, applyContacts]
  );

  // transitionEnd é o evento correto para native stack — a animação é 100% nativa e
  // o InteractionManager do JS não recebe handles dela, disparando imediatamente.
  // hasInitializedRef evita recargas ao revelar a tela após Chat ser removido da pilha.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const unsubscribe = navigation.addListener('transitionEnd', () => {
      if (hasInitializedRef.current || !navigation.isFocused()) return;
      hasInitializedRef.current = true;
      (async () => {
        // Negada ou não: carrega mesmo assim, sem alertar nada (falha
        // silenciosa) — loadContacts() já lida com isso, e o aviso na lista
        // (cheio ou compacto, conforme já haja amigos ou não) já comunica a
        // situação sem precisar de um Alert toda vez que a tela abre.
        await Contacts.requestPermissionsAsync();
        loadContacts();
      })();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active' &&
        isFocused
      ) {
        syncContacts(false);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [isFocused, syncContacts]);

  const handleAddManual = useCallback(async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      addToast(
        'error',
        i18n.t('addContact.errors.emptyPhone'),
        i18n.t('common.error')
      );
      return;
    }

    const formatted = trimmed.startsWith('+') ? trimmed : `+55${trimmed}`;

    try {
      setAddingManual(true);
      const relationship = await relationshipsApi.create(formatted);
      addToast(
        'success',
        i18n.t('addContact.success'),
        i18n.t('common.success')
      );
      setPhoneNumber('');
      phoneInputRef.current?.blur();
      // Mesmo comportamento do fluxo por QR code (ver acima): sem isso, o
      // contato fica "órfão" — criado no backend, mas sem jeito de começar a
      // conversa, porque "Amigos" só lista quem já tem mensagem trocada.
      navigation.navigate('Chat', {
        contact: {
          id: String(relationship.contact.id),
          nickname: relationship.contact.nickname,
          profileEmoji: relationship.contact.profile_emoji,
        },
      });
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error ?? '';

      if (status === 404) {
        Alert.alert(
          'Número não cadastrado',
          'Este número ainda não usa o Zoji. Quer convidar seu amigo?',
          [
            { text: 'Voltar', style: 'cancel' },
            {
              text: 'Convidar',
              onPress: () =>
                Share.share({
                  message: i18n.t('deviceContacts.inviteMessage') ?? '',
                }).catch(() => {}),
            },
          ]
        );
      } else if (status === 409) {
        // Já são amigos — leva pro chat em vez de só avisar "já existe" e
        // deixar a pessoa sem jeito nenhum de abrir a conversa (mesmo caso do
        // "órfão" acima, só que pra um contato adicionado antes dessa correção).
        const rel = err.response?.data?.relationship;
        const contactId =
          rel && user
            ? String(
                String(rel.user_a_id) === user.uid
                  ? rel.user_b_id
                  : rel.user_a_id
              )
            : null;
        if (contactId) {
          try {
            const profile = await contactsApi.getProfile(contactId);
            navigation.navigate('Chat', {
              contact: {
                id: contactId,
                nickname: profile.nickname,
                profileEmoji: profile.profile_emoji,
              },
            });
          } catch {
            addToast(
              'error',
              i18n.t('addContact.errors.alreadyExists'),
              i18n.t('common.error')
            );
          }
        } else {
          addToast(
            'error',
            i18n.t('addContact.errors.alreadyExists'),
            i18n.t('common.error')
          );
        }
      } else if (status === 422 && msg.includes('si mesmo')) {
        addToast(
          'error',
          i18n.t('addContact.errors.ownNumber'),
          i18n.t('common.error')
        );
      } else {
        logger.error('[AddContact] Erro manual:', err);
        addToast(
          'error',
          i18n.t('addContact.errors.generic'),
          i18n.t('common.error')
        );
      }
    } finally {
      setAddingManual(false);
    }
  }, [phoneNumber, addToast, navigation]);

  const handleAddFromList = useCallback(
    async (contact: DeviceContact) => {
      if (addingId) return;
      // Aceitar só precisa do id do pedido. Quem pediu e não está na agenda
      // vem da API sem telefone (só o hash), e exigir o número aqui fazia o
      // botão de aceitar não fazer nada.
      const isAccept =
        contact.relationshipStatus === 'pending_received' &&
        !!contact.relationshipId;
      if (!isAccept && !contact.phoneNumbers[0]) return;
      setAddingId(contact.id);
      try {
        if (isAccept && contact.relationshipId) {
          await relationshipsApi.update(
            parseInt(contact.relationshipId, 10),
            'accept'
          );
        } else {
          await relationshipsApi.create(contact.phoneNumbers[0]);
        }
        if (contact.zojiUserId) {
          const before = cancelledRef.current;
          cancelledRef.current = before.filter(
            c => c.zojiUserId !== contact.zojiUserId
          );
          if (cancelledRef.current.length !== before.length) {
            persistCancelled(cancelledRef.current);
          }
        }
        addToast(
          'success',
          i18n.t('addContact.success'),
          i18n.t('common.success')
        );
        await syncContacts(false);
      } catch (err: any) {
        if (err?.response?.status === 409) {
          addToast(
            'info',
            i18n.t('addContact.errors.alreadyExists'),
            i18n.t('common.info')
          );
        } else {
          addToast(
            'error',
            err?.response?.data?.error || i18n.t('common.error'),
            i18n.t('common.error')
          );
        }
      } finally {
        setAddingId(null);
      }
    },
    [addingId, addToast, syncContacts, persistCancelled]
  );

  const handleCancelRequest = useCallback(
    async (contact: DeviceContact) => {
      if (!contact.relationshipId || addingId) return;
      setAddingId(contact.id);
      try {
        await relationshipsApi.destroy(parseInt(contact.relationshipId, 10));
        addToast(
          'success',
          i18n.t('addContact.cancelSuccess'),
          i18n.t('common.success')
        );

        const restored: DeviceContact = {
          ...contact,
          relationshipStatus: 'none' as const,
          relationshipId: undefined,
        };
        if (
          !cancelledRef.current.find(c => c.zojiUserId === contact.zojiUserId)
        ) {
          cancelledRef.current = [...cancelledRef.current, restored];
          persistCancelled(cancelledRef.current);
        }
        setContacts(prev =>
          prev.map(c => (c.id === contact.id ? restored : c))
        );
      } catch {
        addToast(
          'error',
          i18n.t('addContact.errors.generic'),
          i18n.t('common.error')
        );
      } finally {
        setAddingId(null);
      }
    },
    [addingId, addToast, persistCancelled]
  );

  const rejectRequest = useCallback(
    async (contact: DeviceContact, alsoBlock: boolean) => {
      if (!contact.relationshipId) return;
      setAddingId(contact.id);
      try {
        await relationshipsApi.update(
          parseInt(contact.relationshipId, 10),
          'reject'
        );
        if (alsoBlock && contact.zojiUserId) {
          await contactsApi.block(contact.zojiUserId);
        }
        setContacts(prev => prev.filter(c => c.id !== contact.id));
        addToast(
          'success',
          alsoBlock
            ? i18n.t('chat.contactBlocked')
            : i18n.t('addContact.rejectSuccess'),
          i18n.t('common.success')
        );
        await syncContacts(false);
      } catch {
        addToast(
          'error',
          i18n.t('addContact.errors.generic'),
          i18n.t('common.error')
        );
      } finally {
        setAddingId(null);
      }
    },
    [addToast, syncContacts]
  );

  const handleRejectRequest = useCallback(
    (contact: DeviceContact) => {
      if (!contact.relationshipId || addingId) return;
      const name = contact.zojiProfile?.nickname || contact.name;
      Alert.alert(
        i18n.t('addContact.rejectTitle', { name }),
        i18n.t('addContact.rejectMessage', { name }),
        [
          {
            text: i18n.t('addContact.rejectConfirm'),
            style: 'destructive',
            onPress: () => rejectRequest(contact, false),
          },
          {
            text: i18n.t('addContact.rejectAndBlock'),
            style: 'destructive',
            onPress: () => rejectRequest(contact, true),
          },
          { text: i18n.t('common.cancel'), style: 'cancel' },
        ]
      );
    },
    [addingId, rejectRequest]
  );

  const handleUnblock = useCallback(
    (contact: DeviceContact) => {
      if (!contact.zojiUserId || addingId) return;
      Alert.alert(
        i18n.t('chat.unblockContact'),
        i18n.t('chat.unblockContactMessage', { name: contact.name }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('chat.unblockContact'),
            onPress: async () => {
              setAddingId(contact.id);
              try {
                await contactsApi.unblock(contact.zojiUserId!);
                addToast(
                  'success',
                  i18n.t('chat.contactUnblocked'),
                  i18n.t('common.success')
                );
                await syncContacts(false);
              } catch {
                addToast(
                  'error',
                  i18n.t('addContact.errors.generic'),
                  i18n.t('common.error')
                );
              } finally {
                setAddingId(null);
              }
            },
          },
        ]
      );
    },
    [addingId, addToast, syncContacts]
  );

  const handleOpenChat = useCallback(
    (contact: DeviceContact) => {
      navigation.navigate('Chat', {
        contact: {
          id: contact.zojiUserId!,
          nickname: contact.zojiProfile?.nickname || contact.name,
          profileEmoji: contact.zojiProfile?.profileEmoji || '👤',
        },
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: DeviceContact }) => {
      const status = item.relationshipStatus ?? 'none';
      const isFriend = status === 'friend';
      const isPendingSent = status === 'pending_sent';
      const isPendingReceived = status === 'pending_received';
      const canAdd = status === 'none';
      const isAdding = addingId === item.id;
      const isBlocked = item.blockedByMe === true;

      return (
        <TouchableOpacity
          style={styles.contactItem}
          onPress={
            isFriend && !isBlocked ? () => handleOpenChat(item) : undefined
          }
          activeOpacity={isFriend && !isBlocked ? 0.6 : 1}
        >
          <View style={styles.contactInfo}>
            <EmojiAvatar
              emoji={item.zojiProfile?.profileEmoji || '👤'}
              fontSize={36}
              textStyle={styles.contactEmoji}
            />
            <View style={styles.contactDetails}>
              <Text style={styles.contactName}>
                {item.zojiProfile?.nickname || item.name}
              </Text>
              {item.zojiProfile?.nickname &&
                item.zojiProfile.nickname !== item.name && (
                  <Text style={styles.contactSubName}>{item.name}</Text>
                )}
              {item.phoneNumbers[0] ? (
                <Text style={styles.contactPhone}>{item.phoneNumbers[0]}</Text>
              ) : null}
              <View style={styles.badgeRow}>
                {isFriend && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.primary700 },
                    ]}
                  >
                    <Text style={styles.badgeText}>Amigo</Text>
                  </View>
                )}
                {isPendingSent && (
                  <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
                    <Text style={styles.badgeText}>Aguardando</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {isPendingReceived && (
            <View style={styles.requestActions}>
              {isAdding ? (
                <ActivityIndicator size='small' color={colors.primary700} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(item)}
                  >
                    <Text style={styles.rejectButtonText}>
                      {i18n.t('addContact.rejectRequest')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleAddFromList(item)}
                  >
                    <Text style={styles.acceptButtonText}>
                      {i18n.t('addContact.acceptRequest')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View style={[styles.actionIcon, isPendingReceived && styles.hidden]}>
            {isFriend && !isBlocked && (
              <Ionicons
                name='chatbubble-ellipses-outline'
                size={24}
                color={colors.primary700}
              />
            )}
            {isBlocked && (
              <TouchableOpacity
                onPress={() => handleUnblock(item)}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator size='small' color='#FF5722' />
                ) : (
                  <Ionicons
                    name='lock-open-outline'
                    size={24}
                    color='#FF5722'
                  />
                )}
              </TouchableOpacity>
            )}
            {canAdd && (
              <TouchableOpacity
                onPress={() => handleAddFromList(item)}
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
              <TouchableOpacity
                onPress={() => handleCancelRequest(item)}
                disabled={isAdding}
                accessibilityLabel={i18n.t('addContact.cancelRequest')}
              >
                {isAdding ? (
                  <ActivityIndicator size='small' color='#FF9800' />
                ) : (
                  <Ionicons
                    name='close-circle-outline'
                    size={26}
                    color='#FF9800'
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [
      handleOpenChat,
      handleAddFromList,
      handleCancelRequest,
      handleRejectRequest,
      handleUnblock,
      addingId,
      styles,
      colors,
    ]
  );

  const zojiContacts = contacts.filter(c => c.hasZoji);
  const hasZojiContacts = zojiContacts.length > 0;
  // Com amigos pra mostrar, o aviso de permissão vira nota compacta no
  // rodapé em vez de ocupar a tela toda acima da lista — só fica em
  // destaque quando não há nada além dele pra ver.
  const showFullPermissionNotice = permissionDenied && !hasZojiContacts;
  const showCompactPermissionNotice = permissionDenied && hasZojiContacts;

  const listHeader = (
    <View style={styles.manualSection}>
      <Text style={styles.manualLabel}>{i18n.t('addContact.phoneNumber')}</Text>
      <View style={styles.manualRow}>
        <PlainInput
          ref={phoneInputRef}
          style={styles.manualInput}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType='phone-pad'
          placeholder={i18n.t('addContact.phoneNumberPlaceholder')}
          placeholderTextColor='#aaa'
          editable={!addingManual}
          returnKeyType='send'
          onSubmitEditing={handleAddManual}
        />
        <TouchableOpacity
          style={[
            styles.manualButton,
            addingManual && styles.manualButtonDisabled,
          ]}
          onPress={handleAddManual}
          disabled={addingManual}
        >
          {addingManual ? (
            <ActivityIndicator size='small' color='#fff' />
          ) : (
            <Ionicons name='arrow-forward' size={22} color='#fff' />
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.manualHelper}>{i18n.t('addContact.helper')}</Text>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() =>
            Share.share({
              message: i18n.t('deviceContacts.inviteMessage') ?? '',
            }).catch(() => {})
          }
        >
          <Ionicons
            name='share-social-outline'
            size={24}
            color={colors.primary700}
          />
          <Text style={styles.inviteButtonText}>
            {i18n.t('settings.inviteFriends')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name='people-outline' size={24} color={colors.primary700} />
          <Text style={styles.inviteButtonText}>
            {i18n.t('groups.createGroup')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={() => setIsQRModalVisible(true)}
        >
          <MaterialCommunityIcons
            name='qrcode'
            size={24}
            color={colors.primary700}
          />
          <Text style={styles.inviteButtonText}>
            {i18n.t('addContact.shareQRCode')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionDivider}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionLabel}>
          {showFullPermissionNotice
            ? i18n.t('deviceContacts.permissionRequired')
            : i18n.t('addContact.zojiContacts', {
                count: zojiContacts.length,
              })}
        </Text>
        <View style={styles.sectionLine} />
      </View>

      {showFullPermissionNotice && (
        <View style={styles.permissionBox}>
          <Ionicons name='people-outline' size={36} color='#ccc' />
          <Text style={styles.permissionText}>
            {i18n.t('deviceContacts.permissionRequired')}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Abrir Configurações</Text>
          </TouchableOpacity>
        </View>
      )}

      {!permissionDenied && loadingContacts && (
        <View style={styles.loaderBox}>
          <ActivityIndicator size='large' color={colors.primary700} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={i18n.t('addContact.title')}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        style={styles.flex}
        data={!loadingContacts ? zojiContacts : []}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          showCompactPermissionNotice ? (
            <View style={styles.permissionBoxCompact}>
              <Ionicons name='people-outline' size={18} color='#ccc' />
              <Text style={styles.permissionTextCompact}>
                {i18n.t('deviceContacts.permissionOptional')}
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.permissionButtonTextCompact}>
                  Abrir Configurações
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps='handled'
        ListEmptyComponent={
          !loadingContacts ? (
            <View style={styles.emptyBox}>
              <Ionicons name='people-outline' size={40} color='#ccc' />
              <Text style={styles.emptyText}>
                {i18n.t('deviceContacts.noZojiContacts')}
              </Text>
            </View>
          ) : null
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

      <QRShareModal
        visible={isQRModalVisible}
        onClose={() => setIsQRModalVisible(false)}
      />
    </SafeAreaView>
  );
};
