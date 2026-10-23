import { musicProfile } from "./music.js?rev=clear-bgm-2";

// Standard media playback is independent of AudioContext and the render thread.
export function createMediaMusic({ audioFactory = src => new Audio(src), onStatus = () => {} } = {}) {
  const tracks = new Map();
  let active = false, enabled = true, visible = true, volume = 1;
  let profile = musicProfile(120, 120);
  let current;
  let pending = null;
  let generation = 0;
  let state = "idle", error = "";
  const status = () => ({ state, error, stage: profile.stage, active, enabled });
  const report = (value, message = "") => { state = value; error = message; onStatus(status()); };
  const shouldPlay = () => active && enabled && visible;

  function track(stage) {
    if (!tracks.has(stage)) {
      const audio = audioFactory(new URL(`./audio/bgm-${stage}.wav?rev=clear-bgm-2`, import.meta.url).href);
      audio.loop = true;
      audio.preload = "auto";
      // Each stage is rendered at its own tempo. Continuous playback-rate
      // changes invoke browser time stretching and can smear sustained notes.
      audio.playbackRate = 1;
      audio.addEventListener("error", () => {
        if (audio === current && shouldPlay()) report("error", "BGMファイルを読み込めません。再生ボタンで再試行してください。");
      });
      tracks.set(stage, audio);
    }
    return tracks.get(stage);
  }

  function pause(reason) {
    generation++;
    pending = null;
    current?.pause();
    report(reason);
  }

  function play() {
    if (!shouldPlay() || pending) return;
    if (!current) current = track(profile.stage);
    if (!current.paused && state === "playing") return;
    current.volume = .45 * volume;
    const attempt = ++generation;
    const audio = current;
    report("loading");
    // Invoke play synchronously in the start/retry click; never await Web Audio.
    try {
      const promise = Promise.resolve(audio.play());
      pending = promise;
      promise.then(() => {
        if (attempt !== generation) return;
        pending = null;
        if (shouldPlay() && !audio.paused) report("playing");
      }).catch(cause => {
        if (attempt !== generation) return;
        pending = null;
        report(cause.name === "NotAllowedError" ? "blocked" : "error",
          cause.name === "NotAllowedError" ? "BGMの再生許可が必要です。再生ボタンを押してください。" : `BGMを再生できません（${cause.name || "Error"}）。`);
      });
    } catch (cause) {
      pending = null;
      report("error", `BGMを再生できません（${cause.name || "Error"}）。`);
    }
  }

  function update(left, duration) {
    const next = musicProfile(left, duration);
    const changed = next.stage !== profile.stage;
    profile = next;
    if (left <= 0) { active = false; pause("idle"); return; }
    if (changed && current) {
      pause("paused");
      current = track(next.stage);
      current.currentTime = 0;
      if (shouldPlay()) play();
    }
  }

  return {
    start(left, duration) {
      active = false; pause("idle"); update(left, duration);
      current = track(profile.stage); current.currentTime = 0;
      active = left > 0;
      if (shouldPlay()) play();
    },
    update,
    stop() { active = false; pause("idle"); },
    retry() {
      if (!shouldPlay()) return;
      if (state === "error") current?.load();
      play();
    },
    setEnabled(value) { enabled = value; if (shouldPlay()) play(); else pause(value ? "paused" : "muted"); },
    setVisible(value) { visible = value; if (shouldPlay()) play(); else pause("paused"); },
    setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(1, value));
      if (current) current.volume = .45 * volume;
    },
    status
  };
}
