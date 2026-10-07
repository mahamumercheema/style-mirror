import { useEffect } from "react";

/**
 * Lets heavy work (pose analysis, try-on) pause the animated page background so it doesn't
 * compete for the GPU. Any number of callers can hold a pause at once.
 */
let pauseCount = 0;
const listeners = new Set<(paused: boolean) => void>();

function emit() {
  for (const listener of listeners) listener(pauseCount > 0);
}

/** Subscribes to pause changes; calls back immediately with the current state. */
export function onBackgroundPauseChange(listener: (paused: boolean) => void) {
  listeners.add(listener);
  listener(pauseCount > 0);
  return () => {
    listeners.delete(listener);
  };
}

/** Holds the background paused while `active` is true. */
export function useBackgroundPause(active: boolean) {
  useEffect(() => {
    if (!active) return;
    pauseCount++;
    emit();
    return () => {
      pauseCount--;
      emit();
    };
  }, [active]);
}
