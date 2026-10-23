import { SERVING_TARGET } from "./serving.js";

export const SCORE_RULES = Object.freeze({
  perLiter: 6000,
  qualityPerDelivery: 6500,
  perCombo: 7000,
  speedPerDelivery: 5600
});

// Only completed 900 ml deliveries earn points. Achievement remains the
// existing service-quality percentage, including late, unserved orders.
export function calculateScore({ achievement = null, served = 0, bestCombo = 0, totalServeSeconds = 0, onTimeSeconds = 1 } = {}) {
  if (served <= 0) return { total: 0, volume: 0, achievement: 0, combo: 0, speed: 0, liters: 0, averageSeconds: null };
  const liters = Math.round(served * SERVING_TARGET * 1000) / 1000;
  const averageSeconds = Math.max(0, totalServeSeconds) / served;
  const volume = Math.round(liters * SCORE_RULES.perLiter);
  const qualityRatio = Math.max(0, Math.min(1, (achievement ?? 0) / 100));
  // Quality and speed curves separate strong and weak performances; volume
  // remains linear. A clean, fast full combo puts each component near 25%.
  const quality = Math.round(served * SCORE_RULES.qualityPerDelivery * qualityRatio ** 2);
  const combo = Math.min(served, Math.max(0, bestCombo)) * SCORE_RULES.perCombo;
  const speedRatio = onTimeSeconds > 0 ? Math.max(0, Math.min(1, 1 - averageSeconds / onTimeSeconds)) : 0;
  const speed = Math.round(served * SCORE_RULES.speedPerDelivery * speedRatio ** 1.5);
  return { total: volume + quality + combo + speed, volume, achievement: quality, combo, speed, liters, averageSeconds };
}
