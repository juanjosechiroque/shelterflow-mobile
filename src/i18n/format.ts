import { getCurrentLanguage, type SupportedLanguage } from './index';

const formattingLocales: Record<SupportedLanguage, string> = {
  en: 'en-US',
  es: 'es-PE',
};

export function getFormattingLocale(language = getCurrentLanguage()): string {
  return formattingLocales[language];
}

export function formatDate(
  value: Date | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  return new Intl.DateTimeFormat(getFormattingLocale(), options).format(value);
}
