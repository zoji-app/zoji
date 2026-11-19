// Mock para @react-native-community/netinfo
const NetInfoStateType = {
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

const ConnectionType = {
  none: 'none',
  wifi: 'wifi',
  cellular: 'cellular',
  unknown: 'unknown',
  ethernet: 'ethernet',
  wimax: 'wimax',
  bluetooth: 'bluetooth',
  vpn: 'vpn',
  other: 'other',
};

const NetInfoCellularGeneration = {
  '2g': '2g',
  '3g': '3g',
  '4g': '4g',
  '5g': '5g',
};

const defaultState = {
  type: NetInfoStateType.wifi,
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    cellularGeneration: null,
  },
};

const NetInfoMock = {
  addEventListener: jest.fn(callback => {
    callback(defaultState);
    return jest.fn(); // Retorna função de unsubscribe
  }),
  fetch: jest.fn(() => Promise.resolve(defaultState)),
  refresh: jest.fn(() => Promise.resolve(defaultState)),
  useNetInfo: jest.fn(() => defaultState),
  configure: jest.fn(),
  NetInfoStateType,
  ConnectionType,
  NetInfoCellularGeneration,
};

module.exports = NetInfoMock;
