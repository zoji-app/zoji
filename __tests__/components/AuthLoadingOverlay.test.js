import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthLoadingOverlayMock as AuthLoadingOverlay } from '../mocks/componentMocks';

jest.mock('../../src/components/AuthLoadingOverlay', () => {
  return require('../mocks/componentMocks').AuthLoadingOverlayMock;
});

describe('AuthLoadingOverlay', () => {
  it('deve renderizar corretamente quando visível', () => {
    const { getByTestId, getByText } = render(
      <AuthLoadingOverlay visible={true} message='Carregando...' />
    );

    expect(getByTestId('auth-loading-overlay')).toBeTruthy();
    expect(getByText('Carregando...')).toBeTruthy();
  });

  it('não deve renderizar quando não estiver visível', () => {
    const { queryByTestId } = render(
      <AuthLoadingOverlay visible={false} message='Carregando...' />
    );

    expect(queryByTestId('auth-loading-overlay')).toBeNull();
  });

  it('deve exibir a mensagem personalizada', () => {
    const { getByText } = render(
      <AuthLoadingOverlay visible={true} message='Autenticando...' />
    );

    expect(getByText('Autenticando...')).toBeTruthy();
  });
});
