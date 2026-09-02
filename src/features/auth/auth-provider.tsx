import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';

import {
  createSupabaseClient,
  readSupabaseConfig,
  type SupabaseConfig,
} from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export interface AuthProfile {
  id: string;
  displayName: string;
  shelterId: string;
}

export interface AuthShelter {
  id: string;
  name: string;
  country: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SignInError {
  status: 'invalid_credentials' | 'config_missing' | 'unknown';
  message: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: AuthProfile | null;
  shelter: AuthShelter | null;
  email: string | null;
  hasSupabaseConfig: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  client?: SupabaseClient<Database>;
  initialClientConfig?: SupabaseConfig | null;
}

interface ProfileWithShelterRow {
  id: string;
  display_name: string;
  shelter_id: string;
  shelters:
    | {
        id: string;
        name: string;
        country: string;
      }
    | { id: string; name: string; country: string }[]
    | null;
}

export function AuthProvider({
  children,
  client,
  initialClientConfig = null,
}: AuthProviderProps): ReactNode {
  // The provider owns exactly one client for its full lifetime. This also
  // keeps its auth subscription and AppState refresh binding attached to the
  // client that serves sign-in, sign-out, and profile reads. `client` remains
  // injectable for tests, but changing it requires mounting a new provider.
  const [activeClient] = useState<SupabaseClient<Database> | null>(() => {
    if (client) return client;
    const config = initialClientConfig ?? readSupabaseConfig();
    return config ? createSupabaseClient(config) : null;
  });
  const hasSupabaseConfig = activeClient !== null;
  const activeClientRef = useRef(activeClient);
  const isMountedRef = useRef(false);

  const [status, setStatus] = useState<AuthStatus>(
    activeClient ? 'loading' : 'unauthenticated',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [shelter, setShelter] = useState<AuthShelter | null>(null);

  // Monotonic counter incremented on every authentication transition.
  // Each identity load captures the current value; results that resolve
  // after a newer value was observed are discarded so a stale profile
  // fetch cannot restore the authenticated state after sign-out.
  const identityEpochRef = useRef(0);

  const clearIdentity = useCallback(() => {
    setSession(null);
    setProfile(null);
    setShelter(null);
    setStatus('unauthenticated');
  }, []);

  const loadIdentityForSession = useCallback(
    async (current: Session, epochAtStart: number) => {
      const client = activeClientRef.current;

      if (!client || !current.user) {
        return;
      }

      const { data, error } = await client
        .from('profiles')
        .select('id, display_name, shelter_id, shelters (id, name, country)')
        .eq('id', current.user.id)
        .maybeSingle();

      if (!isMountedRef.current || epochAtStart !== identityEpochRef.current) {
        return;
      }

      if (error || !data) {
        clearIdentity();
        return;
      }

      const row = data as unknown as ProfileWithShelterRow;
      const embedded = Array.isArray(row.shelters)
        ? row.shelters[0]
        : row.shelters;

      if (!embedded) {
        clearIdentity();
        return;
      }

      setSession(current);
      setProfile({
        id: row.id,
        displayName: row.display_name,
        shelterId: row.shelter_id,
      });
      setShelter({
        id: embedded.id,
        name: embedded.name,
        country: embedded.country,
      });
      setStatus('authenticated');
    },
    [clearIdentity],
  );

  useEffect(() => {
    activeClientRef.current = activeClient;
    isMountedRef.current = true;

    if (!activeClient) {
      return () => {
        isMountedRef.current = false;
      };
    }

    const initialEpoch = identityEpochRef.current;

    void activeClient.auth
      .getSession()
      .then(({ data: { session: existing } }) => {
        if (
          !isMountedRef.current ||
          initialEpoch !== identityEpochRef.current
        ) {
          return;
        }
        if (existing) {
          void loadIdentityForSession(existing, initialEpoch);
        } else {
          clearIdentity();
        }
      })
      .catch(() => {
        if (isMountedRef.current && initialEpoch === identityEpochRef.current) {
          clearIdentity();
        }
      });

    const { data: subscription } = activeClient.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        if (!isMountedRef.current) return;
        const nextEpoch = identityEpochRef.current + 1;
        identityEpochRef.current = nextEpoch;

        if (event === 'SIGNED_OUT') {
          // Invalidate any in-flight identity load before clearing state
          // so a late response cannot resurrect the previous session.
          clearIdentity();
          return;
        }
        if (nextSession) {
          void loadIdentityForSession(nextSession, nextEpoch);
        } else {
          clearIdentity();
        }
      },
    );

    // Bind the auto-refresh loop to the same client the provider uses.
    // AppState emits 'active' whenever the app comes to the foreground and
    // any other state ('background', 'inactive', 'unknown') when it does
    // not. We treat the first event as a no-op (Supabase tolerates a
    // redundant start) so behaviour stays predictable across warm starts.
    const appStateSubscription: NativeEventSubscription =
      AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          void activeClient.auth.startAutoRefresh();
        } else {
          void activeClient.auth.stopAutoRefresh();
        }
      });

    return () => {
      isMountedRef.current = false;
      identityEpochRef.current += 1;
      subscription.subscription.unsubscribe();
      appStateSubscription.remove();
      // Stop refresh timers when the provider unmounts so no stale
      // interval survives across a navigation that destroys the layout.
      void activeClient.auth.stopAutoRefresh();
    };
  }, [activeClient, clearIdentity, loadIdentityForSession]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ email, password }) => {
      const current = activeClientRef.current;
      if (!current) {
        const missing: SignInError = {
          status: 'config_missing',
          message: 'missing_supabase_config',
        };
        throw missing;
      }
      const { error } = await current.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const mapped: SignInError = {
          status:
            error.status === 400 || error.code === 'invalid_grant'
              ? 'invalid_credentials'
              : 'unknown',
          message: error.message ?? 'unknown',
        };
        throw mapped;
      }
    },
    [],
  );

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    const current = activeClientRef.current;
    if (!current) return;
    await current.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      shelter,
      email: session?.user.email ?? null,
      hasSupabaseConfig,
      signIn,
      signOut,
    }),
    [status, session, profile, shelter, hasSupabaseConfig, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
