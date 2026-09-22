import type { LessonSessionResult } from '../domain/lessonTypes';
import type { LessonResult } from '../domain/LessonResult';

let lastSession: LessonSessionResult | null = null;
let lastResult: LessonResult | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

/** Prefer storing the full session result; also mirror a flat LessonResult for the result screen. */
export function setLastSessionResult(session: LessonSessionResult): void {
  lastSession = session;
  lastResult = {
    lessonName: session.lessonTitle,
    totalHits: session.expectedCount,
    perfect: session.perfectCount,
    good: session.goodCount,
    ok: session.okCount,
    miss: session.missCount,
    wrongInstrument: 0,
    accuracy: session.accuracy,
    evaluatedHits: [],
  };
  notify();
}

export function setLastResult(result: LessonResult): void {
  lastResult = result;
  notify();
}

export function getLastResult(): LessonResult | null {
  return lastResult;
}

export function getLastSessionResult(): LessonSessionResult | null {
  return lastSession;
}

export function subscribeToResult(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
