import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';
import { radii } from '../../theme/radii';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: colors.pageBackground,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logo: {
      width: 240,
      height: 240,
      marginBottom: 0,
    },
    title: {
      fontSize: 64,
      fontFamily: 'Fredoka_600SemiBold',
      textAlign: 'center',
      marginBottom: 0,
      color: colors.textPrimary,
      marginTop: -40,
    },
    subtitle: {
      fontSize: 20,
      fontFamily: 'Fredoka_600SemiBold',
      textAlign: 'center',
      color: colors.textSecondary,
    },
    input: {
      marginBottom: 10,
      // Era '#FFFFFF' fixo — virava uma caixa branca destoante no escuro
      // (achado em teste manual). cardBackground é o mesmo papel de
      // "superfície elevada" já usado em inputs de outras telas (AddContact).
      backgroundColor: colors.cardBackground,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    helper: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    button: {
      marginTop: 10,
    },
    languageContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
      gap: 8,
    },
    languageButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: radii.pill,
    },
    selectedLanguage: {
      // Tinta translúcida de primary700 em vez de um hex fixo claro — sobre
      // fundo escuro, '#EAF7FF' virava um blob branco destoante (achado em
      // teste manual). Com alpha, a mesma cor funciona nos dois temas.
      backgroundColor: colors.primary700 + '26',
    },
    languageText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '400',
    },
    selectedLanguageText: {
      color: colors.primary700,
      fontWeight: '600',
    },
    legalContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    legalLink: {
      fontSize: 12,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    legalSeparator: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    spamWarning: {
      fontSize: 12,
      color: '#7B5E2A',
      backgroundColor: '#FFF8E1',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 12,
      textAlign: 'center',
    },
    channelBadge: {
      alignItems: 'center',
      marginBottom: 12,
    },
    channelBadgeWhatsapp: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1A7A4A',
      backgroundColor: '#E8F5EE',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      overflow: 'hidden',
    },
    channelBadgeSms: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1A4A7A',
      backgroundColor: '#E8F0F8',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      overflow: 'hidden',
    },
    resendTimer: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    resendButton: {
      marginTop: 4,
    },
    forceSmsButton: {
      marginTop: 8,
      alignItems: 'center',
      paddingVertical: 4,
    },
    forceSmsText: {
      fontSize: 12,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    backToPhoneButton: {
      marginTop: 12,
      alignItems: 'center',
    },
    backToPhoneText: {
      fontSize: 13,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
  });
