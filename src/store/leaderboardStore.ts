import { create } from 'zustand';
import type { LeaderboardEntry, LeaderboardFilters, RankedLeaderboardEntry } from '@/types';
import { leaderboardService } from '@/services/leaderboardService';
import { rankEntries } from '@/utils/ranking';

interface LeaderboardState {
  filters: LeaderboardFilters;
  entries: RankedLeaderboardEntry[];
  isLoading: boolean;
  isOffline: boolean;
  setFilters: (filters: Partial<LeaderboardFilters>) => void;
  refresh: () => Promise<void>;
  submitResult: (entry: Omit<LeaderboardEntry, 'id'>) => Promise<RankedLeaderboardEntry | null>;
}

let unsubscribe: (() => void) | null = null;

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  filters: { range: 'all' },
  entries: [],
  isLoading: false,
  isOffline: false,

  setFilters: (partial) => {
    set({ filters: { ...get().filters, ...partial } });
    get().refresh();
  },

  refresh: async () => {
    set({ isLoading: true });
    try {
      const raw = await leaderboardService.getEntries(get().filters);
      set({ entries: rankEntries(raw), isLoading: false, isOffline: false });

      if (!unsubscribe) {
        unsubscribe = leaderboardService.subscribe(() => get().refresh());
      }
    } catch {
      set({ isLoading: false, isOffline: true });
    }
  },

  submitResult: async (entry) => {
    const saved = await leaderboardService.submitResult(entry);
    await get().refresh();
    const match = get().entries.find((e) => e.id === saved.id);
    return match ?? null;
  },
}));
