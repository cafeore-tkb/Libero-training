export const OPERATION_SPEED_SCALE = 1.15;

// Rates increase and waits decrease so the same work completes 15% faster.
export const FILL_RATE = .25 * OPERATION_SPEED_SCALE;
export const HEAT_POWER = 13.8 * OPERATION_SPEED_SCALE;
export const POT_BUSY_TIME = 7 / OPERATION_SPEED_SCALE;
export const POT_PRESENTATION_TIME = .7 / OPERATION_SPEED_SCALE;
export const POUR_ANIMATION_RATE = 1.5 * OPERATION_SPEED_SCALE;
export const RETURN_ANIMATION_RATE = 1.6 * OPERATION_SPEED_SCALE;

// rAF's timestamp can precede a performance.now() recorded by a start/resume event.
export function frameDeltaSeconds(now, previous) {
  return Math.min(.05, Math.max(0, (now - previous) / 1000));
}
