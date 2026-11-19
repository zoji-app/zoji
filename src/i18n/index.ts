import { I18n } from 'i18n-js';
import i18next from 'i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initReactI18next } from 'react-i18next';
import { logger } from '../utils/logger';

import pt from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';

export const i18n = new I18n({
  pt,
  en,
  es,
});

i18n.defaultLocale = 'pt';
i18n.enableFallback = true;

let currentLanguage = 'pt';

// Configuração do react-i18next
i18next.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
  },
  lng: currentLanguage,
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

export const getCurrentLanguage = () => currentLanguage;

export const initializeLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('@app_language');
    if (savedLanguage) {
      i18n.locale = savedLanguage;
      currentLanguage = savedLanguage;
      i18next.changeLanguage(savedLanguage);
    } else {
      const deviceLanguage = (
        Localization.getLocales()[0]?.languageCode ?? 'pt'
      ).split('-')[0];
      const supportedLanguage = ['pt', 'en', 'es'].includes(deviceLanguage)
        ? deviceLanguage
        : 'pt';
      i18n.locale = supportedLanguage;
      currentLanguage = supportedLanguage;
      i18next.changeLanguage(supportedLanguage);
      await AsyncStorage.setItem('@app_language', supportedLanguage);
    }
  } catch (error) {
    logger.error('Erro ao inicializar idioma:', error as Error);
    i18n.locale = 'pt';
    currentLanguage = 'pt';
    i18next.changeLanguage('pt');
  }
};

export const changeLanguage = async (language: string) => {
  try {
    i18n.locale = language;
    currentLanguage = language;
    i18next.changeLanguage(language);
    await AsyncStorage.setItem('@app_language', language);
  } catch (error) {
    logger.error('Erro ao mudar idioma:', error as Error);
  }
};

// Força a atualização do i18n quando o módulo é carregado
initializeLanguage();
