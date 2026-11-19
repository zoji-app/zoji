import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableButton } from './PressableButton';
import { useThemeColors } from '../../contexts/ThemeContext';

const BACK_BUTTON_SIZE = 36;

/**
 * Header único e adaptável pras duas famílias que existem hoje no app:
 * - Sem `onBack` (Amigos/Configurações/Perfil): título Fredoka à esquerda,
 *   `right` livre (logo, botão de ação, etc.).
 * - Com `onBack` (Adicionar Contato/Contatos Bloqueados/etc.): botão de
 *   voltar + título Fredoka centralizado + espaçador do lado direito do
 *   mesmo tamanho do botão de voltar (ou `right`, se passado), pra manter
 *   o título centralizado de verdade.
 *
 * Antes disso cada tela montava seu próprio header à mão — daí a
 * inconsistência real entre telas (fonte/tamanho/alinhamento do título,
 * ícone de voltar diferente) que motivou esse componente.
 */
export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Conteúdo extra ao lado do título (ex: spinner de status em Amigos) —
   * só faz sentido no modo sem `onBack` (título à esquerda). */
  titleExtra?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  onBack,
  right,
  titleExtra,
  style,
}: ScreenHeaderProps) {
  const isBackMode = onBack !== undefined;
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.hairline,
        },
        style,
      ]}
    >
      {isBackMode && (
        <PressableButton
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel='Voltar'
          accessibilityRole='button'
        >
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </PressableButton>
      )}
      {isBackMode ? (
        <AppText
          variant='backHeaderTitle'
          color={colors.textPrimary}
          style={styles.centeredTitle}
          numberOfLines={1}
        >
          {title}
        </AppText>
      ) : (
        <View style={styles.leftTitleRow}>
          <AppText
            variant='headerTitle'
            color={colors.textPrimary}
            numberOfLines={1}
          >
            {title}
          </AppText>
          {titleExtra}
        </View>
      )}
      {isBackMode ? (right ?? <View style={styles.backButton} />) : right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centeredTitle: {
    flex: 1,
    textAlign: 'center',
  },
});
