/**
 * Serviço de relacionamentos — usa REST API (substitui Firestore).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { EventEmitter } from './eventEmitter';
import { EventType } from '../types/eventType';
import { loadContactsFromStorage, saveContactsToStorage } from './contacts';
import { logger } from '../utils/logger';
import { relationshipsApi, ApiRelationship } from './relationshipsApi';

// ─── Re-exports de tipos ─────────────────────────────────────────────────────

import {
  RelationshipStatus,
  Relationship,
  RelationshipContact as Contact,
} from '../types/relationships';
export { RelationshipStatus, Relationship };
export type { RelationshipContact as Contact } from '../types/relationships';

// ─── Utilitários ─────────────────────────────────────────────────────────────

export const safelyConvertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  try {
    if (timestamp && typeof timestamp.toDate === 'function')
      return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
  } catch {}
  return new Date();
};

export const generateRelationshipId = (
  userIdA: string,
  userIdB: string
): string => {
  const [smaller, larger] =
    userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  return `${smaller}_${larger}`;
};

// ─── Storage ─────────────────────────────────────────────────────────────────

const getRelationshipsKey = (userId: string) => `@zoji:relationships:${userId}`;

export const saveRelationshipsToStorage = async (
  userId: string,
  relationships: Relationship[]
) => {
  try {
    const key = getRelationshipsKey(userId);
    const toStore = relationships.map(r => ({
      ...r,
      createdAt: r.createdAt.getTime(),
      updatedAt: r.updatedAt.getTime(),
      lastInteractionAt: r.lastInteractionAt.getTime(),
    }));
    await AsyncStorage.setItem(key, JSON.stringify(toStore));
  } catch (err) {
    logger.error('[Relationships] Erro ao salvar no storage:', err);
  }
};

export const loadRelationshipsFromStorage = async (
  userId: string
): Promise<Relationship[]> => {
  try {
    const key = getRelationshipsKey(userId);
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];

    return JSON.parse(json).map((r: any) => ({
      ...r,
      rejectedBy: r.rejectedBy ?? undefined,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      lastInteractionAt: new Date(r.lastInteractionAt),
    })) as Relationship[];
  } catch (err) {
    logger.error('[Relationships] Erro ao carregar do storage:', err);
    return [];
  }
};

// ─── Event system ─────────────────────────────────────────────────────────────

type RelationshipsListener = () => void;
const relationshipsListeners = new Set<RelationshipsListener>();

export const addRelationshipsListener = (listener: RelationshipsListener) => {
  relationshipsListeners.add(listener);
  return () => {
    relationshipsListeners.delete(listener);
  };
};

const notifyRelationshipsChanged = () => {
  setTimeout(() => {
    relationshipsListeners.forEach(l => {
      try {
        l();
      } catch {}
    });
  }, 0);
};

// ─── Conversão API → Relationship ─────────────────────────────────────────────

function apiToRelationship(
  userId: string,
  apiRel: ApiRelationship
): Relationship {
  const contactId = String(apiRel.contact.id);
  const userIdNum = parseInt(userId, 10);
  const ctIdNum = apiRel.contact.id;

  // Backend guarantees user_a_id < user_b_id
  const [userA, userB] =
    userIdNum < ctIdNum ? [userId, contactId] : [contactId, userId];

  const isUserA = userA === userId;

  return {
    id: String(apiRel.id),
    userA,
    userB,
    status: apiRel.status as RelationshipStatus,
    initiatedBy: String(apiRel.initiated_by),
    rejectedBy: apiRel.rejected_by ? String(apiRel.rejected_by) : undefined,
    createdAt: new Date(apiRel.created_at),
    updatedAt: new Date(apiRel.updated_at),
    lastInteractionAt: apiRel.last_interaction_at
      ? new Date(apiRel.last_interaction_at)
      : new Date(),
    contactDeleted: apiRel.contact.deleted === true,
    contactIsBot: apiRel.contact.is_system_bot === true,
    metadata: {
      userA_nickname: isUserA ? '' : apiRel.contact.nickname,
      userB_nickname: isUserA ? apiRel.contact.nickname : '',
      userA_profileEmoji: isUserA ? '👤' : apiRel.contact.profile_emoji,
      userB_profileEmoji: isUserA ? apiRel.contact.profile_emoji : '👤',
    },
  };
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Busca relacionamentos do servidor e salva localmente.
 * Retorna true se houve alterações em relação ao cache.
 */
export const syncRelationshipsWithFirestore = async (
  userId: string
): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      logger.warn('[Relationships] Offline, usando cache local');
      return false;
    }

    const cached = await loadRelationshipsFromStorage(userId);
    const apiRels = await relationshipsApi.list();
    const fresh = apiRels.map(r => apiToRelationship(userId, r));

    const cachedSig = cached
      .map(r => `${r.id}:${r.status}`)
      .sort()
      .join(',');
    const freshSig = fresh
      .map(r => `${r.id}:${r.status}`)
      .sort()
      .join(',');
    const hasChanges = cachedSig !== freshSig;

    await saveRelationshipsToStorage(userId, fresh);

    if (hasChanges) notifyRelationshipsChanged();
    return hasChanges;
  } catch (err) {
    logger.error('[Relationships] Erro ao sincronizar:', err);
    return false;
  }
};

/**
 * Retorna relacionamentos do cache local (populado por syncRelationshipsWithFirestore).
 */
export const getUserRelationships = async (
  userId: string
): Promise<Relationship[]> => {
  try {
    const cached = await loadRelationshipsFromStorage(userId);

    const state = await NetInfo.fetch();
    if (!state.isConnected) return cached;

    const apiRels = await relationshipsApi.list();
    const fresh = apiRels.map(r => apiToRelationship(userId, r));
    await saveRelationshipsToStorage(userId, fresh);
    return fresh;
  } catch (err) {
    logger.error('[Relationships] Erro ao obter relacionamentos:', err);
    return await loadRelationshipsFromStorage(userId);
  }
};

/**
 * Converte Relationship[] em Contact[], preservando lastMessage do storage.
 */
export const getContactsFromRelationships = async (
  userId: string,
  relationships: Relationship[],
  skipContactLoading: boolean = false
): Promise<Contact[]> => {
  const contacts: Contact[] = [];

  // Load existing contacts to preserve lastMessage
  const existingMap = new Map<string, any>();
  if (!skipContactLoading) {
    try {
      const existing = (await loadContactsFromStorage(
        userId,
        true
      )) as unknown as Contact[];
      existing.forEach(c => {
        if (c.id && c.lastMessage) existingMap.set(c.id, c);
      });
    } catch {}
  }

  for (const rel of relationships) {
    // Skip if current user rejected or blocked the other
    if (rel.rejectedBy === userId) continue;
    if (rel.status === RelationshipStatus.BLOCKED && rel.initiatedBy !== userId)
      continue;

    const isAccepted = rel.status === RelationshipStatus.ACCEPTED;
    const isPending = rel.status === RelationshipStatus.PENDING;
    const isBlockedByUser =
      rel.status === RelationshipStatus.BLOCKED && rel.initiatedBy === userId;
    const isRejectedNotByUser =
      rel.status === RelationshipStatus.REJECTED && rel.rejectedBy !== userId;

    if (!isAccepted && !isPending && !isBlockedByUser && !isRejectedNotByUser)
      continue;

    const isUserA = rel.userA === userId;
    const contactId = isUserA ? rel.userB : rel.userA;
    const nickname = isUserA
      ? rel.metadata.userB_nickname
      : rel.metadata.userA_nickname;
    const profileEmoji = isUserA
      ? rel.metadata.userB_profileEmoji
      : rel.metadata.userA_profileEmoji;

    const existing = existingMap.get(contactId);

    contacts.push({
      id: contactId,
      nickname: nickname || 'Usuário',
      profileEmoji: profileEmoji || '👤',
      phoneNumber: '',
      lastMessage: existing?.lastMessage ?? null,
      unreadCount: existing?.unreadCount ?? 0,
      isFavorite: false,
      isBlocked: rel.status === RelationshipStatus.BLOCKED,
      isDeleted: rel.contactDeleted === true,
      isSystemBot: rel.contactIsBot === true,
      lastInteractionAt: rel.lastInteractionAt,
      relationshipStatus: rel.status,
      relationshipId: rel.id,
      initiatedBy: rel.initiatedBy,
    } as Contact);
  }

  return contacts;
};

// In-flight guard: parallel calls share one request; cooldown prevents hammering
const _syncInFlight = new Map<string, Promise<boolean>>();
const _syncLastRun = new Map<string, number>();
const SYNC_COOLDOWN_MS = 10_000;

/**
 * Sincroniza relacionamentos da API e atualiza o storage de contatos.
 * É a fonte de verdade para a lista de amigos — deve ser chamada sempre
 * que a lista precisar refletir o estado real do servidor.
 */
export const syncContactsStorage = (userId: string): Promise<boolean> => {
  const now = Date.now();
  const lastRun = _syncLastRun.get(userId) ?? 0;
  if (now - lastRun < SYNC_COOLDOWN_MS) return Promise.resolve(true);

  const existing = _syncInFlight.get(userId);
  if (existing) return existing;

  const promise = (async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return false;

      const apiRels = await relationshipsApi.list();
      const fresh = apiRels.map(r => apiToRelationship(userId, r));
      await saveRelationshipsToStorage(userId, fresh);

      const existing: any[] = await loadContactsFromStorage(userId, true);
      const existingMap = new Map(existing.map((c: any) => [c.id, c]));

      const contacts = await getContactsFromRelationships(userId, fresh, true);
      const merged = contacts.map(c => {
        const ex = existingMap.get(c.id);
        return ex ? { ...c, lastMessage: ex.lastMessage ?? c.lastMessage } : c;
      });

      // RelationshipContact e Contact (contacts.ts) divergem só em opcionalidade;
      // antes do P7-2b isto passava sem checagem via require() dinâmico.
      await saveContactsToStorage(
        userId,
        merged as unknown as Parameters<typeof saveContactsToStorage>[1]
      );
      notifyRelationshipsChanged();
      _syncLastRun.set(userId, Date.now());
      return true;
    } catch (err) {
      logger.error('[Relationships] Erro ao sincronizar contatos:', err);
      return false;
    } finally {
      _syncInFlight.delete(userId);
    }
  })();

  _syncInFlight.set(userId, promise);
  return promise;
};

/**
 * Verifica e corrige consistência entre relacionamentos e mensagens.
 */
export const ensureContactsConsistency = async (
  userId: string
): Promise<boolean> => {
  try {
    await syncRelationshipsWithFirestore(userId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Solicita adição de contato por número de telefone.
 */
export const requestAddContact = async (
  userId: string,
  phoneNumber: string,
  _userNickname?: string,
  _userProfileEmoji?: string
): Promise<boolean> => {
  try {
    await relationshipsApi.create(phoneNumber);
    notifyRelationshipsChanged();
    return true;
  } catch (err) {
    logger.error('[Relationships] Erro ao solicitar contato:', err);
    return false;
  }
};

/**
 * Aceita pedido de relacionamento.
 */
export const acceptRelationship = async (
  relationshipId: string
): Promise<boolean> => {
  try {
    await relationshipsApi.update(parseInt(relationshipId, 10), 'accept');
    return true;
  } catch {
    return false;
  }
};

/**
 * Rejeita pedido de relacionamento.
 */
export const rejectRelationship = async (
  userId: string,
  relationshipId: string
): Promise<boolean> => {
  try {
    await relationshipsApi.update(parseInt(relationshipId, 10), 'reject');
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove relacionamento.
 */
export const removeRelationship = async (
  userId: string,
  relationshipId: string
): Promise<boolean> => {
  try {
    await relationshipsApi.destroy(parseInt(relationshipId, 10));
    return true;
  } catch {
    return false;
  }
};

// Alias mantido para compatibilidade
export const getContactsFromRelationshipsWithoutRecursion =
  getContactsFromRelationships;
