import { createMusic } from "./music.js?rev=audio-gesture-1";

export function playShiftWhistle(context, destination) {
  // A short referee-style double whistle, with soft attacks and a capped level.
  for (const [offset, length] of [[.12, .13], [.35, .55]]) {
    const at = context.currentTime + offset;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(.1, at + .015);
    envelope.gain.setValueAtTime(.085, at + length * .65);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    envelope.connect(destination);
    let remaining = 2;
    for (const frequency of [2180, 2795]) {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.linearRampToValueAtTime(frequency + 28, at + .035);
      oscillator.frequency.linearRampToValueAtTime(frequency - 12, at + length);
      oscillator.connect(envelope);
      oscillator.start(at);
      oscillator.stop(at + length + .025);
      oscillator.onended = () => {
        oscillator.disconnect();
        if (--remaining === 0) envelope.disconnect();
      };
    }
  }
}

// Presentation only: feedback never changes water, heat, deadlines or achievement.
export function serviceJudgment(stage, temperature, clearsBacklog) {
  if (clearsBacklog) return { title: "RECOVERY", detail: "滞りを解消。流れを取り戻した！", color: "#79d9ed", sound: "recovery" };
  if (stage === "on-time" && temperature >= 96) return { title: "PERFECT", detail: "定刻 × 96°C以上。理想の給湯！", color: "#d0ff82", sound: "perfect" };
  if (stage === "on-time") return { title: "NICE FLOW", detail: "待たせず、900mlを届けた！", color: "#b7ee68", sound: "serve" };
  if (stage === "critical") return { title: "JUST IN TIME", detail: "時間超過前に間に合った！", color: "#ffbc76", sound: "serve" };
  return { title: "DELIVERED", detail: "900mlを提供。次の準備へ！", color: "#79d9ed", sound: "serve" };
}

export function createFeedback({ THREE, scene, camera, musicFactory = createMusic }) {
  const layer = document.querySelector("#feedback-layer");
  const judgment = document.querySelector("#service-feedback");
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let effectsEnabled = true;
  let context;
  let master;
  let soundEnabled = true;
  let musicEnabled = true;
  let music;
  const musicSession = { active: false, remaining: 0, duration: 120 };
  let zoom = 0;
  let lastSound = -Infinity;
  let resultFrame = 0;
  const animations = new Set();
  const streams = [];
  const patterns = {
    start: [392, 523, 784], serve: [523, 659, 784], perfect: [659, 831, 988, 1319],
    recovery: [392, 523, 659, 1047], milestone: [523, 659, 784, 1047, 1319],
    ready: [784, 1047], recycle: [440, 659], order: [440], error: [196, 165]
  };

  function unlockAudio() {
    if (!soundEnabled && !musicEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!context || context.state === "closed") {
        try { music?.stop(); } catch { /* A closed device may no longer accept automation. */ }
        context = new Audio();
        master = context.createGain();
        master.gain.value = soundEnabled ? .2 : 0;
        master.connect(context.destination);
        music = musicFactory(context);
        music.setEnabled(musicEnabled);
        music.setVisible(!document.hidden);
        if (musicSession.active) music.start(musicSession.remaining, musicSession.duration);
      }
      if (context.state !== "running") context.resume().catch(() => {});
    } catch { /* Audio is optional; gameplay must still work. */ }
  }

  function play(type, streak = 0) {
    if (!soundEnabled || !context || context.state !== "running") return;
    if (type === "finish") {
      playShiftWhistle(context, master);
      return;
    }
    // Coalesce kettles that finish together and simultaneous new-order pings.
    if ((type === "ready" || type === "order") && context.currentTime - lastSound < .24) return;
    lastSound = context.currentTime;
    const notes = patterns[type] || patterns.serve;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const at = context.currentTime + index * .055;
      oscillator.type = type === "error" ? "triangle" : "sine";
      oscillator.frequency.value = frequency * (1 + Math.min(streak, 12) * .015);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(type === "order" ? .055 : .18, at + .008);
      envelope.gain.exponentialRampToValueAtTime(.001, at + .19);
      oscillator.connect(envelope); envelope.connect(master);
      oscillator.start(at); oscillator.stop(at + .21);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    });
  }

  function animate(element, keyframes, options) {
    if (!effectsEnabled || motionPreference.matches || !element?.animate) return;
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }

  function pulse(element) {
    animate(element, [{ transform: "scale(1)" }, { transform: "scale(1.13)" }, { transform: "scale(1)" }], { duration: 330, easing: "ease-out" });
  }

  function burst(color, amount = 22) {
    if (!effectsEnabled || motionPreference.matches) return;
    const room = Math.max(0, 64 - layer.childElementCount);
    for (let i = 0; i < Math.min(amount, room); i++) {
      const particle = document.createElement("i");
      particle.className = "celebration-particle";
      particle.style.background = i % 3 === 0 ? "#fff4d5" : color;
      layer.append(particle);
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * Math.min(innerWidth * .28, 260);
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      const animation = particle.animate([
        { transform: "translate(-50%, -50%) scale(0)", opacity: 0 },
        { transform: `translate(${dx * .3}px, ${dy * .3}px) scale(1) rotate(30deg)`, opacity: .95, offset: .2 },
        { transform: `translate(${dx}px, ${dy + 70}px) scale(.1) rotate(210deg)`, opacity: 0 }
      ], { duration: 650 + Math.random() * 350, easing: "cubic-bezier(.1,.6,.4,1)" });
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => { particle.remove(); animations.delete(animation); });
    }
  }

  function announce(title, detail, color = "#b7ee68", big = false) {
    judgment.style.setProperty("--feedback-color", color);
    judgment.querySelector("strong").textContent = title;
    judgment.querySelector("small").textContent = detail;
    judgment.classList.toggle("milestone", big);
    judgment.getAnimations().forEach(animation => animation.cancel());
    judgment.classList.add("visible");
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => judgment.classList.remove("visible"), big ? 1900 : 1250);
    animate(judgment, [
      { opacity: 0, transform: "translate(-50%, -30%) scale(.7)" },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1.08)", offset: .2 },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }
    ], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
    if (effectsEnabled && !motionPreference.matches) zoom = big ? 1.1 : .45;
  }

  function waterTrail(kettle, pot) {
    if (!effectsEnabled || motionPreference.matches) return;
    const from = new THREE.Vector3(-.57, 1.04, 0);
    kettle.group.localToWorld(from);
    const to = pot.group.position.clone().add(new THREE.Vector3(0, .75, 0));
    const middle = from.clone().lerp(to, .5); middle.y += .5;
    const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
    const material = new THREE.MeshBasicMaterial({ color: 0xb2f0ff, transparent: true, opacity: .85, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, .035, 6, false), material);
    scene.add(mesh);
    streams.push({ mesh, remaining: .65 });
  }

  function tick(dt) {
    for (let i = streams.length - 1; i >= 0; i--) {
      const stream = streams[i];
      stream.remaining -= dt;
      stream.mesh.material.opacity = Math.max(0, stream.remaining / .65) * .85;
      if (stream.remaining <= 0) {
        scene.remove(stream.mesh); stream.mesh.geometry.dispose(); stream.mesh.material.dispose(); streams.splice(i, 1);
      }
    }
    zoom = Math.max(0, zoom - dt * 2.1);
    const fov = 39 - (effectsEnabled && !motionPreference.matches ? zoom : 0);
    if (Math.abs(camera.fov - fov) > .001) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function countResult(element, value, suffix = "", digits = 0) {
    cancelAnimationFrame(resultFrame);
    if (!effectsEnabled || motionPreference.matches) { element.textContent = `${value}${suffix}`; return; }
    const started = performance.now();
    const frame = now => {
      const progress = Math.min(1, (now - started) / 900);
      element.textContent = `${Number((value * (1 - (1 - progress) ** 3)).toFixed(digits))}${suffix}`;
      if (progress < 1) resultFrame = requestAnimationFrame(frame);
    };
    resultFrame = requestAnimationFrame(frame);
  }

  function clear() {
    clearTimeout(announce.timer); cancelAnimationFrame(resultFrame);
    judgment.classList.remove("visible");
    animations.forEach(animation => animation.cancel()); animations.clear();
    layer.replaceChildren();
    streams.forEach(({ mesh }) => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
    streams.length = 0; zoom = 0;
  }

  function stopMusic() {
    musicSession.active = false;
    music?.stop();
  }

  document.addEventListener("visibilitychange", () => {
    music?.setVisible(!document.hidden);
    if (!document.hidden && musicSession.active) unlockAudio();
  });
  // Unlock inside the actual input event, before a button's click handler runs.
  // Retry after autoplay restrictions or mobile audio interruptions as well.
  document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  document.addEventListener("touchend", unlockAudio, { capture: true, passive: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  // Keep the shift's intent when the browser restores this page from its cache.
  window.addEventListener("pagehide", () => music?.setVisible(false));
  window.addEventListener("pageshow", () => {
    music?.setVisible(!document.hidden);
    if (musicSession.active) unlockAudio();
  });

  return {
    unlockAudio, play, pulse, burst, announce, waterTrail, tick, countResult, clear,
    startMusic(remaining, duration) {
      unlockAudio();
      Object.assign(musicSession, { active: true, remaining, duration });
      music?.start(remaining, duration);
    },
    updateMusic(remaining, duration) {
      Object.assign(musicSession, { remaining, duration });
      if (musicSession.active) music?.update(remaining, duration);
    },
    stopMusic,
    setMusic(enabled) {
      musicEnabled = enabled;
      if (enabled) unlockAudio();
      music?.setEnabled(enabled);
    },
    setSound(enabled) {
      soundEnabled = enabled;
      if (master && context) master.gain.setValueAtTime(enabled ? .2 : 0, context.currentTime);
      if (enabled) unlockAudio();
    },
    setEffects(enabled) { effectsEnabled = enabled; if (!enabled) clear(); }
  };
}
