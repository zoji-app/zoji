import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';
import { radii } from '../../theme/radii';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    scrollView: {
      backgroundColor: colors.pageBackground,
    },
    scrollViewContent: {
      flexGrow: 1,
      backgroundColor: colors.pageBackground,
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
    profileContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    avatarButton: {
      marginBottom: 8,
    },
    profileEmoji: {
      fontSize: 72,
      textAlign: 'center',
    },
    editHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    input: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    button: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 5,
    },
    infoSection: {
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: colors.cardBackground,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    infoDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
    },
  });
