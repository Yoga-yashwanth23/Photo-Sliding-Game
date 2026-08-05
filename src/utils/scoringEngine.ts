import { EXPECTED_MINIMUM_MOVES } from '@/constants';
import type { LeaderboardEntry, MoveQualityMetrics, PerformanceResult, PlayerStatistics } from '@/types';

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round = (value: number) => Math.round(value * 100) / 100;

export function calculateMoveEfficiency(actualMoves: number, expectedMoves = EXPECTED_MINIMUM_MOVES): number {
  return round(clamp((expectedMoves / Math.max(1, actualMoves)) * 100));
}

/** A smooth decay: fast finishes are rewarded without minute-by-minute cliffs. */
export function calculateTimeScore(completionTimeMs: number): number {
  return round(clamp(100 * Math.exp(-Math.max(0, completionTimeMs) / (5 * 60 * 1000))));
}

export function calculateAccuracyScore(moves: number, quality: MoveQualityMetrics): number {
  const total = Math.max(1, moves);
  const productiveRate = quality.productiveMoves / total;
  const noRepeatRate = 1 - quality.repeatedMoves / total;
  const noReversalRate = 1 - quality.reversals / total;
  return round(clamp((productiveRate * 0.65 + noRepeatRate * 0.2 + noReversalRate * 0.15) * 100));
}

export function getPirateRank(score: number): string {
  if (score >= 95) return '👑 Pirate King';
  if (score >= 90) return '🏴 Emperor';
  if (score >= 80) return '⚓ Fleet Admiral';
  if (score >= 70) return '🦜 Captain';
  if (score >= 60) return '⚔ Commander';
  if (score >= 50) return '🧭 Navigator';
  if (score >= 40) return '🏝 Sailor';
  return '🪝 Cabin Boy';
}

export function getLetterGrade(score: number): string {
  if (score >= 97) return 'S+';
  if (score >= 90) return 'S';
  if (score >= 85) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function getPerformanceFeedback(result: Pick<PerformanceResult, 'moveEfficiency' | 'timeScore' | 'accuracyScore' | 'finalScore'>): string {
  if (result.finalScore >= 90) return 'Outstanding strategy! You solved the puzzle with exceptional efficiency.';
  if (result.accuracyScore >= result.moveEfficiency && result.accuracyScore >= result.timeScore) return 'Excellent accuracy! Try completing the puzzle faster for a higher score.';
  if (result.timeScore >= result.moveEfficiency) return 'Great speed! Reduce unnecessary moves to reach the next rank.';
  return 'Good effort! Plan your moves more carefully to improve your efficiency.';
}

export function calculatePerformance(
  completionTimeMs: number,
  moves: number,
  quality: MoveQualityMetrics,
  expectedMinimumMoves = EXPECTED_MINIMUM_MOVES,
): PerformanceResult {
  const moveEfficiency = calculateMoveEfficiency(moves, expectedMinimumMoves);
  const timeScore = calculateTimeScore(completionTimeMs);
  const accuracyScore = calculateAccuracyScore(moves, quality);
  const finalScore = round(clamp(moveEfficiency * 0.5 + timeScore * 0.3 + accuracyScore * 0.2));
  const base = { expectedMinimumMoves, moveEfficiency, timeScore, accuracyScore, finalScore };
  return { ...base, pirateRank: getPirateRank(finalScore), letterGrade: getLetterGrade(finalScore), feedback: getPerformanceFeedback(base) };
}

/** Required leaderboard order: score, efficiency, faster time, accuracy, then earlier completion. */
export function compareLeaderboardEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (b.moveEfficiency !== a.moveEfficiency) return b.moveEfficiency - a.moveEfficiency;
  if (a.completionTimeMs !== b.completionTimeMs) return a.completionTimeMs - b.completionTimeMs;
  if (b.accuracyScore !== a.accuracyScore) return b.accuracyScore - a.accuracyScore;
  return a.completedAt - b.completedAt;
}

export function calculatePlayerStatistics(entries: LeaderboardEntry[], playerId: string): PlayerStatistics | null {
  const games = entries.filter((entry) => entry.playerId === playerId);
  if (!games.length) return null;
  const sum = (selector: (entry: LeaderboardEntry) => number) => games.reduce((total, entry) => total + selector(entry), 0);
  return {
    playerId,
    playerName: games[0].playerName,
    personalBestScore: Math.max(...games.map((entry) => entry.finalScore)),
    bestCompletionTimeMs: Math.min(...games.map((entry) => entry.completionTimeMs)),
    bestMoveEfficiency: Math.max(...games.map((entry) => entry.moveEfficiency)),
    averageCompletionTimeMs: round(sum((entry) => entry.completionTimeMs) / games.length),
    averageMoveEfficiency: round(sum((entry) => entry.moveEfficiency) / games.length),
    totalGamesPlayed: games.length,
  };
}
