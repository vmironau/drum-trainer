import type { DrumHit } from '../domain/DrumHit';
import type { HitRating } from '../domain/EvaluatedHit';
import type {
  EvaluatedPerformanceHit,
  ScheduledEvent,
  StepResult,
  StepScoringWindows,
} from '../domain/lessonTypes';
import { TIMING_THRESHOLDS, getTimingRating } from './timing';

export const DEFAULT_SCORING: StepScoringWindows = {
  perfectMs: TIMING_THRESHOLDS.perfect,
  goodMs: TIMING_THRESHOLDS.good,
  okMs: TIMING_THRESHOLDS.ok,
  missMs: 100,
};

export function rateOffset(
  offsetMs: number,
  windows: StepScoringWindows = DEFAULT_SCORING
): HitRating {
  const abs = Math.abs(offsetMs);
  if (abs <= windows.perfectMs) return 'perfect';
  if (abs <= windows.goodMs) return 'good';
  if (abs <= windows.okMs) return 'ok';
  return 'miss';
}

/** Same thresholds as getTimingRating — kept for existing timing tests. */
export { getTimingRating };

/**
 * Match incoming hit to closest unmatched expected event of the SAME instrument
 * within missMs. Wrong instrument never claims another instrument's event.
 */
export function matchHitToScheduled(
  hit: DrumHit,
  scheduled: ScheduledEvent[],
  windows: StepScoringWindows = DEFAULT_SCORING
): { index: number; offsetMs: number; rating: HitRating } | null {
  const windowMs = windows.missMs;
  let bestIdx: number | null = null;
  let bestOffset = Infinity;

  for (let i = 0; i < scheduled.length; i++) {
    const s = scheduled[i];
    if (s.state !== 'pending') continue;
    if (s.event.instrument !== hit.instrument) continue;
    const offset = hit.timestamp - s.expectedTimeMs;
    if (Math.abs(offset) <= windowMs && Math.abs(offset) < Math.abs(bestOffset)) {
      bestOffset = offset;
      bestIdx = i;
    }
  }

  if (bestIdx === null) return null;
  return { index: bestIdx, offsetMs: bestOffset, rating: rateOffset(bestOffset, windows) };
}

export function buildStepResult(
  stepId: string,
  stepTitle: string,
  scheduled: ScheduledEvent[],
  performanceHits: EvaluatedPerformanceHit[]
): StepResult {
  let perfectCount = 0;
  let goodCount = 0;
  let okCount = 0;
  let missCount = 0;
  let hitCount = 0;

  for (const s of scheduled) {
    if (s.state === 'hit' && s.rating && s.rating !== 'miss') {
      hitCount += 1;
      if (s.rating === 'perfect') perfectCount += 1;
      else if (s.rating === 'good') goodCount += 1;
      else if (s.rating === 'ok') okCount += 1;
    } else {
      missCount += 1;
    }
  }

  const extraHitCount = performanceHits.filter((h) => h.rating === 'extra').length;
  const expectedCount = scheduled.length;
  const weighted = perfectCount * 100 + goodCount * 75 + okCount * 50;
  const accuracy =
    expectedCount > 0 ? Math.round((weighted / (expectedCount * 100)) * 1000) / 10 : 0;

  return {
    stepId,
    stepTitle,
    expectedCount,
    hitCount,
    perfectCount,
    goodCount,
    okCount,
    missCount,
    extraHitCount,
    accuracy,
    hits: performanceHits,
  };
}
