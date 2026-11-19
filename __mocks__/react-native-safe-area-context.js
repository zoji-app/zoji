const React = require('react');

module.exports = {
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children, style }) =>
    React.createElement('View', { style }, children),
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 })),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  },
};
