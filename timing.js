export const OPERATION_SPEED_SCALE = 1.15;
export const ROOM_TEMPERATURE = 20;
export const BOIL_TEMPERATURE = 99.5;
export const KETTLE_CAPACITY = 1.2;
export const FULL_KETTLE_BOIL_TIME = 6;

// One observed minute is represented by roughly one game second. A full 1.2 L
// kettle heated from 20 C reaches the boil in six minutes in the real workflow.
export const FILL_RATE = .25 * OPERATION_SPEED_SCALE;
export const HEAT_POWER = (BOIL_TEMPERATURE - ROOM_TEMPERATURE) * KETTLE_CAPACITY / FULL_KETTLE_BOIL_TIME;
export const POT_BUSY_TIME = 6;
export const POT_PRESENTATION_TIME = .7 / OPERATION_SPEED_SCALE;
export const POUR_ANIMATION_RATE = 1.5 * OPERATION_SPEED_SCALE;
export const RETURN_ANIMATION_RATE = 1.6 * OPERATION_SPEED_SCALE;

// rAF's timestamp can precede a performance.now() recorded by a start/resume event.
export function frameDeltaSeconds(now, previous) {
  return Math.min(.05, Math.max(0, (now - previous) / 1000));
}
