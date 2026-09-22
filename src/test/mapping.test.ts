import { describe, it, expect } from 'vitest';
import { mapNoteToInstrument, getMidiNoteForInstrument } from '../midi/mapping';

describe('MIDI mapping', () => {
  it('maps GM drum notes to instruments', () => {
    expect(mapNoteToInstrument(36)).toBe('kick');
    expect(mapNoteToInstrument(38)).toBe('snare');
    expect(mapNoteToInstrument(42)).toBe('closedHat');
    expect(mapNoteToInstrument(46)).toBe('openHat');
    expect(mapNoteToInstrument(45)).toBe('tom2');
    expect(mapNoteToInstrument(48)).toBe('tom1');
    expect(mapNoteToInstrument(50)).toBe('tom3');
    expect(mapNoteToInstrument(49)).toBe('crash');
    expect(mapNoteToInstrument(51)).toBe('ride');
  });

  it('returns null for unmapped notes', () => {
    expect(mapNoteToInstrument(60)).toBeNull();
    expect(mapNoteToInstrument(0)).toBeNull();
  });

  it('reverses mapping: instrument to MIDI note', () => {
    expect(getMidiNoteForInstrument('kick')).toBe(36);
    expect(getMidiNoteForInstrument('snare')).toBe(38);
    expect(getMidiNoteForInstrument('closedHat')).toBe(42);
  });
});
