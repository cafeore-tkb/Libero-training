import test from "node:test";
import assert from "node:assert/strict";
import { findServingQueueIndex, pourAvailableWater } from "./serving.js";

const empty = index => ({ index, water: 0, temp: 22, busyTime: 0, assignedDripper: null });

test("available water is poured even when the kettle has less than 900ml", () => {
  const kettle = { water: .35, temp: 96, state: "ready", boilTime: 2 };
  const pot = empty(0);
  const result = pourAvailableWater(kettle, pot, 2);

  assert.deepEqual(result, { transferred: .35, remaining: .55, complete: false });
  assert.equal(kettle.water, 0);
  assert.equal(kettle.state, "empty");
  assert.equal(pot.water, .35);
  assert.equal(pot.temp, 96);
  assert.equal(pot.assignedDripper, 2);
});

test("a later kettle tops up the same pot and completes it at 900ml", () => {
  const pot = { index: 0, water: .35, temp: 96, waterLevel: .35 / .9, busyTime: 0, assignedDripper: 2 };
  const kettle = { water: .7, temp: 100, state: "ready", boilTime: 0 };
  const result = pourAvailableWater(kettle, pot, 2);

  assert.deepEqual(result, { transferred: .55, remaining: 0, complete: true });
  assert.equal(pot.water, .9);
  assert.ok(Math.abs(pot.temp - ((.35 * 96 + .55 * 100) / .9)) < 1e-12);
  assert.equal(kettle.water, .15);
});

test("each dripper keeps its own in-progress pot while empty pots remain shared", () => {
  const pots = [
    empty(0),
    { index: 1, water: .4, temp: 95, busyTime: 0, assignedDripper: 3 },
    { index: 2, water: .45, temp: 70, busyTime: 0, assignedDripper: null }
  ];
  assert.equal(findServingQueueIndex([2,0,1], pots, 3), 2);
  assert.equal(findServingQueueIndex([2,0,1], pots, 1), 1);
});
