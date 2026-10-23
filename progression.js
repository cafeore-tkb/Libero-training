export const PROGRESSION_STORAGE_KEY = "libero.progression.v3";
export const DEATH_MARCH_CLEAR_DURATION = 150;

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function readProgression(storage = browserStorage()) {
  try {
    const saved = JSON.parse(storage?.getItem(PROGRESSION_STORAGE_KEY) || "null");
    if (saved?.version !== 3 || !Array.isArray(saved.deathMarchTimeSlots)) return { deathMarchTimeSlots: [] };
    const deathMarchTimeSlots = [...new Set(saved.deathMarchTimeSlots)]
      .filter(timeSlot => typeof timeSlot === "string" && timeSlot.length > 0)
      .sort();
    return { deathMarchTimeSlots };
  } catch {
    return { deathMarchTimeSlots: [] };
  }
}

let progression = readProgression();

export function isDeathMarchUnlocked(timeSlot) {
  return progression.deathMarchTimeSlots.includes(timeSlot);
}

export function qualifiesForDeathMarch(difficulty, achievement, timeSlot, playDuration) {
  return difficulty === "actual" && achievement !== null && achievement >= 100
    && typeof timeSlot === "string" && timeSlot.length > 0
    && playDuration === DEATH_MARCH_CLEAR_DURATION;
}

export function unlockDeathMarchIfEligible(difficulty, achievement, timeSlot, playDuration, storage = browserStorage()) {
  if (!qualifiesForDeathMarch(difficulty, achievement, timeSlot, playDuration) || isDeathMarchUnlocked(timeSlot)) return false;
  progression = { deathMarchTimeSlots: [...progression.deathMarchTimeSlots, timeSlot].sort() };
  try {
    storage?.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify({ version: 3, ...progression }));
  } catch { /* The unlock remains active for this session when storage is unavailable. */ }
  return true;
}
