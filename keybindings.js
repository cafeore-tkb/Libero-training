export const ACTION_KEYS = Object.freeze({
  KeyA: "fill",
  KeyS: "heat",
  KeyD: "return",
  KeyF: "serve"
});

export function keyboardAction(code, activeKettles) {
  if (ACTION_KEYS[code]) return ACTION_KEYS[code];
  const match = /^(?:Digit|Numpad)([1-5])$/.exec(code);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return index < activeKettles ? `kettle-${index}` : null;
}
