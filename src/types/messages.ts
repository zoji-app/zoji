/**
 * Tipos e interfaces para o domínio de mensagens.
 * Extraído de services/messages.ts para separar tipos de implementação.
 */

// Mensagem no sistema (interface principal)
export interface ChatMessage {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  senderEmoji: string;
  status?: string;
  read?: boolean;
}

// Tipo base mais flexível — usado em listeners e atualizações
export interface MessageBase {
  id: string;
  emoji: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  createdAt: Date;
  pending?: boolean;
  delivered?: boolean;
  senderEmoji: string;
  status?: string;
  read?: boolean;
}

// Alias principal
export type Message = ChatMessage;
