import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.pageBackground,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textPrimary,
    },
  });
