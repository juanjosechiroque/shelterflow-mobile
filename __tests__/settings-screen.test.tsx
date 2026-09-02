import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import i18n from '@/i18n';
import type { AuthContextValue } from '@/features/auth/auth-provider';

jest.mock('@/features/auth/auth-provider', () => {
  const actual = jest.requireActual('@/features/auth/auth-provider');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const useAuthMock = jest.requireMock('@/features/auth/auth-provider')
  .useAuth as jest.Mock;

const baseAuthValue: AuthContextValue = {
  status: 'authenticated',
  session: null,
  profile: {
    id: '00000000-0000-4000-8000-000000000103',
    displayName: 'Administrador Huellitas',
    shelterId: '00000000-0000-4000-8000-000000000001',
  },
  shelter: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Huellitas Rescue',
    country: 'Peru',
  },
  email: 'admin@shelter.com',
  hasSupabaseConfig: true,
  signIn: jest.fn(),
  signOut: jest.fn(),
};

describe('<SettingsScreen />', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue(baseAuthValue);
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

  it('places all settings content in a scroll container', async () => {
    const screen = await render(<SettingsScreen />);

    expect(screen.getByTestId('settings-scroll-view')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });
});
