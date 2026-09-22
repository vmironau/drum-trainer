import type { DrumInstrument } from './DrumInstrument';

export interface DrumHit {
  instrument: DrumInstrument;
  velocity: number; // 0-127
  timestamp: number; // ms, monotonic clock (performance.now())
}
