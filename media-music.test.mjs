import test from "node:test";
import assert from "node:assert/strict";
import { createMediaMusic } from "./media-music.js";
import { renderMusicLoop, MUSIC_TEMPOS } from "./music-assets.mjs";

function harness() {
  const tracks = [], states = [];
  let allowed = true;
  const music = createMediaMusic({
    onStatus: status => states.push(status.state),
    audioFactory(src) {
      const audio = new EventTarget();
      Object.assign(audio, { src, paused: true, currentTime: 0, plays: 0, loads: 0,
        play() {
          this.plays++;
          if (!allowed) return Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
          this.paused = false;
          return Promise.resolve();
        },
        pause() { this.paused = true; }, load() { this.loads++; }
      });
      tracks.push(audio);
      return audio;
    }
  });
  return { music, tracks, states, allow(value) { allowed = value; } };
}
const settled = async () => { await Promise.resolve(); await Promise.resolve(); };

test("BGM uses standard media, starts on the start call, and has an audible default volume", async () => {
  const h = harness();
  assert.equal(h.tracks.length, 0);
  h.music.start(120, 120);
  assert.equal(h.tracks[0].plays, 1);
  await settled();
  assert.equal(h.music.status().state, "playing");
  assert.equal(h.tracks[0].loop, true);
  assert.equal(h.tracks[0].volume, .45);
  assert.match(h.tracks[0].src, /audio\/bgm-flow.wav/);
});

test("muting, hiding, pausing, and ending stop playback without overriding volume or intent", async () => {
  const h = harness();
  h.music.start(120, 120); await settled();
  h.music.setVolume(.4); h.music.setEnabled(false);
  assert.equal(h.tracks[0].paused, true);
  h.music.retry(); assert.equal(h.tracks[0].plays, 1);
  h.music.setEnabled(true); await settled();
  assert.ok(Math.abs(h.tracks[0].volume - .18) < 1e-10);
  h.music.setVisible(false); assert.equal(h.tracks[0].paused, true);
  h.music.setVisible(true); await settled();
  assert.equal(h.tracks[0].paused, false);
  h.music.stop(); h.music.retry(); h.music.setVisible(true);
  assert.equal(h.tracks[0].paused, true);
  assert.equal(h.music.status().active, false);
  h.music.start(10, 120); await settled(); h.music.update(0, 120);
  assert.ok(h.tracks.every(audio => audio.paused));
});

test("blocked playback is reported, retried on interaction, and cannot restart a stopped shift", async () => {
  const h = harness(); h.allow(false); h.music.start(120, 120); await settled();
  assert.equal(h.music.status().state, "blocked");
  h.allow(true); h.music.retry(); await settled();
  assert.equal(h.music.status().state, "playing");
  h.music.stop(); h.music.retry();
  assert.equal(h.tracks[0].paused, true);
  assert.equal(h.tracks[0].plays, 2);
});

test("tension stages use their rendered tempos without overlap or time stretching", async () => {
  const h = harness(); h.music.start(120, 120); await settled();
  for (const [left, stage] of [[60, "build"], [30, "rush"], [10, "final"]]) {
    h.music.update(left, 120); await settled();
    assert.equal(h.music.status().stage, stage);
    assert.match(h.tracks.at(-1).src, new RegExp(`bgm-${stage}.wav`));
    assert.equal(h.tracks.filter(audio => !audio.paused).length, 1);
    assert.equal(h.tracks.at(-1).playbackRate, 1);
  }
  const plays = h.tracks.at(-1).plays;
  h.music.update(1, 120);
  assert.equal(h.tracks.at(-1).playbackRate, 1);
  assert.equal(h.tracks.at(-1).plays, plays);
});

test("a late play rejection after stopping cannot show an error or revive music", async () => {
  const h = harness(); h.allow(false); h.music.start(120, 120); h.music.stop(); await settled();
  assert.equal(h.music.status().state, "idle");
  assert.equal(h.music.status().active, false);
});

test("media file errors are visible and retry reloads the file", async () => {
  const h = harness(); h.music.start(120, 120); await settled();
  h.tracks[0].paused = true; h.tracks[0].dispatchEvent(new Event("error"));
  assert.equal(h.music.status().state, "error");
  h.music.retry(); await settled();
  assert.equal(h.tracks[0].loads, 1);
  assert.equal(h.music.status().state, "playing");
});

test("every bundled loop is valid PCM, bounded and non-silent throughout all four bars", () => {
  for (const stage of Object.keys(MUSIC_TEMPOS)) {
    const wav = renderMusicLoop(stage), view = new DataView(wav);
    assert.equal(view.getUint32(4, true), wav.byteLength - 8);
    assert.equal(view.getUint32(24, true), 22050);
    let peak = 0, square = 0;
    for (let offset = 44; offset < wav.byteLength; offset += 2) {
      const sample = view.getInt16(offset, true) / 32768;
      peak = Math.max(peak, Math.abs(sample)); square += sample * sample;
    }
    assert.ok(peak > .69 && peak < .71);
    assert.ok(Math.sqrt(square / ((wav.byteLength - 44) / 2)) > .04, `${stage} must not be effectively silent`);
  }
});
