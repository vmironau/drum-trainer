import type { EvaluatedHit } from './EvaluatedHit';

export interface LessonResult {
  lessonName: string;
  totalHits: number;
  perfect: number;
  good: number;
  ok: number;
  miss: number;
  wrongInstrument: number;
  accuracy: number; // 0-100 percentage
  evaluatedHits: EvaluatedHit[];
}
