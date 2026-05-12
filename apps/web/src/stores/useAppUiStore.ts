import { create } from 'zustand';

interface AppUiState {
  lastPubMedQuery: string;
  setLastPubMedQuery: (query: string) => void;
}

export const useAppUiStore = create<AppUiState>((set) => ({
  lastPubMedQuery: 'health psychology cognition trial',
  setLastPubMedQuery: (query) => set({ lastPubMedQuery: query }),
}));
