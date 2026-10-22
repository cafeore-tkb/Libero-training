import test from "node:test";
import assert from "node:assert/strict";
import { FILL_RATE, HEAT_POWER, HEATING_TIME_SCALE, OPERATION_SPEED_SCALE, POT_BUSY_TIME, frameDeltaSeconds } from "./timing.js";

test("filling and pot return retain their existing 1.15x speed", () => {
  const fillSpeedRatio = FILL_RATE / .25;
  const returnSpeedRatio = 7 / POT_BUSY_TIME;

  assert.equal(OPERATION_SPEED_SCALE, 1.15);
  assert.ok(Math.abs(fillSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
  assert.ok(Math.abs(returnSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
});

test("heating takes 1.15x as long, with constant power and water-dependent warming", () => {
  const previousPower = 13.8 * OPERATION_SPEED_SCALE;
  assert.equal(HEATING_TIME_SCALE, 1.15);
  for (const water of [.3, .9, 1.2]) {
    for (const startTemperature of [22, 75, 95]) {
      const previousTime = (99.5 - startTemperature) * water / previousPower;
      const nextTime = (99.5 - startTemperature) * water / HEAT_POWER;
      assert.ok(Math.abs(nextTime / previousTime - 1.15) < 1e-12);
    }
  }
  assert.ok(Math.abs(HEAT_POWER - 13.8) < 1e-12);
  assert.equal(HEAT_POWER / .6, 2 * (HEAT_POWER / 1.2));
});

test("a frame timestamp preceding start or resume never produces negative time", () => {
  assert.equal(frameDeltaSeconds(1000, 1001.7), 0);
  assert.equal(frameDeltaSeconds(1000, 1000), 0);
  assert.equal(frameDeltaSeconds(1016, 1000), .016);
  assert.equal(frameDeltaSeconds(10000, 1000), .05);
});
