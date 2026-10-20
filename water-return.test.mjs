import test from "node:test";
import assert from "node:assert/strict";
import { planWaterReturn, transferReturnedWater } from "./water-return.js";

const pots = [
  { index: 0, water: 0, busyTime: 0 },
  { index: 1, water: .45, busyTime: 0 },
  { index: 2, water: .5, busyTime: 0 },
  { index: 3, water: .9, busyTime: 4 }
];
const kettle = (water = 0, state = "empty") => ({ water, state });

test("empty pots at the front do not block the first returned pot", () => {
  const queue = [0,1,2];
  const result = planWaterReturn(queue, pots, [kettle()], 0);
  assert.equal(result.queueIndex, 1);
  assert.equal(result.pot.index, 1);
  assert.equal(result.canReturn, true);
  assert.deepEqual(queue, [0,1,2]);
});

test("returned pots are recovered in queue order and busy pots are never used", () => {
  assert.equal(planWaterReturn([0,2,1], pots, [kettle()], 0).pot.index, 2);
  assert.equal(planWaterReturn([3,0,1], pots, [kettle()], 0).pot.index, 1);
});

test("water being accumulated for an order is not mistaken for returned water", () => {
  const servingPots = [
    { index: 0, water: .35, busyTime: 0, assignedDripper: 2 },
    { index: 1, water: .45, busyTime: 0, assignedDripper: null }
  ];
  const result = planWaterReturn([0,1], servingPots, [kettle()], 0);
  assert.equal(result.pot.index, 1);
});

test("heating and completely full kettles are blocked with a usable alternative", () => {
  const heating = planWaterReturn([0,1], pots, [kettle(.3,"heating"),kettle(.3,"filled")], 0);
  assert.equal(heating.canReturn, false);
  assert.deepEqual(heating.candidates, [1]);
  assert.match(heating.reason, /加熱.*K02/);
  const full = planWaterReturn([0,1], pots, [kettle(1.2,"ready"),kettle()], 0);
  assert.equal(full.canReturn, false);
  assert.match(full.reason, /満水.*K02/);
});

test("insufficient capacity allows a partial return without overfilling", () => {
  const exact = planWaterReturn([1], pots, [kettle(.75,"filled")], 0);
  assert.equal(exact.canReturn, true);
  assert.equal(exact.transferAmount, .45);
  assert.equal(exact.remaining, 0);

  const partial = planWaterReturn([1], pots, [kettle(1,"filled")], 0);
  assert.equal(partial.canReturn, true);
  assert.ok(Math.abs(partial.transferAmount - .2) < 1e-12);
  assert.ok(Math.abs(partial.remaining - .25) < 1e-12);
  assert.match(partial.reason, /200mlを部分回収.*残り250ml/);
  assert.equal(planWaterReturn([1], pots, [kettle(1.2,"ready")], 0).canReturn, false);
});

test("a partial transfer preserves the remainder and mixes only the transferred water", () => {
  const target = { water: 1, temp: 80, state: "filled", boilTime: 3 };
  const returned = { water: .45, temp: 60, waterLevel: .5 };
  const result = transferReturnedWater(target, returned, .2);

  assert.deepEqual(result, { transferred: .2, remaining: .25, complete: false });
  assert.equal(target.water, 1.2);
  assert.ok(Math.abs(target.temp - 76.66666666666667) < 1e-12);
  assert.equal(target.boilTime, 0);
  assert.equal(returned.water, .25);
  assert.equal(returned.temp, 60);
  assert.ok(Math.abs(returned.waterLevel - .25 / .9) < 1e-12);
});

test("a complete transfer empties the pot", () => {
  const target = { water: .7, temp: 80, state: "filled", boilTime: 0 };
  const returned = { water: .45, temp: 60, waterLevel: .5 };
  const result = transferReturnedWater(target, returned, .45);

  assert.equal(result.complete, true);
  assert.equal(result.remaining, 0);
  assert.equal(target.water, 1.15);
  assert.equal(returned.water, 0);
  assert.equal(returned.temp, 22);
  assert.equal(returned.waterLevel, 0);
});

test("no returned water is not confused with a busy queue", () => {
  assert.equal(planWaterReturn([0], pots, [kettle()], 0).pot, null);
  assert.match(planWaterReturn([0], pots, [kettle()], 0).reason, /返却待ち/);
  assert.match(planWaterReturn([], pots, [kettle()], 0).reason, /使用中/);
});
