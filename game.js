import * as THREE from "three";
import { createFeedback, serviceJudgment } from "./feedback.js";
import { createServiceCounts, orderStageKey, evaluateService, achievementLabel, achievementValue, serviceRank } from "./evaluation.js";
import { DIFFICULTIES, TIME_SLOTS } from "./config.js";
import { selection, updateSetupUI } from "./setup.js";

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x12221c, 0.034);
const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 6.2, 10.8);
camera.lookAt(0, 1.25, 0);

const hemisphere = new THREE.HemisphereLight(0xd9f2df, 0x172019, 2.2);
scene.add(hemisphere);
const keyLight = new THREE.DirectionalLight(0xffe4c1, 3.6);
keyLight.position.set(-4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const rim = new THREE.PointLight(0xb7ee68, 35, 14, 2);
rim.position.set(4, 4, -3);
scene.add(rim);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x17261f, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const counter = new THREE.Group();
const top = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.28, 3.35), new THREE.MeshStandardMaterial({ color: 0x9c7554, roughness: 0.72 }));
top.position.y = 1.25;
top.castShadow = top.receiveShadow = true;
counter.add(top);
const base = new THREE.Mesh(new THREE.BoxGeometry(10.7, 1.25, 2.6), new THREE.MeshStandardMaterial({ color: 0x23372e, roughness: 0.8 }));
base.position.set(0, 0.5, 0.1);
base.castShadow = base.receiveShadow = true;
counter.add(base);
for (let i = -4; i <= 4; i += 2) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.05, 2.64), new THREE.MeshStandardMaterial({ color: 0x34483d }));
  panel.position.set(i + .4, .5, .08); counter.add(panel);
}
scene.add(counter);

const kettleColors = [0xe75c42, 0xe3b440, 0x5ca88d, 0x728ed2, 0xa779c6];
const kettleData = [];
const clickable = [];

function makeKettle(index, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 1.52, z);
  group.scale.setScalar(.72);
  group.userData.index = index;

  const bodyMat = new THREE.MeshStandardMaterial({ color: kettleColors[index], roughness: .38, metalness: .12 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x151c19, roughness: .52 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d7d2, roughness: .26, metalness: .72 });
  const bodyProfile = [
    new THREE.Vector2(.42, 0), new THREE.Vector2(.57, .12), new THREE.Vector2(.61, .66),
    new THREE.Vector2(.57, 1.02), new THREE.Vector2(.45, 1.23), new THREE.Vector2(.18, 1.3), new THREE.Vector2(0, 1.3)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 28), bodyMat);
  body.position.y = .12; body.castShadow = true; group.add(body); clickable.push(body);
  body.userData.index = index;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.36, .43, .1, 24), darkMat);
  lid.position.y = 1.43; lid.castShadow = true; group.add(lid);
  const lidKnob = new THREE.Mesh(new THREE.SphereGeometry(.105, 14, 8), darkMat);
  lidKnob.scale.y = .55; lidKnob.position.y = 1.53; group.add(lidKnob);
  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(.67, .69, .11, 28), darkMat);
  baseRing.position.y = .05; group.add(baseRing);

  const spout = new THREE.Mesh(new THREE.ConeGeometry(.22, .72, 18), metalMat);
  spout.rotation.z = Math.PI * .38; spout.position.set(-.64, 1.02, 0); spout.castShadow = true; group.add(spout);
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.47, 1.22, 0), new THREE.Vector3(.92, 1.15, 0),
    new THREE.Vector3(1.02, .62, 0), new THREE.Vector3(.57, .25, 0)
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 24, .085, 10, false), darkMat);
  handle.castShadow = true; group.add(handle);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0x38433d, emissive: 0x000000, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 12), ledMat);
  led.position.set(.2, .17, .58); group.add(led);

  const selector = new THREE.Mesh(new THREE.RingGeometry(.75, .82, 32), new THREE.MeshBasicMaterial({ color: 0xb7ee68, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
  selector.rotation.x = -Math.PI / 2; selector.position.y = .015; group.add(selector);

  const steam = [];
  for (let s = 0; s < 6; s++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(.055 + s * .012, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe8f1ec, transparent: true, opacity: 0 }));
    puff.position.set((s % 2 ? .08 : -.08), 1.57 + s * .13, 0); group.add(puff); steam.push(puff);
  }

  scene.add(group);
  kettleData.push({ index, group, body, led, selector, steam, water: 0, temp: 22, state: "empty", boilTime: 0, pourAnim: 0 });
}

[
  [.45, .55], [1.45, -.8], [2.45, .05], [3.45, -.8], [4.45, .55]
].forEach(([x, z], i) => makeKettle(i, x, z));

const potData = [];
const POT_QUEUE_POSITIONS = [
  [-4.65, -.45], [-3.45, -.45], [-2.25, -.45], [-1.05, -.45],
  [-4.65, .75], [-3.45, .75], [-2.25, .75], [-1.05, .75]
];

function makeCoffeePot(index, x) {
  const group = new THREE.Group();
  group.position.set(x, 1.47, 1.12);
  group.scale.setScalar(.62);

  const steel = new THREE.MeshStandardMaterial({ color: 0xdce2df, roughness: .14, metalness: .9 });
  const polishedSteel = new THREE.MeshStandardMaterial({ color: 0xf2f5f3, roughness: .08, metalness: .96 });
  const ventDark = new THREE.MeshStandardMaterial({ color: 0x252b28, roughness: .35, metalness: .45 });
  const water = new THREE.MeshStandardMaterial({ color: 0x79b9c5, roughness: .18, transparent: true, opacity: .72 });

  // TAKAHIRO「雫」を思わせる、広い底から上へ素直に絞られた円錐台形の鏡面ボディ。
  const potProfile = [
    new THREE.Vector2(.38, 0), new THREE.Vector2(.5, .05), new THREE.Vector2(.55, .14),
    new THREE.Vector2(.54, .3), new THREE.Vector2(.51, .5), new THREE.Vector2(.47, .7),
    new THREE.Vector2(.43, .9), new THREE.Vector2(.39, 1.04), new THREE.Vector2(.34, 1.08),
    new THREE.Vector2(0, 1.08)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 32), steel);
  body.position.y = .04; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(.52, .54, .065, 32), polishedSteel);
  baseRim.position.y = .065; baseRim.castShadow = true; group.add(baseRim);
  const topRim = new THREE.Mesh(new THREE.TorusGeometry(.43, .026, 8, 32), polishedSteel);
  topRim.rotation.x = Math.PI / 2; topRim.position.y = 1.115; group.add(topRim);

  // 広いフランジ、浅いドーム、大きめの丸いつまみ。
  const lidFlange = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .045, 32), polishedSteel);
  lidFlange.position.y = 1.13; lidFlange.castShadow = true; group.add(lidFlange);
  const lidDome = new THREE.Mesh(new THREE.SphereGeometry(.4, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), polishedSteel);
  lidDome.scale.y = .45; lidDome.position.y = 1.145; lidDome.castShadow = true; group.add(lidDome);
  const knobStem = new THREE.Mesh(new THREE.CylinderGeometry(.07, .085, .075, 18), polishedSteel);
  knobStem.position.y = 1.345; group.add(knobStem);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.105, .095, .09, 20), polishedSteel);
  knob.position.y = 1.425; knob.castShadow = true; group.add(knob);
  const knobTop = new THREE.Mesh(new THREE.SphereGeometry(.098, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), polishedSteel);
  knobTop.scale.y = .28; knobTop.position.y = 1.47; group.add(knobTop);
  const vent = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), ventDark);
  vent.position.set(.21, 1.275, .12); group.add(vent);

  // 本体下部から立ち上がり、先端でわずかに寝る約7mm相当の極細S字注ぎ口。
  const spoutCollar = new THREE.Mesh(new THREE.CylinderGeometry(.085, .12, .15, 18), polishedSteel);
  spoutCollar.rotation.z = Math.PI / 2; spoutCollar.position.set(-.49, .37, 0); group.add(spoutCollar);
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.5, .37, 0), new THREE.Vector3(-.68, .31, 0),
    new THREE.Vector3(-.84, .37, 0), new THREE.Vector3(-.93, .58, 0),
    new THREE.Vector3(-.94, .84, 0), new THREE.Vector3(-.92, 1.03, 0),
    new THREE.Vector3(-1.03, 1.16, 0), new THREE.Vector3(-1.2, 1.18, 0)
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 40, .029, 10, false), polishedSteel);
  spout.castShadow = true; group.add(spout);

  // ボディの上下へ溶接された、大きなステンレス製ループハンドル。
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.4, .94, 0), new THREE.Vector3(.7, 1.0, 0),
    new THREE.Vector3(.94, .86, 0), new THREE.Vector3(1.01, .63, 0),
    new THREE.Vector3(.96, .4, 0), new THREE.Vector3(.7, .22, 0),
    new THREE.Vector3(.42, .27, 0)
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 36, .058, 10, false), polishedSteel);
  handle.castShadow = true; group.add(handle);
  const upperMount = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .12, 16), polishedSteel);
  upperMount.rotation.z = Math.PI / 2; upperMount.position.set(.45, .94, 0); group.add(upperMount);
  const lowerMount = upperMount.clone(); lowerMount.position.set(.45, .27, 0); group.add(lowerMount);

  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(.38, .43, .72, 24), water);
  liquid.position.y = .4; liquid.scale.y = .02; liquid.visible = false; group.add(liquid);
  const requestRing = new THREE.Mesh(new THREE.RingGeometry(.59, .67, 28), new THREE.MeshBasicMaterial({ color: 0xff9b56, side: THREE.DoubleSide, transparent: true, opacity: .12 }));
  requestRing.rotation.x = -Math.PI / 2; requestRing.position.y = .015; group.add(requestRing);

  scene.add(group);
  potData.push({ index, group, liquid, requestRing, water: 0, temp: 22, waterLevel: 0, flash: 0, returnAnim: 0, busyTime: 0, assignedDripper: null });
}

POT_QUEUE_POSITIONS.forEach(([x, z], i) => { makeCoffeePot(i, x); potData[i].group.position.z = z; });

const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: 0x1b2d25, roughness: 1 }));
wall.position.set(0, 5, -4); scene.add(wall);
const sign = new THREE.Group();
const signBg = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.05, .08), new THREE.MeshStandardMaterial({ color: 0x122019 }));
signBg.position.set(0, 4.55, -3.86); sign.add(signBg);
for (let i = 0; i < 5; i++) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? .23 : .62, .13, .04), new THREE.MeshBasicMaterial({ color: 0xb7ee68 }));
  bar.position.set(-1.5 + i * .78, 4.55, -3.8); sign.add(bar);
}
scene.add(sign);

const ROOM_TEMP = 22;
const FILL_RATE = .25;
const HEAT_POWER = 13.8;
const KETTLE_COOL_RATE = .25;
const ORDER_STAGES = [
  { key: "on-time", label: "ON TIME" },
  { key: "delayed", label: "DELAYED" },
  { key: "critical", label: "CRITICAL" },
  { key: "overdue", label: "OVERDUE" }
];
const KETTLE_LAYOUTS = {
  2: [[1.7, -.2], [3.5, -.2]],
  3: [[1.15, .5], [2.45, -.72], [3.75, .5]],
  4: [[.75, .5], [1.85, -.72], [3.05, -.72], [4.15, .5]],
  5: [[.45, .55], [1.45, -.8], [2.45, .05], [3.45, -.8], [4.45, .55]]
};
const state = { running: false, difficulty: "normal", timeSlot: "afternoon", activeKettles: 3, activeDrippers: 4, selected: 0, selectedDripper: 0, potQueue: [0, 1, 2, 3, 4, 5, 6, 7], filling: false, fillKettle: null, time: 90, achievement: null, serviceCounts: createServiceCounts(), combo: 0, bestCombo: 0, served: 0, perfect: 0, recoveries: 0, flowEffect: 0, orderId: 1, orders: [], nextOrder: 1.5, sound: true, effects: true };
const $ = (q) => document.querySelector(q);
const ui = {
  achievement: $("#achievement"), combo: $("#combo"), timer: $("#timer"), orders: $("#orders"), count: $("#order-count"),
  number: $("#selected-number"), temp: $("#selected-temp"), water: $("#selected-water"), tempBar: $("#temp-bar"), state: $("#selected-state"),
  tabs: $("#kettle-tabs"), potQueue: $("#pot-queue"), availablePots: $("#available-pots"), target: $("#target-line"),
  fill: $("#fill-button"), heat: $("#heat-button"), returnWater: $("#return-button"), serve: $("#serve-button"), toast: $("#toast"),
  shiftStatus: $("#shift-status"), dripperLabel: $("#dripper-label"), kettleShortcuts: $("#kettle-shortcuts"), setupLead: $("#setup-lead"),
  difficultySummary: $("#difficulty-summary"), timeSummary: $("#time-summary"), resultMode: $("#result-mode"),
  flowHud: $("#flow-hud"), flowLabel: $("#flow-label"), flowBar: $("#flow-bar"), flowHint: $("#flow-hint"), servedVolume: $("#served-volume")
};
const feedback = createFeedback({ THREE, scene, camera });

function breakChain() {
  state.combo = 0;
  state.flowEffect = 0;
  ui.flowHud.classList.remove("in-flow");
}

function serviceCelebration(order, temperature) {
  const recovered = order.overdue && !state.orders.some(item => item.overdue);
  const judgment = serviceJudgment(getOrderStage(order).key, temperature, recovered);
  if (judgment.title === "PERFECT") state.perfect++;
  if (recovered) state.recoveries++;
  if (order.overdue) breakChain();
  else state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const milestone = state.combo === 3 ? "FLOW!" : state.combo === 5 ? "UNSTOPPABLE" : state.combo > 0 && state.combo % 10 === 0 ? "LEGENDARY" : null;
  if (state.combo >= 3) state.flowEffect = 8;
  feedback.announce(milestone || judgment.title, milestone ? `${state.combo} CHAIN · ${judgment.title} / ${judgment.detail}` : judgment.detail, milestone ? "#ffd67d" : judgment.color, Boolean(milestone));
  feedback.play(milestone ? "milestone" : judgment.sound, state.combo);
  feedback.burst(milestone ? "#ffd67d" : judgment.color, milestone ? 40 : 22);
  feedback.pulse(ui.combo);
  feedback.pulse(ui.serve);
  const card = ui.orders.querySelector(`[data-dripper-index="${order.dripper}"]`);
  if (card) feedback.pulse(card);
}

for (let i = 0; i < 5; i++) {
  const button = document.createElement("button");
  button.className = "kettle-tab"; button.textContent = `0${i + 1}`; button.onclick = () => selectKettle(i);
  ui.tabs.append(button);
}

for (let i = 0; i < 8; i++) {
  const slot = document.createElement("span");
  slot.className = "pot-slot";
  ui.potQueue.append(slot);
}

function applyConfiguration() {
  const difficulty = DIFFICULTIES[state.difficulty];
  const slot = TIME_SLOTS[state.timeSlot];
  state.activeKettles = difficulty.kettles;
  state.activeDrippers = difficulty.drippers;
  if (state.selected >= state.activeKettles) state.selected = 0;
  if (state.selectedDripper >= state.activeDrippers) state.selectedDripper = 0;

  const layout = KETTLE_LAYOUTS[state.activeKettles];
  kettleData.forEach((kettle, index) => {
    const active = index < state.activeKettles;
    kettle.group.visible = active;
    if (active) {
      kettle.group.position.x = layout[index][0];
      kettle.group.position.z = layout[index][1];
    }
  });
  [...ui.tabs.children].forEach((tab, index) => { tab.hidden = index >= state.activeKettles; });
  ui.tabs.style.gridTemplateColumns = `repeat(${state.activeKettles}, 1fr)`;
  ui.orders.style.setProperty("--drippers", state.activeDrippers);
  ui.dripperLabel.textContent = `${state.activeDrippers} DRIPPERS`;
  ui.kettleShortcuts.textContent = state.activeKettles === 1 ? "1" : `1—${state.activeKettles}`;
  ui.shiftStatus.innerHTML = `<span class="live-dot"></span>${difficulty.label} / ${slot.label} ${slot.range}`;
  canvas.setAttribute("aria-label", `右側に配置された${state.activeKettles}台の電気ケトルと、左側に並ぶコーヒーポットキューの3D作業台`);

  scene.fog.color.setHex(slot.fog);
  keyLight.color.setHex(slot.key);
  rim.color.setHex(slot.rim);
  hemisphere.intensity = state.timeSlot === "closing" ? 1.65 : 2.2;
  renderer.toneMappingExposure = slot.exposure;
  document.body.dataset.timeSlot = state.timeSlot;
}

function selectKettle(index) {
  if (index < 0 || index >= state.activeKettles) return;
  if (state.filling) endFill();
  state.selected = index;
  kettleData.forEach((k, i) => { k.selector.material.opacity = i === index ? .9 : 0; });
  updateUI();
}

function selectDripper(index) {
  if (index < 0 || index >= state.activeDrippers) return;
  state.selectedDripper = index;
  updateUI();
}

let toastTimer;
function toast(message, error = false) {
  clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.className = `toast show${error ? " error" : ""}`;
  toastTimer = setTimeout(() => ui.toast.className = "toast", 1200);
}

function addOrder() {
  if (state.orders.length >= state.activeDrippers) return;
  const occupied = new Set(state.orders.map(order => order.dripper));
  const available = Array.from({ length: state.activeDrippers }, (_, index) => index).filter(index => !occupied.has(index));
  if (!available.length) return;
  const dripper = available[Math.floor(Math.random() * available.length)];
  const slot = TIME_SLOTS[state.timeSlot];
  const variance = .9 + Math.random() * .2;
  const stageDurations = slot.orderStages.map(seconds => seconds * variance);
  const max = stageDurations.reduce((total, seconds) => total + seconds, 0);
  state.orders.push({ id: state.orderId++, dripper, time: max, max, stageDurations, overdue: false });
  if (state.orders.length === 1) state.selectedDripper = dripper;
  feedback.play("order");
}

function getOrderStage(order) {
  if (!order) return null;
  return ORDER_STAGES.find(stage => stage.key === orderStageKey(order));
}

function beginFill() {
  if (!state.running) return;
  const k = kettleData[state.selected];
  if (k.state === "heating") return toast("加熱中は給水できません", true);
  if (k.water >= 1.199) return toast("ケトルは満水です", true);
  state.filling = true;
  state.fillKettle = state.selected;
  updateUI();
}

function endFill() {
  if (!state.filling) return;
  state.filling = false;
  state.fillKettle = null;
  updateUI();
}

function heatSelected() {
  if (!state.running) return;
  endFill();
  const k = kettleData[state.selected];
  if (k.water <= 0) { breakChain(); feedback.play("error"); toast("空焚き！", true); updateUI(); return; }
  if (k.state === "heating") { k.state = k.temp >= 92 ? "ready" : "filled"; toast("加熱を停止"); }
  else { k.state = "heating"; toast(`KETTLE 0${k.index + 1} — 加熱開始`); }
  updateUI();
}

function returnWaterToKettle() {
  if (!state.running) return;
  endFill();
  const k = kettleData[state.selected];
  const headIndex = state.potQueue[0];
  if (headIndex === undefined) return toast("すべてのポットが使用中です", true);
  const pot = potData[headIndex];
  if (pot.water <= 0) return toast("キュー先頭は空のポットです", true);
  if (k.state === "heating") return toast("加熱中のケトルには戻せません", true);
  const capacity = 1.2 - k.water;
  if (capacity + .001 < pot.water) return toast(`ケトルの空き容量が${Math.round((pot.water - capacity) * 1000)}ml不足`, true);
  const transferred = pot.water;
  const mixedVolume = k.water + transferred;
  k.temp = ((k.water * k.temp) + (transferred * pot.temp)) / mixedVolume;
  k.water = Math.round(mixedVolume * 100) / 100;
  k.state = k.temp >= 92 ? "ready" : "filled"; k.boilTime = 0;
  pot.water = 0; pot.temp = 22; pot.waterLevel = 0; pot.flash = 1; pot.returnAnim = 1;
  state.potQueue.shift();
  state.potQueue.push(pot.index);
  feedback.play("recycle");
  feedback.pulse(ui.returnWater);
  toast(`QUEUE → KETTLE 0${k.index + 1} / ${Math.round(transferred * 1000)}ml回収`); updateUI();
}

function serveSelected() {
  if (!state.running) return;
  endFill();
  const k = kettleData[state.selected];
  const emptyQueueIndex = state.potQueue.findIndex(index => potData[index].water <= 0);
  if (emptyQueueIndex < 0) return toast("空のポットがありません", true);
  const potIndex = state.potQueue[emptyQueueIndex];
  const pot = potData[potIndex];
  const orderIndex = state.orders.findIndex(order => order.dripper === state.selectedDripper);
  if (orderIndex < 0) return toast(`DRIPPER 0${state.selectedDripper + 1} は待機中です`, true);
  if (k.water + .001 < .9) return toast("水量不足 — 900ml必要", true);
  if (k.temp < 92) { breakChain(); feedback.play("error"); toast(`${Math.round(k.temp)}°C — まだぬるい！`, true); updateUI(); return; }
  const [order] = state.orders.splice(orderIndex, 1);
  state.serviceCounts[orderStageKey(order)]++;
  state.served++;
  serviceCelebration(order, k.temp);
  feedback.waterTrail(k, pot);
  k.water = Math.max(0, Math.round((k.water - .9) * 100) / 100);
  k.temp = Math.max(22, k.temp - 8);
  k.state = k.water > 0 ? (k.temp >= 92 ? "ready" : "filled") : "empty";
  k.boilTime = 0; k.pourAnim = 1;
  pot.water = .9; pot.temp = k.temp + 8; pot.waterLevel = 1; pot.flash = 1; pot.busyTime = 7; pot.presentationTime = .7; pot.assignedDripper = order.dripper;
  state.potQueue.splice(emptyQueueIndex, 1);
  updateUI();
}

function resetGame() {
  feedback.clear();
  feedback.unlockAudio();
  const difficulty = DIFFICULTIES[state.difficulty];
  Object.assign(state, { running: true, activeKettles: difficulty.kettles, activeDrippers: difficulty.drippers, selected: 0, selectedDripper: 0, potQueue: [0, 1, 2, 3, 4, 5, 6, 7], filling: false, fillKettle: null, time: 90, achievement: null, serviceCounts: createServiceCounts(), combo: 0, bestCombo: 0, served: 0, perfect: 0, recoveries: 0, flowEffect: 0, orderId: 1, orders: [], nextOrder: .6 });
  kettleData.forEach(k => Object.assign(k, { water: 0, temp: 22, state: "empty", boilTime: 0, pourAnim: 0 }));
  potData.forEach((pot, i) => {
    Object.assign(pot, { water: 0, temp: 22, waterLevel: 0, flash: 0, returnAnim: 0, busyTime: 0, presentationTime: 0, assignedDripper: null });
    pot.group.visible = true; pot.group.rotation.z = 0; pot.liquid.visible = false;
    pot.group.position.set(POT_QUEUE_POSITIONS[i][0], 1.47, POT_QUEUE_POSITIONS[i][1]);
  });
  ui.orders.replaceChildren();
  applyConfiguration();
  $("#intro").classList.remove("show"); $("#result").classList.remove("show");
  ui.flowHud.hidden = false;
  ui.timer.classList.remove("warning"); ui.timer.querySelector("strong").textContent = "01:30";
  clearTimeout(toastTimer); ui.toast.className = "toast";
  feedback.announce("LET’S FLOW", "90秒間、店の流れを守れ。", "#b7ee68");
  feedback.play("start");
  selectKettle(0); updateUI();
}

function endGame() {
  endFill();
  state.running = false;
  feedback.clear();
  ui.flowHud.hidden = true;
  const evaluation = evaluateService(state.serviceCounts, state.orders);
  state.achievement = evaluation.percentage;
  const rank = serviceRank(state.achievement);
  $("#result-rank").textContent = rank ? `RANK ${rank}` : "未評価";
  ui.resultMode.textContent = `${DIFFICULTIES[state.difficulty].label} / ${TIME_SLOTS[state.timeSlot].label} ${TIME_SLOTS[state.timeSlot].range}`;
  $("#result-copy").textContent = !rank ? "評価対象の注文はまだありません。注文が届いたらお湯を提供しよう。" : rank === "S" ? "見事な先読み。ほぼすべての注文を定刻に提供できました。" : rank === "A" ? "ナイスリベロ！安定した給湯で店を支えました。" : "ON TIMEでの提供を増やし、待たせている注文を減らそう。";
  $("#final-achievement").textContent = achievementLabel(state.achievement); $("#final-served").textContent = state.served; $("#final-combo").textContent = state.bestCombo;
  $("#evaluation-summary").textContent = `評価対象 ${evaluation.evaluated}件：提供 ${evaluation.completed}件 / 未提供 ${evaluation.unserved}件（0%）・猶予中 ${evaluation.grace}件は評価保留`;
  $("#evaluation-breakdown").textContent = `提供時の内訳 · ON TIME ${state.serviceCounts["on-time"]} / DELAYED ${state.serviceCounts.delayed} / CRITICAL ${state.serviceCounts.critical} / OVERDUE ${state.serviceCounts.overdue}`;
  $("#final-perfect").textContent = state.perfect;
  $("#final-recovery").textContent = state.recoveries;
  $("#final-volume").textContent = `${(state.served * .9).toFixed(1)} L`;
  $("#result").classList.add("show");
  if (state.achievement !== null) feedback.countResult($("#final-achievement"), achievementValue(state.achievement), "%", 1);
  ui.achievement.textContent = achievementLabel(state.achievement);
  feedback.pulse($("#result-rank"));
  feedback.play("finish");
}

function renderOrders() {
  for (let dripperIndex = 0; dripperIndex < state.activeDrippers; dripperIndex++) {
    const order = state.orders.find(item => item.dripper === dripperIndex);
    let element = ui.orders.querySelector(`[data-dripper-index="${dripperIndex}"]`);
    if (!element) {
      element = document.createElement("button");
      element.type = "button";
      element.className = "order";
      element.dataset.dripperIndex = dripperIndex;
      element.innerHTML = `<span class="order-no">D${String(dripperIndex + 1).padStart(2,"0")}</span><span class="order-copy"><b>DRIPPER ${String(dripperIndex + 1).padStart(2,"0")}</b><small></small></span><span class="order-time"></span>`;
      element.onclick = () => selectDripper(dripperIndex);
      ui.orders.append(element);
    }
    const life = order ? Math.max(0, order.time / order.max * 100) : 0;
    const stage = getOrderStage(order);
    element.classList.toggle("active", state.selectedDripper === dripperIndex);
    element.classList.toggle("idle", !order);
    ORDER_STAGES.forEach(item => element.classList.toggle(item.key, stage?.key === item.key));
    element.style.setProperty("--life", `${life}%`);
    element.querySelector(".order-copy small").textContent = order ? `${stage.label} / 900ml` : "リクエスト待機中";
    element.querySelector(".order-time").textContent = order?.overdue ? "OVER" : order ? `${Math.ceil(order.time)}s` : "—";
  }
  ui.count.textContent = state.orders.length;
}

function updateUI() {
  const k = kettleData[state.selected];
  const evaluation = evaluateService(state.serviceCounts, state.orders);
  state.achievement = evaluation.percentage;
  ui.achievement.textContent = achievementLabel(state.achievement);
  ui.achievement.parentElement.classList.toggle("warning", state.achievement !== null && state.achievement < 80);
  ui.achievement.parentElement.title = `提供時の状態：ON TIME 100% / DELAYED 70% / CRITICAL 30% / OVERDUE 0%。評価対象 ${evaluation.evaluated}件（未提供 ${evaluation.unserved}件は0%）。猶予中 ${evaluation.grace}件は保留。`;
  ui.combo.textContent = `${state.combo}`;
  ui.flowHud.classList.toggle("in-flow", state.flowEffect > 0);
  const targetChain = state.combo < 3 ? 3 : state.combo < 5 ? 5 : (Math.floor(state.combo / 10) + 1) * 10;
  ui.flowLabel.textContent = state.flowEffect > 0 ? "FLOW STATE" : "BUILD YOUR FLOW";
  ui.flowBar.style.width = `${state.flowEffect > 0 ? state.flowEffect / 8 * 100 : state.combo / targetChain * 100}%`;
  ui.flowHint.textContent = state.combo < 3 ? `時間超過前にあと${3 - state.combo}回連続提供で FLOW` : `${state.combo} CHAIN · 次は ${targetChain} CHAIN を目指せ`;
  ui.servedVolume.textContent = `${(state.served * .9).toFixed(1)} L SERVED`;
  ui.number.textContent = `0${k.index + 1}`; ui.temp.innerHTML = `${Math.round(k.temp)}<small>°C</small>`; ui.water.innerHTML = `${k.water.toFixed(2)}<small>L</small>`;
  ui.tempBar.style.width = `${Math.min(100, Math.max(0, (k.temp - 20) / 80 * 100))}%`;
  const labels = { empty: "空 — 給水してください", filled: "待機中 — 加熱できます", heating: "加熱中 — 温度上昇", ready: "準備完了 — 提供できます" };
  ui.state.textContent = labels[k.state];
  [...ui.tabs.children].forEach((tab, i) => { tab.classList.toggle("active", i === state.selected); tab.classList.toggle("hot", kettleData[i].temp >= 92); });
  const selectedOrder = state.orders.some(order => order.dripper === state.selectedDripper);
  const nextEmptyQueueIndex = state.potQueue.findIndex(index => potData[index].water <= 0);
  [...ui.potQueue.children].forEach((slot, queueIndex) => {
    const potIndex = state.potQueue[queueIndex];
    const pot = potIndex === undefined ? null : potData[potIndex];
    slot.className = "pot-slot";
    if (queueIndex === 0 && pot) slot.classList.add("head");
    if (queueIndex === nextEmptyQueueIndex && pot) slot.classList.add("serve-next");
    if (!pot) { slot.classList.add("in-use"); slot.textContent = "使用中"; }
    else if (pot.water > 0) { slot.classList.add("returned"); slot.textContent = `戻り ${Math.round(pot.water * 1000)}`; }
    else { slot.classList.add("empty"); slot.textContent = "空"; }
  });
  const headIndex = state.potQueue[0];
  const headPot = headIndex === undefined ? null : potData[headIndex];
  const nextEmptyPot = nextEmptyQueueIndex < 0 ? null : potData[state.potQueue[nextEmptyQueueIndex]];
  const emptyCount = state.potQueue.filter(index => potData[index].water <= 0).length;
  ui.availablePots.textContent = `${emptyCount} READY`;
  ui.target.textContent = !headPot
    ? "QUEUE EMPTY — 全ポット使用中"
    : headPot.water > 0 && nextEmptyPot
      ? `RETURN: ${Math.round(headPot.water * 1000)}ml → K${String(state.selected + 1).padStart(2,"0")} / SERVE: 空ポット → D${String(state.selectedDripper + 1).padStart(2,"0")}`
      : headPot.water > 0
        ? `RETURN: 戻り湯 ${Math.round(headPot.water * 1000)}ml・${Math.round(headPot.temp)}°C → K${String(state.selected + 1).padStart(2,"0")} / 空ポットなし`
        : `SERVE: 空ポット → D${String(state.selectedDripper + 1).padStart(2,"0")} / 900ml`;
  ui.fill.disabled = k.state === "heating" || k.water >= 1.199;
  ui.fill.style.setProperty("--fill-level", `${Math.min(100, k.water / 1.2 * 100)}%`);
  ui.fill.classList.toggle("holding", state.filling && state.fillKettle === state.selected);
  ui.heat.disabled = k.water <= 0;
  ui.returnWater.disabled = !headPot || headPot.water <= 0 || k.state === "heating" || k.water + headPot.water > 1.201;
  ui.serve.disabled = !nextEmptyPot || k.water < .9 || k.temp < 92 || !selectedOrder;
  ui.serve.classList.toggle("ready-to-pour", !ui.serve.disabled);
  renderOrders();
}

let last = performance.now();
let uiElapsed = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const rawDt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.running) {
    const previousTime = state.time;
    state.flowEffect = Math.max(0, state.flowEffect - rawDt);
    state.time = Math.max(0, state.time - rawDt);
    if (previousTime > 10 && state.time <= 10) {
      feedback.announce("LAST 10 SECONDS", "最後まで、流れをつなげ。", "#ffbc76");
      feedback.play("start");
      feedback.pulse(ui.timer);
    }
    state.nextOrder -= rawDt;
    if (state.nextOrder <= 0) {
      addOrder();
      const slot = TIME_SLOTS[state.timeSlot];
      state.nextOrder = slot.orderMin + Math.random() * (slot.orderMax - slot.orderMin);
    }
    let newlyOverdue = 0;
    state.orders.forEach(order => {
      if (order.overdue) return;
      order.time = Math.max(0, order.time - rawDt);
      if (order.time <= 0) { order.overdue = true; newlyOverdue++; }
    });
    if (newlyOverdue) {
      breakChain();
      feedback.play("error");
      toast("時間超過 — この注文は0%評価", true);
    }

    if (state.filling && state.fillKettle !== null) {
      const fillingKettle = kettleData[state.fillKettle];
      if (fillingKettle.state === "heating" || fillingKettle.water >= 1.199) {
        const reachedFull = fillingKettle.water >= 1.199;
        endFill();
        if (reachedFull) toast(`KETTLE 0${fillingKettle.index + 1} — 満水`);
      } else {
        const oldWater = fillingKettle.water;
        const added = Math.min(FILL_RATE * rawDt, 1.2 - oldWater);
        const newWater = oldWater + added;
        fillingKettle.temp = newWater > 0 ? ((oldWater * fillingKettle.temp) + (added * ROOM_TEMP)) / newWater : ROOM_TEMP;
        fillingKettle.water = newWater;
        fillingKettle.state = fillingKettle.temp >= 92 ? "ready" : "filled";
        fillingKettle.boilTime = 0;
        if (oldWater < .9 && newWater >= .9) {
          feedback.play("recycle");
          feedback.pulse(ui.water);
          toast("900ml確保 · 次は加熱！");
        }
      }
    }

    kettleData.forEach(k => {
      if (k.index >= state.activeKettles) return;
      if (k.state === "heating") {
        k.temp = Math.min(100, k.temp + (HEAT_POWER / Math.max(k.water, .05)) * rawDt);
        if (k.temp >= 99.5) {
          k.temp = 100; k.state = "ready";
          feedback.play("ready");
          feedback.pulse(ui.tabs.children[k.index]);
          toast(`KETTLE 0${k.index + 1} · READY 100°C`);
        }
      } else if (k.temp > 22) k.temp = Math.max(22, k.temp - KETTLE_COOL_RATE * rawDt);
      if (k.state === "ready" && k.temp < 92) k.state = "filled";
      if (k.temp >= 99.5) {
        k.boilTime += rawDt;
        if (k.boilTime > 9) { k.boilTime = 5; toast("沸騰放置 — 火傷に注意", true); }
      } else k.boilTime = 0;
      k.led.material.emissive.setHex(k.state === "heating" ? 0xff541f : k.temp >= 92 ? 0xb7ee68 : 0x000000);
      k.led.material.emissiveIntensity = k.state === "heating" || k.temp >= 92 ? 4 : 0;
      k.steam.forEach((p, i) => {
        const active = k.temp > 85;
        p.material.opacity = active ? Math.max(0, .25 - i * .025) * (0.65 + Math.sin(now * .003 + i) * .35) : 0;
        p.position.y = 1.55 + i * .14 + Math.sin(now * .0018 + i) * .05;
      });
      if (k.pourAnim > 0) k.pourAnim = Math.max(0, k.pourAnim - rawDt * 1.5);
      k.group.rotation.x = -Math.sin(k.pourAnim * Math.PI) * .32;
    });
    const firstEmptyPotIndex = state.potQueue.find(index => potData[index].water <= 0);
    potData.forEach(pot => {
      pot.flash = Math.max(0, pot.flash - rawDt * .8);
      pot.presentationTime = Math.max(0, (pot.presentationTime || 0) - rawDt);
      const wasBusy = pot.busyTime > 0;
      pot.busyTime = Math.max(0, pot.busyTime - rawDt);
      if (wasBusy && pot.busyTime <= 0) {
        pot.assignedDripper = null;
        pot.water = Math.round((.4 + Math.random() * .1) * 100) / 100;
        pot.temp = Math.max(22, pot.temp - (6 + Math.random() * 4));
        pot.flash = 1;
        if (!state.potQueue.includes(pot.index)) state.potQueue.push(pot.index);
      } else if (!wasBusy && pot.water > 0) {
        pot.temp = Math.max(22, pot.temp - .18 * rawDt);
      }
      pot.waterLevel = pot.busyTime > 0 ? .55 + (pot.busyTime / 7) * .45 : pot.water / .9;
      pot.liquid.visible = pot.waterLevel > .01;
      pot.liquid.scale.y = Math.max(.02, pot.waterLevel);
      pot.liquid.position.y = .12 + .32 * pot.waterLevel;
      const queueIndex = state.potQueue.indexOf(pot.index);
      pot.group.visible = queueIndex >= 0 || pot.presentationTime > 0;
      if (queueIndex >= 0) {
        const [targetX, targetZ] = POT_QUEUE_POSITIONS[queueIndex];
        pot.group.position.x += (targetX - pot.group.position.x) * Math.min(1, rawDt * 7);
        pot.group.position.z += (targetZ - pot.group.position.z) * Math.min(1, rawDt * 7);
      }
      const isReturnHead = queueIndex === 0 && pot.water > 0;
      const isServeNext = pot.index === firstEmptyPotIndex;
      pot.requestRing.material.opacity = isReturnHead || isServeNext ? .95 : .12;
      pot.requestRing.material.color.setHex(isReturnHead ? 0x79b9c5 : isServeNext ? 0xa7d46f : 0xff9b56);
      if (pot.returnAnim > 0) pot.returnAnim = Math.max(0, pot.returnAnim - rawDt * 1.6);
      pot.group.rotation.z = Math.sin(pot.returnAnim * Math.PI) * .45;
    });
    const mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    ui.timer.querySelector("strong").textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    ui.timer.classList.toggle("warning", state.time < 15);
    if (state.time <= 0) endGame();
    uiElapsed += rawDt;
    if (uiElapsed >= .1) { updateUI(); uiElapsed = 0; }
  }
  kettleData.forEach((k, i) => { k.group.position.y = 1.52 + Math.sin(now * .0012 + i) * .007; });
  feedback.tick(rawDt);
  renderer.render(scene, camera);
}

const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => {
  pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable).find(item => item.object.userData.index < state.activeKettles);
  if (hit) selectKettle(hit.object.userData.index);
});

let dragging = false, dragX = 0, cameraAngle = 0;
canvas.addEventListener("pointerdown", e => { dragging = true; dragX = e.clientX; });
addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => {
  if (!dragging) return;
  cameraAngle += (e.clientX - dragX) * .003; cameraAngle = Math.max(-.28, Math.min(.28, cameraAngle)); dragX = e.clientX;
  camera.position.x = Math.sin(cameraAngle) * 11; camera.position.z = Math.cos(cameraAngle) * 11; camera.lookAt(0, 1.25, 0);
});

addEventListener("keydown", e => {
  if (/^[1-5]$/.test(e.key) && Number(e.key) <= state.activeKettles) selectKettle(Number(e.key) - 1);
  if (e.key.toLowerCase() === "f" && !e.repeat) beginFill();
  if (e.key.toLowerCase() === "r") returnWaterToKettle();
  if (e.key.toLowerCase() === "s") serveSelected();
  if (e.code === "Space") { e.preventDefault(); heatSelected(); }
});

addEventListener("keyup", e => {
  if (e.key.toLowerCase() === "f") endFill();
});
addEventListener("blur", endFill);

ui.fill.addEventListener("pointerdown", e => { e.preventDefault(); beginFill(); });
ui.fill.addEventListener("pointercancel", endFill);
ui.fill.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("pointerup", endFill);
ui.heat.onclick = heatSelected; ui.returnWater.onclick = returnWaterToKettle; ui.serve.onclick = serveSelected;
$("#start-button").onclick = resetGame; $("#restart-button").onclick = resetGame;
$("#change-settings-button").onclick = () => {
  endFill();
  state.running = false;
  $("#result").classList.remove("show");
  $("#intro").classList.add("show");
  updateSetupUI();
};
function syncSetup() {
  state.difficulty = selection.difficulty;
  state.timeSlot = selection.timeSlot;
  state.orders = [];
  ui.orders.replaceChildren();
  applyConfiguration();
  selectKettle(0);
}
document.addEventListener("setup-change", syncSetup);
$("#sound-toggle").onclick = (e) => {
  state.sound = !state.sound;
  feedback.setSound(state.sound);
  e.currentTarget.classList.toggle("muted", !state.sound);
  e.currentTarget.setAttribute("aria-pressed", String(state.sound));
  if (state.sound) feedback.play("ready");
};
$("#effects-toggle").onclick = e => {
  state.effects = !state.effects;
  feedback.setEffects(state.effects);
  document.body.classList.toggle("effects-off", !state.effects);
  e.currentTarget.classList.toggle("muted", !state.effects);
  e.currentTarget.setAttribute("aria-pressed", String(state.effects));
};

function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize(); syncSetup(); updateSetupUI(); updateUI(); requestAnimationFrame(tick);
