import type { DrumInstrument } from './DrumInstrument';
import type { HitRating } from './EvaluatedHit';

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface DrumEvent {
  id: string;
  instrument: DrumInstrument;
  /** 0-based bar index */
  bar: number;
  /** 0-based beat within the bar (fractional allowed, e.g. 0.5) */
  beat: number;
  velocity?: number;
}

export interface Arrangement {
  bars: number;
  beatsPerBar: number;
  events: DrumEvent[];
}

export interface StepScoringWindows {
  perfectMs: number;
  goodMs: number;
  okMs: number;
  missMs: number;
}

export interface LessonStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  arrangement: Arrangement;
  practice?: {
    minBpm?: number;
    maxBpm?: number;
    allowLoop?: boolean;
    allowWaitMode?: boolean;
  };
  scoring?: StepScoringWindows;
  isFinalPerformance?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  bpm: number;
  timeSignature: TimeSignature;
  steps: LessonStep[];
}

export type LessonPhase =
  | 'idle'
  | 'preview'
  | 'ready'
  | 'count_in'
  | 'performance'
  | 'result'
  | 'completed';

export type ExpectedEventState = 'pending' | 'hit' | 'missed';

export interface ScheduledEvent {
  event: DrumEvent;
  absoluteBeat: number;
  expectedTimeMs: number;
  state: ExpectedEventState;
  rating?: HitRating;
  offsetMs?: number;
  actualTimeMs?: number | null;
}

export interface EvaluatedPerformanceHit {
  expectedEventId: string | null;
  expectedInstrument: DrumInstrument | null;
  actualInstrument: DrumInstrument;
  rating: HitRating | 'extra';
  offsetMs: number | null;
  expectedTimeMs: number | null;
  actualTimeMs: number;
  earlyLate: 'early' | 'late' | 'on_time' | null;
}

export interface StepResult {
  stepId: string;
  stepTitle: string;
  expectedCount: number;
  hitCount: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  extraHitCount: number;
  accuracy: number;
  hits: EvaluatedPerformanceHit[];
}

export interface LessonSessionResult {
  lessonId: string;
  lessonTitle: string;
  stepResults: StepResult[];
  expectedCount: number;
  hitCount: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  extraHitCount: number;
  accuracy: number;
}
