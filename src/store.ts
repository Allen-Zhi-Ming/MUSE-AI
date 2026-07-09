import { create } from 'zustand';
import { reducer, INIT } from './state';
import { AppState } from './types';

interface AppStore extends AppState {
  dispatch: (action: any) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  ...INIT,
  dispatch: (action: any) => set((state) => reducer(state, action)),
}));
