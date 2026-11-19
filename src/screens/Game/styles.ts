import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    // Mesma cor do header (não da página) — mesma lógica das outras telas
    // com cabeçalho: a faixa acima dele (notch/status bar) fica colada nele.
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },

    // Header
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    headerTitle: {
      fontFamily: 'Fredoka_600SemiBold',
      fontSize: 32,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Hub
    hubContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    hubEmoji: {
      fontSize: 64,
      textAlign: 'center',
      marginBottom: 8,
    },
    errorText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 16,
    },

    // Buttons
    primaryButton: {
      width: '100%',
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 40,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.hairline,
      width: '100%',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    // Gameplay
    gameplayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    progressText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    scoreText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    streakBadge: {
      fontSize: 13,
      color: colors.warning,
      fontWeight: '600',
    },
    emojiArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 20,
    },
    bigEmoji: {
      fontSize: 96,
      textAlign: 'center',
    },
    optionsArea: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 12,
    },
    optionButton: {
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderWidth: 2,
      backgroundColor: colors.cardBackground,
      borderColor: colors.hairline,
    },
    optionButtonCorrect: {
      backgroundColor: '#D4EDDA',
      borderColor: colors.success,
    },
    optionButtonWrong: {
      backgroundColor: '#F8D7DA',
      borderColor: colors.error,
    },
    optionText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionTextCorrect: {
      color: '#155724',
    },
    optionTextWrong: {
      color: '#721C24',
    },

    // Result
    resultContent: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 32,
      paddingHorizontal: 24,
    },
    resultTrophy: {
      fontSize: 64,
      marginBottom: 12,
    },
    resultScore: {
      fontSize: 52,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    resultScoreLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: 20,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
      width: '100%',
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Ranking
    rankingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    rankingList: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
      marginBottom: 24,
    },
    rankingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      gap: 10,
    },
    rankingPosition: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      width: 24,
      textAlign: 'center',
    },
    rankingEmoji: {
      fontSize: 22,
    },
    rankingNickname: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rankingScore: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });
