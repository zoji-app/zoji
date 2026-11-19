import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import {
  getCurrentLanguage,
  changeLanguage as changeAppLanguage,
} from '../i18n';

type TranslationContextType = {
  t: (key: string, options?: any) => string;
  changeLanguage: (lang: string) => Promise<void>;
  currentLanguage: string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useReactI18nextTranslation();

  const changeLanguage = async (lang: string) => {
    await changeAppLanguage(lang);
  };

  const value = {
    t,
    changeLanguage,
    currentLanguage: getCurrentLanguage(),
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
