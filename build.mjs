import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await Promise.all([
  cp("index.html", "dist/index.html"),
  cp("style.css", "dist/style.css"),
  cp("game.js", "dist/game.js"),
  cp("feedback.js", "dist/feedback.js"),
  cp("evaluation.js", "dist/evaluation.js")
]);

console.log("Built static site in dist/");
