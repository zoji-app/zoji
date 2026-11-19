import { useState, useCallback, useRef, useEffect } from 'react';
import { User } from '../types';
import { loadContactsFromStorage } from '../../../services/contacts';
import { syncContactsStorage } from '../../../services/relationships';
import { getLastMessagesForContacts } from '../../../services/localMessages';
import NetInfo from '@react-native-community/netinfo';
import { default as ContactsManagerInstance } from '../../../services/ContactsManager';
import { wsService } from '../../../services/wsService';
import { debounce } from 'lodash';
import { logger } from '../../../utils/logger';

/**
 * Hook para gerenciar contatos na tela de amigos
 */
export const useContacts = (userId: string | undefined) => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeviceOffline, setIsDeviceOffline] = useState(false);

  // Refs para controle de estado
  const contactsRef = useRef<User[]>([]);
  const isUpdatingContacts = useRef(false);
  const lastContactsUpdateTimestamp = useRef(Date.now());
  const MIN_UPDATE_INTERVAL = 1000;
  const lastLoadRef = useRef<number>(0);

  // Atualizar a ref quando os contatos mudarem
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  /**
   * Verifica a conectividade do dispositivo
   */
  const checkConnectivityBeforeUpdate = async () => {
    try {
      const state = await NetInfo.fetch();
      const isConnected = !!state.isConnected;
      setIsDeviceOffline(!isConnected);
      return isConnected;
    } catch (error) {
      logger.error('[useContacts] Erro ao verificar conectividade:', error);
      setIsDeviceOffline(true);
      return false;
    }
  };

  /**
   * Função para ordenar contatos
   */
  const sortContacts = useCallback((contactList: User[]) => {
    return [...contactList].sort((a, b) => {
      // Contatos com mensagens vêm primeiro, ordenados por data
      if (a.lastMessage && b.lastMessage) {
        const dateA =
          a.lastMessage.createdAt instanceof Date
            ? a.lastMessage.createdAt.getTime()
            : new Date(a.lastMessage.createdAt).getTime();

        const dateB =
          b.lastMessage.createdAt instanceof Date
            ? b.lastMessage.createdAt.getTime()
            : new Date(b.lastMessage.createdAt).getTime();

        return dateB - dateA;
      }
      // Contatos com mensagens vêm antes daqueles sem mensagens
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      // Por último, ordenar por nome
      return a.nickname.localeCompare(b.nickname);
    });
  }, []);

  /**
   * Função para carregar contatos
   */
  const loadContacts = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      await checkConnectivityBeforeUpdate();

      // Sincroniza relacionamentos da API e atualiza o storage de contatos
      await syncContactsStorage(userId);

      const storedContacts = await loadContactsFromStorage(userId);

      if (storedContacts.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Deriva lastMessage diretamente do histórico local de cada conversa
      const lastMsgMap = await getLastMessagesForContacts(
        userId,
        storedContacts.map(c => c.id)
      );

      const processedContacts = storedContacts.map(contact => {
        const historyMsg = lastMsgMap.get(contact.id) ?? null;
        const storedMsg = contact.lastMessage;

        // Use the most recent message between message-history store and contacts store.
        // History is only written when the chat screen is open, so the contacts store
        // may have a newer message (set via updateContactLastMessage from WS events).
        let lastMessage: typeof storedMsg;
        if (!historyMsg) {
          lastMessage = storedMsg;
        } else if (!storedMsg) {
          lastMessage = historyMsg;
        } else {
          const hTs = new Date(historyMsg.createdAt).getTime();
          const sTs = new Date(storedMsg.createdAt).getTime();
          lastMessage = sTs > hTs ? storedMsg : historyMsg;
        }

        return { ...contact, lastMessage };
      });

      // Ordenar contatos (mais recentes primeiro)
      const sortedContacts = sortContacts(processedContacts);

      if (ContactsManagerInstance) {
        ContactsManagerInstance.initialize(sortedContacts);
      }

      setContacts(sortedContacts);

      // Atualizar timestamp da última atualização
      lastLoadRef.current = Date.now();

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      logger.error('[useContacts] Erro ao carregar contatos:', error);
      setError('Erro ao carregar contatos');
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Implementar debounce para evitar recargas frequentes demais
  const debouncedLoadContacts = useCallback(debounce(loadContacts, 300), [
    loadContacts,
  ]);

  // Atualizar contatos a partir do ContactsManager sem recarregar
  const updateContactsFromManager = useCallback(() => {
    if (!ContactsManagerInstance) return;
    isUpdatingContacts.current = true;
    (async () => {
      try {
        if (!userId) return;
        const storedContacts = await loadContactsFromStorage(userId);
        if (storedContacts.length === 0) return;
        const lastMsgMap = await getLastMessagesForContacts(
          userId,
          storedContacts.map(c => c.id)
        );
        const processedContacts = storedContacts.map(c => ({
          ...c,
          lastMessage: lastMsgMap.get(c.id) ?? null,
        }));
        const sortedContacts = sortContacts(processedContacts);
        ContactsManagerInstance.initialize(sortedContacts);
        setContacts(sortedContacts);
      } catch (error) {
        logger.error('[useContacts] Erro ao recarregar contatos:', error);
      } finally {
        isUpdatingContacts.current = false;
      }
    })();
  }, [userId, sortContacts]);

  // Função para bloquear eventos de lista por um período
  const blockListEventsForMessageUpdate = useCallback(
    (contactId: string) => {
      if (!ContactsManagerInstance) return;
      try {
        const managerContacts = ContactsManagerInstance.getAllContacts();
        if (managerContacts.length > 0) {
          setContacts(sortContacts(managerContacts));
        }
      } catch (error) {
        logger.error(
          '[useContacts] Erro ao atualizar antes do bloqueio:',
          error
        );
      }
      ContactsManagerInstance.blockAllListEvents(1000);
      setTimeout(() => {
        try {
          const all = ContactsManagerInstance.getAllContacts();
          if (all.length > 0) setContacts(sortContacts(all));
        } catch (error) {
          logger.error('[useContacts] Erro ao atualizar após bloqueio:', error);
        }
      }, 1100);
    },
    [sortContacts]
  );

  // Função para atualizar contatos (para o pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!userId) return;

    setRefreshing(true);
    await loadContacts();
  }, [userId, loadContacts]);

  // Escuta eventos do ContactsManager e atualiza a lista
  useEffect(() => {
    if (!ContactsManagerInstance) {
      logger.warn('[useContacts] ContactsManagerInstance não disponível');
      return;
    }

    const handleContactsEvents = (data: any, eventType: string) => {
      const isMessageEvent =
        eventType === 'messageUpdated' || data?.source === 'message_updated';

      if (isMessageEvent) {
        lastLoadRef.current = Date.now();
        if (data.contact?.id) {
          const allContacts = contactsRef.current.slice();
          const idx = allContacts.findIndex(c => c.id === data.contact.id);
          if (idx !== -1) {
            const updated = { ...data.contact };
            if (updated.lastMessage?.createdAt) {
              updated.lastMessage = {
                ...updated.lastMessage,
                createdAt:
                  updated.lastMessage.createdAt instanceof Date
                    ? updated.lastMessage.createdAt
                    : new Date(updated.lastMessage.createdAt),
              };
            }
            // Só aplica se a mensagem do evento for mais recente que a atual
            const currentMsg = contactsRef.current[idx]?.lastMessage;
            if (currentMsg && updated.lastMessage?.createdAt) {
              const currentTs =
                currentMsg.createdAt instanceof Date
                  ? currentMsg.createdAt.getTime()
                  : new Date(currentMsg.createdAt).getTime();
              const newTs = updated.lastMessage.createdAt.getTime();
              if (newTs < currentTs) return;
            }
            allContacts[idx] = updated;
            setContacts(sortContacts(allContacts));
            return;
          }
        }
        // Contato não encontrado em memória — ignora, o listener WS direto já cuida
        return;
      }

      // Atualização de perfil (nickname/emoji): aplica direto do dado do CM
      // sem ir ao storage — evita race condition com loadContacts em voo
      if (data?.source === 'contact_updated' && data.contact?.id) {
        setContacts(prev => {
          const idx = prev.findIndex(c => c.id === data.contact.id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            nickname: data.contact.nickname ?? updated[idx].nickname,
            profileEmoji:
              data.contact.profileEmoji ?? updated[idx].profileEmoji,
          };
          return sortContacts(updated);
        });
        return;
      }

      // Eventos genéricos (novo contato, relacionamento): cooldown de 60s
      // para não competir com atualizações WS em tempo real
      const timeSinceLastLoad = Date.now() - lastLoadRef.current;
      if (data?.forceUpdate === true || timeSinceLastLoad > 60000) {
        loadContacts();
      }
    };

    const cleanupContacts = ContactsManagerInstance.onEvent(
      'contactsListUpdated',
      data => handleContactsEvents(data, 'contactsListUpdated')
    );
    const cleanupMessages = ContactsManagerInstance.onEvent(
      'messageUpdated',
      data => handleContactsEvents(data, 'messageUpdated')
    );

    return () => {
      cleanupContacts();
      cleanupMessages();
    };
  }, [loadContacts]);

  // Atualização direta via WS — bypassa completamente o ContactsManager
  useEffect(() => {
    const unsubProfile = wsService.on('profile.updated', (payload: any) => {
      if (!payload?.user_id) return;
      const contactId = String(payload.user_id);
      setContacts(prev => {
        const idx = prev.findIndex(c => c.id === contactId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          nickname: payload.nickname ?? updated[idx].nickname,
          profileEmoji: payload.profile_emoji ?? updated[idx].profileEmoji,
        };
        return updated;
      });
    });

    const unsubMessage = wsService.on('message.new', (payload: any) => {
      if (!payload?.sender_id) return;
      const senderId = String(payload.sender_id);
      // contact_id identifica o outro lado quando vem de sync.last_messages
      const contactId = payload.contact_id
        ? String(payload.contact_id)
        : senderId;
      const msg = {
        id: String(payload.id ?? Date.now()),
        emoji: payload.emoji ?? '',
        senderId,
        senderEmoji: payload.sender_emoji ?? undefined,
        createdAt: new Date(payload.created_at ?? Date.now()),
        pending: false as const,
        delivered: true as const,
      };
      setContacts(prev => {
        const idx = prev.findIndex(c => c.id === contactId);
        if (idx === -1) return prev;
        const existing = prev[idx].lastMessage;
        if (existing) {
          const existingDate =
            existing.createdAt instanceof Date
              ? existing.createdAt.getTime()
              : new Date(existing.createdAt).getTime();
          if (msg.createdAt.getTime() <= existingDate) return prev;
        }
        const updated = [...prev];
        const prevMsg = prev[idx].lastMessage;
        const resolvedSenderEmoji =
          msg.senderEmoji ||
          (prevMsg?.senderId === msg.senderId
            ? prevMsg?.senderEmoji
            : undefined) ||
          prev[idx].profileEmoji ||
          undefined;
        updated[idx] = {
          ...updated[idx],
          lastMessage: { ...msg, senderEmoji: resolvedSenderEmoji },
        };
        return sortContacts(updated);
      });
    });

    return () => {
      unsubProfile();
      unsubMessage();
    };
  }, [sortContacts]);

  /**
   * Refresh rápido a partir do storage local — sem chamada à API.
   * Usa a mesma lógica de merge que loadContacts (history + contacts store, mais recente vence).
   * Seguro de chamar a cada foco de tela.
   */
  const forceUpdate = useCallback(async () => {
    if (!userId || isUpdatingContacts.current) return;
    try {
      isUpdatingContacts.current = true;
      const storedContacts = await loadContactsFromStorage(userId);
      if (storedContacts.length === 0) return;
      const lastMsgMap = await getLastMessagesForContacts(
        userId,
        storedContacts.map(c => c.id)
      );
      const processed = storedContacts.map(c => {
        const historyMsg = lastMsgMap.get(c.id) ?? null;
        const storedMsg = c.lastMessage;
        let lastMessage: typeof storedMsg;
        if (!historyMsg) {
          lastMessage = storedMsg;
        } else if (!storedMsg) {
          lastMessage = historyMsg;
        } else {
          const hTs = new Date(historyMsg.createdAt).getTime();
          const sTs = new Date(storedMsg.createdAt).getTime();
          lastMessage = sTs > hTs ? storedMsg : historyMsg;
        }
        return { ...c, lastMessage };
      });
      // setState funcional garante merge com o estado mais recente do React,
      // evitando race condition entre leitura do storage e eventos WS simultâneos.
      setContacts(prevContacts => {
        const prevMap = new Map(prevContacts.map(c => [c.id, c]));
        const merged = processed.map(c => {
          const inMem = prevMap.get(c.id);
          const inMemMsg = inMem?.lastMessage;
          if (!inMemMsg || !c.lastMessage) return c;
          const inMemTs = new Date(inMemMsg.createdAt).getTime();
          const storageTs = new Date(c.lastMessage.createdAt).getTime();
          return inMemTs > storageTs ? { ...c, lastMessage: inMemMsg } : c;
        });
        const sorted = sortContacts(merged);
        ContactsManagerInstance?.initialize(sorted);
        lastLoadRef.current = Date.now();
        return sorted;
      });
    } catch (error) {
      logger.error('[useContacts] Erro ao forçar recarga:', error);
    } finally {
      isUpdatingContacts.current = false;
    }
  }, [userId, sortContacts]);

  // Função auxiliar para verificar mudanças reais nos contatos
  const checkForChanges = (
    newContacts: User[],
    currentContacts: User[]
  ): boolean => {
    // Diferença no número de contatos
    if (newContacts.length !== currentContacts.length) return true;

    for (const newContact of newContacts) {
      const currentContact = currentContacts.find(c => c.id === newContact.id);

      // Contato novo
      if (!currentContact) return true;

      // Alteração em nome ou emoji
      if (
        newContact.nickname !== currentContact.nickname ||
        newContact.profileEmoji !== currentContact.profileEmoji
      ) {
        return true;
      }

      // Verificar última mensagem
      if (
        (newContact.lastMessage && !currentContact.lastMessage) ||
        (!newContact.lastMessage && currentContact.lastMessage)
      ) {
        return true;
      }

      if (newContact.lastMessage && currentContact.lastMessage) {
        const newDate =
          newContact.lastMessage.createdAt instanceof Date
            ? newContact.lastMessage.createdAt.getTime()
            : new Date(newContact.lastMessage.createdAt).getTime();

        const currentDate =
          currentContact.lastMessage.createdAt instanceof Date
            ? currentContact.lastMessage.createdAt.getTime()
            : new Date(currentContact.lastMessage.createdAt).getTime();

        // Diferenças na última mensagem
        if (
          newDate !== currentDate ||
          newContact.lastMessage.emoji !== currentContact.lastMessage.emoji ||
          newContact.lastMessage.senderId !==
            currentContact.lastMessage.senderId ||
          newContact.lastMessage.pending !== currentContact.lastMessage.pending
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Event to reload contacts with their updated profiles from storage
  const onContactsReloaded = async (options: any = {}) => {
    const { _forceUpdate } = options;
    if (isUpdatingContacts.current && !_forceUpdate) return;
    if (!userId) return;
    try {
      await loadContacts();
    } catch (error) {
      logger.error('[useContacts] Erro ao recarregar contatos:', error);
    }
  };

  return {
    contacts,
    loading,
    refreshing,
    error,
    isDeviceOffline,
    reloadContacts: loadContacts,
    debouncedLoadContacts,
    updateContactsFromManager,
    blockListEventsForMessageUpdate,
    onRefresh,
    forceUpdate,
    lastLoadRef,
    onContactsReloaded,
  };
};
