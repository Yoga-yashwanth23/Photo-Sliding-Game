import { useEffect, useState } from 'react';

/**
 * Ticks once per animation-friendly interval while the puzzle is running,
 * and freezes the instant `solvedAt` is set. Precision is deliberately
 * ~100ms: fine enough to feel live, coarse enough to avoid needless renders.
 */
export function useTimer(startedAt: number | null, solvedAt: number | null): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || solvedAt) return;
    const interval = window.setInterval(() => {
      setTick(Date.now());
    }, 100);
    return () => window.clearInterval(interval);
  }, [startedAt, solvedAt]);

  if (!startedAt) return 0;
  if (solvedAt) return solvedAt - startedAt;
  return tick - startedAt;
}
