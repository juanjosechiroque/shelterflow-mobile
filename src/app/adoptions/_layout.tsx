import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

export default function AdoptionsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="confirm/[candidateId]"
        options={{ title: t('adoptions.persisted.title') }}
      />
      <Stack.Screen
        name="[adoptionId]/index"
        options={{ title: t('adoptions.detail.title') }}
      />
      <Stack.Screen
        name="[adoptionId]/return"
        options={{ title: t('adoptions.return.title') }}
      />
      <Stack.Screen
        name="[adoptionId]/followups/[followupId]/complete"
        options={{ title: t('adoptions.completeFollowup.title') }}
      />
    </Stack>
  );
}
