import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: colors.pageBackground,
    },
    icon: {
      marginBottom: 20,
      opacity: 0.85,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    // neutral700 aqui é texto de apoio (subtítulo) — mesma lógica de
    // neutral500-como-texto, só que num tom mais escuro; convertido pra
    // textSecondary por contraste (ficaria ilegível fixo sobre fundo preto).
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginVertical: 8,
    },
    inviteButton: {},
  });
