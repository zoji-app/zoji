// Mock para expo-modules-core
module.exports = {
  requireNativeModule: jest.fn(() => ({})),
  requireNativeViewManager: jest.fn(() => ({})),
  EventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
};
