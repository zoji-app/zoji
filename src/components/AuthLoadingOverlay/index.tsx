import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { i18n } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { getStyles } from './styles';

interface AuthLoadingOverlayProps {
  loading: boolean;
  onFinishLoading?: () => void;
}

export const AuthLoadingOverlay: React.FC<AuthLoadingOverlayProps> = ({
  loading,
  onFinishLoading,
}) => {
  const [visible, setVisible] = useState(loading);
  const opacity = new Animated.Value(1);
  const { colors, resolvedTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    if (loading) {
      // Se estiver carregando, garantimos que o overlay esteja visível
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      // Quando parar de carregar, fazemos uma animação de fade out
      // Adicionamos um delay significativamente maior para Android
      const timeout = Platform.OS === 'android' ? 2500 : 1500;

      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400, // Aumentado para uma transição mais suave
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          if (onFinishLoading) {
            onFinishLoading();
          }
        });
      }, timeout);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity },
        Platform.OS === 'android' ? styles.androidExtra : {},
      ]}
      testID='auth-loading-container'
    >
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.loadingContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode='contain'
          testID='loading-logo'
        />
        <ActivityIndicator
          size='large'
          color={colors.primary700}
          testID='loading-indicator'
        />
        <Text style={styles.loadingText} testID='loading-text'>
          {i18n.t('common.loading')}
        </Text>
      </View>
    </Animated.View>
  );
};
