import test from "node:test";
import assert from "node:assert/strict";
import { nextOrderDelay } from "./config.js";

test("death march queues orders faster than actual at every time slot", () => {
  for (const timeSlot of ["morning", "lunch", "afternoon", "closing"]) {
    for (const random of [0, .5, 1]) {
      const actualDelay = nextOrderDelay("actual", timeSlot, () => random);
      const deathMarchDelay = nextOrderDelay("death-march", timeSlot, () => random);
      assert.equal(deathMarchDelay, actualDelay * .75);
      assert.ok(deathMarchDelay < actualDelay);
    }
  }
});

test("other difficulties retain the time slot's existing order interval", () => {
  assert.equal(nextOrderDelay("easy", "morning", () => 0), 6);
  assert.equal(nextOrderDelay("hard", "morning", () => 1), 8);
  assert.equal(nextOrderDelay("actual", "lunch", () => .5), 3.75);
});
