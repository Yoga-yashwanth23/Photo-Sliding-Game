import type { LeaderboardEntry, RankedLeaderboardEntry } from '@/types';
import { compareLeaderboardEntries } from './scoringEngine';

/**
 * Comparator implementing the priority order:
 *   1. Highest score
 *   2. Fastest completion time
 *   3. Fewest moves
 *   4. Earliest completion timestamp (tie-breaker of last resort)
 */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return compareLeaderboardEntries(a, b);
}

export function rankEntries(entries: LeaderboardEntry[]): RankedLeaderboardEntry[] {
  return [...entries]
    .sort(compareEntries)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function medalFor(rank: number): string {
  if (rank === 1) return '🏆';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}
