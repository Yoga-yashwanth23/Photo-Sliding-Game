import { useMemo } from 'react';
import { calculateScore } from '@/utils/points';

export function usePoints(completionTimeMs: number) {
  return useMemo(() => calculateScore(completionTimeMs), [completionTimeMs]);
}
