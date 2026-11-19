import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './apiClient';
import { EMOJI_KEYWORDS_I18N } from '../data/emojiKeywords';
import { isCircuitOpen, recordSuccess, recordFailure } from './circuitBreaker';

const CIRCUIT_KEY = 'emoji-keywords';
const STORAGE_KEY = '@zoji:emoji_keywords';
const TTL_MS = 60 * 60 * 1000; // 1 hora

export type KeywordsMap = Record<
  string,
  { pt: string[]; es: string[]; en?: string[] }
>;

interface KeywordsCache {
  keywords: KeywordsMap;
  fetchedAt: number;
}

let memCache: KeywordsCache | null = null;

// Emojis gerenciados pela API sobrepõem o dicionário estático.
// Emojis ausentes da API usam o dicionário estático como fallback.
export async function getEmojiKeywords(): Promise<KeywordsMap> {
  if (memCache && Date.now() - memCache.fetchedAt < TTL_MS) {
    return memCache.keywords;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: KeywordsCache = JSON.parse(stored);
      if (Date.now() - parsed.fetchedAt < TTL_MS) {
        memCache = parsed;
        return parsed.keywords;
      }
    }
  } catch {}

  // P3-2, item 3: já tem fallback estático (EMOJI_KEYWORDS_I18N) — não
  // essencial, dá um tempo depois de falhas seguidas.
  if (isCircuitOpen(CIRCUIT_KEY)) {
    return memCache?.keywords ?? EMOJI_KEYWORDS_I18N;
  }

  try {
    const res = await api.get<{ keywords: KeywordsMap }>('/emoji-keywords');
    const apiKeywords = res.data.keywords ?? {};
    const merged: KeywordsMap = { ...EMOJI_KEYWORDS_I18N, ...apiKeywords };
    const cache: KeywordsCache = { keywords: merged, fetchedAt: Date.now() };
    memCache = cache;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    recordSuccess(CIRCUIT_KEY);
    return merged;
  } catch {
    recordFailure(CIRCUIT_KEY);
    return memCache?.keywords ?? EMOJI_KEYWORDS_I18N;
  }
}

export function invalidateKeywordsCache(): void {
  memCache = null;
}
