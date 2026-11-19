import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    content: {
      flex: 1,
      padding: 20,
      backgroundColor: colors.pageBackground,
    },
    headerLogo: {
      width: 40,
      height: 40,
    },
    input: {
      marginBottom: 20,
    },
    emojiContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 30,
    },
    emojiLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    emojiButton: {
      width: 80,
      height: 80,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.pageBackground,
    },
    emojiText: {
      fontSize: 48,
    },
    button: {
      marginTop: 10,
    },
  });
