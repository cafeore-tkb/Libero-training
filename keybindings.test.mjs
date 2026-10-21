import test from "node:test";
import assert from "node:assert/strict";
import { ACTION_KEYS, DEFAULT_KEYBINDINGS, KEYBINDINGS_STORAGE_KEY, getKeyBindings, isBindableCode, keyLabel, keyboardAction, readKeyBindings, rebindKey, saveKeyBindings, validKeyBindings } from "./keybindings.js";

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

test("rebinding an occupied key swaps actions without losing either binding", () => {
  const result = rebindKey(DEFAULT_KEYBINDINGS, "fill", "KeyS");
  assert.equal(result.swapped, "heat");
  assert.equal(keyboardAction("KeyS", 3, result.bindings), "fill");
  assert.equal(keyboardAction("KeyA", 3, result.bindings), "heat");
  assert.ok(validKeyBindings(result.bindings));
  assert.equal(DEFAULT_KEYBINDINGS.fill, "KeyA");
});

test("custom action and kettle keys honor physical positions and active kettle count", () => {
  const first = rebindKey(DEFAULT_KEYBINDINGS, "fill", "Space").bindings;
  const bindings = rebindKey(first, "kettle-4", "ArrowRight").bindings;
  assert.equal(keyboardAction("Space", 5, bindings), "fill");
  assert.equal(keyboardAction("KeyA", 5, bindings), null);
  assert.equal(keyboardAction("ArrowRight", 5, bindings), "kettle-4");
  assert.equal(keyboardAction("ArrowRight", 3, bindings), null);
  assert.equal(keyLabel("BracketLeft"), "@");
  assert.equal(keyLabel("IntlYen"), "¥");
  assert.equal(keyLabel("NumpadEnter"), "Num ↵");
});

test("an explicitly assigned numpad key takes precedence over the default number alias", () => {
  const bindings = rebindKey(DEFAULT_KEYBINDINGS, "serve", "Numpad1").bindings;
  assert.equal(keyboardAction("Digit1", 3, bindings), "kettle-0");
  assert.equal(keyboardAction("Numpad1", 3, bindings), "serve");
  assert.equal(keyboardAction("Numpad2", 3, bindings), "kettle-1");
});

test("browser, modifier, IME and cancellation keys cannot replace a game binding", () => {
  for (const code of ["Escape", "Tab", "F5", "F11", "F12", "MetaLeft", "ControlLeft", "AltRight", "ShiftLeft", "Backquote", "KanaMode", "", "Unidentified", "__proto__"]) {
    assert.equal(isBindableCode(code), false, code);
    assert.equal(rebindKey(DEFAULT_KEYBINDINGS, "fill", code), null);
  }
});

test("saved controls survive reload; invalid or unavailable storage safely uses defaults", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const custom = rebindKey(DEFAULT_KEYBINDINGS, "fill", "KeyQ").bindings;
  try {
    assert.equal(saveKeyBindings(custom, storage), true);
    assert.deepEqual(readKeyBindings(storage), custom);
    assert.equal(getKeyBindings().fill, "KeyQ");
    values.set(KEYBINDINGS_STORAGE_KEY, "not json");
    assert.deepEqual(readKeyBindings(storage), DEFAULT_KEYBINDINGS);
    values.set(KEYBINDINGS_STORAGE_KEY, JSON.stringify({ version: 1, bindings: { ...custom, heat: "KeyQ" } }));
    assert.deepEqual(readKeyBindings(storage), DEFAULT_KEYBINDINGS);
    const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
    assert.deepEqual(readKeyBindings(denied), DEFAULT_KEYBINDINGS);
    assert.equal(saveKeyBindings(custom, denied), false);
    assert.equal(keyboardAction("KeyQ", 3), "fill");
  } finally {
    saveKeyBindings(DEFAULT_KEYBINDINGS, storage);
  }
});
