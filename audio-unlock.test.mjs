import test from "node:test";
import assert from "node:assert/strict";
import { createFeedback } from "./feedback.js";

function harness() {
  const saved = new Map(["window", "document", "matchMedia"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.hidden = false;
  doc.querySelector = () => ({});
  const contexts = [], musicInstances = [];
  let allowed = false;
  class Audio {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.destination = {}; this.resumes = 0; contexts.push(this); }
    createGain() { this.master = { gain: { value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; return this.master; }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() {}, stop() {} }; }
    close() { this.state = "closed"; return Promise.resolve(); }
    resume() {
      this.resumes++;
      if (!allowed) return Promise.reject(new Error("autoplay blocked"));
      this.state = "running";
      return Promise.resolve();
    }
  }
  win.AudioContext = Audio;
  Object.assign(globalThis, { window: win, document: doc, matchMedia: () => ({ matches: false }) });
  const feedback = createFeedback({ THREE: {}, scene: {}, camera: {}, musicFactory() {
    const music = { starts: 0, stops: 0, active: false, enabled: true, visible: true,
      start() { this.starts++; this.active = true; }, stop() { this.stops++; this.active = false; },
      update() {}, setEnabled(value) { this.enabled = value; }, setVisible(value) { this.visible = value; }, setVolume(value) { this.volume = value; }
    };
    musicInstances.push(music);
    return music;
  } });
  return { win, doc, feedback, contexts, musicInstances, allow() { allowed = true; }, restore() {
    saved.forEach((descriptor, name) => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; });
  } };
}

test("a blocked start retries audio permission on the next gameplay key without stacking music", async () => {
  const h = harness();
  try {
    h.feedback.startMusic(120, 120);
    await Promise.resolve();
    assert.equal(h.contexts[0].state, "suspended");
    assert.equal(h.musicInstances[0].starts, 1);
    h.allow(); h.doc.dispatchEvent(new Event("keydown"));
    assert.equal(h.contexts[0].state, "running");
    assert.equal(h.contexts[0].resumes, 2);
    assert.equal(h.musicInstances[0].starts, 1);
  } finally { h.restore(); }
});

test("pointer/touch priming is silent until the shift starts", () => {
  const h = harness();
  try {
    h.allow(); h.doc.dispatchEvent(new Event("pointerdown")); h.doc.dispatchEvent(new Event("touchend"));
    assert.equal(h.contexts.length, 1);
    assert.equal(h.contexts[0].state, "running");
    assert.equal(h.musicInstances[0].starts, 0);
    h.feedback.startMusic(120, 120);
    assert.equal(h.musicInstances[0].starts, 1);
  } finally { h.restore(); }
});

test("page restoration preserves active music, but cannot restart a paused or finished shift", () => {
  const h = harness();
  try {
    h.allow(); h.feedback.startMusic(120, 120);
    const music = h.musicInstances[0];
    h.win.dispatchEvent(new Event("pagehide"));
    assert.equal(music.visible, false);
    assert.equal(music.active, true);
    h.win.dispatchEvent(new Event("pageshow"));
    assert.equal(music.visible, true);
    assert.equal(music.active, true);
    assert.equal(music.starts, 1);
    h.feedback.stopMusic();
    h.win.dispatchEvent(new Event("pagehide")); h.win.dispatchEvent(new Event("pageshow")); h.doc.dispatchEvent(new Event("pointerdown"));
    assert.equal(music.active, false);
    assert.equal(music.starts, 1);
  } finally { h.restore(); }
});

test("music stays independent of SFX mute, and input cannot override BGM OFF", () => {
  const h = harness();
  try {
    h.allow(); h.feedback.setSound(false); h.feedback.startMusic(120, 120);
    assert.equal(h.contexts[0].master.gain.value, 0);
    assert.equal(h.musicInstances[0].enabled, true);
    h.feedback.setMusic(false); h.doc.dispatchEvent(new Event("keydown"));
    assert.equal(h.musicInstances[0].enabled, false);
    assert.equal(h.musicInstances[0].starts, 1);
  } finally { h.restore(); }
});

test("a closed audio device is recreated on input using the current music session", () => {
  const h = harness();
  try {
    h.allow(); h.feedback.startMusic(120, 120);
    h.contexts[0].state = "closed";
    h.doc.dispatchEvent(new Event("pointerdown"));
    assert.equal(h.contexts.length, 2);
    assert.equal(h.contexts[1].state, "running");
    assert.equal(h.musicInstances[0].stops, 1);
    assert.equal(h.musicInstances[1].starts, 1);
  } finally { h.restore(); }
});

test("explicit reconnection replaces the device without losing the shift, mute, or volume", () => {
  const h = harness();
  try {
    h.allow(); h.feedback.startMusic(90, 120); h.feedback.setSound(false); h.feedback.setVolume(.4);
    h.feedback.reconnectAudio();
    assert.equal(h.contexts[0].state, "closed");
    assert.equal(h.contexts[1].state, "running");
    assert.equal(h.contexts[1].master.gain.value, 0);
    assert.equal(h.musicInstances[1].starts, 1);
    assert.equal(h.musicInstances[1].volume, .4);
    assert.equal(h.feedback.audioStatus().soundEnabled, false);
  } finally { h.restore(); }
});

test("explicit test bypasses mute without changing it or starting background music", async () => {
  const h = harness();
  try {
    h.allow(); h.feedback.setSound(false); h.feedback.setMusic(false);
    assert.equal(await h.feedback.testAudio(), true);
    assert.equal(h.musicInstances[0].starts, 0);
    assert.equal(h.musicInstances[0].enabled, false);
    assert.equal(h.feedback.audioStatus().soundEnabled, false);
  } finally { h.restore(); }
});

test("blocked audio exposes a useful error, and a successful gesture clears it", async () => {
  const h = harness();
  try {
    assert.equal(await h.feedback.testAudio(), false);
    assert.match(h.feedback.audioStatus().error, /テスト音を開始できません/);
    h.allow(); h.doc.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    assert.equal(h.feedback.audioStatus().state, "running");
    assert.equal(h.feedback.audioStatus().error, "");
  } finally { h.restore(); }
});
