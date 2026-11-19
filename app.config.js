module.exports = {
  name: 'Zoji',
  slug: 'zoji',
  owner: 'm4rio.dev',
  version: '1.10.8',
  scheme: 'zoji',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#B8C7C7',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'dev.de4araujo.zoji',
    buildNumber: '125',
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#16224D',
    },
    package: 'dev.de4araujo.zoji',
    versionCode: 131,
    googleServicesFile: './google-services.json',
    navigationBar: {
      backgroundColor: '#B8C7C7',
      barStyle: 'dark-content',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    // P3-5 — crash reporting. VAZIO DE PROPÓSITO (não mandar dado pros EUA).
    // DSN aceita GlitchTip auto-hospedado no BR ou Sentry região UE — ver
    // docs/CRASH-REPORTING.md. Sem DSN, o SDK não inicializa.
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        '7c128f95-2a18-4c6b-857e-9d5532ceae45',
    },
  },
  plugins: [
    'expo-font',
    'expo-secure-store',
    '@sentry/react-native',
    // Pedidos pelo `expo install --fix` no bump pro SDK 57 — já eram
    // dependências instaladas, só faltava registrar como config plugin.
    [
      'expo-build-properties',
      {
        // SDK 57: módulos Expo passaram a exigir iOS 16.4 mínimo (pod
        // install falhava com "requires iOS 16.4 but app targets 15.1").
        // Espelha o valor aplicado manualmente em ios/Podfile.properties.json
        // e no project.pbxproj (target Zoji), já que não dá pra rodar
        // `expo prebuild` neste repo (apagaria o widget custom).
        ios: { deploymentTarget: '16.4' },
      },
    ],
    'expo-localization',
    'expo-status-bar',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#B8C7C7',
        defaultChannel: 'default',
      },
    ],
  ],
};
