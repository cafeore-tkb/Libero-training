import * as THREE from "three";
import { createFeedback, serviceJudgment } from "./feedback.js";
import { createServiceCounts, orderStageKey, evaluateService, achievementLabel, achievementValue, serviceRank } from "./evaluation.js";
import { DIFFICULTIES, TIME_SLOTS } from "./config.js";
import { selection, updateSetupUI } from "./setup.js";
import { planWaterReturn, transferReturnedWater } from "./water-return.js";
import { FILL_RATE, HEAT_POWER, POT_BUSY_TIME, POT_PRESENTATION_TIME, POUR_ANIMATION_RATE, RETURN_ANIMATION_RATE } from "./timing.js";
import { SERVING_TARGET, findServingQueueIndex, pourAvailableWater } from "./serving.js";
import { arrangePotQueue, potQueueLayout, POT_QUEUE_POSITIONS } from "./pot-queue.js";
import { keyboardAction } from "./keybindings.js";
import { updateKeyBindingLabels } from "./keybindings-ui.js";
import { createPauseController } from "./pause.js";

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
const WORKSPACE_CENTER = 1.35;
const CAMERA_DISTANCE = 19.5;
camera.position.set(WORKSPACE_CENTER, 8.2, CAMERA_DISTANCE);
camera.lookAt(WORKSPACE_CENTER, 1.25, .35);

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
const top = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.28, 5.6), new THREE.MeshStandardMaterial({ color: 0x9c7554, roughness: 0.72 }));
top.position.set(WORKSPACE_CENTER, 1.25, .55);
top.castShadow = top.receiveShadow = true;
counter.add(top);
const base = new THREE.Mesh(new THREE.BoxGeometry(13.7, 1.25, 4.85), new THREE.MeshStandardMaterial({ color: 0x23372e, roughness: 0.8 }));
base.position.set(WORKSPACE_CENTER, 0.5, .55);
base.castShadow = base.receiveShadow = true;
counter.add(base);
for (let i = -4; i <= 6; i += 2) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.05, 4.89), new THREE.MeshStandardMaterial({ color: 0x34483d }));
  panel.position.set(i + .4, .5, .55); counter.add(panel);
}
scene.add(counter);

// 「わく子」のマットホワイトを軸に、識別性だけを残した淡いカラーバリエーション。
const kettleColors = [0xf4efe5, 0xeadfd8, 0xdce8df, 0xdde5ed, 0xe7dfea];
const kettleAccentColors = [0xd77255, 0xc9a34d, 0x669b7d, 0x7188a7, 0x9875a0];
const kettleData = [];
const clickable = [];

function makeKettle(index, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 1.52, z);
  group.scale.setScalar(.72);
  group.userData.index = index;

  const bodyMat = new THREE.MeshStandardMaterial({ color: kettleColors[index], roughness: .62, metalness: .03 });
  const bodyHighlightMat = new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: .5, metalness: .02 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3432, roughness: .58 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xd7d4cc, roughness: .66 });
  const accentMat = new THREE.MeshStandardMaterial({ color: kettleAccentColors[index], roughness: .5 });
  const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x364441, roughness: .28, transparent: true, opacity: .9 });
  const gaugeWaterMat = new THREE.MeshStandardMaterial({ color: 0x8fc1ca, emissive: 0x17363b, emissiveIntensity: .35, roughness: .2 });
  const bodyProfile = [
    new THREE.Vector2(.43, 0), new THREE.Vector2(.54, .025), new THREE.Vector2(.59, .1),
    new THREE.Vector2(.605, .32), new THREE.Vector2(.605, .78), new THREE.Vector2(.585, 1.02),
    new THREE.Vector2(.54, 1.17), new THREE.Vector2(.45, 1.25), new THREE.Vector2(.16, 1.28),
    new THREE.Vector2(0, 1.28)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 36), bodyMat);
  body.position.y = .1; body.castShadow = true; body.receiveShadow = true; group.add(body); clickable.push(body);
  body.userData.index = index;

  // 低くフラットな着脱ふたと、上面の給湯ロックボタン。
  const lidRim = new THREE.Mesh(new THREE.CylinderGeometry(.46, .5, .075, 36), bodyHighlightMat);
  lidRim.position.y = 1.405; lidRim.castShadow = true; group.add(lidRim);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.43, .46, .075, 36), bodyMat);
  lid.position.y = 1.47; lid.castShadow = true; group.add(lid);
  const lockButton = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .11, 5, 12), darkMat);
  lockButton.rotation.z = Math.PI / 2; lockButton.scale.y = .52; lockButton.position.set(-.04, 1.54, .02); group.add(lockButton);

  // 薄い電源プレート。識別色は細いリングだけに抑える。
  const powerBase = new THREE.Mesh(new THREE.CylinderGeometry(.625, .65, .075, 36), darkMat);
  powerBase.position.y = .015; powerBase.castShadow = true; group.add(powerBase);
  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(.61, .625, .055, 36), baseMat);
  baseRing.position.y = .07; group.add(baseRing);
  const accentRing = new THREE.Mesh(new THREE.TorusGeometry(.605, .018, 6, 36), accentMat);
  accentRing.rotation.x = Math.PI / 2; accentRing.position.y = .105; group.add(accentRing);

  // 金属の長い口ではなく、本体と一体になった短い三角形の注ぎ口。
  const spoutShape = new THREE.Shape();
  spoutShape.moveTo(-.53, 1.05);
  spoutShape.lineTo(-.84, 1.16);
  spoutShape.lineTo(-.55, 1.31);
  spoutShape.lineTo(-.48, 1.23);
  spoutShape.closePath();
  const spout = new THREE.Mesh(new THREE.ExtrudeGeometry(spoutShape, { depth: .25, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025 }), bodyMat);
  spout.position.z = -.125; spout.castShadow = true; group.add(spout);
  const spoutOpening = new THREE.Mesh(new THREE.BoxGeometry(.045, .105, .2), darkMat);
  spoutOpening.rotation.z = -.23; spoutOpening.position.set(-.82, 1.17, 0); group.add(spoutOpening);

  // 側面の縦長水量窓。淡い水色と目盛りで「わく子」らしい表情を作る。
  const gauge = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .29, 6, 14), gaugeMat);
  gauge.scale.z = .18; gauge.position.set(.27, .76, .56); group.add(gauge);
  const gaugeWater = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .17, 5, 12), gaugeWaterMat);
  gaugeWater.scale.z = .2; gaugeWater.position.set(.27, .68, .578); group.add(gaugeWater);
  for (let mark = 0; mark < 3; mark++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(.055, .012, .018), bodyHighlightMat);
    tick.position.set(.31, .65 + mark * .13, .608); group.add(tick);
  }

  // 本体と同色の、太く握りやすい一体型Dハンドル。
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.46, 1.18, 0), new THREE.Vector3(.73, 1.25, 0),
    new THREE.Vector3(.94, 1.11, 0), new THREE.Vector3(1.0, .75, 0),
    new THREE.Vector3(.97, .4, 0), new THREE.Vector3(.79, .25, 0),
    new THREE.Vector3(.52, .33, 0)
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 40, .105, 12, false), bodyMat);
  handle.castShadow = true; group.add(handle);
  const gripInsetCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.75, 1.16, -.015), new THREE.Vector3(.88, 1.03, -.015),
    new THREE.Vector3(.91, .72, -.015), new THREE.Vector3(.88, .43, -.015)
  ]);
  const gripInset = new THREE.Mesh(new THREE.TubeGeometry(gripInsetCurve, 24, .025, 8, false), bodyHighlightMat);
  group.add(gripInset);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0x38433d, emissive: 0x000000, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 12), ledMat);
  led.position.set(-.18, .16, .59); group.add(led);

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

function makeCoffeePot(index, x) {
  const group = new THREE.Group();
  group.position.set(x, 1.47, 1.12);
  group.scale.setScalar(.62);

  // 環境マップなしでも鏡面の輪郭が黒く沈まない、ゲーム画面向けのステンレス表現。
  const steel = new THREE.MeshStandardMaterial({ color: 0xe8ece9, roughness: .2, metalness: .62 });
  const polishedSteel = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .12, metalness: .74 });
  const ventDark = new THREE.MeshStandardMaterial({ color: 0x252b28, roughness: .35, metalness: .45 });
  const water = new THREE.MeshStandardMaterial({ color: 0x79b9c5, roughness: .18, transparent: true, opacity: .72 });

  // TAKAHIRO「雫」0.9Lの、裾が張って肩へ滑らかに絞られる縦長の鏡面ボディ。
  const potProfile = [
    new THREE.Vector2(.42, 0), new THREE.Vector2(.5, .035), new THREE.Vector2(.55, .11),
    new THREE.Vector2(.555, .25), new THREE.Vector2(.535, .47), new THREE.Vector2(.505, .68),
    new THREE.Vector2(.47, .88), new THREE.Vector2(.435, 1.035), new THREE.Vector2(.405, 1.1),
    new THREE.Vector2(.395, 1.135), new THREE.Vector2(0, 1.135)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 40), steel);
  body.position.y = .04; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(.525, .545, .055, 40), polishedSteel);
  baseRim.position.y = .06; baseRim.castShadow = true; group.add(baseRim);
  const baseSeam = new THREE.Mesh(new THREE.TorusGeometry(.525, .012, 6, 40), polishedSteel);
  baseSeam.rotation.x = Math.PI / 2; baseSeam.position.y = .1; group.add(baseSeam);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.405, .405, .065, 40), steel);
  neck.position.y = 1.175; neck.castShadow = true; group.add(neck);
  const topRim = new THREE.Mesh(new THREE.TorusGeometry(.408, .012, 8, 40), polishedSteel);
  topRim.rotation.x = Math.PI / 2; topRim.position.y = 1.2075; group.add(topRim);

  // 鍋蓋のように内側の差し込み部で位置が決まり、外縁が口の縁へ密着する低い一体蓋。
  // 球面と円盤を重ねず、差し込み部〜折り返し縁〜浅い天面を連続した断面にする。
  const lidProfile = [
    new THREE.Vector2(0, -.028), new THREE.Vector2(.386, -.028),
    new THREE.Vector2(.396, -.016), new THREE.Vector2(.396, 0),
    new THREE.Vector2(.418, 0), new THREE.Vector2(.425, .007),
    new THREE.Vector2(.425, .015), new THREE.Vector2(.417, .023),
    new THREE.Vector2(.36, .038), new THREE.Vector2(.25, .05),
    new THREE.Vector2(.11, .057), new THREE.Vector2(0, .058)
  ];
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProfile, 40), polishedSteel);
  lid.position.y = 1.209; lid.castShadow = true; lid.receiveShadow = true; group.add(lid);
  const knobStem = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, .045, 18), polishedSteel);
  knobStem.position.y = 1.286; group.add(knobStem);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.095, 24, 12), polishedSteel);
  knob.scale.y = .5; knob.position.y = 1.332; knob.castShadow = true; group.add(knob);
  const vent = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 8), ventDark);
  vent.scale.y = .22; vent.position.set(.205, 1.261, .12); group.add(vent);

  // 胴のかなり低い位置から長く立ち上がる、雫の象徴的な約7mm相当の極細口。
  const spoutCollar = new THREE.Mesh(new THREE.CylinderGeometry(.067, .12, .16, 20), polishedSteel);
  spoutCollar.rotation.z = Math.PI / 2; spoutCollar.position.set(-.5, .29, 0); group.add(spoutCollar);
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.52, .29, 0), new THREE.Vector3(-.69, .27, 0),
    new THREE.Vector3(-.84, .34, 0), new THREE.Vector3(-.94, .52, 0),
    new THREE.Vector3(-.985, .76, 0), new THREE.Vector3(-.99, .98, 0),
    new THREE.Vector3(-1.04, 1.15, 0), new THREE.Vector3(-1.17, 1.245, 0),
    new THREE.Vector3(-1.31, 1.25, 0)
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 52, .027, 10, false), polishedSteel);
  spout.castShadow = true; group.add(spout);
  const spoutLip = new THREE.Mesh(new THREE.CylinderGeometry(.034, .03, .055, 16, 1, true), polishedSteel);
  spoutLip.rotation.z = Math.PI / 2; spoutLip.position.set(-1.325, 1.25, 0); group.add(spoutLip);
  const spoutOpening = new THREE.Mesh(new THREE.CircleGeometry(.025, 16), new THREE.MeshBasicMaterial({ color: 0x1b211e, side: THREE.DoubleSide }));
  spoutOpening.rotation.y = Math.PI / 2; spoutOpening.position.set(-1.354, 1.25, 0); group.add(spoutOpening);

  // 上下の金具を結ぶ、角を残した大ぶりなステンレスループハンドル。
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.41, .97, 0), new THREE.Vector3(.68, 1.055, 0),
    new THREE.Vector3(.9, 1.01, 0), new THREE.Vector3(1.025, .84, 0),
    new THREE.Vector3(1.04, .47, 0), new THREE.Vector3(.95, .26, 0),
    new THREE.Vector3(.75, .17, 0), new THREE.Vector3(.55, .2, 0),
    new THREE.Vector3(.42, .34, 0)
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 48, .045, 10, false), polishedSteel);
  handle.castShadow = true; group.add(handle);
  const upperMount = new THREE.Mesh(new THREE.CylinderGeometry(.07, .085, .15, 18), polishedSteel);
  upperMount.rotation.z = Math.PI / 2; upperMount.position.set(.45, .97, 0); group.add(upperMount);
  const lowerMount = upperMount.clone(); lowerMount.position.set(.45, .34, 0); group.add(lowerMount);

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
const state = { running: false, difficulty: "normal", timeSlot: "afternoon", playDuration: 120, activeKettles: 3, activeDrippers: 4, selected: 0, selectedDripper: 0, potQueue: [0, 1, 2, 3, 4, 5, 6, 7], filling: false, fillKettle: null, time: 120, achievement: null, serviceCounts: createServiceCounts(), combo: 0, bestCombo: 0, served: 0, perfect: 0, recoveries: 0, flowEffect: 0, orderId: 1, orders: [], nextOrder: 1.5, sound: true, effects: true };
const $ = (q) => document.querySelector(q);
const ui = {
  achievement: $("#achievement"), combo: $("#combo"), timer: $("#timer"), orders: $("#orders"), count: $("#order-count"),
  number: $("#selected-number"), temp: $("#selected-temp"), water: $("#selected-water"), tempBar: $("#temp-bar"), state: $("#selected-state"),
  tabs: $("#kettle-tabs"), potQueue: $("#pot-queue"), availablePots: $("#available-pots"), target: $("#target-line"), returnHint: $("#return-hint"),
  fill: $("#fill-button"), heat: $("#heat-button"), returnWater: $("#return-button"), serve: $("#serve-button"), toast: $("#toast"),
  shiftStatus: $("#shift-status"), dripperLabel: $("#dripper-label"), kettleShortcuts: $("#kettle-shortcuts"), setupLead: $("#setup-lead"),
  difficultySummary: $("#difficulty-summary"), timeSummary: $("#time-summary"), resultMode: $("#result-mode"),
  keyDialog: $("#keybindings-dialog"),
  pauseDialog: $("#pause-dialog"), pauseButton: $("#pause-button"),
  flowHud: $("#flow-hud"), flowLabel: $("#flow-label"), flowBar: $("#flow-bar"), flowHint: $("#flow-hint"), servedVolume: $("#served-volume")
};
const feedback = createFeedback({ THREE, scene, camera });
const pause = createPauseController({
  onPause() {
    endFill();
    dragging = false;
    feedback.stopMusic();
  },
  onResume() {
    // Never charge time spent in a dialog to the next simulation frame.
    last = performance.now();
    if (state.running) feedback.startMusic(state.time, state.playDuration);
  }
});
const canPlay = () => state.running && !pause.paused;

function pauseGame() {
  if (!state.running || ui.keyDialog.open || ui.pauseDialog.open) return;
  pause.pause("menu");
  const seconds = Math.ceil(state.time);
  $("#pause-time").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("#pause-mode").textContent = `${DIFFICULTIES[state.difficulty].label} / ${TIME_SLOTS[state.timeSlot].label}`;
  ui.pauseDialog.showModal();
}

function closePauseOverlays() {
  pause.clear();
  ui.keyDialog.close();
  ui.pauseDialog.close();
}

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
  button.dataset.keybindingControl = `kettle-${i}`;
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
  ui.kettleShortcuts.dataset.count = String(state.activeKettles);
  updateKeyBindingLabels();
  ui.shiftStatus.innerHTML = `<span class="live-dot"></span>${difficulty.label} / ${slot.label} / ${state.playDuration}s`;
  canvas.setAttribute("aria-label", `右側に配置された${state.activeKettles}台の電気ケトルと、左側に並ぶコーヒーポットキューの3D作業台`);

  scene.fog.color.setHex(slot.fog);
  keyLight.color.setHex(slot.key);
  rim.color.setHex(slot.rim);
  hemisphere.intensity = state.timeSlot === "closing" ? 1.65 : 2.2;
  renderer.toneMappingExposure = slot.exposure;
  document.body.dataset.timeSlot = state.timeSlot;
}

function selectKettle(index) {
  if (pause.paused) return;
  if (index < 0 || index >= state.activeKettles) return;
  if (state.filling) endFill();
  state.selected = index;
  kettleData.forEach((k, i) => { k.selector.material.opacity = i === index ? .9 : 0; });
  updateUI();
}

function selectDripper(index) {
  if (pause.paused) return;
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
  if (!canPlay()) return;
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
  if (!canPlay()) return;
  endFill();
  const k = kettleData[state.selected];
  if (k.water <= 0) { breakChain(); feedback.play("error"); toast("空焚き！", true); updateUI(); return; }
  if (k.state === "heating") { k.state = k.temp >= 92 ? "ready" : "filled"; toast("加熱を停止"); }
  else { k.state = "heating"; toast(`KETTLE 0${k.index + 1} — 加熱開始`); }
  updateUI();
}

function returnWaterToKettle() {
  if (!canPlay()) return;
  endFill();
  const k = kettleData[state.selected];
  const plan = planWaterReturn(state.potQueue, potData, kettleData.slice(0, state.activeKettles), state.selected);
  if (!plan.canReturn) return toast(plan.reason, true);
  const pot = plan.pot;
  const result = transferReturnedWater(k, pot, plan.transferAmount);
  pot.flash = 1; pot.returnAnim = 1;
  arrangePotQueue(state.potQueue, potData);
  feedback.play("recycle");
  feedback.pulse(ui.returnWater);
  const remainder = result.complete ? "" : ` / ポット残り${Math.round(result.remaining * 1000)}ml`;
  toast(`QUEUE → KETTLE 0${k.index + 1} / ${Math.round(result.transferred * 1000)}ml回収${remainder}`); updateUI();
}

function serveSelected() {
  if (!canPlay()) return;
  endFill();
  const k = kettleData[state.selected];
  const servingQueueIndex = findServingQueueIndex(state.potQueue, potData, state.selectedDripper);
  if (servingQueueIndex < 0) return toast("注湯できるポットがありません", true);
  const potIndex = state.potQueue[servingQueueIndex];
  const pot = potData[potIndex];
  const orderIndex = state.orders.findIndex(order => order.dripper === state.selectedDripper);
  if (orderIndex < 0) return toast(`DRIPPER 0${state.selectedDripper + 1} は待機中です`, true);
  if (k.water <= 0) return toast("ケトルが空です", true);
  if (k.temp < 92) { breakChain(); feedback.play("error"); toast(`${Math.round(k.temp)}°C — まだぬるい！`, true); updateUI(); return; }
  feedback.waterTrail(k, pot);
  const pour = pourAvailableWater(k, pot, state.selectedDripper);
  k.pourAnim = 1; pot.flash = 1;
  if (!pour.complete) {
    arrangePotQueue(state.potQueue, potData);
    feedback.play("recycle");
    feedback.pulse(ui.serve);
    toast(`${Math.round(pour.transferred * 1000)}ml注湯 / ポット ${Math.round(pot.water * 1000)} / 900ml`);
    updateUI();
    return;
  }
  const [order] = state.orders.splice(orderIndex, 1);
  state.serviceCounts[orderStageKey(order)]++;
  state.served++;
  serviceCelebration(order, pot.temp);
  pot.busyTime = POT_BUSY_TIME; pot.presentationTime = POT_PRESENTATION_TIME;
  state.potQueue.splice(servingQueueIndex, 1);
  updateUI();
}

function resetGame() {
  state.running = false;
  closePauseOverlays();
  last = performance.now();
  feedback.clear();
  feedback.unlockAudio();
  const difficulty = DIFFICULTIES[state.difficulty];
  Object.assign(state, { running: true, activeKettles: difficulty.kettles, activeDrippers: difficulty.drippers, selected: 0, selectedDripper: 0, potQueue: [0, 1, 2, 3, 4, 5, 6, 7], filling: false, fillKettle: null, time: state.playDuration, achievement: null, serviceCounts: createServiceCounts(), combo: 0, bestCombo: 0, served: 0, perfect: 0, recoveries: 0, flowEffect: 0, orderId: 1, orders: [], nextOrder: .6 });
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
  ui.pauseButton.hidden = false;
  const minutes = Math.floor(state.playDuration / 60), seconds = state.playDuration % 60;
  ui.timer.classList.remove("warning"); ui.timer.querySelector("strong").textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  clearTimeout(toastTimer); ui.toast.className = "toast";
  feedback.announce("LET’S FLOW", `${state.playDuration}秒間、店の流れを守れ。`, "#b7ee68");
  feedback.play("start");
  feedback.startMusic(state.time, state.playDuration);
  selectKettle(0); updateUI();
}

function endGame() {
  endFill();
  state.running = false;
  closePauseOverlays();
  ui.pauseButton.hidden = true;
  feedback.clear();
  feedback.stopMusic();
  ui.flowHud.hidden = true;
  const evaluation = evaluateService(state.serviceCounts, state.orders);
  state.achievement = evaluation.percentage;
  const rank = serviceRank(state.achievement);
  $("#result-rank").textContent = rank ? `RANK ${rank}` : "未評価";
  ui.resultMode.textContent = `${DIFFICULTIES[state.difficulty].label} / ${TIME_SLOTS[state.timeSlot].label} / ${state.playDuration} SEC`;
  const rankMessages = {
    S: "完全達成。評価対象のすべての注文をON TIMEで提供しました。",
    A: "高い安定感。あと少しで全件ON TIMEです。",
    B: "店の流れは守れています。遅れ始めた注文を早めに拾おう。",
    C: "提供は続いていますが、待ち時間が長めです。先読みして湯を準備しよう。",
    D: "滞留が目立ちます。給水・加熱・提供の順番を組み直そう。",
    F: "供給が追いついていません。まず1台を切らさず回すことから始めよう。"
  };
  $("#result-copy").textContent = rank ? rankMessages[rank] : "評価対象の注文はまだありません。注文が届いたらお湯を提供しよう。";
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
  ui.achievement.parentElement.classList.toggle("warning", state.achievement !== null && state.achievement < 85);
  ui.achievement.parentElement.title = `提供時の状態：ON TIME 100% / DELAYED 50% / CRITICAL 10% / OVERDUE 0%。評価対象 ${evaluation.evaluated}件（未提供 ${evaluation.unserved}件は0%）。猶予中 ${evaluation.grace}件は保留。S:90%以上 / A:80%以上 / B:70%以上 / C:60%以上 / D:50%以上 / F:50%未満。`;
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
  const servingQueueIndex = findServingQueueIndex(state.potQueue, potData, state.selectedDripper);
  const returnPlan = planWaterReturn(state.potQueue, potData, kettleData.slice(0, state.activeKettles), state.selected);
  [...ui.potQueue.children].forEach((slot, queueIndex) => {
    const potIndex = state.potQueue[queueIndex];
    const pot = potIndex === undefined ? null : potData[potIndex];
    slot.className = "pot-slot";
    if (queueIndex === 0 && pot) slot.classList.add("head");
    if (queueIndex === servingQueueIndex && pot) slot.classList.add("serve-next");
    if (queueIndex === returnPlan.queueIndex && pot) slot.classList.add("return-next");
    if (!pot) { slot.classList.add("in-use"); slot.textContent = "使用中"; }
    else if (pot.water > 0 && pot.assignedDripper !== null) { slot.classList.add("partial"); slot.textContent = `D${String(pot.assignedDripper + 1).padStart(2,"0")} ${Math.round(pot.water * 1000)}`; }
    else if (pot.water > 0) { slot.classList.add("returned"); slot.textContent = `戻り ${Math.round(pot.water * 1000)}`; }
    else { slot.classList.add("empty"); slot.textContent = "空"; }
  });
  const servingPot = servingQueueIndex < 0 ? null : potData[state.potQueue[servingQueueIndex]];
  const emptyCount = state.potQueue.filter(index => potData[index].water <= 0).length;
  ui.availablePots.textContent = `${emptyCount} READY`;
  ui.target.textContent = !state.potQueue.length
    ? "QUEUE EMPTY — 全ポット使用中"
    : servingPot?.assignedDripper === state.selectedDripper
      ? `SERVE: D${String(state.selectedDripper + 1).padStart(2,"0")} / ${Math.round(servingPot.water * 1000)} → 900ml`
      : servingPot ? `SERVE: 空ポット → D${String(state.selectedDripper + 1).padStart(2,"0")} / 900ml` : "注湯できるポットなし — 戻り湯を回収してください";
  ui.returnHint.textContent = `RETURN: ${returnPlan.reason}`;
  ui.returnWater.title = returnPlan.reason;
  ui.fill.disabled = k.state === "heating" || k.water >= 1.199;
  ui.fill.style.setProperty("--fill-level", `${Math.min(100, k.water / 1.2 * 100)}%`);
  ui.fill.classList.toggle("holding", state.filling && state.fillKettle === state.selected);
  ui.heat.disabled = k.water <= 0;
  ui.returnWater.disabled = !state.running || !returnPlan.canReturn;
  ui.serve.disabled = !servingPot || k.water <= 0 || k.temp < 92 || !selectedOrder;
  ui.serve.classList.toggle("ready-to-pour", !ui.serve.disabled);
  renderOrders();
}

let last = performance.now();
let uiElapsed = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const rawDt = Math.min(.05, (now - last) / 1000); last = now;
  if (canPlay()) {
    const previousTime = state.time;
    state.flowEffect = Math.max(0, state.flowEffect - rawDt);
    state.time = Math.max(0, state.time - rawDt);
    feedback.updateMusic(state.time, state.playDuration);
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
      if (k.pourAnim > 0) k.pourAnim = Math.max(0, k.pourAnim - rawDt * POUR_ANIMATION_RATE);
      k.group.rotation.x = -Math.sin(k.pourAnim * Math.PI) * .32;
    });
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
        arrangePotQueue(state.potQueue, potData);
      } else if (!wasBusy && pot.water > 0) {
        pot.temp = Math.max(22, pot.temp - .18 * rawDt);
      }
    });
    const potPositions = potQueueLayout(state.potQueue, potData);
    const firstServingQueueIndex = findServingQueueIndex(state.potQueue, potData, state.selectedDripper);
    const firstServingPotIndex = firstServingQueueIndex < 0 ? undefined : state.potQueue[firstServingQueueIndex];
    const firstReturnedPotIndex = state.potQueue.find(index => potData[index].water > 0 && potData[index].assignedDripper == null && !(potData[index].busyTime > 0));
    potData.forEach(pot => {
      pot.waterLevel = pot.busyTime > 0 ? .55 + (pot.busyTime / POT_BUSY_TIME) * .45 : pot.water / .9;
      pot.liquid.visible = pot.waterLevel > .01;
      pot.liquid.scale.y = Math.max(.02, pot.waterLevel);
      pot.liquid.position.y = .12 + .32 * pot.waterLevel;
      const position = potPositions.get(pot.index);
      pot.group.visible = Boolean(position) || pot.presentationTime > 0;
      if (position) {
        const [targetX, targetZ] = position;
        pot.group.position.x += (targetX - pot.group.position.x) * Math.min(1, rawDt * 7);
        pot.group.position.z += (targetZ - pot.group.position.z) * Math.min(1, rawDt * 7);
      }
      const isReturnHead = pot.index === firstReturnedPotIndex;
      const isServeNext = pot.index === firstServingPotIndex;
      pot.requestRing.material.opacity = isReturnHead || isServeNext ? .95 : .12;
      pot.requestRing.material.color.setHex(isReturnHead ? 0x79b9c5 : isServeNext ? 0xa7d46f : 0xff9b56);
      if (pot.returnAnim > 0) pot.returnAnim = Math.max(0, pot.returnAnim - rawDt * RETURN_ANIMATION_RATE);
      pot.group.rotation.z = Math.sin(pot.returnAnim * Math.PI) * .45;
    });
    const mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    ui.timer.querySelector("strong").textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    ui.timer.classList.toggle("warning", state.time < 15);
    if (state.time <= 0) endGame();
    uiElapsed += rawDt;
    if (uiElapsed >= .1) { updateUI(); uiElapsed = 0; }
  }
  if (!pause.paused) {
    kettleData.forEach((k, i) => { k.group.position.y = 1.52 + Math.sin(now * .0012 + i) * .007; });
    feedback.tick(rawDt);
  }
  renderer.render(scene, camera);
}

const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => {
  if (!canPlay()) return;
  pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable).find(item => item.object.userData.index < state.activeKettles);
  if (hit) selectKettle(hit.object.userData.index);
});

let dragging = false, dragX = 0, cameraAngle = 0;
canvas.addEventListener("pointerdown", e => { if (canPlay()) { dragging = true; dragX = e.clientX; } });
addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => {
  if (!dragging) return;
  cameraAngle += (e.clientX - dragX) * .003; cameraAngle = Math.max(-.28, Math.min(.28, cameraAngle)); dragX = e.clientX;
  camera.position.x = WORKSPACE_CENTER + Math.sin(cameraAngle) * CAMERA_DISTANCE; camera.position.z = Math.cos(cameraAngle) * CAMERA_DISTANCE; camera.lookAt(WORKSPACE_CENTER, 1.25, .35);
});

addEventListener("keydown", e => {
  if (!state.running || ui.keyDialog.open || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
  if (e.code === "Escape" && !ui.pauseDialog.open) {
    e.preventDefault();
    if (!e.repeat) pauseGame();
    return;
  }
  if (pause.paused) return;
  const action = keyboardAction(e.code, state.activeKettles);
  if (!action || (e.repeat && action !== "fill")) return;
  e.preventDefault();
  if (action.startsWith("kettle-")) selectKettle(Number(action.slice(7)));
  else if (action === "fill" && !e.repeat) beginFill();
  else if (action === "heat") heatSelected();
  else if (action === "return") returnWaterToKettle();
  else if (action === "serve") serveSelected();
});

addEventListener("keyup", e => {
  if (keyboardAction(e.code, state.activeKettles) === "fill") endFill();
});
addEventListener("blur", endFill);

ui.fill.addEventListener("pointerdown", e => { e.preventDefault(); beginFill(); });
ui.fill.addEventListener("pointercancel", endFill);
ui.fill.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("pointerup", endFill);
ui.heat.onclick = heatSelected; ui.returnWater.onclick = returnWaterToKettle; ui.serve.onclick = serveSelected;
$("#start-button").onclick = resetGame; $("#restart-button").onclick = resetGame;
function returnToSettings() {
  endFill();
  state.running = false;
  closePauseOverlays();
  feedback.stopMusic();
  feedback.clear();
  ui.pauseButton.hidden = true;
  ui.flowHud.hidden = true;
  $("#result").classList.remove("show");
  $("#intro").classList.add("show");
  updateSetupUI();
  $("#start-button").focus();
}
$("#change-settings-button").onclick = returnToSettings;
ui.pauseButton.onclick = pauseGame;
$("#resume-button").onclick = () => ui.pauseDialog.close();
ui.pauseDialog.addEventListener("close", () => pause.resume("menu"));
ui.pauseDialog.addEventListener("cancel", e => {
  e.preventDefault();
  ui.pauseDialog.close();
});
$("#pause-restart-button").onclick = resetGame;
$("#pause-settings-button").onclick = returnToSettings;
function syncSetup() {
  state.difficulty = selection.difficulty;
  state.timeSlot = selection.timeSlot;
  state.playDuration = selection.playDuration;
  state.time = state.playDuration;
  state.orders = [];
  ui.orders.replaceChildren();
  applyConfiguration();
  selectKettle(0);
}
document.addEventListener("setup-change", syncSetup);
document.addEventListener("keybindings-change", () => {
  endFill();
  updateKeyBindingLabels();
});
document.addEventListener("keybindings-open", () => {
  pause.pause("keybindings");
});
document.addEventListener("keybindings-close", () => {
  pause.resume("keybindings");
});
let musicEnabled = true;
$("#music-toggle").onclick = e => {
  musicEnabled = !musicEnabled;
  feedback.setMusic(musicEnabled);
  e.currentTarget.classList.toggle("muted", !musicEnabled);
  e.currentTarget.setAttribute("aria-pressed", String(musicEnabled));
  e.currentTarget.title = `BGM ${musicEnabled ? "ON" : "OFF"}`;
};
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
