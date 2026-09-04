import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

const variants: Record<
  AppVariant,
  Pick<ExpoConfig, 'name'> & { applicationId: string }
> = {
  development: {
    name: 'ShelterFlow Dev',
    applicationId: 'com.juanjosechiroque.shelterflow.dev',
  },
  preview: {
    name: 'ShelterFlow Preview',
    applicationId: 'com.juanjosechiroque.shelterflow.preview',
  },
  production: {
    name: 'ShelterFlow',
    applicationId: 'com.juanjosechiroque.shelterflow',
  },
};

function getAppVariant(): AppVariant {
  const value = process.env.APP_VARIANT ?? 'development';

  if (
    value === 'development' ||
    value === 'preview' ||
    value === 'production'
  ) {
    return value;
  }

  throw new Error(`Unsupported APP_VARIANT: ${value}`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = getAppVariant();
  const variant = variants[appVariant];

  return {
    ...config,
    name: variant.name,
    slug: 'shelterflow-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'shelterflow',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: variant.applicationId,
      icon: './assets/expo.icon',
      supportsTablet: true,
    },
    android: {
      package: variant.applicationId,
      adaptiveIcon: {
        backgroundColor: '#E8F3EC',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      [
        'expo-dev-client',
        {
          launchMode: 'most-recent',
        },
      ],
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#1F6B45',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow $(PRODUCT_NAME) to access your photos to set an animal photo.',
          cameraPermission:
            'Allow $(PRODUCT_NAME) to access your camera to take an animal photo.',
          microphonePermission: false,
        },
      ],
      'expo-image',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      appVariant,
    },
  };
};
