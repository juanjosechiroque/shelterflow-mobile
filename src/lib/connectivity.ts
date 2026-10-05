import * as Network from 'expo-network';

/**
 * Connectivity adapter.
 *
 * Screens and providers read connectivity through this seam so the offline and
 * recovery behavior is mockable in tests without a native network stack.
 * `unknown` is treated as "not offline": the app prefers to attempt a request
 * and surface the real failure rather than block on a guess.
 */

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

export interface ConnectivityAdapter {
  getStatus(): ConnectivityStatus;
  subscribe(listener: (status: ConnectivityStatus) => void): () => void;
}

export interface NetworkStateLike {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

export function mapNetworkState(state: NetworkStateLike): ConnectivityStatus {
  if (state.isConnected === false) return 'offline';
  if (state.isInternetReachable === false) return 'offline';
  if (state.isConnected === true) return 'online';
  return 'unknown';
}

export interface MockConnectivityAdapter extends ConnectivityAdapter {
  setStatus(status: ConnectivityStatus): void;
}

export function createMockConnectivityAdapter(
  initial: ConnectivityStatus = 'online',
): MockConnectivityAdapter {
  let status = initial;
  const listeners = new Set<(next: ConnectivityStatus) => void>();

  return {
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      listener(status);
      return () => {
        listeners.delete(listener);
      };
    },
    setStatus(next) {
      status = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}

export function createExpoNetworkConnectivityAdapter(): ConnectivityAdapter {
  let status: ConnectivityStatus = 'unknown';

  return {
    getStatus: () => status,
    subscribe(listener) {
      listener(status);

      const update = (state: NetworkStateLike) => {
        status = mapNetworkState(state);
        listener(status);
      };

      const subscription = Network.addNetworkStateListener(update);
      void Network.getNetworkStateAsync()
        .then(update)
        .catch(() => undefined);

      return () => subscription.remove();
    },
  };
}
