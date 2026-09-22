import type { Arrangement, DrumEvent, Lesson, LessonStep } from '../domain/lessonTypes';
import type { DrumInstrument } from '../domain/DrumInstrument';

let _id = 0;
function eid(prefix: string): string {
  _id += 1;
  return `${prefix}-${_id}`;
}

function eighthHats(bars: number): DrumEvent[] {
  const events: DrumEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      events.push({ id: eid('hh'), instrument: 'closedHat', bar, beat });
      events.push({ id: eid('hh'), instrument: 'closedHat', bar, beat: beat + 0.5 });
    }
  }
  return events;
}

function kicksOn13(bars: number): DrumEvent[] {
  const events: DrumEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    events.push({ id: eid('k'), instrument: 'kick', bar, beat: 0 });
    events.push({ id: eid('k'), instrument: 'kick', bar, beat: 2 });
  }
  return events;
}

function snaresOn24(bars: number): DrumEvent[] {
  const events: DrumEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    events.push({ id: eid('s'), instrument: 'snare', bar, beat: 1 });
    events.push({ id: eid('s'), instrument: 'snare', bar, beat: 3 });
  }
  return events;
}

function arrangement(bars: number, events: DrumEvent[]): Arrangement {
  return { bars, beatsPerBar: 4, events };
}

function step(
  id: string,
  title: string,
  order: number,
  bars: number,
  events: DrumEvent[],
  description?: string,
  isFinalPerformance = false
): LessonStep {
  return {
    id,
    title,
    description,
    order,
    arrangement: arrangement(bars, events),
    isFinalPerformance,
  };
}

_id = 0;
const step1Events = eighthHats(4);
_id = 1000;
const step2Events = [...eighthHats(4), ...kicksOn13(4)];
_id = 2000;
const step3Events = [...eighthHats(4), ...kicksOn13(4), ...snaresOn24(4)];
_id = 3000;
const step4Events = [...eighthHats(8), ...kicksOn13(8), ...snaresOn24(8)];
_id = 4000;
const step5Events = [...eighthHats(8), ...kicksOn13(8), ...snaresOn24(8)];

export const BASIC_ROCK_1: Lesson = {
  id: 'basic-rock-1',
  title: 'Basic Rock 1',
  description: 'Learn a basic rock groove by building it one component at a time.',
  bpm: 80,
  timeSignature: { numerator: 4, denominator: 4 },
  steps: [
    step('br1-s1', 'Hi-Hat Foundation', 1, 4, step1Events, 'Closed hi-hat on every eighth note.'),
    step('br1-s2', 'Add the Kick', 2, 4, step2Events, 'Hi-hat eighths + kick on beats 1 and 3.'),
    step('br1-s3', 'Add the Snare', 3, 4, step3Events, 'Full groove ingredients over 4 bars.'),
    step('br1-s4', 'Basic Rock Groove', 4, 8, step4Events, 'Play the complete groove for 8 bars.'),
    step('br1-s5', 'Final Performance', 5, 8, step5Events, 'Full performance of the groove.', true),
  ],
};

export function countInstruments(events: DrumEvent[]): Partial<Record<DrumInstrument, number>> {
  const out: Partial<Record<DrumInstrument, number>> = {};
  for (const e of events) {
    out[e.instrument] = (out[e.instrument] ?? 0) + 1;
  }
  return out;
}
