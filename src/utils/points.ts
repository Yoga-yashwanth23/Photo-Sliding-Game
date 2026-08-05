import type { ScoringConfig } from '@/types';
import { SCORING_CONFIG } from '@/constants';

export interface ScoreBreakdown {
  base: number;
  timePenalty: number;
  total: number;
}

/**
 * Score = completionPoints - (full minutes elapsed × penaltyPerMinute),
 * clamped to a configurable floor.
 *
 * - Completing the puzzle at all is worth `completionPoints` (20 by default).
 * - Every full minute that passes before solving costs `penaltyPerMinute`
 *   points (2 by default). Partial minutes don't count against the player
 *   yet — the penalty only ticks up once a full minute has elapsed.
 *
 * Because every tunable lives in `ScoringConfig`, an admin dashboard can
 * rebalance the economy without touching this function.
 */
export function calculateScore(
  completionTimeMs: number,
  config: ScoringConfig = SCORING_CONFIG,
): ScoreBreakdown {
  const minutesElapsed = Math.floor(completionTimeMs / 60000);
  const timePenalty = minutesElapsed * config.penaltyPerMinute;
  const total = Math.max(config.minScore, config.completionPoints - timePenalty);

  return { base: config.completionPoints, timePenalty, total };
}
