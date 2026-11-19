/**
 * Tipos e interfaces para o domínio de relacionamentos entre usuários.
 * Extraído de services/relationships.ts para separar tipos de implementação.
 */

// Tipos de status de relacionamento
export enum RelationshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

// Interface para relacionamento
export interface Relationship {
  id: string;
  userA: string;
  userB: string;
  status: RelationshipStatus;
  initiatedBy: string;
  rejectedBy?: string;
  contactDeleted?: boolean;
  contactIsBot?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastInteractionAt: Date;
  metadata: {
    userA_nickname: string;
    userB_nickname: string;
    userA_profileEmoji: string;
    userB_profileEmoji: string;
  };
}

// Interface para contato derivado de um relacionamento
export interface RelationshipContact {
  id: string;
  nickname: string;
  profileEmoji: string;
  phoneNumber?: string;
  lastMessage?: any;
  unreadCount?: number;
  isFavorite?: boolean;
  isBlocked?: boolean;
  isSystemBot?: boolean;
  lastInteractionAt?: Date;
  relationshipStatus?: RelationshipStatus;
  isUnavailableUser?: boolean;
}
