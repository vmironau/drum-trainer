import { useEffect, useState, useCallback } from 'react';
import { Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { requestMidiAccess, type MidiAccess, type MidiInputDevice } from '../midi/midiAccess';

export function MidiScreen() {
  const [access, setAccess] = useState<MidiAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<MidiInputDevice[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const acc = await requestMidiAccess();
      setAccess(acc);
      setDevices(acc.inputs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to access MIDI');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-ink-700/50 flex items-center justify-center">
          <Settings className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-50">MIDI Devices</h1>
          <p className="text-ink-400 text-sm">Available MIDI input devices</p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-700 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-error-500/10 border border-error-500/30 rounded-lg p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-error-400 font-medium text-sm">{error}</p>
            <p className="text-ink-400 text-sm mt-1">
              Make sure your browser supports Web MIDI (Chrome, Edge) and your drum
              kit is connected via USB.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-ink-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Scanning for MIDI devices...
        </div>
      )}

      {!loading && !error && devices.length === 0 && (
        <div className="bg-ink-800/60 border border-ink-700/50 rounded-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 text-ink-500 mx-auto mb-3" />
          <p className="text-ink-300 font-medium">No MIDI devices found</p>
          <p className="text-ink-400 text-sm mt-1">
            Connect your electronic drum kit via USB and click Refresh.
          </p>
        </div>
      )}

      {!loading && devices.length > 0 && (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center gap-4 bg-ink-800/60 border border-ink-700/50 rounded-lg p-4"
            >
              <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />
              <div>
                <p className="text-ink-50 font-medium">{device.name}</p>
                <p className="text-ink-400 text-sm">{device.manufacturer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
