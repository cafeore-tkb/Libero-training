import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const MUSIC_TEMPOS = { flow: 94, build: 104, rush: 118, final: 134 };
const CHORDS = [[52, 55, 59, 62], [48, 52, 55, 59], [45, 48, 52, 55], [47, 50, 54, 57]];
const ROOTS = [40, 36, 33, 35];
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
    add(at, length, t => gain * (Math.sin(2 * Math.PI * f * t) + (bass ? .22 : .12) * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * (bass ? 5 : 3)));
  }
  const urgent = stage === "rush" || stage === "final";
  for (let step = 0; step < 64; step++) {
    const beat = step % 16, bar = Math.floor(step / 16), at = step * stepTime;
    const chord = CHORDS[bar];
    if (beat === 0 || beat === 10) chord.forEach((n, i) => note(n, at + i * .009, .62, beat === 0 ? .15 : .1));
    if (beat === 0 || beat === 8 || urgent && (beat === 6 || beat === 14)) note(ROOTS[bar], at, .3, .25, true);
    const melodySpacing = stage === "final" ? 1 : urgent ? 2 : stage === "build" ? 4 : 8;
    if (beat % melodySpacing === 0) note(chord[[0, 2, 1, 3][Math.floor(step / melodySpacing) % 4]] + 12, at, .22, .13);
    if (beat === 0 || beat === 8 || stage === "final" && (beat === 3 || beat === 11)) {
      add(at, .2, t => .4 * Math.sin(2 * Math.PI * (45 * t + 70 * .04 * (1 - Math.exp(-t / .04)))) * Math.exp(-t * 23));
    }
    if (beat === 4 || beat === 12) add(at, .11, t => noise() * .13 * Math.exp(-t * 30));
    if (urgent || beat % 2 === 0) add(at, .035, t => noise() * .045 * Math.exp(-t * 80));
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
