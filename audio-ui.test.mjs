import test from "node:test";
import assert from "node:assert/strict";
import { testToneWav } from "./audio-ui.js";

test("standard player test is a valid, audible, bounded mono PCM WAV without external assets", () => {
  const wav = testToneWav();
  const view = new DataView(wav);
  const text = offset => String.fromCharCode(...new Uint8Array(wav, offset, 4));
  assert.equal(text(0), "RIFF"); assert.equal(text(8), "WAVE"); assert.equal(text(36), "data");
  assert.equal(view.getUint32(4, true), wav.byteLength - 8);
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 22050);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), wav.byteLength - 44);
  let peak = 0;
  for (let offset = 44; offset < wav.byteLength; offset += 2) peak = Math.max(peak, Math.abs(view.getInt16(offset, true)));
  assert.ok(peak > 5000 && peak < 6000);
});
