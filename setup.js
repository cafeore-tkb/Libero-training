import { DIFFICULTIES, TIME_SLOTS } from "./config.js";

export const selection = { difficulty: "normal", timeSlot: "afternoon" };

export function updateSetupUI() {
  const difficulty = DIFFICULTIES[selection.difficulty];
  const slot = TIME_SLOTS[selection.timeSlot];
  document.querySelectorAll("button[data-difficulty]").forEach(button => {
    const selected = button.dataset.difficulty === selection.difficulty;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("button[data-time-slot]").forEach(button => {
    const selected = button.dataset.timeSlot === selection.timeSlot;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const lead = document.querySelector("#setup-lead");
  if (lead) lead.textContent = `${difficulty.kettles}台のケトルを回し、${difficulty.drippers}人のドリッパーから届く要求に応えよう。`;
  document.querySelector("#difficulty-summary").textContent = `${difficulty.kettles} KETTLES / ${difficulty.drippers} DRIPPERS`;
  const limit = slot.orderStages.reduce((sum, seconds) => sum + seconds, 0);
  document.querySelector("#time-summary").textContent = `${slot.pace} — 注文間隔 ${slot.orderMin}〜${slot.orderMax}秒 / LIMIT ${limit}s ±10%`;
}

document.querySelectorAll("button[data-difficulty], button[data-time-slot]").forEach(button => {
  button.addEventListener("click", () => {
    if (!document.querySelector("#intro").classList.contains("show")) return;
    if (button.dataset.difficulty) selection.difficulty = button.dataset.difficulty;
    if (button.dataset.timeSlot) selection.timeSlot = button.dataset.timeSlot;
    updateSetupUI();
    document.dispatchEvent(new CustomEvent("setup-change", { detail: { ...selection } }));
  });
});
updateSetupUI();
