/**
 * Generates an updated emojis.json for rn-emoji-keyboard using emoji-datasource (Emoji 16.0).
 * Run: node scripts/update-emoji-data.js
 * Then: npx patch-package rn-emoji-keyboard
 */

const fs = require('fs');
const path = require('path');

const source = require('../node_modules/emoji-datasource/emoji.json');

const CATEGORY_MAP = {
  'Smileys & Emotion': 'smileys_emotion',
  'People & Body': 'people_body',
  'Animals & Nature': 'animals_nature',
  'Food & Drink': 'food_drink',
  'Travel & Places': 'travel_places',
  Activities: 'activities',
  Objects: 'objects',
  Symbols: 'symbols',
  Flags: 'flags',
  Component: null, // skin tone components — skip
};

const CATEGORY_ORDER = [
  'smileys_emotion',
  'people_body',
  'animals_nature',
  'food_drink',
  'travel_places',
  'activities',
  'objects',
  'symbols',
  'flags',
];

function unifiedToEmoji(unified) {
  return unified
    .split('-')
    .map(code => String.fromCodePoint(parseInt(code, 16)))
    .join('');
}

const TONE_KEYS = ['1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];

// Build categorized output
const categories = {};
for (const title of CATEGORY_ORDER) {
  categories[title] = [];
}

for (const e of source) {
  const title = CATEGORY_MAP[e.category];
  if (!title) continue;

  const entry = {
    emoji: unifiedToEmoji(e.unified),
    name: e.name.toLowerCase(),
    v: e.added_in,
    toneEnabled: !!e.skin_variations,
    keywords: e.short_names,
  };

  if (e.skin_variations) {
    entry.tones = {};
    for (const key of TONE_KEYS) {
      if (e.skin_variations[key]) {
        entry.tones[key] = unifiedToEmoji(e.skin_variations[key].unified);
      }
    }
  }

  categories[title].push(entry);
}

// Sort each category by sort_order (preserve datasource ordering)
const sourceOrderMap = {};
source.forEach((e, i) => {
  sourceOrderMap[e.unified] = e.sort_order ?? i;
});

// Build final output array
const output = CATEGORY_ORDER.map(title => ({
  title,
  data: categories[title],
})).filter(cat => cat.data.length > 0);

const json = JSON.stringify(output);

// Write to all three locations in rn-emoji-keyboard
const targets = [
  'node_modules/rn-emoji-keyboard/src/assets/emojis.json',
  'node_modules/rn-emoji-keyboard/lib/commonjs/assets/emojis.json',
  'node_modules/rn-emoji-keyboard/lib/module/assets/emojis.json',
];

for (const target of targets) {
  const fullPath = path.join(__dirname, '..', target);
  fs.writeFileSync(fullPath, json, 'utf8');
  console.log(`✓ Updated ${target}`);
}

const totalEmojis = output.reduce((sum, cat) => sum + cat.data.length, 0);
console.log(
  `\nDone. ${totalEmojis} emojis across ${output.length} categories.`
);
