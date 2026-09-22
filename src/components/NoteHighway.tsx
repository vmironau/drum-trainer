import { useMemo } from 'react';
import type { DrumInstrument } from '../domain/DrumInstrument';
import type { ScheduledEvent } from '../domain/lessonTypes';
import { absoluteBeatToMs } from '../engine/musicalPosition';

export const VISUAL_LEAD_MS = 2000;
export const VISUAL_TRAIL_MS = 500;

const LANE_ORDER: DrumInstrument[] = [
  'kick',
  'snare',
  'closedHat',
  'openHat',
  'tom1',
  'tom2',
  'tom3',
  'crash',
  'ride',
];

const LANE_LABELS: Record<DrumInstrument, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  closedHat: 'HH',
  openHat: 'OH',
  tom1: 'TOM1',
  tom2: 'TOM2',
  tom3: 'TOM3',
  crash: 'CRASH',
  ride: 'RIDE',
};

const LANE_COLORS: Record<DrumInstrument, string> = {
  kick: 'bg-rose-500',
  snare: 'bg-sky-400',
  closedHat: 'bg-amber-300',
  openHat: 'bg-amber-500',
  tom1: 'bg-emerald-400',
  tom2: 'bg-emerald-500',
  tom3: 'bg-emerald-600',
  crash: 'bg-fuchsia-400',
  ride: 'bg-violet-400',
};

export type HighwayNoteState = 'pending' | 'perfect' | 'good' | 'ok' | 'hit' | 'missed' | 'early' | 'late';

export interface HighwayNote {
  eventId: string;
  instrument: DrumInstrument;
  expectedMusicalMs: number;
  state: HighwayNoteState;
}

function toHighwayState(s: ScheduledEvent): HighwayNoteState {
  if (s.state === 'missed') return 'missed';
  if (s.state === 'hit') {
    if (s.rating === 'perfect') return 'perfect';
    if (s.rating === 'good') return 'good';
    if (s.rating === 'ok') return 'ok';
    if (s.offsetMs != null && s.offsetMs < 0) return 'early';
    if (s.offsetMs != null && s.offsetMs > 0) return 'late';
    return 'hit';
  }
  return 'pending';
}

/** Convert scheduled events to highway notes using musical time (beat → ms at BPM). */
export function scheduledToHighwayNotes(
  scheduled: ScheduledEvent[],
  bpm: number
): HighwayNote[] {
  return scheduled.map((s) => ({
    eventId: s.event.id,
    instrument: s.event.instrument,
    expectedMusicalMs: absoluteBeatToMs(s.absoluteBeat, bpm),
    state: toHighwayState(s),
  }));
}

/**
 * progress = (eventTime - currentMusicalTime) / visualLeadTime
 * 1 → far end (entry), 0 → HIT LINE, <0 → past hit line
 * Maps to CSS top%: 0% = top (far), ~85% = hit line.
 */
export function noteTopPercent(progress: number): number {
  const hitLinePct = 85;
  // progress 1 → 0%, progress 0 → hitLinePct, progress -trail/lead → 100%
  const trailProgress = VISUAL_TRAIL_MS / VISUAL_LEAD_MS;
  const clamped = Math.max(-trailProgress, Math.min(1, progress));
  if (clamped >= 0) {
    return (1 - clamped) * hitLinePct;
  }
  return hitLinePct + (-clamped / trailProgress) * (100 - hitLinePct);
}

function stateClass(state: HighwayNoteState): string {
  switch (state) {
    case 'perfect':
      return 'ring-2 ring-success-400 scale-110 opacity-100';
    case 'good':
    case 'ok':
    case 'hit':
    case 'early':
    case 'late':
      return 'ring-2 ring-accent-400 scale-105 opacity-100';
    case 'missed':
      return 'ring-2 ring-error-500 opacity-40 scale-90';
    default:
      return 'opacity-95';
  }
}

export function NoteHighway({
  notes,
  musicalTimeMs,
  visualLeadMs = VISUAL_LEAD_MS,
  activeInstruments,
  countdown,
}: {
  notes: HighwayNote[];
  /** Authoritative musical elapsed ms (may be negative during count-in). */
  musicalTimeMs: number;
  visualLeadMs?: number;
  activeInstruments?: DrumInstrument[];
  countdown?: number | null;
}) {
  const lanes = useMemo(() => {
    if (activeInstruments && activeInstruments.length > 0) {
      const set = new Set(activeInstruments);
      return LANE_ORDER.filter((i) => set.has(i));
    }
    const present = new Set(notes.map((n) => n.instrument));
    const filtered = LANE_ORDER.filter((i) => present.has(i));
    return filtered.length > 0 ? filtered : (['kick', 'snare', 'closedHat'] as DrumInstrument[]);
  }, [notes, activeInstruments]);

  const visible = notes.filter((n) => {
    const progress = (n.expectedMusicalMs - musicalTimeMs) / visualLeadMs;
    return progress <= 1.05 && progress >= -(VISUAL_TRAIL_MS / visualLeadMs);
  });

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-xl border border-ink-700/60 bg-ink-900/80 overflow-hidden mb-6 select-none">
      {/* lane columns */}
      <div className="absolute inset-0 flex">
        {lanes.map((lane) => (
          <div
            key={lane}
            className="flex-1 border-r border-ink-800/80 last:border-r-0 relative"
          >
            <div className="absolute inset-x-0 top-0 bottom-[15%] bg-gradient-to-b from-ink-950/40 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* HIT LINE — fixed */}
      <div
        className="absolute left-0 right-0 z-20 pointer-events-none"
        style={{ top: '85%' }}
      >
        <div className="h-0.5 bg-accent-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
        <div className="absolute -top-3 left-2 text-[10px] font-bold tracking-widest text-accent-400/90">
          HIT LINE
        </div>
      </div>

      {/* notes */}
      {visible.map((n) => {
        const laneIndex = lanes.indexOf(n.instrument);
        if (laneIndex < 0) return null;
        const progress = (n.expectedMusicalMs - musicalTimeMs) / visualLeadMs;
        const top = noteTopPercent(progress);
        const widthPct = 100 / lanes.length;
        const left = laneIndex * widthPct + widthPct / 2;
        return (
          <div
            key={n.eventId}
            className={`absolute z-10 w-5 h-5 sm:w-6 sm:h-6 -ml-2.5 sm:-ml-3 -mt-2.5 sm:-mt-3 rounded-full ${LANE_COLORS[n.instrument]} ${stateClass(n.state)} transition-[box-shadow,transform,opacity] duration-75`}
            style={{ top: `${top}%`, left: `${left}%` }}
            title={`${n.instrument} @ ${(n.expectedMusicalMs / 1000).toFixed(2)}s`}
          />
        );
      })}

      {/* lane labels under hit line */}
      <div className="absolute left-0 right-0 bottom-0 h-[15%] flex z-30 bg-ink-950/70 border-t border-ink-700/50">
        {lanes.map((lane) => (
          <div
            key={lane}
            className="flex-1 flex items-center justify-center text-[10px] sm:text-xs font-bold tracking-wide text-ink-300"
          >
            {LANE_LABELS[lane]}
          </div>
        ))}
      </div>

      {countdown != null && countdown > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink-950/30 pointer-events-none">
          <div className="text-6xl font-bold text-accent-400 font-mono drop-shadow-lg">
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}