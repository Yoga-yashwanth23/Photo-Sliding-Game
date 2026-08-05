import { useLeaderboard } from '@/hooks/useLeaderboard';
import { usePlayerStore } from '@/store/playerStore';
import Leaderboard from '@/components/Leaderboard';

export default function LeaderboardPage() {
  const { entries, filters, isLoading, isOffline, setFilters } = useLeaderboard();
  const player = usePlayerStore((s) => s.player);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-center text-3xl">The Captain's Ledger</h1>
      <p className="mb-10 text-center text-foam/70">Live standings, updated the moment a treasure is found.</p>
      <Leaderboard
        entries={entries}
        rangeFilter={filters.range}
        onFilterChange={setFilters}
        currentPlayerId={player?.id}
        isLoading={isLoading}
        isOffline={isOffline}
      />
    </div>
  );
}
