import type { Lesson } from '../domain/lessonTypes';
import { BASIC_ROCK_1 } from './basicRock1';

/** Catalog of step-based lessons. */
export const LESSONS: Lesson[] = [BASIC_ROCK_1];

export function getLesson(index: number): Lesson {
  return LESSONS[index] ?? LESSONS[0];
}
