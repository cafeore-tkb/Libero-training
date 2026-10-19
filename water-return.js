const CAPACITY = 1.2;
const EPSILON = 1e-9;
const roundLiters = value => Math.round(value * 1e6) / 1e6;

export function planWaterReturn(queue, pots, kettles, selected) {
  const queueIndex = queue.findIndex(index => pots[index].water > 0 && !(pots[index].busyTime > 0));
  if (queueIndex < 0) return { queueIndex: -1, pot: null, canReturn: false, candidates: [], transferAmount: 0, remaining: 0, reason: queue.length ? "戻り湯の返却待ちです" : "すべてのポットが使用中です" };
  const pot = pots[queue[queueIndex]];
  const candidates = kettles.flatMap((kettle, index) => kettle.state !== "heating" && CAPACITY - kettle.water > EPSILON ? [index] : []);
  const kettle = kettles[selected];
  const canReturn = candidates.includes(selected);
  const transferAmount = canReturn ? roundLiters(Math.min(pot.water, Math.max(0, CAPACITY - kettle.water))) : 0;
  const remaining = roundLiters(Math.max(0, pot.water - transferAmount));
  const alternative = candidates.find(index => index !== selected);
  const suggestion = alternative === undefined ? "" : ` — K${String(alternative + 1).padStart(2, "0")}へ切替で回収できます`;
  const reason = canReturn ? remaining <= EPSILON
    ? `${Math.round(pot.water * 1000)}mlの戻り湯を全量回収できます`
    : `${Math.round(transferAmount * 1000)}mlを部分回収できます — 残り${Math.round(remaining * 1000)}ml`
    : kettle.state === "heating" ? `加熱を停止してから回収してください${suggestion}`
      : `ケトルは満水です${suggestion}`;
  return { queueIndex, pot, canReturn, candidates, transferAmount, remaining, reason };
}

export function transferReturnedWater(kettle, pot, requestedAmount) {
  const transferred = roundLiters(Math.min(requestedAmount, pot.water, Math.max(0, CAPACITY - kettle.water)));
  if (transferred <= EPSILON) return { transferred: 0, remaining: pot.water, complete: false };

  const mixedVolume = kettle.water + transferred;
  kettle.temp = ((kettle.water * kettle.temp) + (transferred * pot.temp)) / mixedVolume;
  kettle.water = roundLiters(mixedVolume);
  kettle.state = kettle.temp >= 92 ? "ready" : "filled";
  kettle.boilTime = 0;

  pot.water = roundLiters(Math.max(0, pot.water - transferred));
  const complete = pot.water <= EPSILON;
  if (complete) {
    pot.water = 0;
    pot.temp = 22;
    pot.waterLevel = 0;
  } else {
    pot.waterLevel = pot.water / .9;
  }
  return { transferred, remaining: pot.water, complete };
}
