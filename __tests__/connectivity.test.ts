import {
  createMockConnectivityAdapter,
  mapNetworkState,
} from '@/lib/connectivity';

describe('mapNetworkState', () => {
  it('maps a disconnected device to offline', () => {
    expect(mapNetworkState({ isConnected: false })).toBe('offline');
  });

  it('maps an unreachable internet connection to offline', () => {
    expect(
      mapNetworkState({ isConnected: true, isInternetReachable: false }),
    ).toBe('offline');
  });

  it('maps a connected and reachable device to online', () => {
    expect(
      mapNetworkState({ isConnected: true, isInternetReachable: true }),
    ).toBe('online');
  });

  it('maps an unknown state without guessing', () => {
    expect(mapNetworkState({})).toBe('unknown');
  });
});

describe('createMockConnectivityAdapter', () => {
  it('notifies subscribers immediately and on every change', () => {
    const adapter = createMockConnectivityAdapter('online');
    const listener = jest.fn();

    const unsubscribe = adapter.subscribe(listener);
    expect(listener).toHaveBeenCalledWith('online');

    adapter.setStatus('offline');
    adapter.setStatus('online');
    expect(listener).toHaveBeenLastCalledWith('online');

    unsubscribe();
    adapter.setStatus('offline');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('reports the current status synchronously', () => {
    const adapter = createMockConnectivityAdapter('offline');
    expect(adapter.getStatus()).toBe('offline');
  });
});
