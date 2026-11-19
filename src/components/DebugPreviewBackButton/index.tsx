import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableButton, AppText } from '../ui';
import { useDebugPreviewStore } from '../../stores/debugPreviewStore';
import { navigationRef } from '../../navigation/navigationRef';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/radii';
import { styles } from './styles';

/**
 * Botão flutuante mostrado só enquanto o usuário está numa tela aberta
 * pelo atalho de navegação da tela de Debug (useDebugPreviewStore).
 * Existe pra dar um jeito de sair de qualquer tela — mesmo as sem botão
 * de voltar próprio (abas, telas com headerShown: false) — sem precisar
 * interagir com o conteúdo/fluxo real da tela, já que o atalho de Debug
 * é só pra validar layout.
 */
export function DebugPreviewBackButton() {
  const active = useDebugPreviewStore(state => state.active);
  const setActive = useDebugPreviewStore(state => state.setActive);
  const savedState = useDebugPreviewStore(state => state.savedState);
  const setSavedState = useDebugPreviewStore(state => state.setSavedState);
  const insets = useSafeAreaInsets();

  if (!active) return null;

  const handlePress = () => {
    setActive(false);
    if (navigationRef.isReady()) {
      // Restaura o estado exato de antes de sair do Debug (ex: Settings ->
      // Debug), em vez de resetar pra [{name: 'Debug'}] sozinho — isso
      // deixava Debug como raiz da pilha e quebrava o botão de voltar
      // dele mesmo (não tinha mais nada atrás pra voltar).
      if (savedState) {
        navigationRef.reset(savedState);
      } else {
        navigationRef.navigate('Debug');
      }
    }
    setSavedState(undefined);
  };

  return (
    <PressableButton
      onPress={handlePress}
      style={[
        styles.button,
        { bottom: insets.bottom + 16, borderRadius: radii.pill },
      ]}
      backgroundColor={colors.primary700}
      accessibilityLabel='Voltar para a tela de Debug'
      accessibilityRole='button'
      testID='debug-preview-back-button'
    >
      <AppText color={colors.neutral0} weight='600' size={14}>
        ← Debug
      </AppText>
    </PressableButton>
  );
}
