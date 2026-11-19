import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
export const useConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isFirestoreAvailable, setIsFirestoreAvailable] =
    useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setIsFirestoreAvailable(!!state.isConnected);
    });

    const check = async () => {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected);
      setIsFirestoreAvailable(!!state.isConnected);
    };

    check();

    const appStateSub = AppState.addEventListener('change', next => {
      if (next === 'active') check();
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return {
    isConnected,
    isFirestoreAvailable,
    checkFirestoreConnection: async () => true,
  };
};
