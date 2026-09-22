import { describe, it, expect } from 'vitest';
import type { DrumHit } from '../domain/DrumHit';
import type { DrumPattern } from '../domain/DrumPattern';
import type { ExpectedHit } from '../domain/ExpectedHit';
import { schedulePattern, evaluateHits, computeLessonResult } from '../engine/scoring';

const msPerBeat = 60000 / 80; // 80 BPM

function makePattern(hits: ExpectedHit[]): DrumPattern {
  return {
    name: 'Test Pattern',
    bpm: 80,
    beatsPerBar: 4,
    bars: 1,
    hits,
  };
}

const basicHits: ExpectedHit[] = [
  { instrument: 'kick', beat: 1 },
  { instrument: 'snare', beat: 2 },
  { instrument: 'kick', beat: 3 },
  { instrument: 'snare', beat: 4 },
];

describe('Scoring engine', () => {
  it('schedules hits at correct times', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    expect(scheduled).toHaveLength(4);
    expect(scheduled[0].timeMs).toBe(1000);
    expect(scheduled[1].timeMs).toBeCloseTo(1000 + msPerBeat, 1);
    expect(scheduled[2].timeMs).toBeCloseTo(1000 + 2 * msPerBeat, 1);
    expect(scheduled[3].timeMs).toBeCloseTo(1000 + 3 * msPerBeat, 1);
  });

  it('scores perfect hits', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1000 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + msPerBeat },
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated).toHaveLength(4);
    expect(evaluated.every((e) => e.rating === 'perfect')).toBe(true);
  });

  it('scores good hits with offset', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1040 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + msPerBeat + 40 },
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat - 50 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat + 55 },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated.every((e) => e.rating === 'good')).toBe(true);
  });

  it('scores OK hits with offset', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1070 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + msPerBeat + 80 },
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat - 90 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat + 95 },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated.every((e) => e.rating === 'ok')).toBe(true);
  });

  it('scores misses for hits beyond 100ms', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1200 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + msPerBeat + 200 },
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat - 300 },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat + 500 },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated.every((e) => e.rating === 'miss')).toBe(true);
  });

  it('scores wrong instrument as miss', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'snare', velocity: 100, timestamp: 1000 }, // wrong instrument
      { instrument: 'kick', velocity: 100, timestamp: 1000 + msPerBeat }, // wrong
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated[0].rating).toBe('miss');
    expect(evaluated[0].actualInstrument).toBe('snare');
    expect(evaluated[0].expectedInstrument).toBe('kick');
    expect(evaluated[1].rating).toBe('miss');
    expect(evaluated[1].actualInstrument).toBe('kick');
    expect(evaluated[1].expectedInstrument).toBe('snare');
    expect(evaluated[2].rating).toBe('perfect');
    expect(evaluated[3].rating).toBe('perfect');
  });

  it('scores missing hits (no actual hit)', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1000 },
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    expect(evaluated).toHaveLength(4);
    expect(evaluated[0].rating).toBe('perfect');
    expect(evaluated[1].rating).toBe('miss');
    expect(evaluated[1].actualInstrument).toBeNull();
    expect(evaluated[2].rating).toBe('perfect');
    expect(evaluated[3].rating).toBe('miss');
    expect(evaluated[3].actualInstrument).toBeNull();
  });

  it('aggregates lesson result correctly', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'kick', velocity: 100, timestamp: 1000 }, // perfect
      { instrument: 'snare', velocity: 100, timestamp: 1000 + msPerBeat + 40 }, // good
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat + 80 }, // ok
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat + 200 }, // miss
    ];
    const evaluated = evaluateHits(scheduled, actual);
    const result = computeLessonResult('Test Pattern', evaluated);

    expect(result.lessonName).toBe('Test Pattern');
    expect(result.totalHits).toBe(4);
    expect(result.perfect).toBe(1);
    expect(result.good).toBe(1);
    expect(result.ok).toBe(1);
    expect(result.miss).toBe(1);
    expect(result.wrongInstrument).toBe(0);
    // (100 + 75 + 50 + 0) / 400 * 100 = 56.25 -> 56.3
    expect(result.accuracy).toBe(56.3);
  });

  it('counts wrong instrument in lesson result', () => {
    const pattern = makePattern(basicHits);
    const scheduled = schedulePattern(pattern, 1000);
    const actual: DrumHit[] = [
      { instrument: 'snare', velocity: 100, timestamp: 1000 }, // wrong
      { instrument: 'kick', velocity: 100, timestamp: 1000 + msPerBeat }, // wrong
      { instrument: 'kick', velocity: 100, timestamp: 1000 + 2 * msPerBeat },
      { instrument: 'snare', velocity: 100, timestamp: 1000 + 3 * msPerBeat },
    ];
    const evaluated = evaluateHits(scheduled, actual);
    const result = computeLessonResult('Test', evaluated);
    expect(result.wrongInstrument).toBe(2);
    expect(result.miss).toBe(2);
    expect(result.perfect).toBe(2);
  });
});
