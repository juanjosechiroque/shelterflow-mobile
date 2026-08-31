import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n, { getCurrentLanguage, hydrateLanguage, setLanguage } from '@/i18n';
import { formatDate, getFormattingLocale } from '@/i18n/format';
import en from '@/i18n/resources/en.json';
import es from '@/i18n/resources/es.json';

function getTranslationKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    getTranslationKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('internationalization', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('uses Spanish when no preference has been stored', async () => {
    await hydrateLanguage();

    expect(getCurrentLanguage()).toBe('es');
    expect(i18n.t('navigation.home')).toBe('Inicio');
  });

  it('keeps Spanish and English translation keys aligned', () => {
    expect(getTranslationKeys(en).sort()).toEqual(
      getTranslationKeys(es).sort(),
    );
  });

  it('falls back to Spanish when a stored language is unsupported', async () => {
    await AsyncStorage.setItem('shelterflow.language', 'fr');

    await hydrateLanguage();

    expect(getCurrentLanguage()).toBe('es');
  });

  it('persists and restores the selected language', async () => {
    await setLanguage('en');

    expect(await AsyncStorage.getItem('shelterflow.language')).toBe('en');
    expect(getCurrentLanguage()).toBe('en');

    await i18n.changeLanguage('es');
    await hydrateLanguage();

    expect(getCurrentLanguage()).toBe('en');
    expect(i18n.t('navigation.home')).toBe('Home');
  });

  it('formats dates using the selected language locale', async () => {
    const date = new Date(2026, 7, 31, 12);

    expect(getFormattingLocale()).toBe('es-PE');
    expect(formatDate(date)).toBe('31 de agosto de 2026');

    await setLanguage('en');

    expect(getFormattingLocale()).toBe('en-US');
    expect(formatDate(date)).toBe('August 31, 2026');
  });
});
