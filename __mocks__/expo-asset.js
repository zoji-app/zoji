// Mock para expo-asset
module.exports = {
  Asset: {
    loadAsync: jest.fn().mockResolvedValue([]),
    fromModule: jest.fn().mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue({}),
      uri: 'mock-asset-uri',
    }),
  },
};
