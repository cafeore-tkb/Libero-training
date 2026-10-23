import test from "node:test";
import assert from "node:assert/strict";
import { PROGRESSION_STORAGE_KEY, qualifiesForDeathMarch, readProgression, unlockDeathMarchIfEligible } from "./progression.js";

const storage = value => ({ getItem: key => key === PROGRESSION_STORAGE_KEY ? value : null });

test("only a 100 percent ACTUAL clear qualifies for DEATH MARCH", () => {
  assert.equal(qualifiesForDeathMarch("actual", 100, "morning", 150), true);
  assert.equal(qualifiesForDeathMarch("actual", 99.999, "morning", 150), false);
  assert.equal(qualifiesForDeathMarch("actual", 100, "morning", 120), false);
  assert.equal(qualifiesForDeathMarch("death-march", 100, "morning", 150), false);
  assert.equal(qualifiesForDeathMarch("hard", 100, "morning", 150), false);
  assert.equal(qualifiesForDeathMarch("actual", null, "morning", 150), false);
  assert.equal(qualifiesForDeathMarch("actual", 100, null, 150), false);
});

test("the saved unlock is accepted only from valid versioned progression data", () => {
  assert.deepEqual(readProgression(storage('{"version":3,"deathMarchTimeSlots":["morning","closing","morning"]}')), { deathMarchTimeSlots: ["closing","morning"] });
  assert.deepEqual(readProgression(storage('{"version":2,"deathMarchDurations":[150]}')), { deathMarchTimeSlots: [] });
  assert.deepEqual(readProgression(storage('{broken')), { deathMarchTimeSlots: [] });
  assert.deepEqual(readProgression(storage(null)), { deathMarchTimeSlots: [] });
});

test("a qualifying LONG clear persists each time slot only once", () => {
  const writes = [];
  const writableStorage = { setItem: (key, value) => writes.push([key, value]) };
  assert.equal(unlockDeathMarchIfEligible("actual", 100, "morning", 120, writableStorage), false);
  assert.equal(unlockDeathMarchIfEligible("actual", 100, "morning", 150, writableStorage), true);
  assert.deepEqual(writes, [[PROGRESSION_STORAGE_KEY, '{"version":3,"deathMarchTimeSlots":["morning"]}']]);
  assert.equal(unlockDeathMarchIfEligible("actual", 100, "morning", 150, writableStorage), false);
  assert.equal(unlockDeathMarchIfEligible("actual", 100, "closing", 150, writableStorage), true);
  assert.deepEqual(writes.at(-1), [PROGRESSION_STORAGE_KEY, '{"version":3,"deathMarchTimeSlots":["closing","morning"]}']);
});
