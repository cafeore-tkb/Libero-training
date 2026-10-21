export const ACTION_KEYS = Object.freeze({
  KeyA: "fill",
  KeyS: "heat",
  KeyD: "return",
  KeyF: "serve"
});

export const BINDING_ACTIONS = Object.freeze([
  { id: "fill", label: "給水（長押し）", code: "KeyA" },
  { id: "heat", label: "加熱", code: "KeyS" },
  { id: "return", label: "戻り湯を回収", code: "KeyD" },
  { id: "serve", label: "ポットへ注ぐ", code: "KeyF" },
  ...Array.from({ length: 5 }, (_, index) => ({ id: `kettle-${index}`, label: `ケトル ${index + 1}`, code: `Digit${index + 1}` }))
]);
export const DEFAULT_KEYBINDINGS = Object.freeze(Object.fromEntries(BINDING_ACTIONS.map(action => [action.id, action.code])));
export const KEYBINDINGS_STORAGE_KEY = "libero.keybindings.v1";

const NAMED_KEYS = {
  Space: "Space", Enter: "Enter", Backspace: "⌫", Delete: "Del", Insert: "Ins",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Home: "Home", End: "End", PageUp: "PgUp", PageDown: "PgDn",
  Minus: "-", Equal: "^", BracketLeft: "@", BracketRight: "[", Backslash: "]",
  Semicolon: ";", Quote: ":", Comma: ",", Period: ".", Slash: "/", IntlYen: "¥", IntlRo: "\\",
  NumpadAdd: "Num +", NumpadSubtract: "Num -", NumpadMultiply: "Num *", NumpadDivide: "Num /",
  NumpadDecimal: "Num .", NumpadEnter: "Num ↵", NumpadEqual: "Num =", NumpadComma: "Num ,"
};

export function keyLabel(code) {
  if (NAMED_KEYS[code]) return NAMED_KEYS[code];
  if (/^(Key[A-Z]|Digit[0-9])$/.test(code)) return code.replace(/^(Key|Digit)/, "");
  if (/^Numpad[0-9]$/.test(code)) return `Num ${code.slice(-1)}`;
  return code;
}

export function isBindableCode(code) {
  return typeof code === "string" && (Object.hasOwn(NAMED_KEYS, code) || /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F[1-4]|F[6-9]|F10)$/.test(code));
}

export function validKeyBindings(value) {
  if (!value || typeof value !== "object") return false;
  const codes = BINDING_ACTIONS.map(action => value[action.id]);
  return codes.every(isBindableCode) && new Set(codes).size === codes.length;
}

export function rebindKey(bindings, actionId, code) {
  if (!Object.hasOwn(DEFAULT_KEYBINDINGS, actionId) || !isBindableCode(code)) return null;
  const next = { ...bindings };
  const swapped = BINDING_ACTIONS.find(action => action.id !== actionId && next[action.id] === code)?.id;
  if (swapped) next[swapped] = next[actionId];
  next[actionId] = code;
  return { bindings: next, swapped };
}

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function readKeyBindings(storage = browserStorage()) {
  try {
    const saved = JSON.parse(storage?.getItem(KEYBINDINGS_STORAGE_KEY) || "null");
    if (saved?.version === 1 && validKeyBindings(saved.bindings)) {
      return Object.fromEntries(BINDING_ACTIONS.map(action => [action.id, saved.bindings[action.id]]));
    }
  } catch { /* Missing or damaged storage falls back to the default controls. */ }
  return { ...DEFAULT_KEYBINDINGS };
}

let currentBindings = Object.freeze(readKeyBindings());
export const getKeyBindings = () => currentBindings;

export function saveKeyBindings(bindings, storage = browserStorage()) {
  if (!validKeyBindings(bindings)) throw new Error("Invalid key bindings");
  currentBindings = Object.freeze(Object.fromEntries(BINDING_ACTIONS.map(action => [action.id, bindings[action.id]])));
  try {
    if (!storage) return false;
    storage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify({ version: 1, bindings: currentBindings }));
    return true;
  } catch { return false; }
}

export function keyboardAction(code, activeKettles, bindings = currentBindings) {
  let action = BINDING_ACTIONS.find(item => bindings[item.id] === code)?.id;
  // Keep numpad kettle selection unless that physical key has its own binding.
  if (!action && /^Numpad[0-9]$/.test(code)) {
    action = BINDING_ACTIONS.find(item => item.id.startsWith("kettle-") && bindings[item.id] === `Digit${code.slice(-1)}`)?.id;
  }
  if (action?.startsWith("kettle-") && Number(action.slice(7)) >= activeKettles) return null;
  return action || null;
}
