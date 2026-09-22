import type { HitRating } from '../domain/EvaluatedHit';

export const TIMING_THRESHOLDS = {
  perfect: 30,
  good: 60,
  ok: 100,
} as const;

export function getTimingRating(offsetMs: number): HitRating {
  const abs = Math.abs(offsetMs);
  if (abs <= TIMING_THRESHOLDS.perfect) return 'perfect';
  if (abs <= TIMING_THRESHOLDS.good) return 'good';
  if (abs <= TIMING_THRESHOLDS.ok) return 'ok';
  return 'miss';
}
