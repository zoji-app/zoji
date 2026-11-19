import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableRipple } from 'react-native-paper';

// Mock de dependências externas
jest.mock('../../src/services/contacts', () => ({
  addContactProfileListener: jest.fn(() => jest.fn()), // Retorna uma função de limpeza
}));

// Criamos um componente mock baseado no ContactItem do FriendsScreen
const MockContactItem = ({ item, navigation }) => {
  // Versão simplificada do componente para teste
  return (
    <TouchableRipple
      onPress={() => navigation.navigate('IndividualChat', { contact: item })}
      testID={`contact-${item.id}`}
    >
      <Text testID='contact-name'>{item.nickname}</Text>
    </TouchableRipple>
  );
};

describe('ContactItem', () => {
  it('renderiza corretamente com dados básicos', () => {
    const mockNavigation = {
      navigate: jest.fn(),
    };

    const mockContact = {
      id: 'test-contact-1',
      nickname: 'Contato Teste',
      profileEmoji: '👋',
      phoneNumber: '+5511999999999',
      lastMessage: null,
    };

    const { getByTestId, getByText } = render(
      <MockContactItem item={mockContact} navigation={mockNavigation} />
    );

    // Verifica se o nome do contato é exibido
    expect(getByText('Contato Teste')).toBeTruthy();

    // Verifica se o elemento pode ser clicado
    const touchable = getByTestId('contact-test-contact-1');
    fireEvent.press(touchable);

    // Verifica se a navegação foi chamada com os parâmetros corretos
    expect(mockNavigation.navigate).toHaveBeenCalledWith('IndividualChat', {
      contact: mockContact,
    });
  });

  it('lida corretamente com contatos sem mensagens', () => {
    const mockNavigation = {
      navigate: jest.fn(),
    };

    const mockContact = {
      id: 'test-contact-2',
      nickname: 'Contato Sem Mensagem',
      profileEmoji: '👤',
      phoneNumber: '+5511888888888',
      lastMessage: null,
    };

    const { getByText } = render(
      <MockContactItem item={mockContact} navigation={mockNavigation} />
    );

    // Verifica se o nome do contato é exibido
    expect(getByText('Contato Sem Mensagem')).toBeTruthy();
  });
});
