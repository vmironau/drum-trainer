import type { DrumInstrument } from './DrumInstrument';

export type HitRating = 'perfect' | 'good' | 'ok' | 'miss';

export interface EvaluatedHit {
  expectedInstrument: DrumInstrument;
  actualInstrument: DrumInstrument | null; // null = no hit matched (missing)
  rating: HitRating;
  offsetMs: number; // negative = early, positive = late, 0 = missing
  expectedBeat: number;
  expectedTimeMs: number;
  actualTimeMs: number | null;
}
