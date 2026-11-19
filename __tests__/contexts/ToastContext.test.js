import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View, Alert } from 'react-native';
import { ToastProvider, useToast } from '../../src/contexts/ToastContext';

// Mock do Alert.alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Componente de teste para acessar o hook useToast
const TestComponent = () => {
  const { addToast } = useToast();

  const handleAddSuccessToast = () => {
    addToast('success', 'Operação realizada com sucesso', 'Sucesso');
  };

  const handleAddErrorToast = () => {
    addToast('error', 'Ocorreu um erro', 'Erro');
  };

  const handleAddWarningToast = () => {
    addToast('warning', 'Atenção', 'Aviso');
  };

  const handleAddInfoToast = () => {
    addToast('info', 'Informação importante', 'Info');
  };

  const handleAddCustomDurationToast = () => {
    addToast('info', 'Este toast tem duração personalizada', 'Custom', 5000);
  };

  const handleAddPermanentToast = () => {
    addToast('info', 'Este toast é permanente', 'Permanente', 0);
  };

  return (
    <View>
      <TouchableOpacity testID='add-success' onPress={handleAddSuccessToast}>
        <Text>Add Success Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='add-error' onPress={handleAddErrorToast}>
        <Text>Add Error Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='add-warning' onPress={handleAddWarningToast}>
        <Text>Add Warning Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='add-info' onPress={handleAddInfoToast}>
        <Text>Add Info Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='add-custom-duration'
        onPress={handleAddCustomDurationToast}
      >
        <Text>Add Custom Duration Toast</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='add-permanent'
        onPress={handleAddPermanentToast}
      >
        <Text>Add Permanent Toast</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve mostrar um Alert de sucesso', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Adiciona um toast de sucesso
    act(() => {
      getByTestId('add-success').props.onPress();
    });

    // Verifica se o Alert.alert foi chamado com os parâmetros corretos
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sucesso',
      'Operação realizada com sucesso'
    );
  });

  it('deve mostrar um Alert de erro', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Adiciona um toast de erro
    act(() => {
      getByTestId('add-error').props.onPress();
    });

    // Verifica se o Alert.alert foi chamado com os parâmetros corretos
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Ocorreu um erro');
  });

  it('deve mostrar um Alert de aviso', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Adiciona um toast de aviso
    act(() => {
      getByTestId('add-warning').props.onPress();
    });

    // Verifica se o Alert.alert foi chamado com os parâmetros corretos
    expect(Alert.alert).toHaveBeenCalledWith('Aviso', 'Atenção');
  });

  it('deve mostrar um Alert de informação', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Adiciona um toast de informação
    act(() => {
      getByTestId('add-info').props.onPress();
    });

    // Verifica se o Alert.alert foi chamado com os parâmetros corretos
    expect(Alert.alert).toHaveBeenCalledWith('Info', 'Informação importante');
  });

  it('deve mostrar Alert com título padrão quando não é fornecido', () => {
    // Criando um componente para testar os títulos padrão
    const TestDefaultTitle = () => {
      const { addToast } = useToast();

      React.useEffect(() => {
        // Chamar addToast sem título para testar os títulos padrão
        addToast('success', 'Mensagem de sucesso');
        addToast('error', 'Mensagem de erro');
      }, [addToast]);

      return <Text>Test Default Title</Text>;
    };

    render(
      <ToastProvider>
        <TestDefaultTitle />
      </ToastProvider>
    );

    // Verificar se o Alert foi chamado com os títulos padrão corretos
    expect(Alert.alert).toHaveBeenCalledWith('Sucesso', 'Mensagem de sucesso');
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Mensagem de erro');
  });
});
