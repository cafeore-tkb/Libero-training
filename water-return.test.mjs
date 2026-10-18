import test from "node:test";
import assert from "node:assert/strict";
import { planWaterReturn } from "./water-return.js";

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

test("heating and full kettles are blocked with a usable alternative", () => {
  const heating = planWaterReturn([0,1], pots, [kettle(.3,"heating"),kettle(.3,"filled")], 0);
  assert.equal(heating.canReturn, false);
  assert.deepEqual(heating.candidates, [1]);
  assert.match(heating.reason, /加熱.*K02/);
  const full = planWaterReturn([0,1], pots, [kettle(1.2,"ready"),kettle()], 0);
  assert.equal(full.canReturn, false);
  assert.match(full.reason, /450ml不足.*K02/);
});

test("exact capacity fits without allowing overfilling", () => {
  assert.equal(planWaterReturn([1], pots, [kettle(.75,"filled")], 0).canReturn, true);
  assert.equal(planWaterReturn([1], pots, [kettle(.751,"filled")], 0).canReturn, false);
});

test("no returned water is not confused with a busy queue", () => {
  assert.equal(planWaterReturn([0], pots, [kettle()], 0).pot, null);
  assert.match(planWaterReturn([0], pots, [kettle()], 0).reason, /返却待ち/);
  assert.match(planWaterReturn([], pots, [kettle()], 0).reason, /使用中/);
});
