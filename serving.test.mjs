import test from "node:test";
import assert from "node:assert/strict";
import { findServingQueueIndex, pourAvailableWater, mostUrgentOrder } from "./serving.js";

const empty = index => ({ index, water: 0, temp: 22, busyTime: 0, assignedDripper: null });

test("the least remaining time wins, without reordering the order queue", () => {
  const orders = [{ id: 1, dripper: 0, time: 30 }, { id: 2, dripper: 2, time: 7 }, { id: 3, dripper: 1, time: 20 }];
  assert.equal(mostUrgentOrder(orders), orders[1]);
  assert.deepEqual(orders.map(order => order.id), [1, 2, 3]);
  assert.equal(mostUrgentOrder([]), null);
});

test("equal and overdue times prefer the earliest arrival", () => {
  const earlier = { id: 2, dripper: 1, time: 0, overdue: true };
  const later = { id: 4, dripper: 2, time: 0, overdue: true };
  assert.equal(mostUrgentOrder([later, { id: 1, dripper: 0, time: 1 }, earlier]), earlier);
  assert.equal(mostUrgentOrder([{ id: 8, time: 12 }, { id: 3, time: 12 }]).id, 3);
});

test("an urgent order tops up its own pot, without stealing another dripper's pot", () => {
  const pots = [empty(0), { ...empty(1), water: .3, assignedDripper: 1 }, { ...empty(2), water: .4, assignedDripper: 2 }];
  const orders = [{ id: 1, dripper: 1, time: 30 }, { id: 2, dripper: 2, time: 5 }];
  const urgent = mostUrgentOrder(orders);
  assert.equal(findServingQueueIndex([0, 1, 2], pots, urgent.dripper), 2);
  assert.equal(findServingQueueIndex([1], pots, urgent.dripper), -1);
  orders.splice(1, 1);
  assert.equal(mostUrgentOrder(orders).dripper, 1);
});

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
