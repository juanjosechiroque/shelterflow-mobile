import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AuthLoadingScreen } from '@/features/auth/auth-loading-screen';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { PrototypeFlowProvider } from '@/features/prototype-flow/prototype-flow-provider';

function RootNavigator() {
  const { t } = useTranslation();
  const { status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  const isAuthenticated = status === 'authenticated';

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
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{ title: t('navigation.settings') }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <PrototypeFlowProvider>
            <RootNavigator />
          </PrototypeFlowProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
