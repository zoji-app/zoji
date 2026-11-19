// Mock para expo-constants
module.exports = {
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
  manifest: {
    extra: {
      firebaseApiKey: 'test-api-key',
      firebaseAuthDomain: 'test-auth-domain',
      firebaseProjectId: 'test-project-id',
      firebaseStorageBucket: 'test-storage-bucket',
      firebaseMessagingSenderId: 'test-messaging-sender-id',
      firebaseAppId: 'test-app-id',
      firebaseMeasurementId: 'test-measurement-id',
    },
  },
  systemFonts: [],
  Constants: {
    expoVersion: '1.0.0',
    manifest: {
      extra: {
        firebaseApiKey: 'test-api-key',
      },
    },
  },
};
