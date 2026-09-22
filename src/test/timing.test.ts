import { describe, it, expect } from 'vitest';
import { getTimingRating, TIMING_THRESHOLDS } from '../engine/timing';

describe('Timing buckets', () => {
  it('classifies perfect hits within 30ms', () => {
    expect(getTimingRating(0)).toBe('perfect');
    expect(getTimingRating(25)).toBe('perfect');
    expect(getTimingRating(-30)).toBe('perfect');
  });

  it('classifies good hits within 60ms', () => {
    expect(getTimingRating(31)).toBe('good');
    expect(getTimingRating(60)).toBe('good');
    expect(getTimingRating(-45)).toBe('good');
  });

  it('classifies OK hits within 100ms', () => {
    expect(getTimingRating(61)).toBe('ok');
    expect(getTimingRating(100)).toBe('ok');
    expect(getTimingRating(-80)).toBe('ok');
  });

  it('classifies misses beyond 100ms', () => {
    expect(getTimingRating(101)).toBe('miss');
    expect(getTimingRating(-150)).toBe('miss');
    expect(getTimingRating(500)).toBe('miss');
  });

  it('has correct threshold values', () => {
    expect(TIMING_THRESHOLDS.perfect).toBe(30);
    expect(TIMING_THRESHOLDS.good).toBe(60);
    expect(TIMING_THRESHOLDS.ok).toBe(100);
  });
});
