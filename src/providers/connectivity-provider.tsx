import { onlineManager } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  createExpoNetworkConnectivityAdapter,
  type ConnectivityAdapter,
  type ConnectivityStatus,
} from '@/lib/connectivity';

export interface ConnectivityContextValue {
  status: ConnectivityStatus;
}

// Default to online so a screen rendered without the provider (for example in
// a focused test) still behaves predictably instead of claiming to be offline.
const ConnectivityContext = createContext<ConnectivityContextValue>({
  status: 'online',
});

export function useConnectivity(): ConnectivityContextValue {
  return useContext(ConnectivityContext);
}

export interface ConnectivityProviderProps {
  children: ReactNode;
  adapter?: ConnectivityAdapter;
}

export function ConnectivityProvider({
  children,
  adapter,
}: ConnectivityProviderProps): ReactNode {
  const resolvedAdapter = useMemo(
    () => adapter ?? createExpoNetworkConnectivityAdapter(),
    [adapter],
  );
  const [status, setStatus] = useState<ConnectivityStatus>(() =>
    resolvedAdapter.getStatus(),
  );

  useEffect(() => {
    const unsubscribe = resolvedAdapter.subscribe(setStatus);

    // TanStack Query pauses "online"-mode queries while offline and resumes
    // them when connectivity returns, so retries follow the real connection.
    onlineManager.setEventListener((setOnline) => {
      setOnline(resolvedAdapter.getStatus() !== 'offline');
      return resolvedAdapter.subscribe((next) => setOnline(next !== 'offline'));
    });

    return () => {
      unsubscribe();
    };
  }, [resolvedAdapter]);

  const value = useMemo<ConnectivityContextValue>(() => ({ status }), [status]);

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}
