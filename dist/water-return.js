const CAPACITY = 1.2;
const EPSILON = 1e-9;

export function planWaterReturn(queue, pots, kettles, selected) {
  const queueIndex = queue.findIndex(index => pots[index].water > 0 && !(pots[index].busyTime > 0));
  if (queueIndex < 0) return { queueIndex: -1, pot: null, canReturn: false, candidates: [], reason: queue.length ? "戻り湯の返却待ちです" : "すべてのポットが使用中です" };
  const pot = pots[queue[queueIndex]];
  const candidates = kettles.flatMap((kettle, index) => kettle.state !== "heating" && kettle.water + pot.water <= CAPACITY + EPSILON ? [index] : []);
  const kettle = kettles[selected];
  const canReturn = candidates.includes(selected);
  const alternative = candidates.find(index => index !== selected);
  const suggestion = alternative === undefined ? "" : ` — K${String(alternative + 1).padStart(2, "0")}へ切替で回収できます`;
  const reason = canReturn ? `${Math.round(pot.water * 1000)}mlの戻り湯を回収できます`
    : kettle.state === "heating" ? `加熱を停止してから回収してください${suggestion}`
      : `ケトルの空き容量が${Math.ceil(Math.max(0, pot.water - (CAPACITY - kettle.water)) * 1000 - EPSILON)}ml不足${suggestion}`;
  return { queueIndex, pot, canReturn, candidates, reason };
}
