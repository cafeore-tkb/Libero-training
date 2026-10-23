import { ROOM_TEMPERATURE } from "./timing.js";

export const SERVING_TARGET = .9;
const EPSILON = 1e-9;
const roundLiters = value => Math.round(value * 1e6) / 1e6;

export function mostUrgentOrder(orders) {
  return orders.reduce((first, order) => {
    if (!first) return order;
    const remaining = order.overdue ? 0 : Math.max(0, order.time);
    const firstRemaining = first.overdue ? 0 : Math.max(0, first.time);
    return remaining < firstRemaining || (remaining === firstRemaining && order.id < first.id) ? order : first;
  }, null);
}

export function findServingQueueIndex(queue, pots, dripper) {
  const partialIndex = queue.findIndex(index => {
    const pot = pots[index];
    return pot.assignedDripper === dripper && pot.water > EPSILON && !(pot.busyTime > 0);
  });
  if (partialIndex >= 0) return partialIndex;
  return queue.findIndex(index => {
    const pot = pots[index];
    return pot.assignedDripper == null && pot.water <= EPSILON && !(pot.busyTime > 0);
  });
}

export function pourAvailableWater(kettle, pot, dripper) {
  const remaining = Math.max(0, SERVING_TARGET - pot.water);
  const transferred = roundLiters(Math.min(kettle.water, remaining));
  if (transferred <= EPSILON) return { transferred: 0, remaining: roundLiters(remaining), complete: false };

  const sourceTemp = kettle.temp;
  const mixedVolume = pot.water + transferred;
  pot.temp = pot.water > EPSILON ? ((pot.water * pot.temp) + (transferred * sourceTemp)) / mixedVolume : sourceTemp;
  pot.water = roundLiters(mixedVolume);
  pot.waterLevel = Math.min(1, pot.water / SERVING_TARGET);
  pot.assignedDripper = dripper;

  kettle.water = roundLiters(Math.max(0, kettle.water - transferred));
  kettle.temp = Math.max(ROOM_TEMPERATURE, kettle.temp - 8 * (transferred / SERVING_TARGET));
  kettle.state = kettle.water > EPSILON ? (kettle.temp >= 92 ? "ready" : "filled") : "empty";
  kettle.boilTime = 0;

  const complete = pot.water >= SERVING_TARGET - EPSILON;
  if (complete) {
    pot.water = SERVING_TARGET;
    pot.waterLevel = 1;
  }
  return { transferred, remaining: roundLiters(Math.max(0, SERVING_TARGET - pot.water)), complete };
}
