import React from 'react';
import {
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleProp,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useThemeColors } from '../../contexts/ThemeContext';

/**
 * Embrulha o TextInput do react-native-paper (Login/Profile/ProfileSetup).
 * Cada tela hoje tem um tratamento visual próprio (com sombra, sem sombra,
 * com/sem fundo) — reproduzido via props explícitas, não um padrão novo.
 */
export interface PaperFormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  backgroundColor?: string;
  shadow?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  maxLength?: number;
  /** iOS: 'oneTimeCode' faz o teclado sugerir o código que chegou por SMS. */
  textContentType?: TextInputProps['textContentType'];
  /** Android: 'sms-otp' liga o preenchimento automático do código do SMS. */
  autoComplete?: TextInputProps['autoComplete'];
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Cor do sublinhado/label quando focado (mode flat) — sem isso, o Paper usa theme.colors.primary. */
  activeColor?: string;
  /** Cor do sublinhado em repouso (mode flat). */
  underlineColor?: string;
}

const SHADOW_STYLE = {
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
};

export function PaperFormField({
  label,
  value,
  onChangeText,
  disabled,
  keyboardType,
  placeholder,
  backgroundColor,
  shadow,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  maxLength,
  textContentType,
  autoComplete,
  testID,
  style,
  activeColor,
  underlineColor,
}: PaperFormFieldProps) {
  const colors = useThemeColors();

  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      disabled={disabled}
      keyboardType={keyboardType}
      placeholder={placeholder}
      // O Paper calcula a cor do placeholder sozinho a partir do tema, mas
      // nem sempre acompanha bem — pouco contraste no escuro (achado em
      // teste manual no Login). Fixando explícito em vez de confiar nisso.
      placeholderTextColor={colors.textSecondary}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      blurOnSubmit={blurOnSubmit}
      maxLength={maxLength}
      textContentType={textContentType}
      autoComplete={autoComplete}
      testID={testID}
      activeUnderlineColor={activeColor}
      underlineColor={underlineColor}
      style={[
        backgroundColor !== undefined ? { backgroundColor } : null,
        shadow ? SHADOW_STYLE : null,
        style,
      ]}
    />
  );
}
