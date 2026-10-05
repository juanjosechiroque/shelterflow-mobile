import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useConnectivity } from '@/providers/connectivity-provider';
import { SecondaryButton } from './SecondaryButton';

export interface NetworkStatusBannerProps {
  /** True when the screen is showing data it already has (cached or confirmed). */
  hasData?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Communicates the network and cache state without pretending that cached
 * data is confirmed server state. Renders nothing when online and settled.
 *
 * - offline: the device has no connection.
 * - cached: an error occurred but previously loaded data is still shown.
 * - refreshing: a background or manual refresh is in flight over shown data.
 */
export function NetworkStatusBanner({
  hasData = false,
  isFetching = false,
  isError = false,
  onRetry,
}: NetworkStatusBannerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { status } = useConnectivity();
  const isOffline = status === 'offline';

  if (!isOffline && !isError && !isFetching) return null;

  let message: string;
  let tone: 'warning' | 'error' | 'info' = 'info';

  if (isOffline) {
    message = hasData ? t('network.offlineWithCache') : t('network.offline');
    tone = 'warning';
  } else if (isError && hasData) {
    message = t('network.refreshError');
    tone = 'error';
  } else if (isFetching && hasData) {
    message = t('network.refreshing');
  } else {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        tone === 'warning' && styles.bannerWarning,
        tone === 'error' && styles.bannerError,
      ]}
    >
      <Text style={styles.message}>{message}</Text>
      {onRetry && !isOffline ? (
        <SecondaryButton
          accessibilityLabel={t('common.retry')}
          disabled={isFetching}
          fullWidth={false}
          label={t('common.retry')}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerError: {
    backgroundColor: colors.dangerSoft,
  },
  bannerWarning: {
    backgroundColor: colors.warningSoft,
  },
  message: {
    ...typography.meta,
    color: colors.text,
    flexShrink: 1,
  },
});
