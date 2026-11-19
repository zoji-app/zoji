/**
 * Enum com os tipos de eventos utilizados na aplicação
 */
export enum EventType {
  // Eventos de contatos
  CONTACT_UPDATED = 'contactUpdated',
  CONTACTS_LIST_UPDATED = 'contactsListUpdated',
  CONTACT_ADDED = 'contactAdded',

  // Eventos de mensagens
  MESSAGE_UPDATED = 'messageUpdated',
  MESSAGE_SENT = 'messageSent',
  MESSAGE_RECEIVED = 'messageReceived',
  MESSAGE_PENDING_UPDATED = 'messagePendingUpdated',

  // Eventos de conexão
  CONNECTION_STATUS_CHANGED = 'connectionStatusChanged',

  // Eventos de sincronização
  SYNC_COMPLETED = 'syncCompleted',
  SYNC_FAILED = 'syncFailed',
}
