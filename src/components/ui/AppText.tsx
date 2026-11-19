import React from 'react';
import { TextStyle } from 'react-native';
import { Text, TextProps } from 'react-native-paper';
import { typography } from '../../theme/typography';

type TypographyVariant = keyof typeof typography;

/**
 * Embrulha o Text do react-native-paper — todo call site de hoje que
 * vamos migrar (headerTitle, título do Login) já usa o Text do Paper,
 * não o RN puro; trocar o motor de renderização é exatamente o tipo de
 * mudança "invisível" que poderia alterar pixel sem querer.
 *
 * `variant` só existe pras receitas realmente duplicadas hoje
 * (catalogadas em theme/typography.ts) — em todo o resto, a tela
 * continua passando size/weight/color/font explícitos, igual já fazia.
 */
export interface AppTextProps extends Omit<TextProps<never>, 'variant'> {
  variant?: TypographyVariant;
  color?: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
  font?: string;
}

export function AppText({
  variant,
  color,
  size,
  weight,
  font,
  style,
  children,
  ...rest
}: AppTextProps) {
  const variantStyle = variant ? typography[variant] : null;

  return (
    <Text
      {...rest}
      style={[
        variantStyle,
        color !== undefined && { color },
        size !== undefined && { fontSize: size },
        weight !== undefined && { fontWeight: weight },
        font !== undefined && { fontFamily: font },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
