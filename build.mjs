import { cp, mkdir, rm } from "node:fs/promises";
import { writeMusicAssets } from "./music-assets.mjs";

await writeMusicAssets();
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await Promise.all([
  cp("index.html", "dist/index.html"),
  cp("style.css", "dist/style.css"),
  cp("game.js", "dist/game.js"),
  cp("feedback.js", "dist/feedback.js"),
  cp("music.js", "dist/music.js"),
  cp("media-music.js", "dist/media-music.js"),
  cp("audio", "dist/audio", { recursive: true }),
  cp("audio-ui.js", "dist/audio-ui.js"),
  cp("evaluation.js", "dist/evaluation.js"),
  cp("score.js", "dist/score.js"),
  cp("water-return.js", "dist/water-return.js"),
  cp("serving.js", "dist/serving.js"),
  cp("pot-queue.js", "dist/pot-queue.js"),
  cp("pot-lifecycle.js", "dist/pot-lifecycle.js"),
  cp("timing.js", "dist/timing.js"),
  cp("keybindings.js", "dist/keybindings.js"),
  cp("keybindings-ui.js", "dist/keybindings-ui.js"),
  cp("pause.js", "dist/pause.js"),
  cp("config.js", "dist/config.js"),
  cp("setup.js", "dist/setup.js"),
  cp("progression.js", "dist/progression.js"),
  cp("boot.js", "dist/boot.js"),
  cp("vendor", "dist/vendor", { recursive: true })
]);

console.log("Built static site in dist/");
