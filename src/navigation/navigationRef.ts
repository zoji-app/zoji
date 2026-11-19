import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

/**
 * Ref compartilhado do NavigationContainer — permite navegar de fora da
 * árvore de telas (ex: DebugPreviewBackButton, que é renderizado como
 * irmão do NavigationContainer em App.tsx, não dentro de uma tela).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
