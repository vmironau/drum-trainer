import type { DrumHit } from '../domain/DrumHit';
import type { EvaluatedHit, HitRating } from '../domain/EvaluatedHit';
import type { ExpectedHit } from '../domain/ExpectedHit';
import type { DrumPattern } from '../domain/DrumPattern';
import type { LessonResult } from '../domain/LessonResult';
import { getTimingRating } from './timing';

const HIT_WINDOW_MS = 150; // window to match a hit to an expected note

export interface ScheduledHit extends ExpectedHit {
  timeMs: number;
  matched: boolean;
}

export function schedulePattern(
  pattern: DrumPattern,
  startTimeMs: number
): ScheduledHit[] {
  const msPerBeat = 60000 / pattern.bpm;
  const totalBeats = pattern.beatsPerBar * pattern.bars;

  return pattern.hits
    .map((hit) => {
      const beatOffset = hit.beat - 1;
      const timeMs = startTimeMs + beatOffset * msPerBeat;
      return { ...hit, timeMs, matched: false };
    })
    .filter((h) => h.beat <= totalBeats)
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function evaluateHits(
  scheduled: ScheduledHit[],
  actualHits: DrumHit[]
): EvaluatedHit[] {
  const result: EvaluatedHit[] = [];
  const usedHits = new Set<number>();

  for (const expected of scheduled) {
    let bestMatch: number | null = null;
    let bestOffset = Infinity;

    for (let i = 0; i < actualHits.length; i++) {
      if (usedHits.has(i)) continue;
      const hit = actualHits[i];
      const offset = hit.timestamp - expected.timeMs;
      if (Math.abs(offset) <= HIT_WINDOW_MS) {
        if (Math.abs(offset) < Math.abs(bestOffset)) {
          bestOffset = offset;
          bestMatch = i;
        }
      }
    }

    if (bestMatch !== null) {
      usedHits.add(bestMatch);
      const actual = actualHits[bestMatch];
      const rating: HitRating =
        actual.instrument !== expected.instrument
          ? 'miss'
          : getTimingRating(bestOffset);

      result.push({
        expectedInstrument: expected.instrument,
        actualInstrument: actual.instrument,
        rating,
        offsetMs: bestOffset,
        expectedBeat: expected.beat,
        expectedTimeMs: expected.timeMs,
        actualTimeMs: actual.timestamp,
      });
    } else {
      result.push({
        expectedInstrument: expected.instrument,
        actualInstrument: null,
        rating: 'miss',
        offsetMs: 0,
        expectedBeat: expected.beat,
        expectedTimeMs: expected.timeMs,
        actualTimeMs: null,
      });
    }
  }

  return result;
}

export function computeLessonResult(
  lessonName: string,
  evaluated: EvaluatedHit[]
): LessonResult {
  let perfect = 0;
  let good = 0;
  let ok = 0;
  let miss = 0;
  let wrongInstrument = 0;

  for (const e of evaluated) {
    if (e.actualInstrument !== null && e.actualInstrument !== e.expectedInstrument) {
      wrongInstrument++;
    }
    switch (e.rating) {
      case 'perfect':
        perfect++;
        break;
      case 'good':
        good++;
        break;
      case 'ok':
        ok++;
        break;
      case 'miss':
        miss++;
        break;
    }
  }

  const totalHits = evaluated.length;
  const weighted = perfect * 100 + good * 75 + ok * 50;
  const accuracy = totalHits > 0 ? (weighted / (totalHits * 100)) * 100 : 0;

  return {
    lessonName,
    totalHits,
    perfect,
    good,
    ok,
    miss,
    wrongInstrument,
    accuracy: Math.round(accuracy * 10) / 10,
    evaluatedHits: evaluated,
  };
}
