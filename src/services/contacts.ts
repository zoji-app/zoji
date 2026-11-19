import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import {
  getUserRelationships,
  getContactsFromRelationshipsWithoutRecursion,
} from './relationships';
import { default as ContactsManagerInstance } from './ContactsManager';
import { logger } from '../utils/logger';

// ID simples para quando o uuid não puder ser gerado (sem crypto.getRandomValues
// — o polyfill é importado no App.tsx, então isto é só uma rede de segurança).
const generateSimpleId = (prefix = '') => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
};

const newMessageId = (): string => {
  try {
    return uuidv4();
  } catch {
    return generateSimpleId('msg');
  }
};

// Definição da interface Message
export interface Message {
  id: string;
  emoji: string;
  senderId: string;
  senderEmoji?: string;
  receiverId?: string;
  chatId?: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  read?: boolean;
}

// Interface para a última mensagem de um contato
export interface LastMessage {
  emoji: string;
  senderId: string;
  createdAt: Date | string;
  pending?: boolean;
  delivered?: boolean;
  id?: string;
  restored?: boolean; // Flag para indicar que a mensagem foi restaurada
}

export interface Contact {
  id: string;
  nickname: string;
  profileEmoji: string;
  phoneNumber: string;
  deviceName?: string;
  lastMessage: {
    createdAt: Date;
    emoji: string;
    senderId: string;
    senderEmoji?: string;
    pending?: boolean;
    delivered?: boolean;
  } | null;
  unreadCount?: number;
  isFavorite?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  lastInteractionAt?: Date;
  relationshipStatus?: string;
  relationshipId?: string;
  initiatedBy?: string;
}

// Chave base para os contatos do usuário
const getContactsKey = (userId: string) => `@zoji:contacts:${userId}`;

// Inicializa os contatos do usuário
export const initializeContacts = async (userId: string) => {
  try {
    const key = getContactsKey(userId);
    const storedContacts = await AsyncStorage.getItem(key);

    if (!storedContacts) {
      return [];
    }

    // Converter os contatos armazenados
    const parsedContacts = JSON.parse(storedContacts).map((contact: any) => ({
      ...contact,
      lastMessage: contact.lastMessage
        ? {
            ...contact.lastMessage,
            createdAt: new Date(contact.lastMessage.createdAt),
          }
        : null,
    }));

    // Removido setTimeout para evitar loop infinito de sincronização
    // A sincronização será chamada diretamente do FriendsScreen quando necessário

    return parsedContacts;
  } catch (error) {
    logger.error('Erro ao inicializar contatos:', error);
    return [];
  }
};

// Salva contatos no storage
export const saveContactsToStorage = async (
  userId: string,
  contacts: Contact[]
) => {
  try {
    const key = getContactsKey(userId);
    const contactsToStore = contacts.map(contact => ({
      ...contact,
      lastMessage: contact.lastMessage
        ? {
            ...contact.lastMessage,
            createdAt: contact.lastMessage.createdAt.getTime(),
          }
        : null,
    }));
    await AsyncStorage.setItem(key, JSON.stringify(contactsToStore));
  } catch (error) {
    logger.error('Erro ao salvar contatos:', error);
  }
};

// Carrega contatos do armazenamento local
export const loadContactsFromStorage = async (
  userId: string,
  skipRelationshipFallback: boolean = false
): Promise<Contact[]> => {
  try {
    // Obter chave para o armazenamento
    const contactsKey = getContactsKey(userId);

    // Carregar contatos do AsyncStorage
    const contactsJson = await AsyncStorage.getItem(contactsKey);
    let contacts: Contact[] = [];

    // Verificar se há contatos armazenados
    if (contactsJson) {
      try {
        // Converter string JSON para objeto e converter datas para objetos Date
        const parsedContacts = JSON.parse(contactsJson);

        contacts = parsedContacts.map((contact: any) => ({
          ...contact,
          // Converter timestamp de lastMessage de volta para objeto Date
          lastMessage: contact.lastMessage
            ? {
                ...contact.lastMessage,
                createdAt: new Date(contact.lastMessage.createdAt),
              }
            : null,
          // Converter lastInteractionAt de volta para objeto Date, se existir
          lastInteractionAt: contact.lastInteractionAt
            ? new Date(contact.lastInteractionAt)
            : undefined,
        }));

        // Loga quantos contatos foram carregados
        logger.debug(
          `[Contacts] ${contacts.length} contatos carregados do armazenamento local`
        );
      } catch (parseError) {
        logger.error(
          '[Contacts] Erro ao analisar contatos do armazenamento:',
          parseError
        );
      }
    } else {
      logger.debug(
        '[Contacts] Nenhum contato encontrado no armazenamento local'
      );

      // Se não houver contatos no armazenamento local e skipRelationshipFallback for false,
      // tentar carregar dos relacionamentos
      if (!skipRelationshipFallback) {
        try {
          logger.debug(
            '[Contacts] Tentando carregar contatos dos relacionamentos...'
          );
          const relationships = await getUserRelationships(userId);

          if (relationships && relationships.length > 0) {
            logger.debug(
              `[Contacts] ${relationships.length} relacionamentos encontrados, convertendo para contatos`
            );
            // Sem recarregar contatos de novo (evita o loop load → relationships → load)
            const contactsFromRelationships =
              (await getContactsFromRelationshipsWithoutRecursion(
                userId,
                relationships
              )) as unknown as Contact[];

            if (
              contactsFromRelationships &&
              contactsFromRelationships.length > 0
            ) {
              logger.debug(
                `[Contacts] ${contactsFromRelationships.length} contatos convertidos dos relacionamentos`
              );
              await saveContactsToStorage(userId, contactsFromRelationships);
              contacts = contactsFromRelationships;
            }
          }
        } catch (relError) {
          logger.error(
            '[Contacts] Erro ao tentar carregar dos relacionamentos:',
            relError
          );
        }
      }
    }

    return contacts;
  } catch (error) {
    logger.error(
      '[Contacts] Erro ao carregar contatos do armazenamento:',
      error
    );
    return [];
  }
};

// P7-2b: uma rajada de mudanças vira UM recarregamento da lista
// (contactsListUpdated no ContactsManager), disparado quando a rajada acaba.
// Antes: throttle de 300 ms que descartava mudanças no meio da rajada, mais
// duas notificações extras (100 ms e 500 ms) "para garantir".
const NOTIFY_DEBOUNCE_MS = 150;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

export const notifyContactsChanged = (_force: boolean = false) => {
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    try {
      ContactsManagerInstance.notifyContactsChanged(true);
    } catch (error) {
      logger.error(
        '[notifyContactsChanged] Erro ao notificar ContactsManager:',
        error
      );
    }
  }, NOTIFY_DEBOUNCE_MS);
};

/**
 * Regra única de mescla da última mensagem (usada no update individual e no
 * lote). Devolve a nova lastMessage, ou null se não precisa atualizar: só
 * atualiza se for forçado, se não havia mensagem, se a nova é mais recente ou
 * se a atual ainda está pendente.
 */
function mergeLastMessage(
  contact: Contact,
  lastMessage: Partial<Message>,
  forceUpdate: boolean
): Contact['lastMessage'] {
  let needsUpdate = forceUpdate || !contact.lastMessage;

  if (contact.lastMessage && lastMessage) {
    const currentMessageDate =
      contact.lastMessage.createdAt instanceof Date
        ? contact.lastMessage.createdAt
        : new Date(contact.lastMessage.createdAt);
    const newMessageDate =
      lastMessage.createdAt instanceof Date
        ? lastMessage.createdAt
        : lastMessage.createdAt
          ? new Date(lastMessage.createdAt)
          : new Date();

    if (newMessageDate > currentMessageDate || contact.lastMessage.pending) {
      needsUpdate = true;
    }
  }

  if (!needsUpdate) return null;

  let updatedMessage: any;
  try {
    if (contact.lastMessage) {
      updatedMessage = { ...contact.lastMessage, ...lastMessage };
      if (!updatedMessage.senderEmoji) {
        if (
          contact.lastMessage.senderEmoji &&
          updatedMessage.senderId === contact.lastMessage.senderId
        ) {
          // Mesmo remetente — dá para reaproveitar o último emoji dele
          updatedMessage.senderEmoji = contact.lastMessage.senderEmoji;
        } else if (updatedMessage.senderId === contact.id) {
          // Recebida sem emoji — usa o emoji de perfil atual do contato
          updatedMessage.senderEmoji = contact.profileEmoji;
        }
        // Enviada sem senderEmoji: o useChatSender sempre preenche; deixar
        // vazio aqui é mais seguro do que mostrar o emoji errado.
      }
    } else {
      updatedMessage = { ...lastMessage, id: newMessageId() };
    }

    if (!updatedMessage.id) updatedMessage.id = generateSimpleId('msg');
    if (!updatedMessage.createdAt) updatedMessage.createdAt = new Date();
    if (!updatedMessage.emoji) updatedMessage.emoji = '❓';
  } catch (updateError) {
    logger.error('[mergeLastMessage] Erro ao montar mensagem:', updateError);
    updatedMessage = {
      id: generateSimpleId('fallback'),
      emoji: lastMessage.emoji || '❓',
      senderId: lastMessage.senderId || 'unknown',
      createdAt: new Date(),
      pending: lastMessage.pending === true,
    };
  }

  return updatedMessage;
}

// Atualiza a última mensagem de um contato
export const updateContactLastMessage = async (
  userId: string,
  contactId: string,
  lastMessage: Partial<Message>,
  forceUpdate: boolean = false
): Promise<boolean> => {
  logger.debug(
    `[updateContactLastMessage] Atualizando lastMessage para ${contactId}`,
    lastMessage.emoji,
    forceUpdate ? '(FORÇADO);' : ''
  );

  try {
    // Verificar se o contato existe
    const contacts = await loadContactsFromStorage(userId);
    const contact = contacts.find(c => c.id === contactId);

    if (!contact) {
      logger.debug(
        `[updateContactLastMessage] Contato ${contactId} não encontrado`
      );
      return false;
    }

    const updatedMessage = mergeLastMessage(contact, lastMessage, forceUpdate);

    if (updatedMessage) {
      logger.debug(
        `[updateContactLastMessage] Atualizando última mensagem para ${contactId}`,
        lastMessage.emoji
      );

      contact.lastMessage = updatedMessage;

      // Salvar os contatos atualizados no armazenamento local
      await saveContactsToStorage(userId, contacts);

      logger.debug(
        `[updateContactLastMessage] Última mensagem atualizada para ${contactId} no storage`
      );

      // Tentar usar o ContactsManager para garantir propagação de eventos
      try {
        if (
          typeof ContactsManagerInstance !== 'undefined' &&
          ContactsManagerInstance
        ) {
          // MUDANÇA CRÍTICA: Usar as opções de mensagem para garantir atualização
          logger.debug(
            `[updateContactLastMessage] Atualizando via ContactsManager (prioridade alta);`
          );
          const updateOptions = {
            _messageUpdateOnly: true,
            _forceMessageOnly: true,
            _forceUpdate: true,
          };

          // Atualizar o contato no manager
          ContactsManagerInstance.updateContact(contactId, {
            ...contact,
            ...updateOptions,
          });

          // Forçar ordenação e emissão de eventos
          if (lastMessage && lastMessage.createdAt) {
            if (
              typeof ContactsManagerInstance.moveContactToTop === 'function'
            ) {
              logger.debug(
                `[updateContactLastMessage] Movendo contato para o topo da lista`
              );
              // Sempre emitir eventos para garantir atualização da UI
              ContactsManagerInstance.moveContactToTop(contactId, true, true);
            }
          }

          // NOTA: updateContact()/moveContactToTop() acima já emitem eventos
          // granulares ('message_updated'/'contact_updated') que os ouvintes
          // tratam com um patch barato em memória. NÃO chamar
          // ContactsManagerInstance.notifyContactsChanged(true) aqui — esse
          // broadcast genérico ('notify_contacts_changed') força um reload
          // completo da lista (útil só após uma sincronização em lote). Com
          // muitas conversas, cada mensagem recebida via WS chama esta função
          // individualmente, e esse reload por mensagem gerava uma tempestade
          // de "N contatos carregados do armazenamento local" — o log de
          // lentidão relatado pelo usuário com 139 conversas.

          return true;
        }
      } catch (managerError) {
        logger.error(
          '[updateContactLastMessage] Erro ao atualizar ContactsManager:',
          managerError
        );
      }

      // Fallback: notifica via eventos globais (sem delays — delays causam race condition)
      try {
        notifyContactsChanged(true);
      } catch (notifyError) {
        logger.error(
          `[updateContactLastMessage] Erro ao notificar mudança: ${notifyError}`
        );
      }

      return true;
    }

    logger.debug(
      `[updateContactLastMessage] Nenhuma atualização necessária para contato ${contactId}`
    );
    return false;
  } catch (error) {
    logger.error(
      '[updateContactLastMessage] Erro ao atualizar última mensagem:',
      error
    );
    return false;
  }
};

// Atualiza a lastMessage de vários contatos de uma vez (usado pela sincronização em lote).
// Faz UM load, UM save e UMA notificação ao ContactsManager, em vez do ciclo completo
// (load+save+sort+notify) por contato — evita custo O(n²) quando o usuário tem muitas conversas.
export const applyLastMessageUpdatesBatch = async (
  userId: string,
  updates: { contactId: string; lastMessage: Partial<Message> }[],
  forceUpdate: boolean = false
): Promise<boolean> => {
  if (updates.length === 0) return false;

  try {
    const contacts = await loadContactsFromStorage(userId);
    const contactsById = new Map(contacts.map(c => [c.id, c]));
    let changedAny = false;

    for (const { contactId, lastMessage } of updates) {
      const contact = contactsById.get(contactId);
      if (!contact) continue;

      const updatedMessage = mergeLastMessage(
        contact,
        lastMessage,
        forceUpdate
      );
      if (!updatedMessage) continue;

      contact.lastMessage = updatedMessage;
      changedAny = true;
    }

    if (!changedAny) return false;

    await saveContactsToStorage(userId, contacts);

    try {
      if (ContactsManagerInstance) {
        ContactsManagerInstance.initialize(contacts);
        ContactsManagerInstance.notifyContactsChanged(true);
      } else {
        notifyContactsChanged(true);
      }
    } catch (notifyError) {
      logger.error(
        '[applyLastMessageUpdatesBatch] Erro ao notificar mudança:',
        notifyError
      );
    }

    return true;
  } catch (error) {
    logger.error(
      '[applyLastMessageUpdatesBatch] Erro ao atualizar mensagens em lote:',
      error
    );
    return false;
  }
};

// Remove um contato
export const removeContact = async (userId: string, contactId: string) => {
  try {
    // Verificar parâmetros
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      logger.error('[removeContact] ID do usuário inválido');
      return false;
    }

    if (
      !contactId ||
      typeof contactId !== 'string' ||
      contactId.trim() === ''
    ) {
      logger.error('[removeContact] ID do contato inválido');
      return false;
    }

    // 1. Remove localmente
    const contacts = await loadContactsFromStorage(userId);
    const updatedContacts = contacts.filter(
      contact => contact.id !== contactId
    );
    await saveContactsToStorage(userId, updatedContacts);

    // Só local. A chamada antiga à API de relacionamento nunca funcionou
    // (importava um export inexistente) — e não pode ser religada como estava:
    // o id "a_b" passava por parseInt e apagaria o relacionamento de id `a`.
    // Este caminho só roda para contato com conta excluída (ChatRefactored).

    notifyContactsChanged();
    return true;
  } catch (error) {
    logger.error('Erro ao remover contato:', error);
    return false;
  }
};

// Adiciona um novo contato — não mais usado diretamente (AddContact screen usa relationshipsApi)
export const addContact = async (
  _targetUserId: string,
  _nickname: string = '',
  _profileEmoji: string = ''
): Promise<boolean> => {
  logger.warn('[addContact] Deprecated: use relationshipsApi.create instead');
  return false;
};

// Atualiza os dados do contato
export const updateContactData = async (
  userId: string,
  contactId: string,
  updates: { nickname?: string; profileEmoji?: string }
) => {
  try {
    const contacts = await loadContactsFromStorage(userId);
    const updatedContacts = contacts.map(contact => {
      if (contact.id === contactId) {
        return { ...contact, ...updates };
      }
      return contact;
    });
    await saveContactsToStorage(userId, updatedContacts);
    notifyContactsChanged();
  } catch (error) {
    logger.error('Erro ao atualizar dados do contato:', error);
  }
};

// Cache de perfis de contatos
export const cacheContactProfile = async (
  contactId: string,
  profileData: any
) => {
  try {
    await AsyncStorage.setItem(
      `@contact_profile_${contactId}`,
      JSON.stringify({
        ...profileData,
        cachedAt: new Date().toISOString(),
      })
    );
    logger.debug(`[Contacts] Perfil do contato ${contactId} salvo em cache`);
  } catch (error) {
    logger.error(
      `[Contacts] Erro ao salvar perfil do contato ${contactId} em cache:`,
      error
    );
  }
};

// Recupera perfil de contato do cache
export const getContactProfileFromCache = async (contactId: string) => {
  try {
    const cachedData = await AsyncStorage.getItem(
      `@contact_profile_${contactId}`
    );
    if (cachedData) {
      const profileData = JSON.parse(cachedData);
      logger.debug(
        `[Contacts] Perfil do contato ${contactId} recuperado do cache:`,
        {
          nickname: profileData?.nickname,
          cachedAt: profileData?.cachedAt,
        }
      );
      return profileData;
    }
    return null;
  } catch (error) {
    logger.error(
      `[Contacts] Erro ao recuperar perfil do contato ${contactId} do cache:`,
      error
    );
    return null;
  }
};

// Adiciona um listener para mudanças no perfil do contato — stub sem Firestore
export const clearContactLastMessage = async (
  userId: string,
  contactId: string
): Promise<void> => {
  try {
    const contacts = await loadContactsFromStorage(userId);
    const updated = contacts.map(c =>
      c.id === contactId ? { ...c, lastMessage: null } : c
    );
    await saveContactsToStorage(userId, updated as Contact[]);
    notifyContactsChanged(true);
  } catch (error) {
    logger.error('[clearContactLastMessage] Erro:', error);
  }
};

export function addContactProfileListener(
  _contactId: string,
  _callback: (contactProfile: any) => void
): () => void {
  return () => {};
}

// Atualiza um contato específico no storage
export const updateContactInStorage = async (
  userId: string,
  updatedContact: Contact
): Promise<boolean> => {
  try {
    logger.debug(
      `[updateContactInStorage] Atualizando contato ${updatedContact.id} no storage`
    );

    // Carregar todos os contatos
    const contacts = await loadContactsFromStorage(userId);

    // Encontrar o índice do contato a ser atualizado
    const contactIndex = contacts.findIndex(c => c.id === updatedContact.id);

    if (contactIndex === -1) {
      logger.debug(
        `[updateContactInStorage] Contato ${updatedContact.id} não encontrado no storage`
      );
      return false;
    }

    // Criar uma cópia segura do contato
    const safeUpdatedContact = { ...updatedContact };

    // Garantir que a data da última mensagem seja um objeto Date válido
    if (safeUpdatedContact.lastMessage) {
      // Garantir que createdAt exista e seja um objeto Date válido
      if (safeUpdatedContact.lastMessage.createdAt) {
        const createdAt = safeUpdatedContact.lastMessage.createdAt;
        safeUpdatedContact.lastMessage = {
          ...safeUpdatedContact.lastMessage,
          createdAt:
            createdAt instanceof Date
              ? createdAt
              : new Date(createdAt as string | number),
        };
      } else {
        // Se não tiver data, definir como data atual
        safeUpdatedContact.lastMessage = {
          ...safeUpdatedContact.lastMessage,
          createdAt: new Date(),
        };
      }
    }

    // Atualizar o contato na lista
    contacts[contactIndex] = safeUpdatedContact;

    // Salvar a lista atualizada
    await saveContactsToStorage(userId, contacts);

    logger.debug(
      `[updateContactInStorage] Contato ${updatedContact.id} atualizado com sucesso`
    );

    // Notificar sobre a mudança
    try {
      notifyContactsChanged(true);
    } catch (error) {
      logger.error(
        '[updateContactInStorage] Erro ao notificar mudança:',
        error
      );
    }

    return true;
  } catch (error) {
    logger.error(
      '[updateContactInStorage] Erro ao atualizar contato no storage:',
      error
    );
    return false;
  }
};
