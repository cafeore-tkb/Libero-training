const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function musicProfile(remaining, duration) {
  const total = Math.max(1, duration);
  const left = clamp(remaining, 0, total);
  const progress = 1 - left / total;
  if (left <= 10) return { stage: "final", bpm: 134 + (1 - left / 10) * 14, cutoff: 3800 };
  if (left <= 30) return { stage: "rush", bpm: 118 + (30 - left) / 20 * 16, cutoff: 3000 };
  if (progress >= .5 || left <= 45) {
    const buildup = clamp((Math.max(total / 2, 45) - left) / Math.max(1, Math.max(total / 2, 45) - 30), 0, 1);
    return { stage: "build", bpm: 104 + buildup * 14, cutoff: 2300 };
  }
  return { stage: "flow", bpm: 94 + progress * 20, cutoff: 1700 };
}

// Original E-minor groove, synthesized locally; the music never changes game time.
// Separate the three upper voices from the bass; share the voicings with the
// bundled renderer so both playback paths have the same clear arrangement.
export const MUSIC_CHORDS = [[64, 71, 79], [60, 67, 76], [57, 64, 72], [59, 66, 74]];
export const MUSIC_ROOTS = [40, 36, 33, 35];
const ARPEGGIO = [0, 2, 1, 2, 0, 1, 2, 1];

export function createMusic(context, { setTimer = setInterval, clearTimer = clearInterval } = {}) {
  const output = context.createGain();
  const filter = context.createBiquadFilter();
  output.gain.value = 0;
  filter.type = "lowpass";
  filter.frequency.value = 1700;
  filter.Q.value = .45;
  filter.connect(output);
  output.connect(context.destination);

  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const voices = new Set();
  let enabled = true;
  let visible = true;
  let active = false;
  let volume = 1;
  let timer = null;
  let remaining = 0;
  let duration = 120;
  let step = 0;
  let nextStep = 0;
  let profile = musicProfile(duration, duration);

  function voice(source, at, length, volume, destination = filter, extraNodes = []) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    source.connect(envelope);
    envelope.connect(destination);
    voices.add(source);
    source.onended = () => {
      source.disconnect(); envelope.disconnect();
      extraNodes.forEach(node => node.disconnect());
      voices.delete(source);
    };
    source.start(at);
    source.stop(at + length + .025);
  }

  function tone(note, at, length, volume, type = "sine") {
    const source = context.createOscillator();
    source.type = type;
    source.frequency.value = 440 * 2 ** ((note - 69) / 12);
    voice(source, at, length, volume);
  }

  function percussion(at, length, volume, frequency, type) {
    const source = context.createBufferSource();
    const shape = context.createBiquadFilter();
    source.buffer = noise;
    shape.type = type;
    shape.frequency.value = frequency;
    shape.Q.value = .6;
    shape.connect(filter);
    voice(source, at, length, volume, shape, [shape]);
  }

  function kick(at) {
    const source = context.createOscillator();
    source.frequency.setValueAtTime(115, at);
    source.frequency.exponentialRampToValueAtTime(45, at + .12);
    voice(source, at, .1, .09);
  }

  function scheduleStep(at) {
    const beat = step % 16;
    const bar = Math.floor(step / 16);
    const chord = MUSIC_CHORDS[bar % MUSIC_CHORDS.length];
    const urgent = profile.stage === "rush" || profile.stage === "final";
    const final = profile.stage === "final";
    // Sparse electric-piano chords become a busier, higher arpeggio in the finish.
    if (beat === 0 || beat === 10) {
      chord.forEach((note, index) => tone(note, at + index * .012, .24, beat === 0 ? .045 : .03));
    }
    if (beat === 0 || beat === 8 || (urgent && (beat === 6 || beat === 14))) {
      tone(MUSIC_ROOTS[bar % MUSIC_ROOTS.length], at, .16, .09);
    }
    const melodyStep = final ? 1 : urgent ? 2 : profile.stage === "build" ? 4 : 8;
    if (beat % melodyStep === (melodyStep === 1 ? 0 : 2 % melodyStep)) {
      const note = chord[ARPEGGIO[Math.floor(step / melodyStep) % ARPEGGIO.length]];
      const melodyLength = Math.min(.15, 60 / profile.bpm / 4 * .72);
      tone(note, at, melodyLength, final ? .04 : .055);
    }
    if (beat === 0 || beat === 8 || (final && (beat === 3 || beat === 11))) kick(at);
    if (beat === 4 || beat === 12) percussion(at, .11, .09, 1500, "bandpass");
    if (urgent || beat % 2 === 0) percussion(at, .035, beat % 4 === 0 ? .026 : .016, 4200, "highpass");
  }

  function schedule() {
    if (!active || !enabled || !visible || context.state !== "running") return;
    const now = context.currentTime;
    // Resume from now after browser throttling instead of replaying missed beats.
    if (nextStep < now - .1) nextStep = now + .025;
    while (nextStep < now + .15) {
      scheduleStep(nextStep);
      nextStep += 60 / profile.bpm / 4;
      step++;
    }
  }

  function hush() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    const now = context.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setTargetAtTime(0, now, .018);
    voices.forEach(source => {
      try { source.stop(now + .1); } catch { /* An ended voice is already silent. */ }
    });
  }

  function resume() {
    if (!active || !enabled || !visible || timer !== null) return;
    nextStep = context.currentTime + .04;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(.12 * volume, context.currentTime, .06);
    timer = setTimer(schedule, 50);
    schedule();
  }

  function update(left, total = duration) {
    remaining = left;
    duration = total;
    profile = musicProfile(remaining, duration);
    filter.frequency.setTargetAtTime(profile.cutoff, context.currentTime, .5);
    if (remaining <= 0) { active = false; hush(); }
    return profile;
  }

  return {
    start(left, total) {
      hush(); step = 0;
      update(left, total);
      active = left > 0;
      resume();
    },
    update,
    stop() { active = false; hush(); },
    setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = clamp(value, 0, 1);
      if (timer !== null) output.gain.setTargetAtTime(.12 * volume, context.currentTime, .03);
    },
    setEnabled(value) { enabled = value; if (value) resume(); else hush(); },
    setVisible(value) { visible = value; if (value) resume(); else hush(); }
  };
}
