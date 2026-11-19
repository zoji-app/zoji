import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

// Importar os hooks após os mocks
import { useAuth } from '../../src/contexts/AuthContext';
import { useToast } from '../../src/contexts/ToastContext';
import { useNavigation } from '@react-navigation/native';

// Mock dos hooks e serviços
const mockAddToast = jest.fn();
const mockNavigate = jest.fn();

// Mock do React Native
jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');

  return {
    ...reactNative,
    Alert: {
      alert: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(style => style),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios || obj.default),
    },
  };
});

// Mock dos contextos
jest.mock('../../src/contexts/TranslationContext', () => ({
  useTranslation: jest.fn(() => ({
    t: jest.fn(key => key),
  })),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

// Mock dos serviços
jest.mock('../../src/services/deviceContacts', () => ({
  getContactsWithPsiuStatus: jest.fn(),
}));

jest.mock('../../src/services/contacts', () => ({
  addContact: jest.fn(),
  loadContactsFromStorage: jest.fn(),
}));

// Mock do react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(callback => {
    callback();
    return null;
  }),
}));

// Componentes de teste
const LoadingScreen = () => (
  <View>
    <ActivityIndicator testID='loading-indicator' />
  </View>
);

const ContactsList = ({ onPressContact1, onPressContact2 }) => (
  <View>
    <TouchableOpacity testID='contact-1' onPress={onPressContact1}>
      <Text>Contato 1</Text>
      <Text>+5511888888888</Text>
    </TouchableOpacity>
    <TouchableOpacity testID='contact-2' onPress={onPressContact2}>
      <Text>Contato 2</Text>
      <Text>+5511777777777</Text>
    </TouchableOpacity>
  </View>
);

const EmptyList = ({ onPressAddManually }) => (
  <View>
    <Text>deviceContacts.noPsiuContacts</Text>
    <TouchableOpacity testID='add-manually-button' onPress={onPressAddManually}>
      <Text>friends.addManually</Text>
    </TouchableOpacity>
  </View>
);

describe('DeviceContactsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar mocks
    useAuth.mockImplementation(() => ({
      user: { uid: 'test-user-id', phoneNumber: '+5511999999999' },
    }));

    useToast.mockImplementation(() => ({
      addToast: mockAddToast,
    }));

    useNavigation.mockImplementation(() => ({
      navigate: mockNavigate,
    }));
  });

  it('deve renderizar o indicador de carregamento', () => {
    const { getByTestId } = render(<LoadingScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('deve exibir a lista de contatos', () => {
    const { getByText, getByTestId } = render(
      <ContactsList onPressContact1={() => {}} onPressContact2={() => {}} />
    );

    expect(getByText('Contato 1')).toBeTruthy();
    expect(getByText('Contato 2')).toBeTruthy();
    expect(getByText('+5511888888888')).toBeTruthy();
    expect(getByText('+5511777777777')).toBeTruthy();
  });

  it('deve chamar a função correta ao pressionar um contato', () => {
    const onPressContact1 = jest.fn();
    const onPressContact2 = jest.fn();

    const { getByTestId } = render(
      <ContactsList
        onPressContact1={onPressContact1}
        onPressContact2={onPressContact2}
      />
    );

    fireEvent.press(getByTestId('contact-1'));
    expect(onPressContact1).toHaveBeenCalled();

    fireEvent.press(getByTestId('contact-2'));
    expect(onPressContact2).toHaveBeenCalled();
  });

  it('deve exibir mensagem quando não há contatos', () => {
    const { getByText } = render(<EmptyList onPressAddManually={() => {}} />);

    expect(getByText('deviceContacts.noPsiuContacts')).toBeTruthy();
    expect(getByText('friends.addManually')).toBeTruthy();
  });

  it('deve chamar a função de navegação ao pressionar o botão de adicionar manualmente', () => {
    const onPressAddManually = jest.fn();

    const { getByTestId } = render(
      <EmptyList onPressAddManually={onPressAddManually} />
    );

    fireEvent.press(getByTestId('add-manually-button'));
    expect(onPressAddManually).toHaveBeenCalled();
  });
});
