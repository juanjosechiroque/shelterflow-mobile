import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './resources/en.json';
import es from './resources/es.json';

export const supportedLanguages = ['es', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const languageStorageKey = 'shelterflow.language';
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: 'es',
  fallbackLng: 'es',
  supportedLngs: supportedLanguages,
  interpolation: {
    escapeValue: false,
  },
});

function isSupportedLanguage(
  value: string | null | undefined,
): value is SupportedLanguage {
  return supportedLanguages.some((language) => language === value);
}

export async function hydrateLanguage(): Promise<void> {
  const storedLanguage = await AsyncStorage.getItem(languageStorageKey);
  const language = isSupportedLanguage(storedLanguage) ? storedLanguage : 'es';

  await i18n.changeLanguage(language);
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(languageStorageKey, language);
  await i18n.changeLanguage(language);
}

export function getCurrentLanguage(): SupportedLanguage {
  return isSupportedLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : 'es';
}

export default i18n;
