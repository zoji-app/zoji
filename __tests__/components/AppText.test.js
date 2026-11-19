// Regressão: `variant` sem nenhuma outra prop (color/size/weight/font)
// apagava o próprio variantStyle — um objeto posterior no array de
// estilo com essas 4 chaves em `undefined` sobrescrevia os valores reais
// do variantStyle (React Native não ignora chave com valor `undefined`
// explícito num merge de estilo). Achado ao vivo: headerTitle sumindo
// em Settings/Friends/Profile depois da migração pro AppText.
//
// StyleSheet.flatten do mock global de react-native é uma função
// identidade (não achata array de verdade) — por isso o merge é
// replicado aqui manualmente, do mesmo jeito que o React Native faz de
// verdade (Object.assign em sequência, onde uma chave `undefined`
// explícita SOBRESCREVE um valor anterior da mesma chave).

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText } from '../../src/components/ui/AppText';

jest.mock('react-native-paper', () => ({
  Text: ({ style, children, ...rest }) =>
    require('react').createElement(
      'Text',
      { ...rest, style, testID: 'app-text' },
      children
    ),
}));

function flattenStyle(style) {
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => Object.assign(acc, flattenStyle(s)), {});
  }
  return style || {};
}

describe('AppText', () => {
  it('mantém o estilo do variant quando nenhuma outra prop é passada', () => {
    const { getByTestId } = render(
      <AppText variant='headerTitle'>Título</AppText>
    );

    const flattened = flattenStyle(getByTestId('app-text').props.style);

    expect(flattened.fontFamily).toBe('Fredoka_600SemiBold');
    expect(flattened.fontSize).toBe(32);
    expect(flattened.color).toBeDefined();
  });

  it('deixa color/size/weight/font explícitos sobrescreverem o variant', () => {
    const { getByTestId } = render(
      <AppText variant='headerTitle' size={20} color='#123456'>
        Título
      </AppText>
    );

    const flattened = flattenStyle(getByTestId('app-text').props.style);

    expect(flattened.fontSize).toBe(20);
    expect(flattened.color).toBe('#123456');
    // fontFamily do variant continua de pé — só as props passadas mudam
    expect(flattened.fontFamily).toBe('Fredoka_600SemiBold');
  });

  it('sem variant, usa só as props explícitas', () => {
    const { getByTestId } = render(
      <AppText size={14} weight='700' color='#000'>
        Texto
      </AppText>
    );

    const flattened = flattenStyle(getByTestId('app-text').props.style);

    expect(flattened.fontSize).toBe(14);
    expect(flattened.fontWeight).toBe('700');
    expect(flattened.color).toBe('#000');
  });

  it('style prop sempre vence por último', () => {
    const { getByTestId } = render(
      <AppText variant='headerTitle' style={{ fontSize: 99 }}>
        Título
      </AppText>
    );

    const flattened = flattenStyle(getByTestId('app-text').props.style);

    expect(flattened.fontSize).toBe(99);
  });
});
