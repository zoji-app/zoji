// Polyfills globais para testes
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

jest.useFakeTimers();

// Mock para expo-localization
jest.mock('expo-localization', () => ({
  locale: 'pt-BR',
  locales: ['pt-BR'],
  country: 'BR',
  region: 'BR',
  isRTL: false,
  getLocales: () => [{ languageCode: 'pt', countryCode: 'BR' }],
}));

// Mock para expo-font e fontes relacionadas
jest.mock('@expo-google-fonts/fredoka', () => ({
  Fredoka_600SemiBold: 'Fredoka_600SemiBold',
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

// Mock para rn-emoji-keyboard
jest.mock('rn-emoji-keyboard', () => {
  return function MockEmojiKeyboard(props) {
    return null;
  };
});

// Mock para AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve(null)),
  multiRemove: jest.fn(() => Promise.resolve(null)),
}));

// Mock para expo-secure-store (P3-1) — armazenamento em memória
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
    getItemAsync: jest.fn(k =>
      Promise.resolve(store.has(k) ? store.get(k) : null)
    ),
    setItemAsync: jest.fn((k, v) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn(k => {
      store.delete(k);
      return Promise.resolve();
    }),
  };
});

// Mock para @sentry/react-native (P3-5)
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: c => c,
}));

// Mock para o Alert do React Native
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock para uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock para Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
}));

// Configuração global para evitar avisos
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  ignoreLogs: jest.fn(),
}));

global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

global.__DEV__ = true;

// Mock para funcionalidades de animação
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  return Object.setPrototypeOf(
    {
      NativeModules: {
        ...RN.NativeModules,
        UIManager: {
          RCTView: {
            directEventTypes: {},
          },
        },
        RNGestureHandlerModule: {
          State: {
            BEGAN: 'BEGAN',
            ACTIVE: 'ACTIVE',
            END: 'END',
          },
        },
        StatusBarManager: {
          HEIGHT: 44,
        },
      },
      Animated: {
        ...RN.Animated,
        timing: jest.fn(() => ({
          start: jest.fn(callback => {
            if (callback) callback({ finished: true });
          }),
        })),
        delay: jest.fn(() => ({
          start: jest.fn(callback => {
            if (callback) callback({ finished: true });
          }),
        })),
        sequence: jest.fn(() => ({
          start: jest.fn(callback => {
            if (callback) callback({ finished: true });
          }),
        })),
        parallel: jest.fn(() => ({
          start: jest.fn(callback => {
            if (callback) callback({ finished: true });
          }),
        })),
        Value: jest.fn(() => ({
          setValue: jest.fn(),
          interpolate: jest.fn(() => ({
            interpolate: jest.fn(),
          })),
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      },
    },
    RN
  );
});

// Mock dos componentes do React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useIsFocused: () => true,
  useFocusEffect: jest.fn(callback => callback()),
  createNavigatorFactory: jest.fn(),
  NavigationContainer: ({ children }) => children,
}));

// Mock para o react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
  ScrollView: 'ScrollView',
  State: {},
  PinchGestureHandler: 'PinchGestureHandler',
  RotationGestureHandler: 'RotationGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
}));

// Mock para react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock para o serviço de notificações
jest.mock(
  '../src/services/notifications.ts',
  () => ({
    BACKGROUND_NOTIFICATION_TASK: 'BACKGROUND-NOTIFICATION-TASK',
    registerBackgroundNotificationsAsync: jest
      .fn()
      .mockResolvedValue(undefined),
    registerForPushNotificationsAsync: jest
      .fn()
      .mockResolvedValue('ExponentPushToken[test-token]'),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    sendNewMessageNotification: jest.fn().mockResolvedValue(undefined),
    setupNotificationListeners: jest.fn().mockReturnValue({
      notificationListener: { remove: jest.fn() },
      responseListener: { remove: jest.fn() },
    }),
    getLastNotificationToken: jest.fn().mockResolvedValue('test-token'),
    registerPushToken: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

// Mock para @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => {
  const mockNetInfoStateType = {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  };

  const mockDefaultState = {
    type: mockNetInfoStateType.wifi,
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      cellularGeneration: null,
    },
  };

  return {
    addEventListener: jest.fn(callback => {
      callback(mockDefaultState);
      return jest.fn();
    }),
    fetch: jest.fn(() => Promise.resolve(mockDefaultState)),
    refresh: jest.fn(() => Promise.resolve(mockDefaultState)),
    useNetInfo: jest.fn(() => mockDefaultState),
    configure: jest.fn(),
    NetInfoStateType: mockNetInfoStateType,
    ConnectionType: {
      none: 'none',
      wifi: 'wifi',
      cellular: 'cellular',
      unknown: 'unknown',
      ethernet: 'ethernet',
      wimax: 'wimax',
      bluetooth: 'bluetooth',
      vpn: 'vpn',
      other: 'other',
    },
    NetInfoCellularGeneration: {
      '2g': '2g',
      '3g': '3g',
      '4g': '4g',
      '5g': '5g',
    },
  };
});

// Teste de sanidade do setup
describe('Jest setup', () => {
  it('deve configurar o ambiente de teste corretamente', () => {
    expect(true).toBe(true);
  });
});
