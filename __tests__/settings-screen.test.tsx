import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import i18n from '@/i18n';

describe('<SettingsScreen />', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('switches the UI to English and persists the preference', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    await waitFor(() => {
      expect(screen.getByText('Language')).toBeTruthy();
    });
    expect(await AsyncStorage.getItem('shelterflow.language')).toBe('en');
  });

  it('shows an error when the preference cannot be persisted', async () => {
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('storage failed'));
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(
      screen.getByText('No pudimos guardar el idioma. Inténtalo nuevamente.'),
    ).toBeTruthy();
    expect(i18n.resolvedLanguage).toBe('es');
  });
});
