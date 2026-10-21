import test from "node:test";
import assert from "node:assert/strict";
import { emptyCoffeePotState, advancePotLifecycle } from "./pot-lifecycle.js";

test("all eight pots start independently empty with no pending return", () => {
  const pots = Array.from({ length: 8 }, emptyCoffeePotState);
  assert.ok(pots.every(p => p.water === 0 && p.busyTime === 0 && p.returnPending === false && p.assignedDripper === null));
  pots[0].water = .5;
  assert.ok(pots.slice(1).every(p => p.water === 0));
});

test("waiting without serving never creates returned water", () => {
  const pot = emptyCoffeePotState();
  for (let i = 0; i < 3000; i++) assert.equal(advancePotLifecycle(pot, .05), false);
  assert.equal(pot.water, 0);
});

test("a stale timer cannot return a pot that was never served in this shift", () => {
  const pot = { ...emptyCoffeePotState(), busyTime: .01 };
  assert.equal(advancePotLifecycle(pot, .05), false);
  assert.equal(pot.water, 0);
});

test("negative elapsed time cannot resurrect an empty pot's return timer", () => {
  const pot = emptyCoffeePotState();
  assert.equal(advancePotLifecycle(pot, -.0017), false);
  assert.equal(pot.busyTime, 0);
  assert.equal(pot.presentationTime, 0);
  assert.equal(pot.flash, 0);
  assert.equal(advancePotLifecycle(pot, .016), false);
  assert.equal(pot.water, 0);
});

test("restart clears returned, in-progress and in-use states", () => {
  for (const old of [
    { water: .5, temp: 80, flash: 1, returnAnim: 1 },
    { water: .3, assignedDripper: 2 },
    { water: .9, busyTime: 4, presentationTime: 1, returnPending: true, assignedDripper: 1 }
  ]) {
    const pot = { ...emptyCoffeePotState(), ...old };
    Object.assign(pot, emptyCoffeePotState());
    assert.deepEqual(pot, emptyCoffeePotState());
    assert.equal(advancePotLifecycle(pot, 10), false);
    assert.equal(pot.water, 0);
  }
});

test("a served pot returns 400–500ml once and at a lower temperature", () => {
  for (const randomValue of [0, .5, 1]) {
    const pot = { ...emptyCoffeePotState(), water: .9, temp: 96, busyTime: 1, returnPending: true, assignedDripper: 2 };
    assert.equal(advancePotLifecycle(pot, .5, () => randomValue), false);
    assert.equal(pot.assignedDripper, 2);
    assert.equal(advancePotLifecycle(pot, .5, () => randomValue), true);
    assert.ok(pot.water >= .4 && pot.water <= .5);
    assert.ok(pot.temp >= 86 && pot.temp <= 90);
    assert.equal(pot.assignedDripper, null);
    assert.equal(pot.returnPending, false);
    const returnedWater = pot.water;
    assert.equal(advancePotLifecycle(pot, 1), false);
    assert.equal(pot.water, returnedWater);
  }
});
