import type { DrumInstrument } from './DrumInstrument';

export interface ExpectedHit {
  instrument: DrumInstrument;
  beat: number; // fractional beat position, e.g. 1.0 = beat 1, 1.5 = "& of 1"
}
