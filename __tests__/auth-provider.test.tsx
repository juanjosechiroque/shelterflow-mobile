import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';

jest.mock('@/lib/supabase', () => ({
  createSupabaseClient: jest.fn(),
  readSupabaseConfig: jest.fn(),
}));

import {
  AuthProvider,
  useAuth,
  type AuthContextValue,
} from '@/features/auth/auth-provider';
import type { Database } from '@/lib/database.types';
import type { SupabaseConfig } from '@/lib/supabase';

const { createSupabaseClient, readSupabaseConfig } = jest.requireMock(
  '@/lib/supabase',
) as {
  createSupabaseClient: jest.Mock;
  readSupabaseConfig: jest.Mock;
};

type AuthStateListener = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

interface FakeAuthClient {
  auth: {
    getSession: jest.Mock;
    onAuthStateChange: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    startAutoRefresh: jest.Mock;
    stopAutoRefresh: jest.Mock;
  };
  from: jest.Mock;
}

function createAuthClientHarness() {
  const listeners: AuthStateListener[] = [];

  const profileFrom = jest.fn();
  const profilesQuery = {
    select: jest.fn(),
  };
  profileFrom.mockReturnValue(profilesQuery);

  const client: SupabaseClient<Database> = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn((cb: AuthStateListener) => {
        listeners.push(cb);
        return {
          data: {
            subscription: { unsubscribe: jest.fn() },
          },
        };
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    from: profileFrom,
  } as unknown as SupabaseClient<Database>;

  return {
    client: client as unknown as FakeAuthClient & SupabaseClient<Database>,
    emit(event: AuthChangeEvent, nextSession: Session | null) {
      for (const cb of listeners) cb(event, nextSession);
    },
    mocks: { profileFrom, profilesQuery },
  };
}

function createDeferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
}

function Consumer(): React.JSX.Element {
  const {
    status,
    supabase,
    session,
    profile,
    shelter,
    email,
    hasSupabaseConfig,
  } = useAuth();
  return (
    <Text testID="consumer">
      {JSON.stringify({
        status,
        sessionId: session?.user?.id ?? null,
        profileId: profile?.id ?? null,
        shelterId: shelter?.id ?? null,
        email,
        hasSupabaseClient: supabase !== null,
        hasSupabaseConfig,
      })}
    </Text>
  );
}

const ADMIN_SESSION: Session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-4000-8000-000000000103',
    email: 'admin@shelter.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
} as unknown as Session;

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readSupabaseConfig.mockReturnValue(null);
  });

  it('creates the configured client once across provider re-renders', async () => {
    const harness = createAuthClientHarness();
    const config: SupabaseConfig = {
      url: 'http://127.0.0.1:54321',
      publishableKey: 'test-key',
    };
    readSupabaseConfig.mockReturnValue(config);
    createSupabaseClient.mockReturnValue(harness.client);
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const view = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"unauthenticated"',
      );
    });

    view.rerender(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(readSupabaseConfig).toHaveBeenCalledTimes(1);
    expect(createSupabaseClient).toHaveBeenCalledTimes(1);
    expect(harness.client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('reports an unauthenticated status when Supabase returns no session', async () => {
    const harness = createAuthClientHarness();
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const view = await render(
      <AuthProvider client={harness.client}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"unauthenticated"',
      );
    });
  });

  it('restores the session and exposes the authenticated shelter identity', async () => {
    const harness = createAuthClientHarness();
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: ADMIN_SESSION },
      error: null,
    });
    const profileRow = {
      id: '00000000-0000-4000-8000-000000000103',
      display_name: 'Administrador Huellitas',
      shelter_id: '00000000-0000-4000-8000-000000000001',
      shelters: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Huellitas Rescue',
        country: 'Peru',
      },
    };
    const eq = jest.fn(() => ({
      maybeSingle: jest.fn(() =>
        Promise.resolve({ data: profileRow, error: null }),
      ),
    }));
    harness.mocks.profilesQuery.select.mockReturnValue({ eq });

    const view = await render(
      <AuthProvider client={harness.client}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"authenticated"',
      );
      expect(view.getByTestId('consumer').props.children).toContain(
        '"profileId":"00000000-0000-4000-8000-000000000103"',
      );
      expect(view.getByTestId('consumer').props.children).toContain(
        '"shelterId":"00000000-0000-4000-8000-000000000001"',
      );
      expect(view.getByTestId('consumer').props.children).toContain(
        '"email":"admin@shelter.com"',
      );
      expect(view.getByTestId('consumer').props.children).toContain(
        '"hasSupabaseClient":true',
      );
    });
  });

  it('clears the authenticated state when the listener emits SIGNED_OUT', async () => {
    const harness = createAuthClientHarness();
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const profileRow = {
      id: '00000000-0000-4000-8000-000000000103',
      display_name: 'Administrador Huellitas',
      shelter_id: '00000000-0000-4000-8000-000000000001',
      shelters: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Huellitas Rescue',
        country: 'Peru',
      },
    };
    const eq = jest.fn(() => ({
      maybeSingle: jest.fn(() =>
        Promise.resolve({ data: profileRow, error: null }),
      ),
    }));
    harness.mocks.profilesQuery.select.mockReturnValue({ eq });

    const view = await render(
      <AuthProvider client={harness.client}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"unauthenticated"',
      );
    });

    await act(async () => {
      harness.emit('SIGNED_IN', ADMIN_SESSION);
    });

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"authenticated"',
      );
    });

    await act(async () => {
      harness.emit('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"unauthenticated"',
      );
      expect(view.getByTestId('consumer').props.children).toContain(
        '"profileId":null',
      );
    });
  });

  it('ignores a pending profile result after SIGNED_OUT', async () => {
    const harness = createAuthClientHarness();
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const pendingProfile = createDeferred<{
      data: {
        id: string;
        display_name: string;
        shelter_id: string;
        shelters: { id: string; name: string; country: string };
      };
      error: null;
    }>();
    const eq = jest.fn(() => ({
      maybeSingle: jest.fn(() => pendingProfile.promise),
    }));
    harness.mocks.profilesQuery.select.mockReturnValue({ eq });

    const view = await render(
      <AuthProvider client={harness.client}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId('consumer').props.children).toContain(
        '"status":"unauthenticated"',
      );
    });

    await act(async () => {
      harness.emit('SIGNED_IN', ADMIN_SESSION);
    });
    expect(eq).toHaveBeenCalledTimes(1);

    await act(async () => {
      harness.emit('SIGNED_OUT', null);
    });

    await act(async () => {
      pendingProfile.resolve({
        data: {
          id: ADMIN_SESSION.user.id,
          display_name: 'Administrador Huellitas',
          shelter_id: '00000000-0000-4000-8000-000000000001',
          shelters: {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Huellitas Rescue',
            country: 'Peru',
          },
        },
        error: null,
      });
      await Promise.resolve();
    });

    expect(view.getByTestId('consumer').props.children).toContain(
      '"status":"unauthenticated"',
    );
    expect(view.getByTestId('consumer').props.children).toContain(
      '"profileId":null',
    );
  });

  it('signIn normalises invalid credential errors', async () => {
    const harness = createAuthClientHarness();
    harness.client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    harness.client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: 'Invalid login credentials',
        status: 400,
        code: 'invalid_grant',
      },
    });
    const eq = jest.fn(() => ({
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    harness.mocks.profilesQuery.select.mockReturnValue({ eq });

    let capturedError: SignInLike | null = null;
    function Probe(): React.JSX.Element {
      const { signIn }: AuthContextValue = useAuth();
      return (
        <Text
          testID="probe"
          onPress={async () => {
            try {
              await signIn({ email: 'admin@shelter.com', password: 'WRONG' });
            } catch (error) {
              capturedError = error as SignInLike;
            }
          }}
        >
          probe
        </Text>
      );
    }

    const view = await render(
      <AuthProvider client={harness.client}>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      view.getByTestId('probe').props.onPress();
    });

    expect(capturedError).not.toBeNull();
    expect((capturedError as unknown as { status: string }).status).toBe(
      'invalid_credentials',
    );
  });
});

type SignInLike = Awaited<ReturnType<AuthContextValue['signIn']>>;
