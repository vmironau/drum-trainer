export interface MusicalClock {
  now: () => number;
  start: () => void;
  stop: () => void;
  restart: () => void;
  isRunning: () => boolean;
  startTime: () => number | null;
}

export function createMusicalClock(
  nowFn: () => number = performance.now
): MusicalClock {
  let startTime: number | null = null;
  let running = false;

  return {
    now: () => nowFn(),
    start: () => {
      if (running) return;
      startTime = nowFn();
      running = true;
    },
    stop: () => {
      running = false;
    },
    restart: () => {
      startTime = nowFn();
      running = true;
    },
    isRunning: () => running,
    startTime: () => startTime,
  };
}
