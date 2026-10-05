import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { ContactActionsPanel } from '@/features/candidates/components/contact-actions-panel';
import type { OpenContactResult } from '@/features/candidates/contact-actions';
import type {
  ContactLogEntry,
  ContactLogStore,
  NewContactLogEntry,
} from '@/features/candidates/local-contact-log';
import i18n from '@/i18n';

const candidateId = '00000000-0000-4000-8000-000000000051';
const personName = 'Andrea Perez';
const phone = '+51 999 111 222';

function createStore() {
  const record = jest.fn(async (input: NewContactLogEntry) => ({
    id: 'entry-1',
    recordedAt: '2026-09-16T10:00:00.000Z',
    ...input,
  }));
  const store: ContactLogStore = {
    list: jest.fn(async () => []),
    record,
  };
  return { store, record };
}

function createOpenUrl(result: OpenContactResult) {
  return jest.fn(async () => result);
}

describe('ContactActionsPanel', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('es');
  });

  it('calls the phone link, requires an explicit outcome, and records it', async () => {
    const { store, record } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));

    expect(openUrl).toHaveBeenCalledWith('tel:+51999111222');
    expect(
      await screen.findByText('Registrar el resultado del contacto'),
    ).toBeTruthy();
    expect(record).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Se logró contacto'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar resultado' }),
    );

    await waitFor(() => {
      expect(record).toHaveBeenCalledWith({
        candidateId,
        channel: 'phone',
        outcome: 'REACHED',
        notes: null,
      });
    });
    expect(
      await screen.findByText('Resultado del contacto guardado'),
    ).toBeTruthy();
  });

  it('builds the WhatsApp link and records the WhatsApp channel', async () => {
    const { store, record } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'WhatsApp' }));
    expect(openUrl).toHaveBeenCalledWith('https://wa.me/51999111222');

    await fireEvent.press(await screen.findByText('Pidió que lo llamen'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar resultado' }),
    );

    await waitFor(() => {
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'whatsapp',
          outcome: 'CALLBACK_REQUESTED',
        }),
      );
    });
  });

  it('disables both actions and explains when the number is invalid', async () => {
    const { store } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone="not-a-number"
        store={store}
      />,
    );

    expect(
      screen.getByText(
        'El teléfono de Andrea Perez no se puede usar para llamadas ni WhatsApp.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Llamar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'WhatsApp' })).toBeNull();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('reports an unavailable application but still allows recording an outcome', async () => {
    const { store } = createStore();
    const openUrl = createOpenUrl({ status: 'unsupported' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));

    expect(
      await screen.findByText(
        'La aplicación que maneja esta acción no está disponible en este dispositivo.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Registrar el resultado del contacto'),
    ).toBeTruthy();
  });

  it('shows an error with a working retry when openURL fails', async () => {
    const { store } = createStore();
    const openUrl = jest.fn(
      async (_url: string): Promise<OpenContactResult> => ({
        status: 'opened',
      }),
    );
    openUrl
      .mockResolvedValueOnce({ status: 'error', message: 'boom' })
      .mockResolvedValueOnce({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));

    expect(
      await screen.findByText(
        'No pudimos abrir la aplicación. Inténtalo nuevamente.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledTimes(2);
    });
  });

  it('prevents a double save of the same outcome', async () => {
    const { store, record } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });
    let resolveRecord!: (entry: {
      id: string;
      recordedAt: string;
      candidateId: string;
      channel: 'phone' | 'whatsapp';
      outcome: 'NO_ANSWER';
      notes: null;
    }) => void;
    record.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRecord = resolve;
      }),
    );

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));
    await fireEvent.press(await screen.findByText('Sin respuesta'));

    const saveButton = screen.getByRole('button', {
      name: 'Guardar resultado',
    });
    await fireEvent.press(saveButton);
    await waitFor(() => {
      expect(record).toHaveBeenCalledTimes(1);
    });

    await fireEvent.press(saveButton);
    expect(record).toHaveBeenCalledTimes(1);

    resolveRecord({
      id: 'entry-1',
      recordedAt: '2026-09-16T10:00:00.000Z',
      candidateId,
      channel: 'phone',
      outcome: 'NO_ANSWER',
      notes: null,
    });
    expect(
      await screen.findByText('Resultado del contacto guardado'),
    ).toBeTruthy();
  });

  it('shows a persisted result when the panel is reopened', async () => {
    const { store } = createStore();
    (store.list as jest.Mock).mockResolvedValue([
      {
        id: 'entry-existing',
        candidateId,
        channel: 'phone',
        outcome: 'REACHED',
        notes: 'Hablamos de Luna',
        recordedAt: '2026-09-15T10:00:00.000Z',
      },
    ]);
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    expect(await screen.findByText('Llamar · Se logró contacto')).toBeTruthy();
    expect(screen.getByText('Hablamos de Luna')).toBeTruthy();
  });

  it('updates the contact history after saving a result', async () => {
    const { store, record } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));
    await fireEvent.press(await screen.findByText('Se logró contacto'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar resultado' }),
    );

    await waitFor(() => {
      expect(record).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Llamar · Se logró contacto')).toBeTruthy();
  });

  it('keeps a saved result when the initial history load finishes late', async () => {
    const { store, record } = createStore();
    let resolveList!: (entries: ContactLogEntry[]) => void;
    (store.list as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<ContactLogEntry[]>((resolve) => {
          resolveList = resolve;
        }),
    );
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar' }));
    await fireEvent.press(await screen.findByText('Se logró contacto'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Guardar resultado' }),
    );
    await waitFor(() => {
      expect(record).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveList([]);
    });

    expect(await screen.findByText('Llamar · Se logró contacto')).toBeTruthy();
  });

  it('renders the English interface when the language is English', async () => {
    await i18n.changeLanguage('en');
    const { store } = createStore();
    const openUrl = createOpenUrl({ status: 'opened' });

    const screen = await render(
      <ContactActionsPanel
        candidateId={candidateId}
        openUrl={openUrl}
        personName={personName}
        phone={phone}
        store={store}
      />,
    );

    expect(screen.getByRole('button', { name: 'Call' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeTruthy();
  });
});
