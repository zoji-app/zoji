// Mock do Expo e dependências associadas
const ExpoMock = {
  // Expo modules
  Font: {
    loadAsync: jest.fn().mockResolvedValue(true),
  },
  SplashScreen: {
    preventAutoHideAsync: jest.fn().mockResolvedValue(true),
    hideAsync: jest.fn().mockResolvedValue(true),
  },
  Constants: {
    statusBarHeight: 44,
    manifest: {
      extra: {
        firebaseConfig: {},
      },
    },
  },
  LinearGradient: 'LinearGradient',
};

// Mock para @expo/vector-icons
const ExpoIconsMock = {
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
  MaterialIcons: 'MaterialIcons',
  FontAwesome5: 'FontAwesome5',
  createIconSet: () => 'Icon',
};

module.exports = {
  ExpoMock,
  ExpoIconsMock,
};
