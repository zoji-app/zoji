import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Mock para LoginScreen
export const LoginScreenMock = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');

  return (
    <View testID='login-screen'>
      <Text>Login Screen</Text>
      <input
        testID='phone-input'
        value={phoneNumber}
        onChange={e => setPhoneNumber(e.target.value)}
        placeholder='Telefone'
      />
      <input
        testID='code-input'
        value={verificationCode}
        onChange={e => setVerificationCode(e.target.value)}
        placeholder='Código de verificação'
      />
      <TouchableOpacity testID='send-code-button' onPress={() => {}}>
        <Text>Enviar código</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='verify-code-button'
        onPress={() => navigation.navigate('ProfileSetup')}
      >
        <Text>Verificar código</Text>
      </TouchableOpacity>
    </View>
  );
};

// Mock para SettingsScreen
export const SettingsScreenMock = ({ navigation }) => {
  return (
    <View testID='settings-screen'>
      <Text>Settings Screen</Text>
      <TouchableOpacity testID='logout-button' onPress={() => {}}>
        <Text>Logout</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='delete-account-button' onPress={() => {}}>
        <Text>Excluir conta</Text>
      </TouchableOpacity>
    </View>
  );
};
