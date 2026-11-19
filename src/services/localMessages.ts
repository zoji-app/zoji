/**
 * Persistência local de mensagens via AsyncStorage.
 * O banco de dados é apenas um relay de entrega — o histórico fica no dispositivo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../hooks/useChatMessages';
import { logger } from '../utils/logger';

const KEY = (chatId: string) => `@zoji:messages:${chatId}`;
const PENDING_KEY = (chatId: string) => `@zoji:pending:${chatId}`;

// Mensagens pendentes mais antigas que 7 dias são descartadas automaticamente
const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

/** Carrega todas as mensagens locais de uma conversa */
export async function loadLocalMessages(chatId: string): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(chatId));
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    const byId = new Map<string, Message>();
    for (const m of parsed) {
      // Descartar pendentes órfãs salvas por sessões anteriores
      if (m.pending) continue;
      byId.set(m.id, { ...m, createdAt: new Date(m.createdAt) });
    }
    return [...byId.values()];
  } catch (err) {
    logger.error('[localMessages] Erro ao carregar:', err as Error);
    return [];
  }
}

/** Salva (merge) novas mensagens no histórico local — evita duplicatas por id */
export async function saveLocalMessages(
  chatId: string,
  incoming: Message[]
): Promise<void> {
  // Nunca persistir mensagens pendentes — evita órfãs após fechamento do app
  const toSave = incoming.filter(m => !m.pending);
  if (toSave.length === 0) return;
  try {
    const existing = await loadLocalMessages(chatId);
    const existingIds = new Set(existing.map(m => m.id));
    const newOnes = toSave.filter(m => !existingIds.has(m.id));
    if (newOnes.length === 0) return;

    const merged = [...existing, ...newOnes].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    await AsyncStorage.setItem(KEY(chatId), JSON.stringify(merged));
  } catch (err) {
    logger.error('[localMessages] Erro ao salvar:', err as Error);
  }
}

/** Atualiza uma mensagem existente no armazenamento local (ex: pending → confirmada) */
export async function updateLocalMessage(
  chatId: string,
  pendingId: string,
  confirmed: Message
): Promise<void> {
  try {
    const existing = await loadLocalMessages(chatId);
    // Remove o pending E qualquer entrada já existente com o id confirmado, depois insere
    const filtered = existing.filter(
      m => m.id !== pendingId && m.id !== confirmed.id
    );
    const updated = [...filtered, confirmed].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    await AsyncStorage.setItem(KEY(chatId), JSON.stringify(updated));
  } catch (err) {
    logger.error('[localMessages] Erro ao atualizar:', err as Error);
  }
}

/** Carrega o emoji personalizado para um chat específico */
export async function getChatEmoji(
  userId: string,
  chatId: string
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`@zoji:chat_emoji:${userId}:${chatId}`);
  } catch {
    return null;
  }
}

/** Salva (ou remove) o emoji personalizado de um chat. null = usar emoji geral */
export async function setChatEmoji(
  userId: string,
  chatId: string,
  emoji: string | null
): Promise<void> {
  try {
    const key = `@zoji:chat_emoji:${userId}:${chatId}`;
    if (emoji === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, emoji);
    }
  } catch {}
}

/**
 * Lê em batch a última mensagem de cada conversa.
 * Retorna um Map de contactId → última Message (mais recente).
 */
export async function getLastMessagesForContacts(
  userId: string,
  contactIds: string[]
): Promise<Map<string, Message>> {
  if (contactIds.length === 0) return new Map();
  try {
    const keys = contactIds.map(id => KEY([userId, id].sort().join('_')));
    const pairs = await AsyncStorage.multiGet(keys);
    const result = new Map<string, Message>();
    for (let i = 0; i < pairs.length; i++) {
      const raw = pairs[i][1];
      if (!raw) continue;
      const parsed: any[] = JSON.parse(raw);
      const confirmed = parsed.filter(m => !m.pending);
      if (confirmed.length === 0) continue;
      // Sorted oldest-first in storage; last element is most recent
      const last = confirmed[confirmed.length - 1];
      result.set(contactIds[i], {
        ...last,
        emoji: last.emoji || '❓',
        createdAt: new Date(last.createdAt),
      });
    }
    return result;
  } catch (err) {
    logger.error(
      '[localMessages] Erro ao ler últimas mensagens:',
      err as Error
    );
    return new Map();
  }
}

// ─── Fila de pendentes ────────────────────────────────────────────────────────

/** Persiste uma mensagem pendente na fila dedicada (sobrevive ao fechamento do app) */
export async function savePendingMessage(
  chatId: string,
  msg: Message
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY(chatId));
    const existing: any[] = raw ? JSON.parse(raw) : [];
    const withoutDup = existing.filter((m: any) => m.id !== msg.id);
    await AsyncStorage.setItem(
      PENDING_KEY(chatId),
      JSON.stringify([
        ...withoutDup,
        {
          ...msg,
          createdAt:
            msg.createdAt instanceof Date
              ? msg.createdAt.toISOString()
              : msg.createdAt,
        },
      ])
    );
  } catch (err) {
    logger.error('[localMessages] Erro ao salvar pendente:', err as Error);
  }
}

/** Carrega mensagens pendentes da fila. Remove automaticamente entradas com mais de 7 dias. */
export async function loadPendingMessages(chatId: string): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY(chatId));
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    const now = Date.now();
    const valid = parsed.filter(
      (m: any) => now - new Date(m.createdAt).getTime() < MAX_PENDING_AGE_MS
    );
    if (valid.length !== parsed.length) {
      if (valid.length === 0) {
        await AsyncStorage.removeItem(PENDING_KEY(chatId));
      } else {
        await AsyncStorage.setItem(PENDING_KEY(chatId), JSON.stringify(valid));
      }
    }
    return valid.map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      pending: true,
    }));
  } catch (err) {
    logger.error('[localMessages] Erro ao carregar pendentes:', err as Error);
    return [];
  }
}

/** Remove uma mensagem específica da fila de pendentes (após confirmação ou falha permanente) */
export async function removePendingMessage(
  chatId: string,
  pendingId: string
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY(chatId));
    if (!raw) return;
    const existing: any[] = JSON.parse(raw);
    const filtered = existing.filter((m: any) => m.id !== pendingId);
    if (filtered.length === 0) {
      await AsyncStorage.removeItem(PENDING_KEY(chatId));
    } else {
      await AsyncStorage.setItem(PENDING_KEY(chatId), JSON.stringify(filtered));
    }
  } catch (err) {
    logger.error('[localMessages] Erro ao remover pendente:', err as Error);
  }
}

/** Remove uma mensagem específica do histórico local */
export async function deleteLocalMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY(chatId));
    if (!raw) return;
    const parsed: any[] = JSON.parse(raw);
    const filtered = parsed.filter(m => String(m.id) !== messageId);
    if (filtered.length === parsed.length) return;
    await AsyncStorage.setItem(KEY(chatId), JSON.stringify(filtered));
  } catch (err) {
    logger.error('[localMessages] Erro ao deletar mensagem:', err as Error);
  }
}

/** Deleta todas as mensagens locais de uma conversa */
export async function clearLocalMessages(chatId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY(chatId));
  } catch (err) {
    logger.error('[localMessages] Erro ao limpar:', err as Error);
  }
}
