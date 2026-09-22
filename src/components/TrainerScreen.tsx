import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, RotateCcw, ArrowLeft, AlertCircle, Eye, SkipForward } from 'lucide-react';
import { getLesson } from '../lessons/lessons';
import { createMusicalClock, type MusicalClock } from '../engine/musicalClock';
import { LessonEngine } from '../engine/lessonEngine';
import { Metronome } from '../audio/metronome';
import { requestMidiAccess } from '../midi/midiAccess';
import { TestDrumInput } from '../test/testDrumInput';
import type { DrumHit } from '../domain/DrumHit';
import type { DrumInstrument } from '../domain/DrumInstrument';
import type {
  EvaluatedPerformanceHit,
  LessonPhase,
  LessonStep,
  ScheduledEvent,
  StepResult,
} from '../domain/lessonTypes';
import { setLastSessionResult } from '../state/resultStore';
import type { Route } from '../router';
import { NoteHighway, scheduledToHighwayNotes } from './NoteHighway';

const RATING_COLORS: Record<string, string> = {
  perfect: 'text-success-400 bg-success-500/10 border-success-500/30',
  good: 'text-accent-400 bg-accent-500/10 border-accent-500/30',
  ok: 'text-warning-400 bg-warning-500/10 border-warning-500/30',
  miss: 'text-error-400 bg-error-500/10 border-error-500/30',
  extra: 'text-ink-300 bg-ink-700/40 border-ink-600/40',
};

const PADS: DrumInstrument[] = [
  'kick', 'snare', 'closedHat', 'openHat', 'tom1', 'tom2', 'tom3', 'crash', 'ride',
];

export function TrainerScreen({
  lessonIndex,
  navigate,
}: {
  lessonIndex: number;
  navigate: (r: Route) => void;
}) {
  const lesson = getLesson(lessonIndex);

  const [phase, setPhase] = useState<LessonPhase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [step, setStep] = useState<LessonStep>(lesson.steps[0]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentBar, setCurrentBar] = useState(1);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [durationMs, setDurationMs] = useState(1);
  const [recentHits, setRecentHits] = useState<DrumHit[]>([]);
  const [evaluatedHits, setEvaluatedHits] = useState<EvaluatedPerformanceHit[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledEvent[]>([]);
  const [accuracy, setAccuracy] = useState(100);
  const [misses, setMisses] = useState(0);
  const [stepResult, setStepResult] = useState<StepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpm] = useState(lesson.bpm);

  const engineRef = useRef<LessonEngine | null>(null);
  const clockRef = useRef<MusicalClock | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const midiUnsubRef = useRef<(() => void) | null>(null);
  const testInputRef = useRef<TestDrumInput | null>(null);

  const handleHit = useCallback((hit: DrumHit) => {
    setRecentHits((prev) => [hit, ...prev].slice(0, 5));
    engineRef.current?.registerHit(hit);
  }, []);

  useEffect(() => {
    clockRef.current = createMusicalClock();
    testInputRef.current = new TestDrumInput();
    const unsub = testInputRef.current.subscribe(handleHit);

    (async () => {
      try {
        const acc = await requestMidiAccess();
        if (acc.inputs.length > 0) {
          midiUnsubRef.current = acc.listen(acc.inputs[0].id, handleHit);
        }
      } catch {
        setError('No MIDI device detected. Use the test pads below to play.');
      }
    })();

    const engine = new LessonEngine(lesson, clockRef.current, {
      onPhaseChange: setPhase,
      onStepChange: (idx, s) => {
        setStepIndex(idx);
        setStep(s);
        setStepResult(null);
        setEvaluatedHits([]);
        setScheduled([]);
        setAccuracy(100);
        setMisses(0);
      },
      onBeat: (bar, beat) => {
        setCurrentBar(bar);
        setCurrentBeat(beat);
      },
      onPlayhead: (elapsed, duration) => {
        setPlayhead(elapsed);
        setDurationMs(Math.max(duration, 1));
        // Keep highway schedule in sync during count-in (before first evaluation).
        const eng = engineRef.current;
        if (eng) {
          const sched = eng.getScheduled();
          if (sched.length) setScheduled([...sched]);
        }
      },
      onCountdown: (remaining) => {
        setCountdown(remaining > 0 ? remaining : null);
      },
      onHit: () => {},
      onEvaluated: (ev, sched) => {
        setScheduled([...sched]);
        setEvaluatedHits((prev) => [...prev, ev].slice(-30));
        if (ev.rating === 'miss') setMisses((m) => m + 1);
        const scored = sched.filter((s) => s.state !== 'pending');
        if (scored.length === 0) {
          setAccuracy(100);
          return;
        }
        const weighted = scored.reduce((sum, s) => {
          if (s.rating === 'perfect') return sum + 100;
          if (s.rating === 'good') return sum + 75;
          if (s.rating === 'ok') return sum + 50;
          return sum;
        }, 0);
        setAccuracy(Math.round((weighted / (scored.length * 100)) * 1000) / 10);
      },
      onStepResult: (result) => {
        setStepResult(result);
        setAccuracy(result.accuracy);
        setMisses(result.missCount);
        metronomeRef.current?.stop();
      },
      onLessonComplete: (session) => {
        setLastSessionResult(session);
        metronomeRef.current?.stop();
        navigate({ name: 'result', resultIndex: lessonIndex });
      },
    });
    engineRef.current = engine;
    engine.prepare();

    return () => {
      unsub();
      midiUnsubRef.current?.();
      engine.stop();
      metronomeRef.current?.dispose();
    };
  }, [lesson, handleHit, lessonIndex, navigate]);

  const startMetronome = (bars: number) => {
    metronomeRef.current?.dispose();
    const metronome = new Metronome({
      bpm,
      beatsPerBar: step.arrangement.beatsPerBar,
      bars,
      countInBars: 1,
    });
    metronomeRef.current = metronome;
    metronome.start();
  };

  const onPreview = () => {
    setEvaluatedHits([]);
    setStepResult(null);
    engineRef.current?.setPlaybackBpm(bpm);
    engineRef.current?.preview();
    const sched = engineRef.current?.getScheduled() ?? [];
    setScheduled([...sched]);
    startMetronome(step.arrangement.bars);
  };

  const onStart = () => {
    setEvaluatedHits([]);
    setStepResult(null);
    setMisses(0);
    setAccuracy(100);
    engineRef.current?.setPlaybackBpm(bpm);
    engineRef.current?.startPerformance();
    const sched = engineRef.current?.getScheduled() ?? [];
    setScheduled([...sched]);
    startMetronome(step.arrangement.bars);
  };

  const onStop = () => {
    engineRef.current?.stop();
    metronomeRef.current?.stop();
    setCountdown(null);
  };

  const onRestart = () => {
    metronomeRef.current?.stop();
    engineRef.current?.restartStep();
    setCountdown(null);
    setEvaluatedHits([]);
    setStepResult(null);
    setPlayhead(0);
  };

  const onNextStep = () => {
    engineRef.current?.advanceAfterResult();
    setCountdown(null);
    setPlayhead(0);
  };

  const active =
    phase === 'preview' || phase === 'count_in' || phase === 'performance';
  const playheadPercent = Math.min(Math.max(playhead, 0) / durationMs * 100, 100);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <a
          href="#lessons"
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: 'lessons' });
          }}
          className="p-2 rounded-lg bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink-50">{lesson.title}</h1>
          <p className="text-ink-400 text-sm">
            Step {stepIndex + 1}/{lesson.steps.length}: {step.title} · {bpm} BPM ·{' '}
            {step.arrangement.bars} bars
          </p>
        </div>
      </div>

      {step.description && (
        <p className="text-ink-400 text-sm mb-4">{step.description}</p>
      )}

      {error && !active && (
        <div className="flex items-start gap-3 bg-warning-500/10 border border-warning-500/30 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-warning-400 flex-shrink-0 mt-0.5" />
          <p className="text-warning-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center">
          <p className="text-ink-500 text-xs uppercase tracking-wide mb-1">BPM</p>
          <input
            type="number"
            min={40}
            max={180}
            value={bpm}
            disabled={active}
            onChange={(e) => setBpm(Number(e.target.value) || lesson.bpm)}
            className="w-full bg-transparent text-center text-xl font-bold text-ink-50 font-mono outline-none"
          />
        </div>
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center">
          <p className="text-ink-500 text-xs uppercase tracking-wide mb-1">Bar</p>
          <p className="text-2xl font-bold text-ink-50 font-mono">
            {currentBar}/{step.arrangement.bars}
          </p>
        </div>
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center">
          <p className="text-ink-500 text-xs uppercase tracking-wide mb-1">Beat</p>
          <p className="text-2xl font-bold text-accent-400 font-mono">{currentBeat}</p>
        </div>
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center">
          <p className="text-ink-500 text-xs uppercase tracking-wide mb-1">Accuracy</p>
          <p className="text-2xl font-bold text-success-400 font-mono">{accuracy}%</p>
        </div>
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center">
          <p className="text-ink-500 text-xs uppercase tracking-wide mb-1">Phase</p>
          <p className="text-sm font-semibold text-ink-200 uppercase">{phase}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all duration-75"
            style={{ width: `${active || phase === 'result' ? playheadPercent : 0}%` }}
          />
        </div>
      </div>

      {(active || phase === 'ready' || phase === 'count_in' || phase === 'result') && (
        <NoteHighway
          notes={
            scheduled.length
              ? scheduledToHighwayNotes(scheduled, bpm)
              : scheduledToHighwayNotes(
                  step.arrangement.events.map((event) => ({
                    event,
                    absoluteBeat:
                      event.bar * step.arrangement.beatsPerBar + event.beat,
                    expectedTimeMs: 0,
                    state: 'pending' as const,
                  })),
                  bpm
                )
          }
          musicalTimeMs={
            phase === 'ready' || phase === 'idle' || phase === 'result' ? 0 : playhead
          }
          countdown={countdown}
        />
      )}

      {evaluatedHits.length > 0 && (
        <div className="mb-6">
          <p className="text-ink-400 text-xs uppercase tracking-wide mb-2">Recent Hits</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {evaluatedHits.slice().reverse().map((ev, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${RATING_COLORS[ev.rating] ?? RATING_COLORS.miss}`}
              >
                <span className="font-bold w-16 capitalize">{ev.rating}</span>
                <span className="text-ink-300">
                  {ev.expectedInstrument ?? '—'}
                  {ev.rating === 'extra' && ` (extra ${ev.actualInstrument})`}
                </span>
                {ev.offsetMs !== null && (
                  <span className="text-ink-500 font-mono ml-auto text-xs">
                    {ev.offsetMs > 0 ? '+' : ''}
                    {Math.round(ev.offsetMs)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && stepResult && (
        <div className="mb-6 rounded-xl border border-ink-700/50 bg-ink-800/60 p-4">
          <p className="text-ink-200 font-semibold mb-2">Step result: {stepResult.accuracy}%</p>
          <p className="text-ink-400 text-sm">
            Perfect {stepResult.perfectCount} · Good {stepResult.goodCount} · OK {stepResult.okCount} ·
            Miss {stepResult.missCount} · Extra {stepResult.extraHitCount}
          </p>
        </div>
      )}

      {(active || phase === 'ready') && (
        <div className="mb-6">
          <p className="text-ink-400 text-xs uppercase tracking-wide mb-2">Test Pads</p>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
            {PADS.map((inst) => (
              <button
                key={inst}
                type="button"
                onClick={() => testInputRef.current?.hit(inst)}
                className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-2 text-center hover:border-accent-500/40 hover:bg-ink-800 transition-all active:scale-95 text-xs font-medium text-ink-200"
              >
                {inst}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {phase === 'ready' && (
          <>
            <button
              type="button"
              onClick={onPreview}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-ink-700/50 text-ink-200 font-medium hover:bg-ink-700 transition-colors"
            >
              <Eye className="w-5 h-5" />
              Preview
            </button>
            <button
              type="button"
              onClick={onStart}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-500 text-ink-950 font-semibold hover:bg-accent-400 transition-colors"
            >
              <Play className="w-5 h-5" />
              Start
            </button>
          </>
        )}
        {active && (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-error-500 text-white font-semibold hover:bg-error-400 transition-colors"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-ink-700/50 text-ink-300 font-medium hover:bg-ink-700 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Restart step
        </button>
        {phase === 'result' && (
          <button
            type="button"
            onClick={onNextStep}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-500 text-ink-950 font-semibold hover:bg-accent-400 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
            {stepIndex >= lesson.steps.length - 1 ? 'Finish lesson' : 'Next step'}
          </button>
        )}
      </div>
    </div>
  );
}