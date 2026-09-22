import type { DrumInstrument } from '../domain/DrumInstrument';

const GM_DRUM_MAP: Record<number, DrumInstrument> = {
  36: 'kick',
  38: 'snare',
  42: 'closedHat',
  46: 'openHat',
  45: 'tom2',
  48: 'tom1',
  50: 'tom3',
  49: 'crash',
  51: 'ride',
};

export function mapNoteToInstrument(note: number): DrumInstrument | null {
  return GM_DRUM_MAP[note] ?? null;
}

export function getMidiNoteForInstrument(instrument: DrumInstrument): number | null {
  for (const [note, inst] of Object.entries(GM_DRUM_MAP)) {
    if (inst === instrument) return Number(note);
  }
  return null;
}
