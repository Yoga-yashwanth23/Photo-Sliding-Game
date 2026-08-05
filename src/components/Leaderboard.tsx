import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { LeaderboardFilterRange, RankedLeaderboardEntry } from '@/types';
import { medalFor } from '@/utils/ranking';
import { formatTime } from '@/utils/timer';

interface LeaderboardProps {
  entries: RankedLeaderboardEntry[];
  rangeFilter: LeaderboardFilterRange;
  onFilterChange: (partial: { range?: LeaderboardFilterRange }) => void;
  currentPlayerId?: string;
  isLoading?: boolean;
  isOffline?: boolean;
}

const podiumOrder = [2, 1, 3]; // silver, gold, bronze visual order

export default function Leaderboard({
  entries,
  rangeFilter,
  onFilterChange,
  currentPlayerId,
  isLoading,
  isOffline,
}: LeaderboardProps) {
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (currentPlayerId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPlayerId, entries]);

  const top3 = entries.filter((e) => e.rank <= 3);

  return (
    <div className="mx-auto w-full max-w-4xl">
      {isOffline && (
        <p className="mb-4 rounded-md bg-rust/10 px-4 py-2 text-center text-sm text-rust">
          Leaderboard is offline — showing the last cached results.
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <FilterGroup
          label="Range"
          value={rangeFilter}
          options={[
            { id: 'all', label: 'All Time' },
            { id: 'week', label: 'This Week' },
            { id: 'today', label: 'Today' },
          ]}
          onChange={(range) => onFilterChange({ range: range as LeaderboardFilterRange })}
        />
      </div>

      {top3.length > 0 && (
        <div className="mb-8 flex items-end justify-center gap-4">
          {podiumOrder
            .map((rank) => top3.find((e) => e.rank === rank))
            .filter((e): e is RankedLeaderboardEntry => !!e)
            .map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`plank-panel flex flex-col items-center px-5 py-4 ${
                  entry.rank === 1 ? 'order-2 -translate-y-3' : entry.rank === 2 ? 'order-1' : 'order-3'
                }`}
              >
                <span className="text-3xl">{medalFor(entry.rank)}</span>
                <span className="mt-1 font-heading text-gold">{entry.playerName}</span>
                <span className="font-mono text-sm text-foam/70">{formatTime(entry.completionTimeMs)}</span>
                <span className="font-mono text-lg text-gold-light">{entry.finalScore.toFixed(2)} · {entry.letterGrade}</span>
              </motion.div>
            ))}
        </div>
      )}

      <div className="plank-panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-xs uppercase tracking-widest text-foam/60">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Moves</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Efficiency</th>
              <th className="px-4 py-3">Pirate Rank</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-foam/60">
                  Charting the leaderboard…
                </td>
              </tr>
            )}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-foam/60">
                  No voyages logged yet. Be the first to claim the treasure.
                </td>
              </tr>
            )}
            {!isLoading &&
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  ref={entry.playerId === currentPlayerId ? highlightRef : undefined}
                  className={`border-b border-gold/10 ${
                    entry.playerId === currentPlayerId ? 'bg-gold/15' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono">{medalFor(entry.rank)}</td>
                  <td className="px-4 py-3 font-heading text-gold">{entry.playerName}</td>
                  <td className="px-4 py-3 font-mono">{formatTime(entry.completionTimeMs)}</td>
                  <td className="px-4 py-3 font-mono">{entry.moves}</td>
                  <td className="px-4 py-3 font-mono">{entry.finalScore.toFixed(2)} ({entry.letterGrade})</td>
                  <td className="px-4 py-3 font-mono">{entry.moveEfficiency.toFixed(2)}%</td>
                  <td className="px-4 py-3">{entry.pirateRank}</td>
                  <td className="px-4 py-3 text-foam/60">{new Date(entry.completedAt).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gold/20 bg-deep/60 p-1" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={`rounded px-3 py-1.5 text-xs font-heading tracking-wide transition-colors ${
            value === opt.id ? 'bg-gold text-abyss' : 'text-foam/70 hover:text-gold-light'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
