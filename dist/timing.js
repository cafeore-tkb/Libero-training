export const OPERATION_TIME_SCALE = 1.15;

// Rates are divided by the time scale so the same work takes 15% longer.
export const FILL_RATE = .25 / OPERATION_TIME_SCALE;
export const HEAT_POWER = 13.8 / OPERATION_TIME_SCALE;
export const POT_BUSY_TIME = 7 * OPERATION_TIME_SCALE;
export const POT_PRESENTATION_TIME = .7 * OPERATION_TIME_SCALE;
export const POUR_ANIMATION_RATE = 1.5 / OPERATION_TIME_SCALE;
export const RETURN_ANIMATION_RATE = 1.6 / OPERATION_TIME_SCALE;
