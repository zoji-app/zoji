import React from 'react';
import {
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

/**
 * Embrulha TouchableOpacity pros ~18 "botões" montados na mão hoje
 * (View com backgroundColor/padding/borderRadius). Não existe um
 * "variant" com cor fixa de propósito — cada cor/raio já é diferente
 * de tela pra tela hoje, então cada chamada continua passando o valor
 * exato que já usava, só sem repetir o TouchableOpacity toda vez.
 *
 * Estende TouchableOpacityProps (hitSlop, accessibilityLabel, etc.)
 * em vez de listar cada prop à mão — vários call sites (ex: o FAB)
 * usam props de acessibilidade/toque que um subconjunto restrito
 * deixaria passar batido.
 */
export interface PressableButtonProps extends Omit<
  TouchableOpacityProps,
  'style'
> {
  backgroundColor?: string;
  borderRadius?: number;
  width?: number;
  height?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  padding?: number;
  disabledOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function PressableButton({
  backgroundColor,
  borderRadius,
  width,
  height,
  paddingHorizontal,
  paddingVertical,
  padding,
  disabledOpacity,
  disabled,
  style,
  ...rest
}: PressableButtonProps) {
  return (
    <TouchableOpacity
      disabled={disabled}
      {...rest}
      style={[
        {
          backgroundColor,
          borderRadius,
          width,
          height,
          paddingHorizontal,
          paddingVertical,
          padding,
          opacity:
            disabled && disabledOpacity !== undefined
              ? disabledOpacity
              : undefined,
        },
        style,
      ]}
    />
  );
}
