/**
 * Splits an emoji string into individual grapheme clusters (complete emoji units).
 *
 * Uses a pattern-based regex rather than Intl.Segmenter because Hermes on Android
 * bundles ICU 73 (April 2023), which predates Emoji 15.1 (September 2023). Sequences
 * like 🏃‍♂️‍➡️ (U+1F3C3 ZWJ U+2642 FE0F ZWJ U+27A1 FE0F) would be incorrectly split
 * into ['🏃‍♂️', '➡️'] by Intl.Segmenter on those runtimes, rendering as a blank space
 * in the chat. The regex matches each atom individually so it works regardless of
 * whether the ICU tables know about the specific ZWJ sequence.
 */
export function splitEmojis(str: string): string[] {
  if (!str) return [];

  // Handles, in order:
  //  1. Keycap sequences: digit/# /* + optional FE0F + U+20E3 (e.g. 1️⃣, #️⃣)
  //  2. Tag sequences: emoji + tag chars U+E0020–U+E007E + terminator U+E007F
  //     (subdivision flags: 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🏴󠁧󠁢󠁳󠁣󠁴󠁿 🏴󠁧󠁢󠁷󠁬󠁳󠁿)
  //  3. Regional indicator pairs — country flags (e.g. 🇧🇷)
  //  4. ZWJ sequences of arbitrary depth (e.g. 🧑‍🎓, 🏃‍♀️, 👨‍👩‍👧, 🏃‍♂️‍➡️)
  //     Each "atom" is: (modifier-base + skin-tone) OR (emoji + optional FE0F)
  //     Joined by U+200D zero-width joiner.
  //  5. Any other single code point as last resort
  const keycap = '[0-9#*]\\uFE0F?\\u20E3';
  const tagSeq = '\\p{Emoji}[\\u{E0020}-\\u{E007E}]+\\u{E007F}';
  const atom =
    '(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}|\\p{Emoji}\\uFE0F?)';
  const zwjSeq = `${atom}(?:\\u200D${atom})*`;
  const regionalPair = '[\\u{1F1E0}-\\u{1F1FF}]{2}';
  const pattern = new RegExp(
    `${keycap}|${tagSeq}|${regionalPair}|${zwjSeq}|.`,
    'gu'
  );

  return str.match(pattern) ?? [...str];
}
