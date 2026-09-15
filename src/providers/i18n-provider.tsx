import { type PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import i18n, { hydrateLanguage } from '@/i18n';

export function I18nProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    hydrateLanguage()
      .catch(() => i18n.changeLanguage('es'))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
