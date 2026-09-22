import type { ExpectedHit } from './ExpectedHit';

export interface DrumPattern {
  name: string;
  bpm: number;
  beatsPerBar: number; // 4 for 4/4
  bars: number;
  hits: ExpectedHit[];
}
