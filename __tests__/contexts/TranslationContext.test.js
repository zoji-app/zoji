import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  TranslationProvider,
  useTranslation,
} from '../../src/contexts/TranslationContext';
import { getCurrentLanguage, changeLanguage } from '../../src/i18n';

// Mock do i18n
jest.mock('../../src/i18n', () => ({
  getCurrentLanguage: jest.fn(() => 'pt-BR'),
  changeLanguage: jest.fn(() => Promise.resolve()),
  t: jest.fn(key => key),
}));

// Mock do react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: jest.fn(key => key),
  }),
}));

// Componente de teste para acessar o hook useTranslation
const TestComponent = () => {
  const { t, changeLanguage, currentLanguage } = useTranslation();

  return (
    <View>
      <Text testID='current-language'>{currentLanguage}</Text>
      <Text testID='translated-text'>{t('hello.world')}</Text>
      <TouchableOpacity
        testID='change-to-en'
        onPress={() => changeLanguage('en')}
      >
        <Text>Change to English</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='change-to-pt'
        onPress={() => changeLanguage('pt-BR')}
      >
        <Text>Change to Portuguese</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='change-to-es'
        onPress={() => changeLanguage('es')}
      >
        <Text>Change to Spanish</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('TranslationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentLanguage.mockReturnValue('pt-BR');
  });

  it('deve fornecer o idioma atual', () => {
    const { getByTestId } = render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const currentLanguage = getByTestId('current-language');
    expect(currentLanguage.props.children).toBe('pt-BR');
  });

  it('deve fornecer a função de tradução', () => {
    const { getByTestId } = render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const translatedText = getByTestId('translated-text');
    expect(translatedText.props.children).toBe('hello.world');
  });

  it('deve mudar o idioma quando changeLanguage é chamado', async () => {
    const { getByTestId } = render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    // Muda o idioma para inglês
    await act(async () => {
      fireEvent.press(getByTestId('change-to-en'));
    });

    // Verifica se a função changeLanguage foi chamada com o idioma correto
    expect(changeLanguage).toHaveBeenCalledWith('en');
  });

  it('deve lançar um erro se useTranslation for usado fora do TranslationProvider', () => {
    // Silencia os erros de console para este teste
    const originalError = console.error;
    console.error = jest.fn();

    // Função que tenta renderizar o componente de teste sem o provider
    const renderWithoutProvider = () => {
      render(<TestComponent />);
    };

    // Verifica se a função lança um erro
    expect(renderWithoutProvider).toThrow(
      'useTranslation must be used within a TranslationProvider'
    );

    // Restaura o console.error
    console.error = originalError;
  });
});
