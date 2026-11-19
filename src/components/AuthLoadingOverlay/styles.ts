import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.pageBackground,
      zIndex: 1000,
    },
    androidExtra: {
      // Valores específicos para Android para garantir que o overlay fique por cima de tudo
      elevation: 999,
      position: 'absolute',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
  });
