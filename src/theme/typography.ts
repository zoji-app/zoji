import type { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Catálogo das receitas de tipografia que já existem, hoje copiadas em
 * mais de um arquivo — não é uma escala nova (tipo H1/H2/Body). Cada
 * entrada aqui é uma duplicata exata já confirmada no código; algo
 * "parecido mas diferente" (ex: título do Login) vira sua própria
 * constante, nunca é forçado a bater com outra.
 */
export const typography: Record<string, TextStyle> = {
  // Settings/styles.ts, Friends/styles.ts, Profile/styles.ts — idêntico nos 3
  headerTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 32,
    color: colors.neutral900,
  },
  // Login/styles.ts — mesma família, tamanho/cor próprios
  loginTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 64,
    color: colors.neutral900,
  },
  loginSubtitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: colors.neutral700,
  },
  // AddContact/styles.ts — título de tela com botão de voltar (ScreenHeader
  // no modo `onBack`); mesma família, tamanho um pouco menor
  backHeaderTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 30,
    color: colors.neutral900,
  },
};
