import type { DrumHit } from '../domain/DrumHit';
import { mapNoteToInstrument } from './mapping';

export type MidiInputListener = (hit: DrumHit) => void;

export interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiAccess {
  inputs: MidiInputDevice[];
  listen: (deviceId: string, listener: MidiInputListener) => () => void;
}

export async function requestMidiAccess(): Promise<MidiAccess> {
  const nav = navigator as Navigator & {
    requestMIDIAccess?: () => Promise<MIDIAccess>;
  };
  if (!nav.requestMIDIAccess) {
    throw new Error('Web MIDI API is not supported in this browser.');
  }
  const access = await nav.requestMIDIAccess();
  const listeners = new Map<string, Set<MidiInputListener>>();

  const refreshInputs = (): MidiInputDevice[] => {
    const result: MidiInputDevice[] = [];
    access.inputs.forEach((input: MIDIInput) => {
      result.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
      });
    });
    return result;
  };

  const getInputs = (): MidiInputDevice[] => refreshInputs();

  const listen = (deviceId: string, listener: MidiInputListener): (() => void) => {
    let set = listeners.get(deviceId);
    if (!set) {
      set = new Set();
      listeners.set(deviceId, set);
    }
    set.add(listener);

    const input = Array.from(access.inputs.values()).find(
      (i) => i.id === deviceId
    );
    if (input) {
      const handler = (e: MIDIMessageEvent) => {
        if (!e.data) return;
        const [status, note, velocity] = e.data;
        // Note-on (0x90-0x9F) with velocity > 0
        if (status >= 0x90 && status <= 0x9f && velocity > 0) {
          const instrument = mapNoteToInstrument(note);
          if (instrument) {
            const hit: DrumHit = {
              instrument,
              velocity,
              timestamp: performance.now(),
            };
            const ls = listeners.get(deviceId);
            if (ls) ls.forEach((l) => l(hit));
          }
        }
      };
      input.onmidimessage = handler;
    }

    return () => {
      const s = listeners.get(deviceId);
      if (s) {
        s.delete(listener);
        if (s.size === 0) {
          listeners.delete(deviceId);
          const inp = Array.from(access.inputs.values()).find(
            (i) => i.id === deviceId
          );
          if (inp) inp.onmidimessage = null;
        }
      }
    };
  };

  return { inputs: getInputs(), listen };
}
