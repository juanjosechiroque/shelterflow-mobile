import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';

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

describe('<SettingsScreen /> My Shelter section', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    useAuthMock.mockReset();
    await AsyncStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('exposes only the authenticated shelter identity read-only', async () => {
    useAuthMock.mockReturnValue({
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
    } satisfies AuthContextValue);

    const screen = await render(<SettingsScreen />);

    expect(screen.getByText('Mi refugio')).toBeTruthy();
    expect(screen.getByText('Huellitas Rescue')).toBeTruthy();
    expect(screen.getByText('Peru')).toBeTruthy();
    expect(screen.getByText('Administrador Huellitas')).toBeTruthy();
    expect(screen.getByText('admin@shelter.com')).toBeTruthy();

    // The other shelter fixture must not be visible to the administrator.
    expect(screen.queryByText('Patitas Felices')).toBeNull();
    expect(screen.queryByText('Argentina')).toBeNull();
  });

  it('calls signOut when the logout button is pressed', async () => {
    const signOut = jest.fn(() => Promise.resolve());
    useAuthMock.mockReturnValue({
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
      signOut,
    } satisfies AuthContextValue);

    const screen = await render(<SettingsScreen />);
    await screen.findByText('Cerrar sesión');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
