import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { MUSIC_CHORDS, MUSIC_ROOTS } from "./music.js";

export const MUSIC_TEMPOS = { flow: 94, build: 104, rush: 118, final: 134 };
const frequency = note => 440 * 2 ** ((note - 69) / 12);

// Deterministic, original coffee-shop groove. Render once at build time so
// gameplay, Web Audio permissions, and timer throttling cannot interrupt notes.
export function renderMusicLoop(stage) {
  const rate = 22050;
  const stepTime = 60 / MUSIC_TEMPOS[stage] / 4;
  const count = Math.round(64 * stepTime * rate);
  const mix = new Float32Array(count);
  let seed = 173;
  const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
  function add(at, length, wave) {
    const start = Math.round(at * rate);
    for (let i = 0; i < length * rate; i++) {
      const t = i / rate;
      mix[(start + i) % count] += wave(t) * Math.min(t / .008, 1) * Math.max(0, 1 - t / length);
    }
  }
  function note(midi, at, length, gain, bass = false) {
    const f = frequency(midi);
    add(at, length, t => gain * (Math.sin(2 * Math.PI * f * t) + (bass ? 0 : .035) * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * (bass ? 8 : 5)));
  }
  const urgent = stage === "rush" || stage === "final";
  for (let step = 0; step < 64; step++) {
    const beat = step % 16, bar = Math.floor(step / 16), at = step * stepTime;
    const chord = MUSIC_CHORDS[bar];
    if (beat === 0 || beat === 10) chord.forEach((n, i) => note(n, at + i * .012, .24, beat === 0 ? .11 : .075));
    if (beat === 0 || beat === 8 || urgent && (beat === 6 || beat === 14)) note(MUSIC_ROOTS[bar], at, .16, .12, true);
    const melodySpacing = stage === "final" ? 1 : urgent ? 2 : stage === "build" ? 4 : 8;
    if (beat % melodySpacing === 0) {
      const melodyLength = Math.min(.15, stepTime * .72);
      note(chord[[0, 2, 1, 2][Math.floor(step / melodySpacing) % 4]], at, melodyLength, .12);
    }
    if (beat === 0 || beat === 8 || stage === "final" && (beat === 3 || beat === 11)) {
      add(at, .1, t => .1 * Math.sin(2 * Math.PI * (48 * t + 45 * .025 * (1 - Math.exp(-t / .025)))) * Math.exp(-t * 35));
    }
    if (beat === 4 || beat === 12) add(at, .065, t => noise() * .04 * Math.exp(-t * 45));
    if (urgent || beat % 2 === 0) add(at, .025, t => noise() * .018 * Math.exp(-t * 100));
  }
  let peak = 0;
  for (const sample of mix) peak = Math.max(peak, Math.abs(sample));
  const wav = new ArrayBuffer(44 + count * 2);
  const view = new DataView(wav);
  const tag = (offset, text) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  tag(0, "RIFF"); view.setUint32(4, wav.byteLength - 8, true); tag(8, "WAVE");
  tag(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) view.setInt16(44 + i * 2, Math.round(mix[i] / peak * .7 * 32767), true);
  return wav;
}

export async function writeMusicAssets() {
  await mkdir(new URL("./audio/", import.meta.url), { recursive: true });
  for (const stage of Object.keys(MUSIC_TEMPOS)) await writeFile(new URL(`./audio/bgm-${stage}.wav`, import.meta.url), new Uint8Array(renderMusicLoop(stage)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await writeMusicAssets();
