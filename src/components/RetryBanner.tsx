import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useApiBackoff } from '../hooks/useApiBackoff';
import { colors } from '../theme/colors';
import { i18n } from '../i18n';

/**
 * P3-2, item 2 — "Muita gente entrando agora, tente novamente em Xs".
 * Não-bloqueante de propósito (nada de Alert.alert): some sozinho quando o
 * apiClient consegue completar o retry, sem exigir toque do usuário.
 * Mesmo padrão visual do WsStatusBanner (altura/opacidade animadas).
 */
export function RetryBanner() {
  const { active, retryAt } = useApiBackoff();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!active || !retryAt) {
      setSecondsLeft(0);
      return;
    }
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active, retryAt]);

  const visible = active && secondsLeft > 0;

  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: visible ? 32 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      style={[styles.banner, { height: heightAnim, opacity: opacityAnim }]}
      testID='retry-banner'
    >
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={1}>
          {i18n.t('common.highTrafficRetry', { seconds: secondsLeft })}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    overflow: 'hidden',
    width: '100%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
