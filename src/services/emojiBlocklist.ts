import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './apiClient';

const STORAGE_KEY = '@zoji:emoji_blocklist';
const TTL_MS = 60 * 1000;

export type BlockScope = 'messages' | 'profile' | 'both';

export interface BlockedEntry {
  emoji: string;
  scope: BlockScope;
}

interface BlocklistCache {
  entries: BlockedEntry[];
  fetchedAt: number;
}

let memCache: BlocklistCache | null = null;

export async function getEmojiBlocklist(): Promise<BlockedEntry[]> {
  if (memCache && Date.now() - memCache.fetchedAt < TTL_MS) {
    return memCache.entries;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: BlocklistCache = JSON.parse(stored);
      if (Date.now() - parsed.fetchedAt < TTL_MS) {
        memCache = parsed;
        return parsed.entries;
      }
    }
  } catch {}

  try {
    const res = await api.get('/emoji-blocklist');
    const entries: BlockedEntry[] = (res.data.emojis ?? [])
      .map((e: { emoji: string; scope: BlockScope }) => ({
        emoji: e.emoji,
        scope: e.scope ?? 'both',
      }))
      .sort(
        (a: BlockedEntry, b: BlockedEntry) => b.emoji.length - a.emoji.length
      );
    const cache: BlocklistCache = { entries, fetchedAt: Date.now() };
    memCache = cache;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    return entries;
  } catch {
    return memCache?.entries ?? [];
  }
}

export function invalidateBlocklistCache(): void {
  memCache = null;
}

function graphemes(s: string): string[] {
  if (
    typeof Intl !== 'undefined' &&
    typeof (Intl as any).Segmenter === 'function'
  ) {
    return [...new (Intl as any).Segmenter().segment(s)].map(
      (seg: any) => seg.segment
    );
  }
  // Fallback: split by Unicode code points (handles most single-codepoint emojis)
  return [...s];
}

function matchesSequence(text: string, seq: string): boolean {
  if (!seq.includes('*')) return text.includes(seq);
  const tg = graphemes(text);
  const sg = graphemes(seq);
  if (sg.length > tg.length) return false;
  for (let i = 0; i <= tg.length - sg.length; i++) {
    let ok = true;
    for (let j = 0; j < sg.length; j++) {
      if (sg[j] !== '*' && tg[i + j] !== sg[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** Retorna a primeira sequência bloqueada encontrada para o escopo dado, ou null. */
export function findBlockedSequence(
  text: string,
  entries: BlockedEntry[],
  scope: BlockScope
): string | null {
  const relevant = entries.filter(e => e.scope === scope || e.scope === 'both');
  for (const { emoji } of relevant) {
    if (matchesSequence(text, emoji)) return emoji;
  }
  return null;
}
