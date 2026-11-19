import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors, darkColors, zojiColors } from '../theme/colors';
import { logger } from '../utils/logger';
import { setWidgetThemeMode } from '../services/widgetService';

export type ThemeMode = 'light' | 'dark' | 'zoji' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextType = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: typeof lightColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@zoji:theme_mode';
const supportedModes: ThemeMode[] = ['light', 'dark', 'zoji', 'system'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  // Zoji é o tema padrão — só troca se o usuário já tiver escolhido outro
  // (carregado do AsyncStorage abaixo).
  const [mode, setModeState] = useState<ThemeMode>('zoji');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && supportedModes.includes(saved as ThemeMode)) {
          setModeState(saved as ThemeMode);
        }
      } catch (error) {
        logger.error(
          '[ThemeContext] Erro ao carregar tema salvo:',
          error as Error
        );
      }
    })();
  }, []);

  // Mantém o widget (App Group) em sincronia com a escolha do usuário —
  // roda tanto na carga inicial (AsyncStorage) quanto em toda troca manual.
  // O nativo (iOS/Android) reconhece "zoji" como valor próprio, com o fundo
  // navy replicado lá (não lê theme/colors.ts, que é só JS).
  useEffect(() => {
    setWidgetThemeMode(mode);
  }, [mode]);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      logger.error('[ThemeContext] Erro ao salvar tema:', error as Error);
    }
  }, []);

  // Sinal simples "isso é visualmente escuro?" — usado só pra decisões de
  // chrome do sistema (status bar, nav bar do Android, base do Paper).
  // Zoji conta como escuro aqui mesmo sendo uma paleta própria (ver `colors`
  // abaixo), pra ícones/materiais claros do SO continuarem corretos nela.
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    if (mode === 'zoji') return 'dark';
    return mode;
  }, [mode, systemScheme]);

  const resolvedColors = useMemo(() => {
    if (mode === 'zoji') return zojiColors;
    if (mode === 'system')
      return systemScheme === 'dark' ? darkColors : lightColors;
    return mode === 'dark' ? darkColors : lightColors;
  }, [mode, systemScheme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      resolvedTheme,
      colors: resolvedColors,
      setMode,
    }),
    [mode, resolvedTheme, resolvedColors, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return ctx;
}

/** Atalho pra quem só precisa da paleta resolvida (uso mais comum em styles.ts). */
export function useThemeColors(): typeof lightColors {
  return useTheme().colors;
}
