import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

export default function AnimalsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: t('navigation.animals'),
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[animalId]"
        options={{ title: t('animals.detail.title') }}
      />
      <Stack.Screen
        name="[animalId]/reevaluation"
        options={{ title: t('adoptions.reevaluation.title') }}
      />
      <Stack.Screen
        name="candidate/[candidateId]/index"
        options={{ title: t('candidates.title') }}
      />
      <Stack.Screen
        name="candidate/[candidateId]/evaluation"
        options={{ title: t('evaluations.title') }}
      />
      <Stack.Screen
        name="candidate/[candidateId]/meetings"
        options={{ title: t('meetings.title') }}
      />
      <Stack.Screen
        name="candidate/[candidateId]/confirm-adoption"
        options={{ title: t('adoptions.confirm.title') }}
      />
      <Stack.Screen
        name="followups/[animalId]"
        options={{ title: t('followups.title') }}
      />
    </Stack>
  );
}
