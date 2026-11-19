import { StyleSheet, Platform } from 'react-native';
import { colors } from '../../../../theme/colors';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    ...Platform.select({
      ios: {
        marginRight: 8,
      },
      android: {
        marginRight: 0,
      },
    }),
  },
  badgeContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.warning,
  },
});
