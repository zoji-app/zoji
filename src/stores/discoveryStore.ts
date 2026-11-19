import { create } from 'zustand';

interface DiscoveryState {
  done: boolean | null;
  setDone: (done: boolean) => void;
}

export const useDiscoveryStore = create<DiscoveryState>(set => ({
  done: null,
  setDone: (done: boolean) => set({ done }),
}));
