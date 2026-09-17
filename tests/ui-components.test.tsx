import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StateView } from '@/components/ui/StateView';
import i18n from '@/i18n';

describe('Shared UI components', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('es');
  });

  describe('ScreenHeader', () => {
    it('renders eyebrow, title and subtitle in the default alignment', async () => {
      await render(
        <ScreenHeader
          eyebrow="EYEBROW"
          subtitle="subtitle copy"
          title="Welcome"
        />,
      );

      expect(screen.getByText('EYEBROW')).toBeTruthy();
      expect(screen.getByRole('header', { name: 'Welcome' })).toBeTruthy();
      expect(screen.getByText('subtitle copy')).toBeTruthy();
    });
  });

  describe('SectionHeader', () => {
    it('renders an optional description without an action slot', async () => {
      await render(
        <SectionHeader description="section subtitle" title="Section" />,
      );

      expect(screen.getByRole('header', { name: 'Section' })).toBeTruthy();
      expect(screen.getByText('section subtitle')).toBeTruthy();
    });
  });

  describe('Card', () => {
    it('exposes its label as a button when used as a pressable', async () => {
      const onPress = jest.fn();
      await render(
        <Card
          accessibilityLabel="Open Nala"
          accessibilityRole="button"
          onPress={onPress}
          variant="subtle"
        >
          <Text>Nala</Text>
        </Card>,
      );

      const button = screen.getByRole('button', { name: 'Open Nala' });
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not require an onPress to render children as a static view', async () => {
      await render(
        <Card variant="elevated">
          <Text>static content</Text>
        </Card>,
      );

      expect(screen.getByText('static content')).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('PrimaryButton', () => {
    it('exposes disabled state to assistive tech', async () => {
      const onPress = jest.fn();
      await render(
        <PrimaryButton disabled label="Confirm" onPress={onPress} />,
      );

      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(
        (button.props as { accessibilityState?: { disabled?: boolean } })
          .accessibilityState?.disabled,
      ).toBe(true);
      fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('reports busy state while loading and blocks presses', async () => {
      const onPress = jest.fn();
      await render(<PrimaryButton label="Confirm" loading onPress={onPress} />);

      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(
        (button.props as { accessibilityState?: { busy?: boolean } })
          .accessibilityState?.busy,
      ).toBe(true);
      fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('invokes onPress when enabled', async () => {
      const onPress = jest.fn();
      await render(<PrimaryButton label="Confirm" onPress={onPress} />);

      fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('SecondaryButton', () => {
    it('invokes onPress when enabled', async () => {
      const onPress = jest.fn();
      await render(<SecondaryButton label="Later" onPress={onPress} />);

      fireEvent.press(screen.getByRole('button', { name: 'Later' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('StateView', () => {
    it('renders an alert when the tone is error', async () => {
      await render(
        <StateView
          description="recoverable"
          title="Something went wrong"
          tone="error"
        />,
      );

      expect(
        screen.getByRole('alert', { name: 'Something went wrong' }),
      ).toBeTruthy();
      expect(screen.getByText('recoverable')).toBeTruthy();
    });

    it('renders the primary action with the provided label and handler', async () => {
      const onPress = jest.fn();
      await render(
        <StateView
          title="Not found"
          primaryAction={{ label: 'Retry', onPress }}
        />,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
