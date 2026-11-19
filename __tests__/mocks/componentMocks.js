import React from 'react';
import { View, Text } from 'react-native';

// Mock para o componente SplashScreen
export const SplashScreenMock = ({ onFinish }) => {
  React.useEffect(() => {
    // Simular a conclusão da animação
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 0);
  }, [onFinish]);

  return (
    <View testID='splash-screen'>
      <Text>SplashScreen Mock</Text>
    </View>
  );
};

// Mock para o componente AuthLoadingOverlay
export const AuthLoadingOverlayMock = ({ visible, message }) => {
  return visible ? (
    <View testID='auth-loading-overlay'>
      <Text>{message || 'Carregando...'}</Text>
    </View>
  ) : null;
};

// Mock para o FirebaseRecaptchaWrapper
export const FirebaseRecaptchaWrapperMock = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    verify: jest.fn().mockResolvedValue('verified-token'),
  }));
  return <div data-testid='recaptcha-wrapper' />;
});

// Adicione outros mocks de componentes conforme necessário
