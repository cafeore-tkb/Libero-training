export const DIFFICULTIES = {
  easy: { label: "EASY", kettles: 2, drippers: 3 },
  normal: { label: "NORMAL", kettles: 3, drippers: 4 },
  hard: { label: "HARD", kettles: 4, drippers: 5 },
  actual: { label: "ACTUAL", kettles: 5, drippers: 6 },
  "death-march": { label: "DEATH MARCH", kettles: 4, drippers: 6, orderIntervalScale: .75, hidden: true }
};

export const PLAY_DURATIONS = [90, 120, 150];

export const TIME_SLOTS = {
  morning: { label: "MORNING", range: "10:00—11:30", pace: "CALM", orderMin: 6, orderMax: 8, orderStages: [39, 27, 18], fog: 0x1c3027, key: 0xffedc8, rim: 0xb7ee68, exposure: 1.12 },
  lunch: { label: "LUNCH", range: "11:30—13:00", pace: "RUSH", orderMin: 3, orderMax: 4.5, orderStages: [17, 12, 9], fog: 0x14251e, key: 0xffe4c1, rim: 0xff9b56, exposure: 1.08 },
  afternoon: { label: "AFTERNOON", range: "13:00—15:00", pace: "STEADY", orderMin: 4.5, orderMax: 6, orderStages: [30, 21, 15], fog: 0x18251f, key: 0xffcf9c, rim: 0xb7ee68, exposure: 1.02 },
  closing: { label: "CLOSING", range: "15:00—16:00", pace: "LAST CALL", orderMin: 4, orderMax: 6.5, orderStages: [23, 17, 12], fog: 0x111826, key: 0xb9c9ff, rim: 0x728ed2, exposure: .92 }
};

export function nextOrderDelay(difficultyKey, timeSlotKey, random = Math.random) {
  const difficulty = DIFFICULTIES[difficultyKey];
  const slot = TIME_SLOTS[timeSlotKey];
  const intervalScale = difficulty.orderIntervalScale ?? 1;
  return (slot.orderMin + random() * (slot.orderMax - slot.orderMin)) * intervalScale;
}
