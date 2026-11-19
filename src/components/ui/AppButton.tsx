import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

/**
 * Embrulha o Button do react-native-paper. Absorve o boilerplate comum
 * (loading/disabled) sem mudar nenhum visual — cada tela continua
 * passando seu style/mode/etc exatamente como fazia antes, só que via
 * um componente só em vez de repetir o JSX do Paper em cada arquivo.
 *
 * Altura do "contained": cada tela tinha um paddingVertical diferente
 * (1, 3, 4, 6, 8...) espalhado pelo próprio style — por isso a altura
 * nunca ficava igual entre telas (achado em teste manual: Login/ProfileSetup
 * visivelmente mais baixos que Perfil). Centralizado aqui via contentStyle,
 * que controla o padding do CONTEÚDO interno (não o container/margem que
 * style ainda controla) — uma tela só sobrescreve se passar contentStyle
 * explicitamente.
 */
const CONTAINED_CONTENT_STYLE = { paddingVertical: 8 };

export interface AppButtonProps {
  mode: 'contained' | 'outlined' | 'text';
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  icon?: string;
  textColor?: string;
  buttonColor?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AppButton({
  mode,
  onPress,
  children,
  loading,
  disabled,
  compact,
  icon,
  textColor,
  buttonColor,
  borderRadius,
  style,
  contentStyle,
  testID,
}: AppButtonProps) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      compact={compact}
      icon={icon}
      textColor={textColor}
      buttonColor={buttonColor}
      style={[borderRadius !== undefined ? { borderRadius } : null, style]}
      contentStyle={[
        mode === 'contained' ? CONTAINED_CONTENT_STYLE : null,
        contentStyle,
      ]}
      testID={testID}
    >
      {children}
    </Button>
  );
}
