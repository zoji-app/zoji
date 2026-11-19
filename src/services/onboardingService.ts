import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@zoji:onboarding_done';

export const hasSeenOnboarding = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(KEY);
  return val === 'true';
};

export const markOnboardingDone = async (): Promise<void> => {
  await AsyncStorage.setItem(KEY, 'true');
};

export const resetOnboarding = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
