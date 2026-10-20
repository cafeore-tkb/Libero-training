import test from "node:test";
import assert from "node:assert/strict";
import { arrangePotQueue, potQueuePriority } from "./pot-queue.js";

test("empty pots stay left, in-progress pots stay in the middle, and returned pots move right", () => {
  const pots = [
    { water: .45, assignedDripper: null },
    { water: 0, assignedDripper: null },
    { water: .3, assignedDripper: 2 },
    { water: 0, assignedDripper: null },
    { water: .5, assignedDripper: null },
    { water: .2, assignedDripper: 1 }
  ];
  const queue = [0,1,2,3,4,5];

  assert.deepEqual(arrangePotQueue(queue, pots), [1,3,2,5,0,4]);
  assert.deepEqual(queue, [1,3,2,5,0,4]);
});

test("queue order remains stable inside each group", () => {
  const pots = [
    { water: 0, assignedDripper: null },
    { water: 0, assignedDripper: null },
    { water: .4, assignedDripper: null },
    { water: .5, assignedDripper: null }
  ];
  assert.deepEqual(arrangePotQueue([1,3,0,2], pots), [1,0,3,2]);
  assert.equal(potQueuePriority(pots[0]), 0);
  assert.equal(potQueuePriority(pots[2]), 2);
});
