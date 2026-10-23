import { DIFFICULTIES, PLAY_DURATIONS, TIME_SLOTS } from "./config.js";
import { isDeathMarchUnlocked } from "./progression.js";

export const selection = { difficulty: "easy", timeSlot: "morning", playDuration: 90 };

export function updateSetupUI() {
  if (selection.difficulty === "death-march" && !isDeathMarchUnlocked(selection.timeSlot)) selection.difficulty = "actual";
  const difficulty = DIFFICULTIES[selection.difficulty];
  const slot = TIME_SLOTS[selection.timeSlot];
  document.querySelectorAll('input[name="difficulty"]').forEach(input => {
    const locked = DIFFICULTIES[input.value]?.hidden === true && !isDeathMarchUnlocked(selection.timeSlot);
    input.disabled = locked;
    input.checked = input.value === selection.difficulty;
    if (input.value === "death-march") {
      input.setAttribute("aria-label", locked ? "未解放の隠し難易度" : "DEATH MARCH 4ケトル 6ドリッパー");
    }
  });
  document.querySelectorAll("button[data-time-slot]").forEach(button => {
    const selected = button.dataset.timeSlot === selection.timeSlot;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("button[data-play-duration]").forEach(button => {
    const selected = Number(button.dataset.playDuration) === selection.playDuration;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const lead = document.querySelector("#setup-lead");
  if (lead) lead.textContent = `${difficulty.kettles}台のケトルを回し、${difficulty.drippers}人のドリッパーから届く要求に応えよう。`;
  document.querySelector("#difficulty-summary").textContent = `${difficulty.label} — ケトル ${difficulty.kettles}台 / ドリッパー ${difficulty.drippers}人`;
  const limit = slot.orderStages.reduce((sum, seconds) => sum + seconds, 0);
  document.querySelector("#time-summary").textContent = `注文間隔 ${slot.orderMin}〜${slot.orderMax}秒 / 制限 ${limit}秒`;
  const minutes = Math.floor(selection.playDuration / 60);
  const seconds = selection.playDuration % 60;
  document.querySelector("#duration-summary").textContent = `${minutes}分${seconds ? `${seconds}秒` : ""}間のシフトに挑戦`;
}

document.querySelectorAll('input[name="difficulty"]').forEach(input => {
  input.addEventListener("change", () => {
    if (!document.querySelector("#intro").classList.contains("show") || !input.checked || input.disabled) return;
    selection.difficulty = input.value;
    updateSetupUI();
    document.dispatchEvent(new CustomEvent("setup-change", { detail: { ...selection } }));
  });
});

document.querySelectorAll("button[data-time-slot], button[data-play-duration]").forEach(button => {
  button.addEventListener("click", () => {
    if (!document.querySelector("#intro").classList.contains("show")) return;
    if (button.dataset.timeSlot) selection.timeSlot = button.dataset.timeSlot;
    if (button.dataset.playDuration) {
      const duration = Number(button.dataset.playDuration);
      if (PLAY_DURATIONS.includes(duration)) selection.playDuration = duration;
    }
    updateSetupUI();
    document.dispatchEvent(new CustomEvent("setup-change", { detail: { ...selection } }));
  });
});
updateSetupUI();
