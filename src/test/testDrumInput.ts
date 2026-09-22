import type { DrumHit } from '../domain/DrumHit';
import type { DrumInstrument } from '../domain/DrumInstrument';

export type DrumHitListener = (hit: DrumHit) => void;

export class TestDrumInput {
  private listeners = new Set<DrumHitListener>();
  private nowFn: () => number;

  constructor(nowFn: () => number = performance.now) {
    this.nowFn = nowFn;
  }

  hit(instrument: DrumInstrument, velocity: number = 100): void {
    const drumHit: DrumHit = {
      instrument,
      velocity,
      timestamp: this.nowFn(),
    };
    this.listeners.forEach((l) => l(drumHit));
  }

  hitAt(instrument: DrumInstrument, timestamp: number, velocity: number = 100): void {
    const drumHit: DrumHit = {
      instrument,
      velocity,
      timestamp,
    };
    this.listeners.forEach((l) => l(drumHit));
  }

  subscribe(listener: DrumHitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
