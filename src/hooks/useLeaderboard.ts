import { useEffect } from 'react';
import { useLeaderboardStore } from '@/store/leaderboardStore';

export function useLeaderboard() {
  const { entries, filters, isLoading, isOffline, setFilters, refresh, submitResult } = useLeaderboardStore();

  useEffect(() => {
    refresh();
    // Only run once on mount; filter changes call refresh() themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { entries, filters, isLoading, isOffline, setFilters, submitResult };
}
