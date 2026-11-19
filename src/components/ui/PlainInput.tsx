import React, { forwardRef } from 'react';
import { StyleProp, TextInput, TextInputProps, TextStyle } from 'react-native';

/**
 * Embrulha o TextInput cru do RN (AddContact, CreateGroup, GroupDetails
 * edição inline, Debug). Cada tela tem raio/borda/altura próprios — vira
 * prop explícita em vez de um padrão novo. Repassa a ref pro TextInput
 * nativo por baixo — AddContact chama .blur() nela imperativamente.
 */
export interface PlainInputProps extends Omit<TextInputProps, 'style'> {
  borderRadius?: number;
  borderWidth?: number;
  height?: number;
  fontFamily?: string;
  backgroundColor?: string;
  style?: StyleProp<TextStyle>;
}

export const PlainInput = forwardRef<TextInput, PlainInputProps>(
  (
    {
      borderRadius,
      borderWidth,
      height,
      fontFamily,
      backgroundColor,
      style,
      ...rest
    },
    ref
  ) => (
    <TextInput
      ref={ref}
      {...rest}
      style={[
        {
          borderRadius,
          borderWidth,
          height,
          fontFamily,
          backgroundColor,
        },
        style,
      ]}
    />
  )
);

PlainInput.displayName = 'PlainInput';
