import test from "node:test";
import assert from "node:assert/strict";
import { calculateScore } from "./score.js";

const shift = { achievement: 100, served: 10, bestCombo: 10, totalServeSeconds: 100, onTimeSeconds: 20 };

test("no completed delivery earns no score, volume or average, even with an achievement value", () => {
  assert.deepEqual(calculateScore({ achievement: 100, bestCombo: 10 }), {
    total: 0, volume: 0, achievement: 0, combo: 0, speed: 0, liters: 0, averageSeconds: null
  });
});

test("score combines completed volume, achievement, best combo and average service time", () => {
  assert.deepEqual(calculateScore(shift), {
    total: 208799, volume: 54000, achievement: 65000, combo: 70000, speed: 19799, liters: 9, averageSeconds: 10
  });
});

test("each scoring factor contributes independently", () => {
  const baseline = calculateScore(shift);
  assert.equal(calculateScore({ ...shift, achievement: 50 }).total, baseline.total - 48750);
  assert.equal(calculateScore({ ...shift, bestCombo: 5 }).total, baseline.total - 35000);
  assert.equal(calculateScore({ ...shift, totalServeSeconds: 200 }).total, baseline.total - 19799);
  assert.ok(calculateScore({ ...shift, served: 20, totalServeSeconds: 200 }).total > baseline.total);
});

test("speed is capped and cannot become a penalty for very late completed orders", () => {
  assert.equal(calculateScore({ ...shift, totalServeSeconds: 0 }).speed, 56000);
  assert.equal(calculateScore({ ...shift, totalServeSeconds: 1000 }).speed, 0);
  assert.equal(calculateScore({ ...shift, onTimeSeconds: 0 }).speed, 0);
});

test("a late pending order affects the achievement bonus, without inventing volume or delivery time", () => {
  const score = calculateScore({ ...shift, achievement: 10 / 11 * 100 });
  assert.equal(score.volume, 54000);
  assert.equal(score.achievement, 53719);
  assert.equal(score.averageSeconds, 10);
});

test("speed uses the slot's ON TIME window, and keeps unrounded averages for scoring", () => {
  assert.equal(calculateScore({ ...shift, onTimeSeconds: 40 }).speed, 36373);
  const score = calculateScore({ ...shift, served: 3, bestCombo: 3, totalServeSeconds: 1 });
  assert.equal(score.averageSeconds, 1 / 3);
  assert.equal(score.speed, 16382);
  assert.equal(score.liters, 2.7);
});

test("a strong long lunch shift scores around a million without a fixed cap", () => {
  const score = calculateScore({ achievement: 100, served: 45, bestCombo: 45, totalServeSeconds: 90, onTimeSeconds: 17 });
  assert.ok(score.total > 900000 && score.total < 1100000);
  assert.ok(calculateScore({ achievement: 100, served: 50, bestCombo: 50, totalServeSeconds: 0, onTimeSeconds: 17 }).total > 1000000);
});

test("the reported 13-delivery, eight-combo performance has balanced contributions", () => {
  const score = calculateScore({ achievement: 100, served: 13, bestCombo: 8, totalServeSeconds: 13 * .243, onTimeSeconds: 39 });
  for (const component of ["volume", "achievement", "combo", "speed"]) {
    const share = score[component] / score.total;
    assert.ok(share > .19 && share < .31, `${component}: ${share}`);
  }
  assert.notEqual(score.volume, score.achievement);
});

test("quality and speed curves make higher performance meaningfully more valuable", () => {
  const good = calculateScore({ ...shift, totalServeSeconds: 40 });
  const poor = calculateScore({ ...shift, achievement: 50, bestCombo: 2, totalServeSeconds: 160 });
  assert.equal(good.volume, poor.volume);
  assert.ok(poor.achievement < good.achievement * .5);
  assert.ok(poor.combo < good.combo * .5);
  assert.ok(poor.speed < good.speed * .5);
});
