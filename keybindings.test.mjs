import test from "node:test";
import assert from "node:assert/strict";
import { ACTION_KEYS, keyboardAction } from "./keybindings.js";

test("JIS home-row physical keys map to the four actions", () => {
  assert.deepEqual(ACTION_KEYS, { KeyA: "fill", KeyS: "heat", KeyD: "return", KeyF: "serve" });
  assert.equal(keyboardAction("KeyA", 3), "fill");
  assert.equal(keyboardAction("KeyS", 3), "heat");
  assert.equal(keyboardAction("KeyD", 3), "return");
  assert.equal(keyboardAction("KeyF", 3), "serve");
});

test("number-row and numpad kettle shortcuts respect the active kettle count", () => {
  assert.equal(keyboardAction("Digit1", 3), "kettle-0");
  assert.equal(keyboardAction("Digit3", 3), "kettle-2");
  assert.equal(keyboardAction("Numpad2", 3), "kettle-1");
  assert.equal(keyboardAction("Digit4", 3), null);
  assert.equal(keyboardAction("KeyR", 3), null);
});
