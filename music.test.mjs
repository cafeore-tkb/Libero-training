import test from "node:test";
import assert from "node:assert/strict";
import { createMusic, musicProfile } from "./music.js";

test("all shift durations build tension gradually and enter the final stages at 30 and 10 seconds", () => {
  for (const duration of [90, 120, 150]) {
    assert.equal(musicProfile(duration, duration).stage, "flow");
    assert.equal(musicProfile(duration / 2, duration).stage, "build");
    assert.equal(musicProfile(30, duration).stage, "rush");
    assert.equal(musicProfile(10, duration).stage, "final");
    let previousBpm = 0;
    for (let left = duration; left >= 0; left -= .25) {
      const profile = musicProfile(left, duration);
      assert.ok(profile.bpm >= previousBpm && profile.bpm <= 148);
      previousBpm = profile.bpm;
    }
  }
});

function audioHarness() {
  const timers = new Set();
  const starts = [];
  const gains = [];
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(value) { this.value = value; }, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {} });
  const source = () => ({ ...node(), frequency: parameter(), start(at) { starts.push(at); }, stop() {} });
  const context = {
    currentTime: 0, sampleRate: 1000, state: "running", destination: node(),
    createGain() { const result = { ...node(), gain: parameter() }; gains.push(result); return result; },
    createBiquadFilter: () => ({ ...node(), frequency: parameter(), Q: parameter() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(1000) }),
    createOscillator: source,
    createBufferSource: source
  };
  const music = createMusic(context, {
    setTimer(callback) { timers.add(callback); return callback; },
    clearTimer(callback) { timers.delete(callback); }
  });
  return { context, music, starts, gains, timers, tick() { [...timers].forEach(callback => callback()); } };
}

test("muting and hidden tabs stop scheduling; resuming never replays a backlog", () => {
  const h = audioHarness();
  h.music.start(120, 120);
  assert.ok(h.starts.length > 0);
  const count = h.starts.length;
  h.music.setEnabled(false);
  assert.equal(h.timers.size, 0);
  h.context.currentTime = 20;
  h.tick();
  assert.equal(h.starts.length, count);
  h.music.setEnabled(true);
  assert.ok(h.starts.slice(count).every(at => at >= 20));
  h.music.setVisible(false);
  assert.equal(h.timers.size, 0);
  h.context.currentTime = 80;
  const hiddenCount = h.starts.length;
  h.music.setVisible(true);
  assert.ok(h.starts.length > hiddenCount);
  assert.ok(h.starts.slice(hiddenCount).every(at => at >= 80));
  h.music.stop();
});

test("restarting never stacks schedulers, and finishing or stopping cannot restart muted music", () => {
  const h = audioHarness();
  h.music.start(90, 90);
  h.music.start(150, 150);
  assert.equal(h.timers.size, 1);
  h.music.update(0, 150);
  assert.equal(h.timers.size, 0);
  h.music.setEnabled(false);
  h.music.setEnabled(true);
  assert.equal(h.timers.size, 0);
  h.music.start(120, 120);
  assert.equal(h.timers.size, 1);
  h.music.stop();
  h.music.setVisible(false);
  h.music.setVisible(true);
  assert.equal(h.timers.size, 0);
});

test("autoplay-suspended audio waits for permission without losing its scheduler", () => {
  const h = audioHarness();
  h.context.state = "suspended";
  h.music.start(120, 120);
  assert.equal(h.starts.length, 0);
  h.context.state = "running";
  h.context.currentTime = 3;
  h.tick();
  assert.ok(h.starts.length > 0);
  assert.ok(h.starts.every(at => at >= 3));
  h.music.stop();
});

test("volume affects playing music and persists through mute, pause and restart", () => {
  const h = audioHarness();
  h.music.setVolume(.5); h.music.start(120, 120);
  assert.equal(h.gains[0].gain.value, .06);
  h.music.setVolume(0);
  assert.equal(h.gains[0].gain.value, 0);
  h.music.stop(); h.music.setVolume(.8);
  assert.equal(h.timers.size, 0);
  h.music.start(90, 120);
  assert.equal(h.gains[0].gain.value, .096);
  h.music.setEnabled(false); h.music.setVolume(1);
  assert.equal(h.gains[0].gain.value, 0);
  h.music.setEnabled(true);
  assert.equal(h.gains[0].gain.value, .12);
  h.music.stop();
});
