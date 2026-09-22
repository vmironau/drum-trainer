import type { Arrangement, DrumEvent } from '../domain/lessonTypes';

export function toAbsoluteBeat(bar: number, beat: number, beatsPerBar: number): number {
  return bar * beatsPerBar + beat;
}

export function msPerBeat(bpm: number): number {
  return 60000 / bpm;
}

export function absoluteBeatToMs(absoluteBeat: number, bpm: number): number {
  return absoluteBeat * msPerBeat(bpm);
}

export function eventAbsoluteBeat(event: DrumEvent, beatsPerBar: number): number {
  return toAbsoluteBeat(event.bar, event.beat, beatsPerBar);
}

export function arrangementDurationMs(arrangement: Arrangement, bpm: number): number {
  return arrangement.bars * arrangement.beatsPerBar * msPerBeat(bpm);
}

export function positionFromElapsedMs(
  elapsedMs: number,
  bpm: number,
  beatsPerBar: number
): { absoluteBeat: number; bar: number; beat: number } {
  const abs = elapsedMs / msPerBeat(bpm);
  const bar = Math.floor(abs / beatsPerBar);
  const beat = abs - bar * beatsPerBar;
  return { absoluteBeat: abs, bar, beat };
}
