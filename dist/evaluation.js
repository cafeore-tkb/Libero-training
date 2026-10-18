export const SERVICE_WEIGHTS = Object.freeze({ "on-time": 1, delayed: .5, critical: .1, overdue: 0 });

export function createServiceCounts() {
  return { "on-time": 0, delayed: 0, critical: 0, overdue: 0 };
}

export function orderStageKey(order) {
  if (order.overdue || order.time <= 0) return "overdue";
  const elapsed = Math.max(0, order.max - order.time);
  if (elapsed < order.stageDurations[0]) return "on-time";
  if (elapsed < order.stageDurations[0] + order.stageDurations[1]) return "delayed";
  return "critical";
}

// Completed requests retain their delivery-stage evaluation. Pending requests
// enter the denominator when the on-time grace period ends; fresh requests
// remain ungraded, including those arriving just before the shift finishes.
export function evaluateService(delivered, pending) {
  let completed = 0;
  let credit = 0;
  for (const [stage, weight] of Object.entries(SERVICE_WEIGHTS)) {
    const count = delivered[stage] || 0;
    completed += count;
    credit += count * weight;
  }
  const unserved = pending.filter(order => orderStageKey(order) !== "on-time").length;
  const evaluated = completed + unserved;
  const percentage = evaluated ? Math.min(100, Math.max(0, credit / evaluated * 100)) : null;
  return { percentage, evaluated, completed, unserved, grace: pending.length - unserved };
}

export function achievementValue(percentage) {
  // Never round a displayed percentage up into a rank it has not earned.
  return percentage === null ? null : Math.floor((percentage + 1e-9) * 10) / 10;
}

export function achievementLabel(percentage) {
  const value = achievementValue(percentage);
  return value === null ? "未評価" : `${value}%`;
}

export function serviceRank(percentage) {
  if (percentage === null) return null;
  return percentage >= 100 ? "S" : percentage >= 95 ? "A" : percentage >= 85 ? "B" : "C";
}
