import { EMOJIBASE_I18N } from '../data/emojibaseI18n';
import { EMOJI_KEYWORDS_I18N } from '../data/emojiKeywords';
import type { KeywordsMap } from '../services/emojiKeywordsApi';

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const matchesPipe = (piped: string, q: string): boolean =>
  piped.split('|').some(term => normalize(term).includes(q));

export const searchEmojis = <
  T extends { emoji: string; name: string; keywords?: string[] },
>(
  query: string,
  emojis: T[],
  language: string,
  customKeywords?: KeywordsMap
): T[] => {
  const q = normalize(query.trim());
  if (!q) return emojis;

  const kwMap = customKeywords ?? EMOJI_KEYWORDS_I18N;

  return emojis.filter(e => {
    if (normalize(e.name).includes(q)) return true;
    if (e.keywords?.some(k => normalize(k).includes(q))) return true;

    const eb = EMOJIBASE_I18N[e.emoji];
    const custom = kwMap[e.emoji];

    if (language === 'pt-BR') {
      if (eb?.p && matchesPipe(eb.p, q)) return true;
      if (custom?.pt.some(k => normalize(k).includes(q))) return true;
    }

    if (language === 'es') {
      if (eb?.e && matchesPipe(eb.e, q)) return true;
      if (custom?.es.some(k => normalize(k).includes(q))) return true;
    }

    if (language === 'en') {
      if (custom?.en?.some(k => normalize(k).includes(q))) return true;
    }

    return false;
  });
};
