import test from "node:test";
import assert from "node:assert/strict";
import {
  BOIL_TEMPERATURE, FILL_RATE, FULL_KETTLE_BOIL_TIME, HEAT_POWER,
  KETTLE_CAPACITY, OPERATION_SPEED_SCALE, POT_BUSY_TIME, ROOM_TEMPERATURE,
  frameDeltaSeconds
} from "./timing.js";

test("filling retains its existing 1.15x speed", () => {
  const fillSpeedRatio = FILL_RATE / .25;

  assert.equal(OPERATION_SPEED_SCALE, 1.15);
  assert.ok(Math.abs(fillSpeedRatio - OPERATION_SPEED_SCALE) < 1e-12);
});

test("20 C and 1.2 L reaches the boil in six game seconds", () => {
  const boilTime = (BOIL_TEMPERATURE - ROOM_TEMPERATURE) * KETTLE_CAPACITY / HEAT_POWER;
  assert.equal(FULL_KETTLE_BOIL_TIME, 6);
  assert.ok(Math.abs(boilTime - FULL_KETTLE_BOIL_TIME) < 1e-12);
  assert.ok(Math.abs(HEAT_POWER - 15.9) < 1e-12);
  assert.equal(HEAT_POWER / .6, 2 * (HEAT_POWER / 1.2));
});

test("a served pot returns in six game seconds", () => {
  assert.equal(POT_BUSY_TIME, 6);
});

test("a frame timestamp preceding start or resume never produces negative time", () => {
  assert.equal(frameDeltaSeconds(1000, 1001.7), 0);
  assert.equal(frameDeltaSeconds(1000, 1000), 0);
  assert.equal(frameDeltaSeconds(1016, 1000), .016);
  assert.equal(frameDeltaSeconds(10000, 1000), .05);
});
