import { BINDING_ACTIONS, DEFAULT_KEYBINDINGS, getKeyBindings, isBindableCode, keyLabel, keyboardAction, rebindKey, saveKeyBindings } from "./keybindings.js";

const dialog = document.querySelector("#keybindings-dialog");
const status = document.querySelector("#keybindings-status");
const buttons = new Map();
let capturing = null;
let opener;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("is-error", error);
}

export function updateKeyBindingLabels() {
  const bindings = getKeyBindings();
  document.querySelectorAll("[data-keybinding-label]").forEach(element => {
    element.textContent = keyLabel(bindings[element.dataset.keybindingLabel]);
  });
  document.querySelectorAll("[data-keybinding-control]").forEach(element => {
    const action = BINDING_ACTIONS.find(item => item.id === element.dataset.keybindingControl);
    const code = bindings[action.id];
    element.setAttribute("aria-keyshortcuts", code.replace(/^(Key|Digit)/, ""));
    element.title = `${action.label}：${keyLabel(code)}`;
  });
  const hint = document.querySelector("#kettle-shortcuts");
  if (hint) {
    const count = Number(hint.dataset.count || 3);
    const labels = Array.from({ length: count }, (_, index) => keyLabel(bindings[`kettle-${index}`]));
    const direct = labels.every((label, index) => label === String(index + 1)) ? `1—${labels.length}` : labels.join(" / ");
    const arrows = [["ArrowLeft", "previous-kettle"], ["ArrowRight", "next-kettle"]]
      .filter(([code, action]) => keyboardAction(code, count, bindings) === action).map(([code]) => keyLabel(code));
    hint.textContent = [direct, arrows.join(" ")].filter(Boolean).join(" / ");
  }
  buttons.forEach((button, id) => {
    button.classList.toggle("listening", capturing === id);
    button.querySelector("kbd").textContent = capturing === id ? "入力待ち…" : keyLabel(bindings[id]);
    button.setAttribute("aria-label", `${BINDING_ACTIONS.find(action => action.id === id).label}：${keyLabel(bindings[id])}。クリックして変更`);
  });
}

function apply(bindings) {
  const saved = saveKeyBindings(bindings);
  capturing = null;
  updateKeyBindingLabels();
  document.dispatchEvent(new CustomEvent("keybindings-change"));
  return saved;
}

for (const action of BINDING_ACTIONS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "binding-key";
  button.dataset.bindingAction = action.id;
  const label = document.createElement("span");
  label.textContent = action.label;
  button.append(label, document.createElement("kbd"));
  button.onclick = () => {
    capturing = action.id;
    message(`${action.label}に割り当てたいキーを押してください。`);
    updateKeyBindingLabels();
  };
  document.querySelector(action.id.startsWith("kettle-") ? "#kettle-keybindings" : "#action-keybindings").append(button);
  buttons.set(action.id, button);
}

document.querySelectorAll("[data-open-keybindings]").forEach(button => {
  button.onclick = () => {
    if (dialog.open) return;
    opener = button;
    capturing = null;
    message("設定はこのブラウザに自動保存されます。");
    updateKeyBindingLabels();
    dialog.showModal();
    document.dispatchEvent(new CustomEvent("keybindings-open"));
  };
});
document.querySelector("#keybindings-close").onclick = () => dialog.close();
dialog.addEventListener("close", () => {
  capturing = null;
  updateKeyBindingLabels();
  document.dispatchEvent(new CustomEvent("keybindings-close"));
  opener?.focus();
});
document.querySelector("#keybindings-reset").onclick = () => {
  const saved = apply(DEFAULT_KEYBINDINGS);
  message(saved ? "初期設定に戻しました。" : "初期設定に戻しました。このブラウザでは保存できません。", !saved);
};

window.addEventListener("keydown", event => {
  if (!dialog.open || !capturing) return;
  if (event.code === "Tab") {
    capturing = null;
    updateKeyBindingLabels();
    message("キーの変更を取り消しました。");
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.repeat) return;
  if (event.code === "Escape") {
    capturing = null;
    updateKeyBindingLabels();
    message("キーの変更を取り消しました。");
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || !isBindableCode(event.code)) {
    message("文字・数字・矢印・Spaceなどの単独キーを選んでください。", true);
    return;
  }
  const action = BINDING_ACTIONS.find(item => item.id === capturing);
  const result = rebindKey(getKeyBindings(), capturing, event.code);
  if (!result) return;
  const saved = apply(result.bindings);
  const swapped = result.swapped ? BINDING_ACTIONS.find(item => item.id === result.swapped) : null;
  message(`${action.label}を ${keyLabel(event.code)} に変更しました。${swapped ? `${swapped.label}は ${keyLabel(result.bindings[swapped.id])} へ入れ替えました。` : ""}${saved ? "" : " このブラウザでは保存できません。"}`, !saved);
}, true);

updateKeyBindingLabels();
