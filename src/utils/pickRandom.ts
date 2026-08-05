/**
 * Returns up to `count` distinct, randomly-chosen items from `items`
 * (order randomized too). If `items` has fewer than `count` entries, every
 * item is returned. Used to pick which maps show on Home out of however
 * many photos happen to be in public/images/puzzles.
 */
export function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
