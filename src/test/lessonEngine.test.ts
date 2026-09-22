import { describe, it, expect } from 'vitest';
import { createMusicalClock } from '../engine/musicalClock';
import { LessonEngine } from '../engine/lessonEngine';
import { absoluteBeatToMs } from '../engine/musicalPosition';
import { BASIC_ROCK_1 } from '../lessons/basicRock1';
import type {
  EvaluatedPerformanceHit,
  Lesson,
  LessonPhase,
  LessonSessionResult,
  LessonStep,
  ScheduledEvent,
  StepResult,
} from '../domain/lessonTypes';
import type { DrumHit } from '../domain/DrumHit';

function makeTinyLesson(): Lesson {
  return {
    id: 'tiny',
    title: 'Tiny',
    bpm: 60, // 1000ms per beat — easy math
    timeSignature: { numerator: 4, denominator: 4 },
    steps: [
      {
        id: 's1',
        title: 'Kick only',
        order: 1,
        arrangement: {
          bars: 1,
          beatsPerBar: 4,
          events: [
            { id: 'e1', instrument: 'kick', bar: 0, beat: 0 },
            { id: 'e2', instrument: 'kick', bar: 0, beat: 2 },
          ],
        },
      },
      {
        id: 's2',
        title: 'Kick + snare',
        order: 2,
        arrangement: {
          bars: 1,
          beatsPerBar: 4,
          events: [
            { id: 'e3', instrument: 'kick', bar: 0, beat: 0 },
            { id: 'e4', instrument: 'snare', bar: 0, beat: 1 },
          ],
        },
        isFinalPerformance: true,
      },
    ],
  };
}

function silentCallbacks() {
  const phases: LessonPhase[] = [];
  const stepResults: StepResult[] = [];
  let lessonResult: LessonSessionResult | null = null;
  const evaluated: EvaluatedPerformanceHit[] = [];
  return {
    phases,
    stepResults,
    get lessonResult() {
      return lessonResult;
    },
    evaluated,
    cbs: {
      onPhaseChange: (p: LessonPhase) => phases.push(p),
      onStepChange: (_i: number, _s: LessonStep) => {},
      onBeat: () => {},
      onPlayhead: () => {},
      onCountdown: () => {},
      onHit: () => {},
      onEvaluated: (h: EvaluatedPerformanceHit, _s: ScheduledEvent[]) => evaluated.push(h),
      onStepResult: (r: StepResult) => stepResults.push(r),
      onLessonComplete: (r: LessonSessionResult) => {
        lessonResult = r;
      },
    },
  };
}

function hit(instrument: DrumHit['instrument'], timestamp: number): DrumHit {
  return { instrument, velocity: 100, timestamp };
}

// Node/vitest has no rAF — lesson engine uses it only to poll the musical clock for UI.
const _rafTimers = new Map<number, ReturnType<typeof setTimeout>>();
let _rafId = 1;
(globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame = (cb) => {
  const id = _rafId++;
  _rafTimers.set(id, setTimeout(() => cb(Date.now()), 16));
  return id;
};
(globalThis as unknown as { cancelAnimationFrame: typeof cancelAnimationFrame }).cancelAnimationFrame = (id) => {
  const t = _rafTimers.get(id);
  if (t) clearTimeout(t);
  _rafTimers.delete(id);
};


describe('LessonEngine', () => {
  it('scores a perfect hit', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const clock = createMusicalClock(() => 0);
    const engine = new LessonEngine(lesson, clock, bag.cbs);
    engine.prepare();
    const t0 = 10_000;
    engine.startPerformanceAt(t0);
    engine.registerHit(hit('kick', t0)); // exact
    const sched = engine.getScheduled();
    expect(sched[0].state).toBe('hit');
    expect(sched[0].rating).toBe('perfect');
  });

  it('scores early and late hits within windows', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    const t0 = 5_000;
    engine.startPerformanceAt(t0);
    engine.registerHit(hit('kick', t0 - 40)); // early good
    engine.registerHit(hit('kick', t0 + 2000 + 80)); // beat 2 late ok
    const sched = engine.getScheduled();
    expect(sched[0].rating).toBe('good');
    expect(sched[1].rating).toBe('ok');
  });

  it('records miss when no hit arrives', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    engine.startPerformanceAt(0);
    engine.forceFinishPerformance();
    expect(bag.stepResults[0].missCount).toBe(2);
    expect(bag.stepResults[0].hitCount).toBe(0);
  });

  it('records extra hits without corrupting expected matching', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    const t0 = 1000;
    engine.startPerformanceAt(t0);
    engine.registerHit(hit('snare', t0)); // wrong instrument / extra
    engine.registerHit(hit('kick', t0)); // still matches kick
    expect(bag.evaluated.some((e) => e.rating === 'extra')).toBe(true);
    expect(engine.getScheduled()[0].state).toBe('hit');
    expect(engine.getScheduled()[0].rating).toBe('perfect');
  });

  it('wrong instrument does not satisfy another instrument event', () => {
    const lesson = makeTinyLesson();
    lesson.steps[0].arrangement.events = [
      { id: 'k', instrument: 'kick', bar: 0, beat: 0 },
      { id: 's', instrument: 'snare', bar: 0, beat: 1 },
    ];
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    const t0 = 0;
    engine.startPerformanceAt(t0);
    engine.registerHit(hit('snare', t0)); // at kick time — must NOT take the kick slot
    const sched = engine.getScheduled();
    expect(sched[0].state).toBe('pending');
    expect(sched[0].event.instrument).toBe('kick');
    expect(bag.evaluated.some((e) => e.rating === 'extra')).toBe(true);
  });

  it('does not allow double-scoring the same expected event', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    const t0 = 0;
    engine.startPerformanceAt(t0);
    engine.registerHit(hit('kick', t0));
    engine.registerHit(hit('kick', t0 + 5));
    expect(engine.getScheduled()[0].state).toBe('hit');
    expect(bag.evaluated.filter((e) => e.rating === 'extra').length).toBe(1);
  });

  it('preview does not affect scoring', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    engine.preview();
    engine.registerHit(hit('kick', 0));
    expect(bag.evaluated.length).toBe(0);
    expect(bag.stepResults.length).toBe(0);
  });

  it('advances through steps and completes the lesson', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();

    engine.startPerformanceAt(0);
    engine.registerHit(hit('kick', 0));
    engine.registerHit(hit('kick', 2000));
    engine.forceFinishPerformance();
    expect(engine.getPhase()).toBe('result');
    expect(bag.stepResults).toHaveLength(1);

    engine.advanceAfterResult();
    expect(engine.getStepIndex()).toBe(1);
    expect(engine.getPhase()).toBe('ready');

    engine.startPerformanceAt(10_000);
    engine.registerHit(hit('kick', 10_000));
    engine.registerHit(hit('snare', 11_000));
    engine.forceFinishPerformance();
    engine.advanceAfterResult();

    expect(engine.getPhase()).toBe('completed');
    expect(bag.lessonResult).not.toBeNull();
    expect(bag.lessonResult!.stepResults).toHaveLength(2);
  });

  it('BPM override scales timestamps without mutating events', () => {
    const lesson = makeTinyLesson();
    const bag = silentCallbacks();
    const engine = new LessonEngine(lesson, createMusicalClock(() => 0), bag.cbs);
    engine.prepare();
    engine.setPlaybackBpm(120); // 500ms/beat
    expect(absoluteBeatToMs(2, 120)).toBe(1000);
    engine.startPerformanceAt(0);
    const sched = engine.getScheduled();
    expect(sched[1].expectedTimeMs - sched[0].expectedTimeMs).toBe(1000);
    // musical positions unchanged
    expect(lesson.steps[0].arrangement.events[1].beat).toBe(2);
  });

  it('Basic Rock 1 has progressive steps with real timed events', () => {
    expect(BASIC_ROCK_1.steps).toHaveLength(5);
    expect(BASIC_ROCK_1.steps[0].arrangement.events.every((e) => e.instrument === 'closedHat')).toBe(
      true
    );
    const s2 = BASIC_ROCK_1.steps[1].arrangement.events;
    expect(s2.some((e) => e.instrument === 'kick')).toBe(true);
    expect(s2.some((e) => e.instrument === 'snare')).toBe(false);
    const s3 = BASIC_ROCK_1.steps[2].arrangement.events;
    expect(s3.some((e) => e.instrument === 'snare')).toBe(true);
    expect(BASIC_ROCK_1.steps[4].isFinalPerformance).toBe(true);
    expect(BASIC_ROCK_1.steps[3].arrangement.bars).toBe(8);
    expect(BASIC_ROCK_1.steps[0].arrangement.events.length).toBeGreaterThan(0);
  });
});
