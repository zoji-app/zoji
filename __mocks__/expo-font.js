// Mock para expo-font
module.exports = {
  useFonts: () => [true, null],
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  Font: {
    loadAsync: jest.fn(() => Promise.resolve()),
  },
};
