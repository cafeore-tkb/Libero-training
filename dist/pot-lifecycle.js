export function emptyCoffeePotState() {
  return {
    water: 0, temp: 22, waterLevel: 0, flash: 0, returnAnim: 0,
    busyTime: 0, presentationTime: 0, assignedDripper: null, returnPending: false
  };
}

// A timer alone must never manufacture returned water in a new shift.
export function advancePotLifecycle(pot, seconds, random = Math.random) {
  seconds = Math.max(0, seconds);
  pot.flash = Math.max(0, pot.flash - seconds * .8);
  pot.presentationTime = Math.max(0, pot.presentationTime - seconds);
  const wasBusy = pot.busyTime > 0;
  pot.busyTime = Math.max(0, pot.busyTime - seconds);
  if (wasBusy && pot.busyTime <= 0 && pot.returnPending) {
    pot.returnPending = false;
    pot.assignedDripper = null;
    pot.water = Math.round((.4 + random() * .1) * 100) / 100;
    pot.temp = Math.max(22, pot.temp - (6 + random() * 4));
    pot.flash = 1;
    return true;
  }
  if (!wasBusy && pot.water > 0) pot.temp = Math.max(22, pot.temp - .18 * seconds);
  return false;
}
