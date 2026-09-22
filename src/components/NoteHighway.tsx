import { useEffect, useRef, useState } from 'react';
import type { DrumInstrument } from '../domain/DrumInstrument';
import type { ScheduledEvent } from '../domain/lessonTypes';
import type { LessonPhase } from '../domain/lessonTypes';

export interface NoteHighwayProps {
  scheduled: ScheduledEvent[];
  clockNow: () => number;
  performanceStartMs: number | null;
  phase: LessonPhase;
  visualLeadTimeMs: number;
  pastWindowMs: number;
  activeInstruments: DrumInstrument[];
}

interface VisibleNote {
  key: string;
  instrument: DrumInstrument;
  progress: number;
  state: ScheduledEvent['state'];
  rating?: string;
}

const LANE_COLORS: Record<DrumInstrument, string> = {
  kick: 'bg-accent-500',
  snare: 'bg-success-500',
  closedHat: 'bg-warning-500',
  openHat: 'bg-orange-400',
  tom1: 'bg-blue-400',
  tom2: 'bg-cyan-400',
  tom3: 'bg-teal-400',
  crash: 'bg-pink-400',
  ride: 'bg-purple-400',
};

const LANE_LABELS: Record<DrumInstrument, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  closedHat: 'HAT',
  openHat: 'OPEN',
  tom1: 'TOM1',
  tom2: 'TOM2',
  tom3: 'TOM3',
  crash: 'CRASH',
  ride: 'RIDE',
};

const STATE_STYLES: Record<string, string> = {
  pending: 'opacity-100',
  hit: 'opacity-60',
  missed: 'opacity-30',
};

const RATING_GLOW: Record<string, string> = {
  perfect: 'ring-2 ring-success-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]',
  good: 'ring-2 ring-accent-400 shadow-[0_0_10px_rgba(26,255,226,0.6)]',
  ok: 'ring-2 ring-warning-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]',
  miss: 'ring-2 ring-error-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]',
};

export function NoteHighway({
  scheduled,
  clockNow,
  performanceStartMs,
  phase,
  visualLeadTimeMs,
  pastWindowMs,
  activeInstruments,
}: NoteHighwayProps) {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== 'preview' && phase !== 'performance' && phase !== 'count_in') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase]);

  void tick;

  const now = clockNow();
  const isRunning = phase === 'preview' || phase === 'performance';
  const hasStart = performanceStartMs !== null;

  const visibleNotes: VisibleNote[] = [];
  if (isRunning && hasStart) {
    const start = performanceStartMs!;
    for (const s of scheduled) {
      const eventTime = s.expectedTimeMs;
      const elapsed = now - start;
      const timeUntil = eventTime - elapsed;
      if (timeUntil > visualLeadTimeMs) continue;
      if (timeUntil < -pastWindowMs) continue;
      const progress = timeUntil / visualLeadTimeMs;
      visibleNotes.push({
        key: s.event.id,
        instrument: s.event.instrument,
        progress,
        state: s.state,
        rating: s.rating,
      });
    }
  }

  const highwayHeight = 320;
  const hitLineY = highwayHeight - 40;
  const noteSize = 28;
  const laneCount = activeInstruments.length;
  const laneWidth = laneCount > 0 ? 100 / laneCount : 100;

  function noteY(progress: number): number {
    return hitLineY - progress * (hitLineY - 10);
  }

  function laneX(instrument: DrumInstrument): number {
    const idx = activeInstruments.indexOf(instrument);
    if (idx < 0) return 50;
    return idx * laneWidth + laneWidth / 2;
  }

  return (
    <div
      className="relative w-full rounded-xl border border-ink-700/50 bg-ink-900/80 overflow-hidden"
      style={{ height: highwayHeight }}
    >
      {/* Lane backgrounds */}
      <div className="absolute inset-0 flex">
        {activeInstruments.map((inst, i) => (
          <div
            key={inst}
            className="flex-1 border-r border-ink-800/60 last:border-r-0"
            style={{
              background:
                i % 2 === 0
                  ? 'rgba(26,31,51,0.3)'
                  : 'rgba(16,20,36,0.3)',
            }}
          />
        ))}
      </div>

      {/* Lane labels at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex" style={{ height: 28 }}>
        {activeInstruments.map((inst) => (
          <div
            key={inst}
            className="flex-1 flex items-center justify-center text-[10px] font-mono font-semibold text-ink-500 uppercase tracking-wide border-t border-ink-800/60"
          >
            {LANE_LABELS[inst]}
          </div>
        ))}
      </div>

      {/* Hit line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-accent-400/70"
        style={{ top: hitLineY, boxShadow: '0 0 10px rgba(26,255,226,0.3)' }}
      >
        <div className="absolute -top-2.5 left-2 text-[10px] font-mono font-bold text-accent-400/80 uppercase">
          HIT
        </div>
      </div>

      {/* Notes */}
      {visibleNotes.map((note) => {
        const x = laneX(note.instrument);
        const y = noteY(note.progress);
        const isHit = note.state === 'hit';
        const isMissed = note.state === 'missed';
        const colorClass = LANE_COLORS[note.instrument] ?? 'bg-ink-400';
        const glowClass = isHit && note.rating ? RATING_GLOW[note.rating] ?? '' : '';
        const stateClass = STATE_STYLES[note.state] ?? 'opacity-100';

        return (
          <div
            key={note.key}
            className={`absolute rounded-full ${colorClass} ${stateClass} ${glowClass} transition-opacity duration-150`}
            style={{
              left: `calc(${x}% - ${noteSize / 2}px)`,
              top: y,
              width: noteSize,
              height: noteSize,
              filter: isMissed ? 'grayscale(1)' : 'none',
              transform: isHit ? 'scale(0.7)' : 'scale(1)',
              transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
            }}
          />
        );
      })}

      {/* Empty state */}
      {!isRunning && phase !== 'count_in' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-ink-500 text-sm">
            {phase === 'ready' ? 'Press Preview or Start to see the note highway' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
