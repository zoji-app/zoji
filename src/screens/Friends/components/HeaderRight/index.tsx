import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { IconButton, Badge } from 'react-native-paper';
import { i18n } from '../../../../i18n';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { styles as headerRightStyles } from './styles';

interface HeaderRightProps {
  navigation: any;
  pendingMessages: number;
  isDeviceOffline: boolean;
}

/**
 * Componente para o lado direito do cabeçalho
 */
const HeaderRight = React.memo(
  ({ navigation, pendingMessages, isDeviceOffline }: HeaderRightProps) => {
    const colors = useThemeColors();

    // Ações quando offline/online
    const offlineStatusButton = useMemo(() => {
      if (isDeviceOffline) {
        return (
          <IconButton
            icon='wifi-off'
            iconColor={colors.warning}
            size={24}
            accessibilityLabel={i18n.t('general.offline')}
            onPress={() => {}}
          />
        );
      }
      return null;
    }, [isDeviceOffline, colors]);

    // Badge para mensagens pendentes
    const pendingMessagesBadge = useMemo(() => {
      if (pendingMessages > 0) {
        return (
          <View style={headerRightStyles.badgeContainer}>
            <IconButton
              icon='message-processing'
              iconColor={colors.textPrimary}
              size={24}
              accessibilityLabel={i18n.t('messaging.pendingMessages')}
              onPress={() => {}}
            />
            <Badge style={headerRightStyles.badge} size={16}>
              {pendingMessages > 99 ? '99+' : pendingMessages}
            </Badge>
          </View>
        );
      }
      return null;
    }, [pendingMessages, colors]);

    return (
      <View style={headerRightStyles.container}>
        {offlineStatusButton}
        {pendingMessagesBadge}
      </View>
    );
  }
);

export default HeaderRight;
