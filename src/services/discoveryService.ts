import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@zoji:discovery_done';

export const hasCompletedDiscovery = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(KEY);
  return val === 'true';
};

export const markDiscoveryDone = async (): Promise<void> => {
  await AsyncStorage.setItem(KEY, 'true');
};

export const resetDiscovery = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
