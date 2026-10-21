import test from "node:test";
import assert from "node:assert/strict";
import { arrangePotQueue, potQueuePriority, potQueueLayout } from "./pot-queue.js";

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

test("returned pots have their own positions to the right of every kettle", () => {
  const pots = [
    { water: .45, assignedDripper: null },
    { water: 0, assignedDripper: null },
    { water: .3, assignedDripper: 2 },
    { water: .5, assignedDripper: null }
  ];
  const queue = arrangePotQueue([3, 2, 1, 0], pots);
  const layout = potQueueLayout(queue, pots);
  assert.deepEqual(queue, [1, 2, 3, 0]);
  assert.ok(layout.get(1)[0] < layout.get(2)[0] || layout.get(1)[1] < layout.get(2)[1]);
  assert.ok(layout.get(2)[0] < .45);
  assert.ok(layout.get(3)[0] > 4.45 + 1);
  assert.ok(layout.get(0)[0] > 4.45 + 1);

  // A partial recovery stays on the return side; an emptied pot rejoins supply.
  pots[3].water = .1;
  assert.deepEqual(potQueueLayout(queue, pots).get(3), layout.get(3));
  pots[3].water = 0;
  arrangePotQueue(queue, pots);
  assert.deepEqual(queue, [1, 3, 2, 0]);
  assert.ok(potQueueLayout(queue, pots).get(3)[0] < .45);
});

test("all eight returned pots fit distinct positions on the right", () => {
  const pots = Array.from({ length: 8 }, () => ({ water: .45, assignedDripper: null }));
  const queue = [7, 2, 4, 1, 6, 0, 5, 3];
  const layout = potQueueLayout(queue, pots);
  assert.deepEqual([...layout.keys()], queue);
  assert.equal(new Set([...layout.values()].map(position => position.join(","))).size, 8);
  assert.ok([...layout.values()].every(([x]) => x > 4.45 + 1));
});
