import { create } from 'zustand';

interface OnboardingState {
  done: boolean | null;
  setDone: (done: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>(set => ({
  done: null,
  setDone: (done: boolean) => set({ done }),
}));
