import test from "node:test";
import assert from "node:assert/strict";
import { createServiceCounts, orderStageKey, evaluateService, achievementLabel, serviceRank } from "./evaluation.js";

const order = elapsed => ({ max: 66, time: Math.max(0, 66 - elapsed), stageDurations: [30, 21, 15], overdue: elapsed >= 66 });
const evaluate = (counts, pending = []) => evaluateService({ ...createServiceCounts(), ...counts }, pending);

test("the four stages change at their actual boundaries", () => {
  for (const [elapsed, expected] of [[0,"on-time"],[29.99,"on-time"],[30,"delayed"],[50.99,"delayed"],[51,"critical"],[65.99,"critical"],[66,"overdue"],[80,"overdue"]]) {
    assert.equal(orderStageKey(order(elapsed)), expected);
  }
  assert.equal(orderStageKey({ max: 38, time: 21, stageDurations: [17,12,9], overdue: false }), "delayed");
});

test("no delivery cannot produce a 100% achievement or S rank", () => {
  assert.equal(evaluate({}).percentage, null);
  assert.equal(evaluate({}, [order(2)]).percentage, null);
  assert.equal(serviceRank(null), null);
  assert.equal(achievementLabel(null), "未評価");
  assert.equal(evaluate({}, [order(31)]).percentage, 0);
  assert.equal(evaluate({}, [order(66)]).percentage, 0);
});

test("deliveries earn 100, 50, 10 or 0 percent according to stage", () => {
  for (const [stage, expected] of [["on-time",100],["delayed",50],["critical",10],["overdue",0]]) {
    assert.equal(evaluate({ [stage]: 1 }).percentage, expected);
  }
  assert.equal(evaluate({ "on-time": 1, delayed: 1, critical: 1, overdue: 1 }).percentage, 40);
});

test("each unserved late request counts, rather than a single shared blocked timer", () => {
  assert.equal(evaluate({ "on-time": 1 }, [order(66)]).percentage, 50);
  assert.equal(evaluate({ "on-time": 1 }, [order(66),order(66),order(66)]).percentage, 25);
});

test("recovery replaces one pending entry; it neither double-counts nor forgives the delay", () => {
  const before = evaluate({ "on-time": 1 }, [order(66)]);
  const after = evaluate({ "on-time": 1, overdue: 1 });
  assert.equal(before.percentage, after.percentage);
  assert.equal(before.evaluated, after.evaluated);
  assert.equal(evaluate({ "on-time": 1, delayed: 1 }).percentage, 75);
});

test("fresh end-of-shift requests remain ungraded while unserved late ones lower the final result", () => {
  assert.deepEqual(evaluate({ "on-time": 1 }, [order(1),order(35)]), {
    percentage: 50, completed: 1, evaluated: 2, unserved: 1, grace: 1
  });
  assert.equal(evaluate({ "on-time": 1 }, [order(1)]).percentage, 100);
});

test("rank boundaries cover the full achievement range without collapsing failures into C", () => {
  for (const [value, rank] of [[100,"S"],[99.99,"A"],[95,"A"],[94.99,"B"],[85,"B"],[84.99,"C"],[70,"C"],[69.99,"D"],[50,"D"],[49.99,"F"],[0,"F"]]) {
    assert.equal(serviceRank(value), rank);
  }
  assert.equal(achievementLabel(94.999), "94.9%");
  assert.equal(achievementLabel(100), "100%");
  assert.deepEqual(createServiceCounts(), { "on-time": 0, delayed: 0, critical: 0, overdue: 0 });
});

test("only a fully on-time run earns S; a single late or unserved request lowers the rank", () => {
  assert.equal(serviceRank(evaluate({ "on-time": 10 }).percentage), "S");
  assert.equal(evaluate({ "on-time": 9, delayed: 1 }).percentage, 95);
  assert.equal(serviceRank(evaluate({ "on-time": 9, delayed: 1 }).percentage), "A");
  assert.equal(serviceRank(evaluate({ "on-time": 9, critical: 1 }).percentage), "B");
  assert.equal(serviceRank(evaluate({ "on-time": 9, overdue: 1 }).percentage), "B");
  assert.equal(serviceRank(evaluate({ "on-time": 9 }, [order(66)]).percentage), "B");
  assert.equal(serviceRank(evaluate({ "on-time": 999, delayed: 1 }).percentage), "A");
});
