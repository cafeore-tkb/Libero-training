import test from "node:test";
import assert from "node:assert/strict";
import { FILL_RATE, HEAT_POWER, OPERATION_TIME_SCALE, POT_BUSY_TIME } from "./timing.js";

test("filling, heating and pot return each take 15% longer", () => {
  const fillRatio = (.9 / FILL_RATE) / (.9 / .25);
  const heatRatio = ((100 - 22) * .9 / HEAT_POWER) / ((100 - 22) * .9 / 13.8);
  const returnRatio = POT_BUSY_TIME / 7;

  assert.equal(OPERATION_TIME_SCALE, 1.15);
  assert.ok(Math.abs(fillRatio - OPERATION_TIME_SCALE) < 1e-12);
  assert.ok(Math.abs(heatRatio - OPERATION_TIME_SCALE) < 1e-12);
  assert.ok(Math.abs(returnRatio - OPERATION_TIME_SCALE) < 1e-12);
});
