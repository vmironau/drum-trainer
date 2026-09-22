import type { DrumHit } from '../domain/DrumHit';
import type {
  EvaluatedPerformanceHit,
  Lesson,
  LessonPhase,
  LessonSessionResult,
  LessonStep,
  ScheduledEvent,
  StepResult,
  StepScoringWindows,
} from '../domain/lessonTypes';
import type { MusicalClock } from './musicalClock';
import {
  absoluteBeatToMs,
  arrangementDurationMs,
  eventAbsoluteBeat,
  positionFromElapsedMs,
} from './musicalPosition';
import {
  DEFAULT_SCORING,
  buildStepResult,
  matchHitToScheduled,
} from './matching';

export interface LessonEngineCallbacks {
  onPhaseChange: (phase: LessonPhase) => void;
  onStepChange: (stepIndex: number, step: LessonStep) => void;
  onBeat: (bar: number, beat: number) => void;
  onPlayhead: (elapsedMs: number, durationMs: number) => void;
  onCountdown: (remainingBeats: number) => void;
  onHit: (hit: DrumHit) => void;
  onEvaluated: (hit: EvaluatedPerformanceHit, scheduled: ScheduledEvent[]) => void;
  onStepResult: (result: StepResult) => void;
  onLessonComplete: (result: LessonSessionResult) => void;
}

const COUNT_IN_BARS = 1;

/**
 * Melodics-style step lesson engine.
 * Musical time comes from MusicalClock (performance.now). rAF only polls UI.
 */
export class LessonEngine {
  private lesson: Lesson;
  private clock: MusicalClock;
  private callbacks: LessonEngineCallbacks;
  private phase: LessonPhase = 'idle';
  private stepIndex = 0;
  private playbackBpm: number;
  private scheduled: ScheduledEvent[] = [];
  private performanceHits: EvaluatedPerformanceHit[] = [];
  private stepResults: StepResult[] = [];
  private rafId: number | null = null;
  private phaseStartMs: number | null = null;
  private performanceStartMs: number | null = null;
  private plannedPerformanceStartMs: number | null = null;
  private scoring: StepScoringWindows = DEFAULT_SCORING;

  constructor(lesson: Lesson, clock: MusicalClock, callbacks: LessonEngineCallbacks) {
    this.lesson = lesson;
    this.clock = clock;
    this.callbacks = callbacks;
    this.playbackBpm = lesson.bpm;
  }

  getPhase(): LessonPhase {
    return this.phase;
  }

  getStepIndex(): number {
    return this.stepIndex;
  }

  getCurrentStep(): LessonStep {
    return this.lesson.steps[this.stepIndex];
  }

  getScheduled(): ScheduledEvent[] {
    return this.scheduled;
  }

  getPlaybackBpm(): number {
    return this.playbackBpm;
  }

  getStepResults(): StepResult[] {
    return this.stepResults;
  }

  setPlaybackBpm(bpm: number): void {
    if (this.phase === 'performance' || this.phase === 'count_in' || this.phase === 'preview') {
      return;
    }
    this.playbackBpm = Math.max(20, Math.min(300, bpm));
  }

  private setPhase(phase: LessonPhase): void {
    this.phase = phase;
    this.callbacks.onPhaseChange(phase);
  }

  private currentWindows(): StepScoringWindows {
    return this.getCurrentStep().scoring ?? DEFAULT_SCORING;
  }

  private buildScheduled(startTimeMs: number): ScheduledEvent[] {
    const step = this.getCurrentStep();
    const beatsPerBar = step.arrangement.beatsPerBar;
    return step.arrangement.events
      .map((event) => {
        const absoluteBeat = eventAbsoluteBeat(event, beatsPerBar);
        return {
          event,
          absoluteBeat,
          expectedTimeMs: startTimeMs + absoluteBeatToMs(absoluteBeat, this.playbackBpm),
          state: 'pending' as const,
        };
      })
      .sort((a, b) => a.expectedTimeMs - b.expectedTimeMs);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (): void => {
    if (
      this.phase === 'idle' ||
      this.phase === 'ready' ||
      this.phase === 'result' ||
      this.phase === 'completed'
    ) {
      return;
    }

    const now = this.clock.now();
    const step = this.getCurrentStep();
    const beatsPerBar = step.arrangement.beatsPerBar;
    const msBeat = 60000 / this.playbackBpm;

    if (this.phase === 'count_in' && this.phaseStartMs !== null) {
      const countInMs = COUNT_IN_BARS * beatsPerBar * msBeat;
      const elapsed = now - this.phaseStartMs;
      const remaining = Math.max(0, Math.ceil((countInMs - elapsed) / msBeat));
      this.callbacks.onCountdown(remaining);
      // Musical time is negative during count-in so the highway can pre-position notes.
      if (this.plannedPerformanceStartMs !== null) {
        const musicalElapsed = now - this.plannedPerformanceStartMs;
        const durationMs = arrangementDurationMs(step.arrangement, this.playbackBpm);
        this.callbacks.onPlayhead(musicalElapsed, durationMs);
      }
      if (elapsed >= countInMs) {
        this.beginPerformance(this.plannedPerformanceStartMs ?? now);
      }
    } else if (
      (this.phase === 'preview' || this.phase === 'performance') &&
      this.performanceStartMs !== null
    ) {
      const durationMs = arrangementDurationMs(step.arrangement, this.playbackBpm);
      const elapsed = now - this.performanceStartMs;
      const pos = positionFromElapsedMs(elapsed, this.playbackBpm, beatsPerBar);
      this.callbacks.onBeat(pos.bar + 1, Math.floor(pos.beat) + 1);
      this.callbacks.onPlayhead(elapsed, durationMs);

      if (this.phase === 'performance') {
        this.markMissed(now);
      }

      if (elapsed >= durationMs) {
        if (this.phase === 'preview') {
          this.finishPreview();
        } else {
          this.finishPerformance();
        }
        return;
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private markMissed(now: number): void {
    const windowMs = this.scoring.missMs;
    for (const s of this.scheduled) {
      if (s.state !== 'pending') continue;
      if (now - s.expectedTimeMs > windowMs) {
        s.state = 'missed';
        s.rating = 'miss';
        s.offsetMs = 0;
        s.actualTimeMs = null;
        const ev: EvaluatedPerformanceHit = {
          expectedEventId: s.event.id,
          expectedInstrument: s.event.instrument,
          actualInstrument: s.event.instrument,
          rating: 'miss',
          offsetMs: null,
          expectedTimeMs: s.expectedTimeMs,
          actualTimeMs: now,
          earlyLate: null,
        };
        this.callbacks.onEvaluated(ev, this.scheduled);
      }
    }
  }

  private beginPerformance(now: number): void {
    this.performanceStartMs = now;
    this.plannedPerformanceStartMs = now;
    // Keep pre-built schedule if present; otherwise build now.
    if (this.scheduled.length === 0) {
      this.scheduled = this.buildScheduled(now);
    }
    this.performanceHits = [];
    this.scoring = this.currentWindows();
    this.setPhase('performance');
  }

  private finishPreview(): void {
    this.stopLoop();
    this.scheduled = [];
    this.performanceStartMs = null;
    this.setPhase('ready');
  }

  private finishPerformance(): void {
    this.stopLoop();
    for (const s of this.scheduled) {
      if (s.state === 'pending') {
        s.state = 'missed';
        s.rating = 'miss';
        s.actualTimeMs = null;
      }
    }
    const step = this.getCurrentStep();
    const result = buildStepResult(step.id, step.title, this.scheduled, this.performanceHits);
    this.stepResults.push(result);
    this.callbacks.onStepResult(result);
    this.setPhase('result');
  }

  prepare(): void {
    this.stopLoop();
    this.clock.start();
    this.setPhase('ready');
    this.callbacks.onStepChange(this.stepIndex, this.getCurrentStep());
  }

  preview(): void {
    this.stopLoop();
    this.clock.start();
    const now = this.clock.now();
    this.phaseStartMs = now;
    this.performanceStartMs = now;
    this.scheduled = this.buildScheduled(now);
    this.performanceHits = [];
    this.setPhase('preview');
    this.rafId = requestAnimationFrame(this.tick);
  }

  startPerformance(): void {
    this.stopLoop();
    this.clock.start();
    const now = this.clock.now();
    const step = this.getCurrentStep();
    const beatsPerBar = step.arrangement.beatsPerBar;
    const msBeat = 60000 / this.playbackBpm;
    const countInMs = COUNT_IN_BARS * beatsPerBar * msBeat;
    this.phaseStartMs = now;
    this.plannedPerformanceStartMs = now + countInMs;
    this.performanceStartMs = null;
    this.scoring = this.currentWindows();
    // Pre-schedule so the highway can show approaching notes during count-in.
    this.scheduled = this.buildScheduled(this.plannedPerformanceStartMs);
    this.performanceHits = [];
    this.setPhase('count_in');
    this.rafId = requestAnimationFrame(this.tick);
  }

  registerHit(hit: DrumHit): void {
    this.callbacks.onHit(hit);

    if (this.phase === 'preview') return;
    if (this.phase !== 'performance' || this.performanceStartMs === null) return;

    const match = matchHitToScheduled(hit, this.scheduled, this.scoring);
    if (match) {
      const s = this.scheduled[match.index];
      s.state = 'hit';
      s.rating = match.rating;
      s.offsetMs = match.offsetMs;
      s.actualTimeMs = hit.timestamp;
      const earlyLate =
        match.rating === 'perfect' ? 'on_time' : match.offsetMs < 0 ? 'early' : 'late';
      const ev: EvaluatedPerformanceHit = {
        expectedEventId: s.event.id,
        expectedInstrument: s.event.instrument,
        actualInstrument: hit.instrument,
        rating: match.rating,
        offsetMs: match.offsetMs,
        expectedTimeMs: s.expectedTimeMs,
        actualTimeMs: hit.timestamp,
        earlyLate,
      };
      this.performanceHits.push(ev);
      this.callbacks.onEvaluated(ev, this.scheduled);
    } else {
      const ev: EvaluatedPerformanceHit = {
        expectedEventId: null,
        expectedInstrument: null,
        actualInstrument: hit.instrument,
        rating: 'extra',
        offsetMs: null,
        expectedTimeMs: null,
        actualTimeMs: hit.timestamp,
        earlyLate: null,
      };
      this.performanceHits.push(ev);
      this.callbacks.onEvaluated(ev, this.scheduled);
    }
  }

  stop(): void {
    this.stopLoop();
    this.performanceStartMs = null;
    this.phaseStartMs = null;
    if (this.phase !== 'completed' && this.phase !== 'result') {
      this.setPhase('ready');
    }
  }

  restartStep(): void {
    this.stopLoop();
    this.performanceHits = [];
    this.scheduled = [];
    if (this.phase === 'result' && this.stepResults.length > 0) {
      const last = this.stepResults[this.stepResults.length - 1];
      if (last.stepId === this.getCurrentStep().id) {
        this.stepResults.pop();
      }
    }
    this.setPhase('ready');
  }

  advanceAfterResult(): void {
    if (this.phase !== 'result') return;
    if (this.stepIndex >= this.lesson.steps.length - 1) {
      this.completeLesson();
      return;
    }
    this.stepIndex += 1;
    this.scheduled = [];
    this.performanceHits = [];
    this.setPhase('ready');
    this.callbacks.onStepChange(this.stepIndex, this.getCurrentStep());
  }

  private completeLesson(): void {
    this.setPhase('completed');
    this.callbacks.onLessonComplete(this.aggregate());
  }

  private aggregate(): LessonSessionResult {
    const stepResults = [...this.stepResults];
    const sum = (fn: (s: StepResult) => number) => stepResults.reduce((a, s) => a + fn(s), 0);
    const expectedCount = sum((s) => s.expectedCount);
    const perfectCount = sum((s) => s.perfectCount);
    const goodCount = sum((s) => s.goodCount);
    const okCount = sum((s) => s.okCount);
    const missCount = sum((s) => s.missCount);
    const hitCount = sum((s) => s.hitCount);
    const extraHitCount = sum((s) => s.extraHitCount);
    const weighted = perfectCount * 100 + goodCount * 75 + okCount * 50;
    const accuracy =
      expectedCount > 0 ? Math.round((weighted / (expectedCount * 100)) * 1000) / 10 : 0;
    return {
      lessonId: this.lesson.id,
      lessonTitle: this.lesson.title,
      stepResults,
      expectedCount,
      hitCount,
      perfectCount,
      goodCount,
      okCount,
      missCount,
      extraHitCount,
      accuracy,
    };
  }

  /** Test helper: start performance at a fixed clock time (no count-in). */
  startPerformanceAt(startTimeMs: number): void {
    this.stopLoop();
    this.clock.start();
    this.performanceStartMs = startTimeMs;
    this.scheduled = this.buildScheduled(startTimeMs);
    this.performanceHits = [];
    this.scoring = this.currentWindows();
    this.setPhase('performance');
  }

  forceFinishPerformance(): void {
    if (this.phase === 'performance') this.finishPerformance();
  }
}