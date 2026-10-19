import test from "node:test";
import assert from "node:assert/strict";
import { FILL_RATE, HEAT_POWER, OPERATION_SPEED_SCALE, POT_BUSY_TIME } from "./timing.js";

test("filling, heating and pot return each run at 1.15x speed", () => {
  const fillSpeedRatio = FILL_RATE / .25;
  const heatSpeedRatio = HEAT_POWER / 13.8;
  const returnSpeedRatio = 7 / POT_BUSY_TIME;

  assert.equal(OPERATION_SPEED_SCALE, 1.15);
  assert.ok(Math.abs(fillSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
  assert.ok(Math.abs(heatSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
  assert.ok(Math.abs(returnSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
});
