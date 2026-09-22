import { useEffect, useState, useRef, useCallback } from 'react';
import { Drum, AlertCircle, Trash2 } from 'lucide-react';
import { requestMidiAccess, type MidiAccess } from '../midi/midiAccess';
import type { DrumHit } from '../domain/DrumHit';
import { TestDrumInput } from '../test/testDrumInput';

const INSTRUMENT_LABELS: Record<string, string> = {
  kick: 'Kick',
  snare: 'Snare',
  closedHat: 'Closed Hat',
  openHat: 'Open Hat',
  tom1: 'Tom 1',
  tom2: 'Tom 2',
  tom3: 'Tom 3',
  crash: 'Crash',
  ride: 'Ride',
};

const INSTRUMENT_COLORS: Record<string, string> = {
  kick: 'text-rose-400',
  snare: 'text-amber-400',
  closedHat: 'text-cyan-400',
  openHat: 'text-sky-400',
  tom1: 'text-violet-400',
  tom2: 'text-fuchsia-400',
  tom3: 'text-pink-400',
  crash: 'text-lime-400',
  ride: 'text-emerald-400',
};

export function DrumTestScreen() {
  const [access, setAccess] = useState<MidiAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<DrumHit[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const testInputRef = useRef<TestDrumInput | null>(null);

  const handleHit = useCallback((hit: DrumHit) => {
    setHits((prev) => [hit, ...prev].slice(0, 20));
  }, []);

  // Initialize MIDI
  useEffect(() => {
    (async () => {
      try {
        const acc = await requestMidiAccess();
        setAccess(acc);
        if (acc.inputs.length > 0) {
          setSelectedDevice(acc.inputs[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to access MIDI');
      }
    })();

    // Test input always available
    testInputRef.current = new TestDrumInput();
    const unsub = testInputRef.current.subscribe(handleHit);
    return () => {
      unsub();
      unsubscribeRef.current?.();
    };
  }, [handleHit]);

  // Subscribe to selected MIDI device
  useEffect(() => {
    unsubscribeRef.current?.();
    if (access && selectedDevice) {
      unsubscribeRef.current = access.listen(selectedDevice, handleHit);
    }
    return () => unsubscribeRef.current?.();
  }, [access, selectedDevice, handleHit]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-ink-700/50 flex items-center justify-center">
          <Drum className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Drum Test</h1>
          <p className="text-ink-400 text-sm">Hit a pad to see the instrument and velocity</p>
        </div>
        {hits.length > 0 && (
          <button
            onClick={() => setHits([])}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-700 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-error-500/10 border border-error-500/30 rounded-lg p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-error-400 font-medium text-sm">{error}</p>
            <p className="text-ink-400 text-sm mt-1">
              You can still use the test buttons below.
            </p>
          </div>
        </div>
      )}

      {access && access.inputs.length > 0 && (
        <div className="mb-6">
          <label className="text-ink-400 text-sm block mb-2">MIDI Input</label>
          <select
            value={selectedDevice ?? ''}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-ink-100 text-sm w-full"
          >
            {access.inputs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Test drum pads */}
      <div className="mb-6">
        <p className="text-ink-400 text-sm mb-3">Test Pads (click to simulate hits)</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(['kick', 'snare', 'closedHat', 'openHat', 'tom1', 'tom2', 'tom3', 'crash', 'ride'] as const).map((inst) => (
            <button
              key={inst}
              onClick={() => testInputRef.current?.hit(inst)}
              className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 text-center hover:border-accent-500/40 hover:bg-ink-800 transition-all active:scale-95"
            >
              <span className={`text-sm font-medium ${INSTRUMENT_COLORS[inst]}`}>
                {INSTRUMENT_LABELS[inst]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hit log */}
      <div className="space-y-2">
        {hits.length === 0 && (
          <div className="text-ink-500 text-sm text-center py-8">
            No hits yet. Play your kit or tap a test pad above.
          </div>
        )}
        {hits.map((hit, i) => (
          <div
            key={`${hit.timestamp}-${i}`}
            className="flex items-center gap-4 bg-ink-800/60 border border-ink-700/50 rounded-lg p-3 animate-hit-flash"
          >
            <div className={`text-lg font-bold ${INSTRUMENT_COLORS[hit.instrument] ?? 'text-ink-100'}`}>
              {INSTRUMENT_LABELS[hit.instrument] ?? hit.instrument}
            </div>
            <div className="text-ink-400 text-sm font-mono">
              velocity {hit.velocity}
            </div>
            <div className="text-ink-600 text-xs font-mono ml-auto">
              {Math.round(hit.timestamp)}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
