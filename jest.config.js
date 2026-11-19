module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-navigation|@react-navigation|@expo|expo|@react-native-community|react-native-reanimated)/)',
  ],
  testPathIgnorePatterns: [
    '\\.snap$',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__tests__/mocks/react-native.js',
    '^@expo/vector-icons$': '<rootDir>/__tests__/mocks/iconMock.js',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__tests__/mocks/iconMock.js',
    'expo-font': '<rootDir>/__tests__/mocks/expo.js',
    'expo-splash-screen': '<rootDir>/__tests__/mocks/expo.js',
    'expo-constants': '<rootDir>/__tests__/mocks/expo.js',
    'expo-linear-gradient': '<rootDir>/__tests__/mocks/expo.js',
    'expo-notifications': '<rootDir>/__tests__/mocks/expoMock.js',
    'expo-device': '<rootDir>/__tests__/mocks/expoMock.js',
    'expo-task-manager': '<rootDir>/__tests__/mocks/expoMock.js',
    'expo-navigation-bar': '<rootDir>/__tests__/mocks/expoMock.js',
    '^expo$': '<rootDir>/__tests__/mocks/expoMock.js',
    '^src/services/notifications$':
      '<rootDir>/__tests__/mocks/notificationsMock.js',
    '^src/components/SplashScreen$':
      '<rootDir>/__tests__/mocks/componentMocks.js',
    '^src/components/AuthLoadingOverlay$':
      '<rootDir>/__tests__/mocks/componentMocks.js',
    '^src/contexts/ThemeContext$': '<rootDir>/__tests__/mocks/contextMocks.js',
    '^src/contexts/AuthContext$': '<rootDir>/__tests__/mocks/contextMocks.js',
    '^src/contexts/LanguageContext$':
      '<rootDir>/__tests__/mocks/contextMocks.js',
    '^src/screens/ChatScreen$': '<rootDir>/__tests__/mocks/screenMocks.js',
    '^src/screens/LoginScreen$': '<rootDir>/__tests__/mocks/screenMocks.js',
    '^src/screens/SettingsScreen$': '<rootDir>/__tests__/mocks/screenMocks.js',
    '^src/screens/IndividualChatScreen$':
      '<rootDir>/__tests__/mocks/screenMocks.js',
    '^@react-native-community/netinfo$':
      '<rootDir>/__tests__/mocks/netinfoMock.js',
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
  ],
  testEnvironment: 'node',
  forceExit: true,
};
