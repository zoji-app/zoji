import { create } from 'zustand';
import type { NavigationState } from '@react-navigation/native';

interface DebugPreviewState {
  active: boolean;
  setActive: (active: boolean) => void;
  /** Estado da pilha capturado bem antes de sair da tela de Debug pra um
   * preview — restaurado (via reset) ao voltar, em vez de só empilhar
   * mais uma navegação por cima. Preserva o histórico real de antes
   * (ex: Settings -> Debug), então o botão de voltar da própria tela de
   * Debug continua funcionando depois. */
  savedState: NavigationState | undefined;
  setSavedState: (state: NavigationState | undefined) => void;
}

export const useDebugPreviewStore = create<DebugPreviewState>(set => ({
  active: false,
  setActive: (active: boolean) => set({ active }),
  savedState: undefined,
  setSavedState: (savedState: NavigationState | undefined) =>
    set({ savedState }),
}));
