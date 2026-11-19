// Mock do módulo Expo
const expo = {
  AppLoading: 'AppLoading',
  Asset: {
    fromModule: jest.fn(() => ({ downloadAsync: jest.fn() })),
    loadAsync: jest.fn(() => Promise.resolve()),
  },
  Constants: {
    manifest: {},
    systemFonts: [],
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    },
  },
  Font: {
    isLoaded: jest.fn(() => true),
    loadAsync: jest.fn(() => Promise.resolve()),
  },
  KeepAwake: {
    activate: jest.fn(),
    deactivate: jest.fn(),
  },
  Linking: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve()),
  },
  SplashScreen: {
    preventAutoHide: jest.fn(),
    hide: jest.fn(),
  },
};

export default expo;

// Mocks para funções que seriam fornecidas pelo Expo
global.FormData = class FormData {
  constructor() {
    this.data = {};
  }
  append(key, value) {
    this.data[key] = value;
  }
  get(key) {
    return this.data[key] || null;
  }
};

global.Blob = class Blob {
  constructor() {}
};

global.FileReader = class FileReader {
  constructor() {}
  readAsDataURL() {}
  addEventListener() {}
};

module.exports = {
  registerRootComponent: jest.fn(),
  Linking: {
    makeUrl: jest.fn(),
    openURL: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
  Icon: {
    getImageSource: jest.fn().mockResolvedValue({ uri: 'test-uri' }),
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
};
