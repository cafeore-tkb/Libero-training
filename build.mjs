import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await Promise.all([
  cp("index.html", "dist/index.html"),
  cp("style.css", "dist/style.css"),
  cp("game.js", "dist/game.js"),
  cp("feedback.js", "dist/feedback.js"),
  cp("evaluation.js", "dist/evaluation.js"),
  cp("water-return.js", "dist/water-return.js"),
  cp("serving.js", "dist/serving.js"),
  cp("pot-queue.js", "dist/pot-queue.js"),
  cp("timing.js", "dist/timing.js"),
  cp("keybindings.js", "dist/keybindings.js"),
  cp("config.js", "dist/config.js"),
  cp("setup.js", "dist/setup.js"),
  cp("boot.js", "dist/boot.js"),
  cp("vendor", "dist/vendor", { recursive: true })
]);

console.log("Built static site in dist/");
