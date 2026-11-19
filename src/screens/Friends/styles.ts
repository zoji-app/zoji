import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
    },
  });
