/**
 * Remove emojis e caracteres relacionados de uma string.
 * Cobre: pictogramas estendidos, seletores de variação, keycap, ZWJ e indicadores regionais (bandeiras).
 */
export function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[︀-️]/g, '') // seletores de variação
    .replace(/⃣/g, '') // combining enclosing keycap (1️⃣ etc.)
    .replace(/‍/g, '') // zero-width joiner
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // indicadores regionais (bandeiras)
}

export function hasEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text);
}
