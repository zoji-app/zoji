import React, { useEffect, useRef } from 'react';
import { View, Image, Animated } from 'react-native';
import { styles } from './styles';

interface SplashScreenProps {
  onFinish: () => void;
}

export const Splash: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef<Animated.Value | null>(null);

  // Criar o Animated.Value apenas uma vez no primeiro render
  if (fadeAnim.current === null) {
    fadeAnim.current = new Animated.Value(0);
  }

  useEffect(() => {
    if (!fadeAnim.current) return;

    Animated.sequence([
      Animated.timing(fadeAnim.current, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(fadeAnim.current, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [onFinish]);

  return (
    <View style={styles.container} testID='splash-container'>
      <Animated.View
        style={[styles.logoContainer, { opacity: fadeAnim.current }]}
        testID='logo-container'
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode='contain'
          testID='splash-logo'
        />
      </Animated.View>
    </View>
  );
};
