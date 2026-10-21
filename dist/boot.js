// Bind settings before importing anything that requires WebGL.
import "./setup.js";
import "./keybindings-ui.js";

const startButton = document.querySelector("#start-button");
const status = document.querySelector("#boot-status");
const retry = document.querySelector("#reload-button");
retry.addEventListener("click", () => location.reload());

try {
  await import("./game.js?rev=urgent-target-1");
  startButton.disabled = false;
  status.hidden = true;
} catch (error) {
  console.error("LIBERO initialization failed:", error);
  status.textContent = "3D画面を開始できませんでした。ブラウザーのグラフィック設定を確認して、再読み込みしてください。";
  status.classList.add("boot-error");
  startButton.disabled = true;
  retry.hidden = false;
}
