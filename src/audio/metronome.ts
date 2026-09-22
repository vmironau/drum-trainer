export interface MetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  bars: number;
  countInBars?: number;
  onBeat?: (bar: number, beat: number) => void;
  onComplete?: () => void;
  onCountdownBeat?: (beatNumber: number) => void;
}

export class Metronome {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private timeoutIds: number[] = [];
  private running = false;
  private opts: MetronomeOptions;

  constructor(opts: MetronomeOptions) {
    this.opts = opts;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    const msPerBeat = 60000 / this.opts.bpm;
    const countInBars = this.opts.countInBars ?? 1;
    const countInBeats = countInBars * this.opts.beatsPerBar;
    const totalLessonBeats = this.opts.bars * this.opts.beatsPerBar;
    const now = this.audioCtx.currentTime;

    // Schedule count-in beats
    for (let i = 0; i < countInBeats; i++) {
      const time = now + (i * msPerBeat) / 1000;
      this.scheduleClick(time, i === 0, true);
      if (this.opts.onCountdownBeat) {
        const remaining = countInBeats - i;
        const id = window.setTimeout(
          () => this.opts.onCountdownBeat?.(remaining),
          (time - now) * 1000
        );
        this.timeoutIds.push(id);
      }
    }

    // Schedule lesson beats
    for (let i = 0; i < totalLessonBeats; i++) {
      const time = now + ((countInBeats + i) * msPerBeat) / 1000;
      const beatInBar = i % this.opts.beatsPerBar;
      const bar = Math.floor(i / this.opts.beatsPerBar) + 1;
      const beat = beatInBar + 1;
      this.scheduleClick(time, beatInBar === 0, false);
      if (this.opts.onBeat) {
        const id = window.setTimeout(
          () => this.opts.onBeat?.(bar, beat),
          (time - now) * 1000
        );
        this.timeoutIds.push(id);
      }
    }

    // Schedule completion
    const totalTime = (countInBeats + totalLessonBeats) * msPerBeat;
    const id = window.setTimeout(() => {
      this.opts.onComplete?.();
      this.stop();
    }, totalTime);
    this.timeoutIds.push(id);
  }

  private scheduleClick(time: number, isDownbeat: boolean, isCountIn: boolean): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = isDownbeat ? 1200 : 800;
    if (isCountIn && !isDownbeat) osc.frequency.value = 600;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  stop(): void {
    this.running = false;
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.timeoutIds = [];
  }

  get isRunning(): boolean {
    return this.running;
  }

  dispose(): void {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
