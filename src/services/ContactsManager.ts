import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Interface do usuário/contato
export interface User {
  id: string;
  nickname: string;
  profileEmoji: string;
  phoneNumber: string;
  lastMessage: {
    emoji: string;
    senderId: string;
    createdAt: Date | string;
    pending?: boolean;
    delivered?: boolean;
  } | null;
  lastUpdate?: string;
  _messageUpdateOnly?: boolean;
  _forceMessageOnly?: boolean;
  _preventReload?: boolean;
  _forceUpdate?: boolean; // Flag para forçar atualização mesmo quando o conteúdo parece idêntico
  relationshipStatus?: string; // Status do relacionamento (accepted, rejected, blocked)
  relationshipId?: string; // ID do relacionamento
  rejectedBy?: string | null; // ID do usuário que rejeitou o contato, se aplicável
  lastMessageUpdateTimestamp?: number;
}

// Interface para opções de emissão de eventos
export interface EmitOptions {
  messageUpdateOnly?: boolean;
  forceMessageOnly?: boolean;
  preventReload?: boolean;
  forceUpdate?: boolean;
  contactId?: string;
  mode?: string;
}

// Interface do gerenciador de contatos
export interface ContactsManagerInterface {
  initialize(contactsList: User[]): void;
  updateContact(contactId: string, updates: Partial<User>): void;
  moveContactToTop(
    contactId: string,
    isMessageUpdateOnly: boolean,
    skipListEvents: boolean
  ): void;
  blockAllListEvents(durationMs: number): void;
  checkNewMessages(userId: string, afterDate: Date): Promise<boolean>;
}

// Enum para tipos de eventos
enum EventType {
  CONTACT_UPDATED = 'contactUpdated',
  MESSAGE_UPDATED = 'messageUpdated',
  CONTACTS_LIST_UPDATED = 'contactsListUpdated',
  CONTACT_ADDED = 'contactAdded',
}

// Classe para gerenciar manipulações de contatos sem causar re-renderizações desnecessárias
export class ContactsManagerClass implements ContactsManagerInterface {
  private contacts: Map<string, User> = new Map();
  private eventEmitter = new EventEmitter();
  private isInitialized = false;
  private isEventBlocked = false; // Flag para evitar múltiplos eventos em sequência
  private processingContacts = new Set<string>();
  private _listEventsBlocked: boolean = false;
  private _listEventsBlockTimer: NodeJS.Timeout | null = null;
  private _processingContact: string | null = null;
  private _blockMode: string = 'none';
  private _lastNotifyTime: number = 0;

  constructor() {
    // Sobrescrever o método emit do EventEmitter para adicionar proteção extra
    const originalEmit = this.eventEmitter.emit;
    this.eventEmitter.emit = (event: string, ...args: any[]) => {
      // Se estiver tentando emitir um evento de lista e for um evento de mensagem
      if (
        event === 'contactsListUpdated' &&
        (this as any)._lastEventType === 'message_update'
      ) {
        // Permitir evento de updateContact específico, mas bloquear eventos de lista
        return false;
      }

      // Verificar se os eventos estão bloqueados (permite bypass via _force)
      if (
        this.isEventBlocked &&
        event === 'contactsListUpdated' &&
        !args[0]?._force
      ) {
        return false;
      }

      return originalEmit.call(this.eventEmitter, event, ...args);
    };
  }

  /**
   * Método de depuração para verificar o estado do gerenciador
   */
  debugInfo(): string {
    const contactCount = this.contacts.size;
    const contactIds = Array.from(this.contacts.keys()).join(', ');

    return `[ContactsManager Debug] Inicializado: ${this.isInitialized}, Contatos: ${contactCount}, IDs: ${contactIds.substring(0, 50)}${contactIds.length > 50 ? '...' : ''}`;
  }

  /**
   * Inicializa o gerenciador com a lista atual de contatos
   */
  initialize(contactsList: User[]): void {
    // Se já foi inicializado, apenas atualizamos os contatos existentes ou adicionamos novos
    if (this.isInitialized) {
      // Evitar loop de eventos durante a inicialização
      this.disableEvents();

      contactsList.forEach(contact => {
        // Normalizar as datas para evitar problemas de comparação
        if (contact.lastMessage && contact.lastMessage.createdAt) {
          contact = {
            ...contact,
            lastMessage: {
              ...contact.lastMessage,
              createdAt:
                contact.lastMessage.createdAt instanceof Date
                  ? contact.lastMessage.createdAt
                  : new Date(contact.lastMessage.createdAt),
            },
          };
        }

        // Verificar se já existe e comparar última mensagem
        const existingContact = this.contacts.get(contact.id);
        if (
          existingContact &&
          existingContact.lastMessage &&
          contact.lastMessage
        ) {
          // Comparar qual mensagem é mais recente
          const existingDate =
            existingContact.lastMessage.createdAt instanceof Date
              ? existingContact.lastMessage.createdAt
              : new Date(existingContact.lastMessage.createdAt);

          const newDate =
            contact.lastMessage.createdAt instanceof Date
              ? contact.lastMessage.createdAt
              : new Date(contact.lastMessage.createdAt);

          if (newDate.getTime() >= existingDate.getTime()) {
            // Mensagem mais recente: atualiza tudo
            this.contacts.set(contact.id, contact);
          } else {
            // Mensagem mais antiga: mantém a mensagem existente mas sempre
            // atualiza campos de perfil (nickname, profileEmoji) e relacionamento
            this.contacts.set(contact.id, {
              ...existingContact,
              nickname: contact.nickname || existingContact.nickname,
              profileEmoji:
                contact.profileEmoji || existingContact.profileEmoji,
              relationshipStatus:
                contact.relationshipStatus ??
                existingContact.relationshipStatus,
              relationshipId:
                contact.relationshipId ?? existingContact.relationshipId,
            });
          }
        } else {
          // Se não existir ou não tiver mensagem, sempre atualiza
          this.contacts.set(contact.id, contact);
        }
      });

      // Reativar eventos após finalizar
      this.enableEvents();

      return;
    }

    this.contacts.clear();

    // Normalizar todas as datas antes de adicionar
    contactsList.forEach(contact => {
      // Garantir que a data da última mensagem seja um objeto Date
      if (contact.lastMessage && contact.lastMessage.createdAt) {
        const normalizedContact = {
          ...contact,
          lastMessage: {
            ...contact.lastMessage,
            createdAt:
              contact.lastMessage.createdAt instanceof Date
                ? contact.lastMessage.createdAt
                : new Date(contact.lastMessage.createdAt),
          },
        };
        this.contacts.set(contact.id, normalizedContact);
      } else {
        this.contacts.set(contact.id, contact);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Desativa temporariamente os eventos para evitar loops
   */
  disableEvents(): void {
    this.isEventBlocked = true;
  }

  /**
   * Reativa os eventos após operações em lote
   */
  enableEvents(): void {
    setTimeout(() => {
      this.isEventBlocked = false;
    }, 500);
  }

  /**
   * Atualiza um contato existente ou adiciona um novo
   */
  updateContact(contactId: string, updates: Partial<User>): boolean {
    if (!contactId || !updates) {
      logger.warn(
        '[ContactsManager] Tentativa de atualizar contato com dados inválidos'
      );
      return false;
    }

    // Verificar se eventos estão bloqueados e não é uma atualização forçada
    const isForceUpdate = updates._forceUpdate === true;
    const isMessageUpdate = updates._messageUpdateOnly === true;

    // Log com informações detalhadas

    // Bloquear apenas quando isEventBlocked e não for uma atualização forçada
    if (this.isEventBlocked && !isForceUpdate) {
      return false;
    }

    // Obter o contato existente
    const existingContact = this.contacts.get(contactId);

    // Se não encontrar o contato, log e retorno
    if (!existingContact) {
      logger.warn(`[ContactsManager] Contato não encontrado: ${contactId}`);
      return false;
    }

    // VERIFICAÇÃO IMPORTANTE: Se estamos mudando o status para "accepted", garantir que rejectedBy seja limpo
    if (
      updates.relationshipStatus === 'accepted' &&
      existingContact.relationshipStatus !== 'accepted'
    ) {
      updates.rejectedBy = null;
    }

    // PROTEÇÃO CRÍTICA: Nunca apagar mensagens de contatos aceitos
    // Esta verificação impede que qualquer atualização limpe a última mensagem
    // de um contato com status ACCEPTED, a menos que seja uma atualização explícita de mensagem
    if (
      updates.lastMessage === null &&
      existingContact.lastMessage &&
      existingContact.relationshipStatus === 'accepted' &&
      !isMessageUpdate
    ) {
      // PROTEÇÃO ADICIONAL: Manter a última mensagem existente
      updates.lastMessage = existingContact.lastMessage;
    }

    // Atualizar o contato com as novas informações
    let updated = false;
    let updatedContact = { ...existingContact };

    // Para atualizações de última mensagem
    if (isMessageUpdate && updates.lastMessage) {
      // Se for forceUpdate, sempre atualizar
      if (isForceUpdate) {
        // MELHORIA: Salvar a informação de quando a última atualização ocorreu
        // para evitar ciclos de atualizações frequentes
        const now = new Date();
        updatedContact = {
          ...existingContact,
          lastMessage: updates.lastMessage,
          lastMessageUpdateTimestamp: now.getTime(),
        };
        this.contacts.set(contactId, updatedContact);
        updated = true;
      } else if (existingContact.lastMessage) {
        // Verificar se a mensagem nova é mais recente que a existente
        try {
          const existingDate =
            existingContact.lastMessage.createdAt instanceof Date
              ? existingContact.lastMessage.createdAt
              : new Date(existingContact.lastMessage.createdAt);

          const newDate =
            updates.lastMessage.createdAt instanceof Date
              ? updates.lastMessage.createdAt
              : new Date(updates.lastMessage.createdAt);

          // MELHORIA: Verificar se a última atualização foi muito recente
          // para evitar ciclos de atualização
          const now = new Date();
          const lastUpdateTime =
            existingContact.lastMessageUpdateTimestamp || 0;
          const timeSinceLastUpdate = now.getTime() - lastUpdateTime;
          const MIN_UPDATE_INTERVAL = 2000; // 2 segundos para evitar atualizações muito frequentes

          // Se a mensagem for mais recente OU se a mensagem for a mesma mas o status mudou
          if (
            newDate.getTime() > existingDate.getTime() ||
            (updates.lastMessage.emoji === existingContact.lastMessage.emoji &&
              updates.lastMessage.senderId ===
                existingContact.lastMessage.senderId &&
              updates.lastMessage.pending !==
                existingContact.lastMessage.pending) ||
            timeSinceLastUpdate > MIN_UPDATE_INTERVAL
          ) {
            updatedContact = {
              ...existingContact,
              lastMessage: updates.lastMessage,
              lastMessageUpdateTimestamp: now.getTime(),
            };
            this.contacts.set(contactId, updatedContact);
            updated = true;
          } else {
          }
        } catch (dateError) {
          logger.error(`[ContactsManager] Erro ao comparar datas:`, dateError);

          // Em caso de erro, atualizar mesmo assim para evitar dados inconsistentes
          updatedContact = {
            ...existingContact,
            lastMessage: updates.lastMessage,
          };
          this.contacts.set(contactId, updatedContact);
          updated = true;
        }
      } else {
        // Se não havia mensagem anterior, atualizar sempre
        updatedContact = {
          ...existingContact,
          lastMessage: updates.lastMessage,
          lastMessageUpdateTimestamp: new Date().getTime(),
        };
        this.contacts.set(contactId, updatedContact);
        updated = true;
      }
    }
    // Para outras atualizações (não apenas mensagens)
    else {
      // Criar um objeto com os campos atualizados
      const updateFields: Partial<User> = {};
      let fieldsUpdated = false;

      // Processar cada campo do objeto updates
      Object.keys(updates).forEach(key => {
        // Ignorar campos internos de controle
        if (
          key !== '_forceUpdate' &&
          key !== '_messageUpdateOnly' &&
          key !== '_forceMessageOnly' &&
          key !== '_preventReload'
        ) {
          // Campo especial: lastMessage
          if (key === 'lastMessage') {
            const lastMessageUpdate = updates.lastMessage;

            // Se tiver lastMessage anterior e nova lastMessage
            if (lastMessageUpdate && existingContact.lastMessage) {
              // Comparar datas
              const existingDate =
                existingContact.lastMessage.createdAt instanceof Date
                  ? existingContact.lastMessage.createdAt.getTime()
                  : new Date(existingContact.lastMessage.createdAt).getTime();

              const newDate =
                lastMessageUpdate.createdAt instanceof Date
                  ? lastMessageUpdate.createdAt.getTime()
                  : new Date(lastMessageUpdate.createdAt).getTime();

              // Atualizar se a mensagem for mais recente ou forceUpdate
              if (newDate >= existingDate || isForceUpdate) {
                updateFields.lastMessage =
                  lastMessageUpdate as User['lastMessage'];
                fieldsUpdated = true;
              }
            }
            // Se não tiver lastMessage anterior ou a nova for null
            else {
              updateFields.lastMessage =
                lastMessageUpdate as User['lastMessage'];
              fieldsUpdated = true;
            }
          }
          // Outros campos
          else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (updateFields as any)[key] = updates[key as keyof User];
            fieldsUpdated = true;
          }
        }
      });

      // Se algum campo foi atualizado, aplicar atualização
      if (fieldsUpdated) {
        updatedContact = { ...existingContact, ...updateFields };
        this.contacts.set(contactId, updatedContact);
        updated = true;
      }
    }

    // Se houve alguma atualização, notificar os listeners
    if (updated) {
      // IMPORTANTE: Para atualizações de mensagem com forceUpdate, sempre notificar
      if (isForceUpdate || !isMessageUpdate) {
        this._emitContactsUpdated(updatedContact, {
          forceUpdate: isForceUpdate,
          messageUpdateOnly: isMessageUpdate,
          forceMessageOnly: updates._forceMessageOnly || false,
          preventReload: updates._preventReload || false,
        });

        // Segunda notificação após pequeno atraso
        if (isMessageUpdate && isForceUpdate) {
          setTimeout(() => {
            this._emitContactsUpdated(updatedContact, {
              forceUpdate: true,
              messageUpdateOnly: true,
            });
          }, 200);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Move um contato para o topo da lista (para ordenação)
   */
  moveContactToTop(
    contactId: string,
    skipSort: boolean = false,
    skipListEvents: boolean = false
  ): boolean {
    const contact = this.contacts.get(contactId);
    if (!contact) {
      return false;
    }

    // Atualizar timestamp para ordenação
    contact.lastUpdate = new Date().toISOString();

    // Ordenar contatos - SEMPRE ordenar para garantir consistência
    this.sortContactsByLastMessage();

    // IMPORTANTE: Emissor eventos SEMPRE, independente de skipListEvents
    // Precisamos garantir que a UI reflita a ordenação correta

    this._emitContactsUpdated(contact, {
      forceUpdate: true,
      mode: 'moveToTop',
    });

    return true;
  }

  /**
   * Verifica se um contato existe no gerenciador
   */
  contactExists(contactId: string): boolean {
    return this.contacts.has(contactId);
  }

  /**
   * Obtém um contato específico pelo ID
   * @param contactId ID do contato a ser obtido
   * @returns O contato ou undefined se não existir
   */
  getContact(contactId: string): User | undefined {
    return this.contacts.get(contactId);
  }

  /**
   * Retorna todos os contatos ordenados por data da última mensagem
   */
  getAllContacts(): User[] {
    // Converter o Map para array
    const contactsArray = Array.from(this.contacts.values());

    // Garantir que todas as datas são objetos Date válidos antes de ordenar
    const normalizedContacts = contactsArray.map(contact => {
      if (contact.lastMessage && contact.lastMessage.createdAt) {
        return {
          ...contact,
          lastMessage: {
            ...contact.lastMessage,
            createdAt:
              contact.lastMessage.createdAt instanceof Date
                ? contact.lastMessage.createdAt
                : new Date(contact.lastMessage.createdAt),
          },
        };
      }
      return contact;
    });

    // Ordenar contatos por data da última mensagem (mais recente primeiro)
    return normalizedContacts.sort((a, b) => {
      // Se ambos têm mensagens, compara as datas
      if (a.lastMessage && b.lastMessage) {
        // Garantir que as datas sejam objetos Date
        const dateA =
          a.lastMessage.createdAt instanceof Date
            ? a.lastMessage.createdAt
            : new Date(a.lastMessage.createdAt);

        const dateB =
          b.lastMessage.createdAt instanceof Date
            ? b.lastMessage.createdAt
            : new Date(b.lastMessage.createdAt);

        return dateB.getTime() - dateA.getTime();
      }

      // Contatos com mensagens vêm primeiro
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;

      // Se nenhum tem mensagem, ordena por nome
      return a.nickname.localeCompare(b.nickname);
    });
  }

  /**
   * Registra um ouvinte para atualizações de contatos específicos
   */
  onContactUpdate(
    callback: (contactId: string, updatedContact: User) => void
  ): () => void {
    this.eventEmitter.on('contactUpdated', callback);
    return () => {
      this.eventEmitter.off('contactUpdated', callback);
    };
  }

  /**
   * Registra um ouvinte para adição de novos contatos
   */
  onContactAdded(callback: (newContact: User) => void): () => void {
    this.eventEmitter.on('contactAdded', callback);
    return () => {
      this.eventEmitter.off('contactAdded', callback);
    };
  }

  /**
   * Registra um listener para alterações na lista completa de contatos
   */
  onContactsListUpdated(callback: () => void): () => void {
    // NOVA IMPLEMENTAÇÃO: Sem throttling para garantir que todos os eventos sejam processados
    // Removemos o throttling anterior para evitar perda de eventos

    // Registrar diretamente sem throttling
    this.eventEmitter.on('contactsListUpdated', callback);

    // Retorna função para cancelar o listener
    return () => {
      this.eventEmitter.off('contactsListUpdated', callback);
    };
  }

  /**
   * Adiciona um listener para quando um contato específico for atualizado
   */
  addContactUpdatedListener(
    callback: (contactId: string, updatedContact: User) => void
  ): { remove: () => void } {
    this.eventEmitter.addListener('contactUpdated', callback);

    return {
      remove: () => {
        this.eventEmitter.removeListener('contactUpdated', callback);
      },
    };
  }

  /**
   * Registra um listener para um evento específico
   */
  onEvent(eventName: string, callback: (data: any) => void): () => void {
    this.eventEmitter.on(eventName, callback);

    return () => {
      this.eventEmitter.off(eventName, callback);
    };
  }

  /**
   * Bloqueia temporariamente TODOS os eventos de lista para evitar recarregamentos
   * @param durationMs Duração do bloqueio em milissegundos
   */
  blockAllListEvents(durationMs: number = 1000): void {
    // Limpar timer existente se houver
    if (this._listEventsBlockTimer) {
      clearTimeout(this._listEventsBlockTimer);
      this._listEventsBlockTimer = null;
    }

    // IMPORTANTE: Não bloquear completamente, apenas modificar comportamento
    // Em vez de bloquear todos os eventos, vamos definir um modo "seletivo"
    this._listEventsBlocked = true; // Ainda definir como true para compatibilidade
    (this as any)._blockMode = 'selective';

    // Criar timer para desbloquear após a duração
    this._listEventsBlockTimer = setTimeout(() => {
      this._listEventsBlocked = false;
      (this as any)._blockMode = 'none';
      this._listEventsBlockTimer = null;
    }, durationMs);
  }

  /**
   * Emite eventos de atualização de contatos
   */
  private _emitContactsUpdated(
    contact: User,
    options: Partial<EmitOptions> = {}
  ) {
    // Extrair opções
    const messageUpdateOnly = options.messageUpdateOnly || false;
    const forceMessageOnly = options.forceMessageOnly || false;
    const forceUpdate =
      options.forceUpdate || messageUpdateOnly || forceMessageOnly;
    const source = messageUpdateOnly ? 'message_updated' : 'contact_updated';

    // MELHORIA IMPORTANTE: Para eventos de mensagens, sempre emitir mesmo com _listEventsBlocked=true
    const isMessageEvent = messageUpdateOnly || forceMessageOnly;

    // Log detalhado para depuração de eventos

    // Eventos relacionados a mensagens SEMPRE devem ser propagados, independente de bloqueios
    const shouldEmit =
      !this._listEventsBlocked || isMessageEvent || options.forceUpdate;

    if (!shouldEmit) {
      return;
    }

    // Exibir informações adicionais para mensagens
    if (isMessageEvent && contact.lastMessage) {
    }

    // ESTRATÉGIA: Usar setTimeout para garantir que eventos diferentes sejam processados em ciclos separados
    // Isso evita problemas de múltiplos eventos no mesmo ciclo de execução
    setTimeout(() => {
      // Emitir evento com metadados para melhor rastreamento
      this.eventEmitter.emit('contactsListUpdated', {
        forceUpdate: true,
        _force: forceUpdate, // bypasses isEventBlocked when true
        source,
        updatedContact: contact.id,
        contact,
        timestamp: Date.now(),
      });
    }, 0);

    // CRÍTICO: Sempre emitir messageUpdated para eventos de mensagem
    if (isMessageEvent) {
      // Criar cópia do contato para garantir que não haja problemas de referência
      const contactCopy = JSON.parse(JSON.stringify(contact));

      // Garantir que a data seja válida após JSON.parse
      if (contactCopy.lastMessage && contactCopy.lastMessage.createdAt) {
        contactCopy.lastMessage.createdAt = new Date(
          contactCopy.lastMessage.createdAt
        );
      }

      setTimeout(() => {
        this.eventEmitter.emit('messageUpdated', {
          forceUpdate: true,
          source: 'message_updated',
          contact: contactCopy,
          updatedContact: contact.id,
          timestamp: Date.now(),
        });
      }, 10);
    }
  }

  private sortContactsByLastMessage(): User[] {
    // Converter para array
    const contactsArray = Array.from(this.contacts.values());

    // Ordenar por data da última mensagem (mais recente primeiro)
    return contactsArray.sort((a, b) => {
      // Se tem lastUpdate, usar isso como principal critério
      if (a.lastUpdate && b.lastUpdate) {
        return (
          new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
        );
      }

      // Se um dos contatos tem lastMessage e o outro não
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;

      // Se ambos têm lastMessage
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

      // Sem critérios de ordenação, usar alfabético
      return a.nickname.localeCompare(b.nickname);
    });
  }

  public notifyContactsChanged(forceUpdate = false): void {
    // Implementação para evitar notificações múltiplas e sucessivas
    // Usamos uma variável estática para controlar o tempo da última notificação
    const now = Date.now();
    const lastNotifyTime = (this as any)._lastNotifyTime || 0;
    const MIN_NOTIFY_INTERVAL = 1000; // Intervalo mínimo de 1 segundo entre notificações

    // Atualizar o timestamp da última notificação
    (this as any)._lastNotifyTime = now;

    // Se a última notificação foi muito recente e não estamos forçando, ignorar
    if (now - lastNotifyTime < MIN_NOTIFY_INTERVAL && !forceUpdate) {
      return;
    }

    this.eventEmitter.emit(EventType.CONTACTS_LIST_UPDATED, {
      source: 'notify_contacts_changed',
      timestamp: now,
      forceUpdate: true,
      _force: forceUpdate, // bypasses isEventBlocked when true
    });
  }

  /**
   * Verifica novas mensagens mais recentes que a data fornecida.
   * Polling is handled by messages.ts / useChatMessages — this is a no-op stub.
   */
  async checkNewMessages(_userId: string, _afterDate: Date): Promise<boolean> {
    // No-op: message updates are handled by REST API polling in messages.ts
    return false;
  }
}

// Singleton
export const ContactsManager = new ContactsManagerClass();
export default ContactsManager;
