// Mock para firebase/auth/react-native
module.exports = {
  getReactNativePersistence: jest.fn(() => ({
    type: 'asyncStorage',
    storage: {},
  })),
};
