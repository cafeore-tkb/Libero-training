import test from "node:test";
import assert from "node:assert/strict";
import { serviceJudgment } from "./feedback.js";

test("PERFECT requires both on-time service and at least 96°C", () => {
  assert.equal(serviceJudgment("on-time", 96, false).title, "PERFECT");
  assert.equal(serviceJudgment("on-time", 95.99, false).title, "NICE FLOW");
  assert.equal(serviceJudgment("delayed", 100, false).title, "DELIVERED");
  assert.equal(serviceJudgment("critical", 100, false).title, "JUST IN TIME");
});

test("clearing the last overdue order celebrates recovery, not a perfect service", () => {
  assert.equal(serviceJudgment("overdue", 100, true).title, "RECOVERY");
  assert.equal(serviceJudgment("overdue", 100, false).title, "DELIVERED");
});
