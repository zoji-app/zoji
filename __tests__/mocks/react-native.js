// Mock do React Native para testes
const ReactNativeMock = {
  StyleSheet: {
    create: styles => styles,
    hairlineWidth: 1,
    absoluteFillObject: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    flatten: styles => styles,
  },
  Platform: {
    OS: 'ios',
    select: obj => obj.ios || obj.default,
    Version: 13,
  },
  Dimensions: {
    get: () => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 2,
    }),
  },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 2,
    getPixelSizeForLayoutSize: size => size * 2,
    roundToNearestPixel: size => size,
  },
  Alert: {
    alert: jest.fn(),
  },
  Animated: {
    View: 'Animated.View',
    createAnimatedComponent: component => component,
    timing: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
    })),
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(() => ({
        interpolate: jest.fn(),
      })),
    })),
  },
  Easing: {
    linear: 'linear',
    ease: 'ease',
    bezier: jest.fn(),
  },
  Image: {
    resolveAssetSource: jest.fn(source => source),
  },
  I18nManager: {
    isRTL: false,
  },
  NativeModules: {
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
  TouchableNativeFeedback: {
    Ripple: jest.fn(),
  },
  TextInput: 'TextInput',
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Pressable: 'Pressable',
  SafeAreaView: 'SafeAreaView',
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setTranslucent: jest.fn(),
    currentHeight: 44,
  },
};

module.exports = ReactNativeMock;
