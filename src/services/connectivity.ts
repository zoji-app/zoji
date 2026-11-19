import NetInfo from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

export const addConnectivityListener = (
  callback: (isConnected: boolean) => void
): (() => void) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    callback(!!state.isConnected);
  });
  return unsubscribe;
};

export const isDeviceConnected = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return false;
  }
};

// Kept for API compatibility — now just checks network connectivity
export const isFirestoreConnected = isDeviceConnected;

export const hasQualityConnection = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return false;
    const type = state.type;
    return type !== 'none' && type !== 'unknown';
  } catch {
    return false;
  }
};
