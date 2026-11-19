const React = require('react');

const mockComponent = name => {
  return function MockComponent(props) {
    return React.createElement(name, props, props.children);
  };
};

// Mock do StyleSheet
const StyleSheet = {
  create: styles => styles,
  flatten: styles => styles,
  absoluteFill: {},
  hairlineWidth: 1,
};

// Mock do Dimensions
const Dimensions = {
  get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock do Platform
const Platform = {
  OS: 'ios',
  select: jest.fn(obj => obj.ios || obj.default),
  Version: 13,
  isTesting: true,
};

module.exports = {
  // Componentes básicos
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TextInput: mockComponent('TextInput'),
  ScrollView: mockComponent('ScrollView'),
  FlatList: mockComponent('FlatList'),
  SectionList: mockComponent('SectionList'),
  Image: mockComponent('Image'),
  ImageBackground: mockComponent('ImageBackground'),
  Button: mockComponent('Button'),

  // Componentes de interação
  TouchableOpacity: mockComponent('TouchableOpacity'),
  TouchableHighlight: mockComponent('TouchableHighlight'),
  TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
  Pressable: mockComponent('Pressable'),

  // Componentes de layout
  SafeAreaView: mockComponent('SafeAreaView'),
  StatusBar: mockComponent('StatusBar'),
  KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),

  // Componentes de animação
  Animated: {
    View: mockComponent('Animated.View'),
    Text: mockComponent('Animated.Text'),
    Image: mockComponent('Animated.Image'),
    ScrollView: mockComponent('Animated.ScrollView'),
    createAnimatedComponent: component => component,
    timing: jest.fn().mockReturnValue({
      start: jest.fn(callback => callback && callback({ finished: true })),
    }),
    spring: jest.fn().mockReturnValue({
      start: jest.fn(callback => callback && callback({ finished: true })),
    }),
    decay: jest.fn().mockReturnValue({
      start: jest.fn(callback => callback && callback({ finished: true })),
    }),
    Value: jest.fn(value => ({
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue({}),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
    event: jest.fn().mockReturnValue(jest.fn()),
  },

  // APIs
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
  Linking: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    openURL: jest.fn().mockResolvedValue(true),
    canOpenURL: jest.fn().mockResolvedValue(true),
    getInitialURL: jest.fn().mockResolvedValue(null),
  },
  PixelRatio: {
    get: jest.fn().mockReturnValue(2),
    getFontScale: jest.fn().mockReturnValue(1),
    getPixelSizeForLayoutSize: jest.fn(size => size * 2),
    roundToNearestPixel: jest.fn(size => size),
  },

  // Utilitários
  I18nManager: {
    isRTL: false,
    doLeftAndRightSwapInRTL: true,
  },
  NativeModules: {},
  InteractionManager: {
    runAfterInteractions: jest.fn(callback => {
      if (callback) callback();
      return { cancel: jest.fn() };
    }),
  },
};
