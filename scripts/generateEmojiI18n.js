#!/usr/bin/env node
/**
 * Gera src/data/emojibaseI18n.ts a partir do emojibase-data.
 * Execute: node scripts/generateEmojiI18n.js
 *
 * Formato de saída: Record<emoji, { p: string; e: string }>
 *   p = label pt + "|" + tags pt (pipe-separated)
 *   e = label es + "|" + tags es
 */

const fs = require('fs');
const path = require('path');

const ptData = require('emojibase-data/pt/compact.json');
const esData = require('emojibase-data/es/compact.json');

const map = {};

for (const e of ptData) {
  if (!e.unicode || !e.label) continue;
  const terms = [e.label, ...(e.tags ?? [])].join('|');
  map[e.unicode] = { p: terms, e: '' };
}

for (const e of esData) {
  if (!e.unicode || !e.label) continue;
  const terms = [e.label, ...(e.tags ?? [])].join('|');
  if (map[e.unicode]) {
    map[e.unicode].e = terms;
  } else {
    map[e.unicode] = { p: '', e: terms };
  }
}

const entries = Object.entries(map)
  .map(([emoji, v]) => {
    const key = JSON.stringify(emoji);
    const p = JSON.stringify(v.p);
    const e = JSON.stringify(v.e);
    return `  ${key}: { p: ${p}, e: ${e} }`;
  })
  .join(',\n');

const output = `// Auto-gerado por scripts/generateEmojiI18n.js — não edite manualmente.
// Fonte: emojibase-data (pt + es). Regenere ao atualizar emojibase-data.
// Formato: p = label|tag|tag... em português; e = label|tag|tag... em espanhol.
export const EMOJIBASE_I18N: Record<string, { p: string; e: string }> = {
${entries},
};
`;

const outPath = path.resolve(__dirname, '../src/data/emojibaseI18n.ts');
fs.writeFileSync(outPath, output, 'utf8');
console.log(
  `Gerado: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB, ${Object.keys(map).length} emojis)`
);
