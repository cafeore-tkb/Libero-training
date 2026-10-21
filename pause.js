// Independent reasons prevent closing settings from resuming a paused shift.
export function createPauseController({ onPause = () => {}, onResume = () => {} } = {}) {
  const reasons = new Set();
  return {
    get paused() { return reasons.size > 0; },
    pause(reason) {
      const wasPaused = reasons.size > 0;
      reasons.add(reason);
      if (!wasPaused) onPause();
    },
    resume(reason) {
      if (reasons.delete(reason) && reasons.size === 0) onResume();
    },
    clear() { reasons.clear(); }
  };
}
