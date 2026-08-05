/**
 * Random tile numbers shown to players (and read by assistive tech / visible
 * in DevTools' Accessibility inspector), completely separate from the
 * internal `Tile.id`.
 *
 * These are NOT persisted anywhere and are not derived from any game-state
 * value (id, correctRow, correctCol). They're generated fresh, in memory
 * only, once per app execution (see usage in PuzzleBoard), so:
 *  - the number can't be used to work out a tile's correct row/column, and
 *  - the numbers are different every time the app is loaded/run.
 */

function shuffledRange(count: number): number[] {
  const pool = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/**
 * Builds an id -> displayNumber map for `total` tiles (ids 0..total-2 are
 * real tiles; total-1 is the empty slot and gets no label). Call this once
 * per app run (e.g. via useMemo with no deps) — calling it again produces a
 * different random mapping.
 */
export function buildDisplayLabelMap(total: number): Map<number, number> {
  const labels = shuffledRange(total - 1);
  const map = new Map<number, number>();
  for (let id = 0; id < total - 1; id++) {
    map.set(id, labels[id]);
  }
  return map;
}
