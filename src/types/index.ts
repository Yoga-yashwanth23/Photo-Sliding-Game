// ---------------------------------------------------------------------------
// Core domain types. Kept framework-agnostic so the game engine, services and
// UI layers can all depend on the same contracts without circular coupling.
// ---------------------------------------------------------------------------

export interface PuzzleImage {
  id: number;
  name: string;
  path: string;
}

/** A single tile in the sliding puzzle grid. */
export interface Tile {
  /** Stable identity of the tile, 0..n*n-2 (n*n-1 is reserved for the empty slot).
   *  Internal only — used for move/lookup logic. Never render this to the DOM
   *  (e.g. in aria-label, text content, data-* attributes): it's assigned in
   *  row-major solved order, so id === correctRow * gridSize + correctCol and
   *  anyone opening DevTools could read it straight off the element and back
   *  out the tile's correct position without playing.
   *
   *  Note: the number shown to players/assistive tech (aria-label) is a
   *  separate, freshly-randomized value generated at render time in
   *  PuzzleBoard — it is intentionally NOT stored here or persisted, so it
   *  carries no positional information and changes every time the app runs. */
  id: number;
  /** Correct row/col this tile belongs in when solved. */
  correctRow: number;
  correctCol: number;
  /** Current row/col in the live grid. */
  row: number;
  col: number;
  isEmpty: boolean;
}

export interface PuzzleState {
  tiles: Tile[];
  gridSize: number;
  moves: number;
  isSolved: boolean;
  startedAt: number | null;
  solvedAt: number | null;
}

/** Signals collected while playing, used exclusively by the scoring engine. */
export interface MoveQualityMetrics {
  productiveMoves: number;
  repeatedMoves: number;
  reversals: number;
  correctPlacements: number;
}

export interface PerformanceResult {
  expectedMinimumMoves: number;
  moveEfficiency: number;
  timeScore: number;
  accuracyScore: number;
  finalScore: number;
  pirateRank: string;
  letterGrade: string;
  feedback: string;
}

export interface Player {
  id: string;
  name: string;
  normalisedName: string;
  createdAt: number;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  completionTimeMs: number;
  moves: number;
  /** Final centralized performance score (0–100). */
  finalScore: number;
  expectedMinimumMoves: number;
  moveEfficiency: number;
  timeScore: number;
  accuracyScore: number;
  pirateRank: string;
  letterGrade: string;
  completedAt: number;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number;
}

export type LeaderboardFilterRange = 'all' | 'today' | 'week';

export interface LeaderboardFilters {
  range: LeaderboardFilterRange;
}

export interface PlayerStatistics {
  playerId: string;
  playerName: string;
  personalBestScore: number;
  bestCompletionTimeMs: number;
  bestMoveEfficiency: number;
  averageCompletionTimeMs: number;
  averageMoveEfficiency: number;
  totalGamesPlayed: number;
}
