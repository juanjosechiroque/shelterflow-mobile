import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { I18nProvider } from '@/providers/i18n-provider';
import { PrototypeFlowProvider } from '@/features/prototype-flow/prototype-flow-provider';

function RootNavigator() {
  const { t } = useTranslation();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{ title: t('navigation.settings') }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <PrototypeFlowProvider>
          <RootNavigator />
        </PrototypeFlowProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
