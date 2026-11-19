import { useState, useEffect } from 'react';
import { emojisByCategory } from 'rn-emoji-keyboard';
import {
  getEmojiBlocklist,
  findBlockedSequence,
  BlockScope,
} from '../services/emojiBlocklist';
import sortOrderMap from '../data/emojiSortOrder.json';

type EmojisByCategory = typeof emojisByCategory;

// Sort all categories once at module load using Apple's sort_order from emoji-datasource.
// Emojis not found in the map (e.g. standalone ♀️ ♂️ ⚕️) get sort order MAX_SAFE_INTEGER.
const getSortOrder = (emoji: string): number => {
  const order = (sortOrderMap as Record<string, number>)[emoji];
  if (order !== undefined) return order;
  // Strip variation selector FE0F and try again
  const stripped = emoji.replace(/️/g, '');
  return (
    (sortOrderMap as Record<string, number>)[stripped] ??
    Number.MAX_SAFE_INTEGER
  );
};

const sortedEmojisByCategory: EmojisByCategory = (
  emojisByCategory as EmojisByCategory
).map(category => ({
  ...category,
  data: [...category.data].sort(
    (a, b) => getSortOrder(a.emoji) - getSortOrder(b.emoji)
  ),
}));

export function useFilteredEmojis(scope: BlockScope) {
  const [filtered, setFiltered] = useState<EmojisByCategory>(
    sortedEmojisByCategory
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blocklist = await getEmojiBlocklist();
      if (cancelled || blocklist.length === 0) return;
      const result = sortedEmojisByCategory.map(category => ({
        ...category,
        data: category.data.filter(
          e => !findBlockedSequence(e.emoji, blocklist, scope)
        ),
      }));
      if (!cancelled) setFiltered(result as EmojisByCategory);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return filtered;
}
