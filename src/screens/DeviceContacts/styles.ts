import { StyleSheet, Platform } from 'react-native';
import { colors as staticColors } from '../../theme/colors';

export const getStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.pageBackground,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 50, // Afasta um pouco do centro para cima (fica visualmente melhor)
    },
    listContent: {
      padding: 16,
      flexGrow: 1,
      ...(Platform.OS === 'android' ? { paddingBottom: 30 } : {}),
    },
    contactItem: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      ...(Platform.OS === 'android' ? { flexShrink: 1 } : {}),
    },
    contactDetailsContainer: {
      flex: 1,
      ...(Platform.OS === 'android' ? { flexShrink: 1 } : {}),
    },
    contactEmoji: {
      fontSize: 40,
      marginRight: 12,
    },
    contactName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 2,
      ...(Platform.OS === 'android'
        ? {
            flexShrink: 1,
            flexWrap: 'wrap',
          }
        : {}),
    },
    contactPhone: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      ...(Platform.OS === 'android' ? { flexShrink: 1 } : {}),
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    zojiBadge: {
      backgroundColor: '#4CAF50',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginRight: 8,
    },
    zojiBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    addedBadge: {
      backgroundColor: '#2196F3',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    addedBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    iconContainer: {
      width: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingIndicator: {
      marginLeft: 10,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    addManuallyButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 50,
      marginTop: 8,
    },
    addManuallyButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });
