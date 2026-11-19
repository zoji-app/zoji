import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

// getStyles(colors) — recebe a paleta resolvida pelo ThemeContext (clara ou
// escura) e monta o StyleSheet na hora. Só as cores de papel semântico
// (pageBackground/cardBackground/textPrimary/textSecondary) mudam entre os
// temas — o resto (primary700, error...) é fixo nos dois, de propósito.
export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    // Mesma cor do header (não da página) — o recorte visível dessa cor é só
    // a faixa acima do header (notch/status bar), que fica "colada" nele,
    // igual o rodapé já faz com a cor da tab bar até a borda inferior.
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    headerLogo: {
      width: 48,
      height: 48,
    },
    section: {
      marginBottom: 24,
      backgroundColor: colors.pageBackground,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
      paddingHorizontal: 16,
      color: colors.textPrimary,
    },
    profileContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    avatarButton: {
      marginBottom: 16,
    },
    profileEmoji: {
      fontSize: 62,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    profileEmojiContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    input: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    button: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 5,
      paddingVertical: 8,
    },
    logoutIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.error + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    languageDialog: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
    },
    dialogTitle: {
      fontFamily: 'Fredoka_600SemiBold',
      fontSize: 28,
      color: colors.textPrimary,
    },
    dialogContent: {
      paddingHorizontal: 0,
    },
    radioItem: {
      paddingVertical: 2,
    },
    radioLabel: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    scrollView: {
      backgroundColor: colors.pageBackground,
    },
    scrollViewContent: {
      flexGrow: 1,
      backgroundColor: colors.pageBackground,
    },
    actionSection: {
      marginBottom: 24,
      backgroundColor: colors.pageBackground,
      paddingBottom: 15,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalText: {
      fontSize: 14,
      marginBottom: 24,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    logoutConfirmButton: {
      width: '100%',
      borderRadius: 12,
      marginBottom: 8,
    },
    logoutConfirmLabel: {
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: 2,
    },
    logoutCancelButton: {
      width: '100%',
    },
    logoutCancelLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
