import test from "node:test";
import assert from "node:assert/strict";
import { createPauseController } from "./pause.js";

test("pause and resume notify only on actual transitions", () => {
  const events = [];
  const pause = createPauseController({ onPause: () => events.push("pause"), onResume: () => events.push("resume") });
  assert.equal(pause.paused, false);
  pause.pause("menu");
  pause.pause("menu");
  assert.equal(pause.paused, true);
  pause.resume("unknown");
  assert.deepEqual(events, ["pause"]);
  pause.resume("menu");
  pause.resume("menu");
  assert.equal(pause.paused, false);
  assert.deepEqual(events, ["pause", "resume"]);
});

test("closing key settings keeps the pause menu paused", () => {
  let resumes = 0;
  const pause = createPauseController({ onResume: () => resumes++ });
  pause.pause("menu");
  pause.pause("keybindings");
  pause.resume("keybindings");
  assert.equal(pause.paused, true);
  assert.equal(resumes, 0);
  pause.resume("menu");
  assert.equal(pause.paused, false);
  assert.equal(resumes, 1);
});

test("reset clears all reasons without resuming an abandoned shift", () => {
  let resumes = 0;
  const pause = createPauseController({ onResume: () => resumes++ });
  pause.pause("menu");
  pause.pause("keybindings");
  pause.clear();
  pause.resume("keybindings");
  pause.resume("menu");
  assert.equal(pause.paused, false);
  assert.equal(resumes, 0);
});
