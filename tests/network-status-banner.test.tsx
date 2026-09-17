import {
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { NetworkStatusBanner } from '@/components/ui';
import {
  createMockConnectivityAdapter,
  type ConnectivityStatus,
} from '@/lib/connectivity';
import { ConnectivityProvider } from '@/providers/connectivity-provider';
import i18n from '@/i18n';

function renderBanner(
  ui: ReactElement,
  status: ConnectivityStatus,
): Promise<RenderResult> {
  const adapter = createMockConnectivityAdapter(status);
  return render(
    <ConnectivityProvider adapter={adapter}>{ui}</ConnectivityProvider>,
  );
}

describe('NetworkStatusBanner', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('shows the offline message with cached data', async () => {
    const screen = await renderBanner(
      <NetworkStatusBanner hasData isError isFetching={false} />,
      'offline',
    );

    expect(
      screen.getByText(
        'Estás sin conexión. Se muestran datos guardados, no el estado confirmado del servidor.',
      ),
    ).toBeTruthy();
  });

  it('shows the offline message without data', async () => {
    const screen = await renderBanner(
      <NetworkStatusBanner hasData={false} isFetching={false} />,
      'offline',
    );

    expect(
      screen.getByText(
        'Estás sin conexión. Las acciones que necesitan el servidor esperarán a que vuelva la conexión.',
      ),
    ).toBeTruthy();
  });

  it('shows a cached-data error with a working retry', async () => {
    const onRetry = jest.fn();
    const screen = await renderBanner(
      <NetworkStatusBanner hasData isError onRetry={onRetry} />,
      'online',
    );

    expect(
      screen.getByText('No pudimos actualizar. Se muestran datos guardados.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('indicates a refresh over shown data', async () => {
    const screen = await renderBanner(
      <NetworkStatusBanner hasData isFetching />,
      'online',
    );

    expect(screen.getByText('Actualizando los datos guardados…')).toBeTruthy();
  });

  it('renders nothing when online and settled', async () => {
    const screen = await renderBanner(
      <NetworkStatusBanner hasData isFetching={false} />,
      'online',
    );

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the English interface when the language is English', async () => {
    await i18n.changeLanguage('en');
    const screen = await renderBanner(
      <NetworkStatusBanner hasData isFetching={false} />,
      'offline',
    );

    expect(
      screen.getByText(
        "You're offline. Showing saved data, not confirmed server state.",
      ),
    ).toBeTruthy();
  });
});
