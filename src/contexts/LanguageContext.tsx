import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { i18n, changeLanguage, getCurrentLanguage } from '../i18n';
import { logger } from '../utils/logger';

// Crie um objeto para armazenar um ID de versão que muda quando o idioma muda
export const languageVersionState = { version: 0 };

type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => Promise<void>;
  languageVersion: number; // Adicionar um número de versão que muda quando o idioma muda
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const supportedLanguages = ['pt-BR', 'en', 'es'];
const defaultLanguage = 'pt-BR';

const getDeviceLanguage = () => {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  if (locale.startsWith('pt')) return 'pt-BR';
  if (locale.startsWith('es')) return 'es';
  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<string>(getCurrentLanguage());
  const [languageVersion, setLanguageVersion] = useState<number>(0);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('@app_language');
        if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
          setLanguageState(savedLanguage);
          await changeLanguage(savedLanguage);
        } else {
          const deviceLanguage = getDeviceLanguage();
          setLanguageState(deviceLanguage);
          await changeLanguage(deviceLanguage);
          await AsyncStorage.setItem('@app_language', deviceLanguage);
        }
      } catch (error) {
        logger.error('Erro ao carregar idioma:', error);
        // Em caso de erro, use o idioma padrão
        setLanguageState(defaultLanguage);
        await changeLanguage(defaultLanguage);
      }
    };

    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(
    async (newLanguage: string) => {
      try {
        if (!supportedLanguages.includes(newLanguage)) {
          throw new Error('Idioma não suportado');
        }
        await changeLanguage(newLanguage);
        await AsyncStorage.setItem('@app_language', newLanguage);
        setLanguageState(newLanguage);

        // Incrementar a versão para forçar a atualização dos componentes
        const newVersion = languageVersion + 1;
        languageVersionState.version = newVersion;
        setLanguageVersion(newVersion);

        // Forçar atualização do i18n
        i18n.locale = newLanguage;
      } catch (error) {
        logger.error('Erro ao salvar idioma:', error);
        throw error;
      }
    },
    [languageVersion]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, languageVersion }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
