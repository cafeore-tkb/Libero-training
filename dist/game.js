import * as THREE from "three";

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

scene.add(new THREE.HemisphereLight(0xd9f2df, 0x172019, 2.2));
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

function makeKettle(index, x) {
  const group = new THREE.Group();
  group.position.set(x, 1.52, -.65);
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

[-3.8, -1.9, 0, 1.9, 3.8].forEach((x, i) => makeKettle(i, x));

const potData = [];
const potClickable = [];

function makeCoffeePot(index, x) {
  const group = new THREE.Group();
  group.position.set(x, 1.47, 1.12);
  group.scale.setScalar(.78);

  const steel = new THREE.MeshStandardMaterial({ color: 0xbcc5c0, roughness: .2, metalness: .86 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171d1a, roughness: .5 });
  const water = new THREE.MeshStandardMaterial({ color: 0x79b9c5, roughness: .18, transparent: true, opacity: .72 });
  const potProfile = [
    new THREE.Vector2(.31, 0), new THREE.Vector2(.43, .11), new THREE.Vector2(.46, .62),
    new THREE.Vector2(.39, .82), new THREE.Vector2(.3, .88), new THREE.Vector2(0, .88)
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 24), steel);
  body.position.y = .08; body.castShadow = true; body.userData = { type: "pot", index }; group.add(body); potClickable.push(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.28, .34, .07, 20), dark);
  lid.position.y = 1; lid.userData = { type: "pot", index }; group.add(lid); potClickable.push(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), dark);
  knob.scale.y = .55; knob.position.y = 1.08; group.add(knob);

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.37, .56, 0), new THREE.Vector3(-.58, .7, 0),
    new THREE.Vector3(-.72, 1.02, 0), new THREE.Vector3(-1.02, 1.18, 0)
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 24, .055, 9, false), steel);
  neck.castShadow = true; group.add(neck);
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.34, .72, 0), new THREE.Vector3(.78, .78, 0),
    new THREE.Vector3(.82, .25, 0), new THREE.Vector3(.38, .18, 0)
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 20, .065, 9, false), dark);
  group.add(handle);

  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(.34, .38, .55, 18), water);
  liquid.position.y = .34; liquid.scale.y = .02; liquid.visible = false; group.add(liquid);
  const requestRing = new THREE.Mesh(new THREE.RingGeometry(.56, .63, 24), new THREE.MeshBasicMaterial({ color: 0xff9b56, side: THREE.DoubleSide, transparent: true, opacity: .12 }));
  requestRing.rotation.x = -Math.PI / 2; requestRing.position.y = .015; group.add(requestRing);

  scene.add(group);
  potData.push({ index, group, liquid, requestRing, water: 0, temp: 22, waterLevel: 0, flash: 0, busyTime: 0, assignedDripper: null });
}

[
  [-3.75, .72], [-1.25, .72], [1.25, .72], [3.75, .72],
  [-3.75, 1.55], [-1.25, 1.55], [1.25, 1.55], [3.75, 1.55]
].forEach(([x, z], i) => { makeCoffeePot(i, x); potData[i].group.position.z = z; });

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

const state = { running: false, selected: 0, selectedDripper: 0, selectedPot: 0, time: 90, score: 0, combo: 1, bestCombo: 1, served: 0, orderId: 1, orders: [], nextOrder: 1.5, sound: true };
const $ = (q) => document.querySelector(q);
const ui = {
  score: $("#score"), combo: $("#combo"), timer: $("#timer"), orders: $("#orders"), count: $("#order-count"),
  number: $("#selected-number"), temp: $("#selected-temp"), water: $("#selected-water"), tempBar: $("#temp-bar"), state: $("#selected-state"),
  tabs: $("#kettle-tabs"), potTabs: $("#pot-tabs"), availablePots: $("#available-pots"), target: $("#target-line"),
  fill: $("#fill-button"), heat: $("#heat-button"), serve: $("#serve-button"), toast: $("#toast")
};

for (let i = 0; i < 5; i++) {
  const button = document.createElement("button");
  button.className = "kettle-tab"; button.textContent = `0${i + 1}`; button.onclick = () => selectKettle(i);
  ui.tabs.append(button);
}

for (let i = 0; i < 8; i++) {
  const button = document.createElement("button");
  button.className = "pot-tab"; button.textContent = `P${i + 1}`; button.onclick = () => selectPot(i);
  ui.potTabs.append(button);
}

function selectKettle(index) {
  state.selected = index;
  kettleData.forEach((k, i) => { k.selector.material.opacity = i === index ? .9 : 0; });
  updateUI();
}

function selectPot(index) {
  state.selectedPot = index;
  updateUI();
}

function selectDripper(index) {
  state.selectedDripper = index;
  updateUI();
}

let toastTimer;
function toast(message, error = false) {
  clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.className = `toast show${error ? " error" : ""}`;
  toastTimer = setTimeout(() => ui.toast.className = "toast", 1200);
}

function addOrder() {
  if (state.orders.length >= 6) return;
  const occupied = new Set(state.orders.map(order => order.dripper));
  const available = Array.from({ length: 6 }, (_, index) => index).filter(index => !occupied.has(index));
  if (!available.length) return;
  const dripper = available[Math.floor(Math.random() * available.length)];
  const max = Math.max(16, 25 - Math.floor((90 - state.time) / 15));
  state.orders.push({ id: state.orderId++, dripper, time: max, max });
  if (state.orders.length === 1) state.selectedDripper = dripper;
}

function fillSelected() {
  if (!state.running) return;
  const k = kettleData[state.selected];
  if (k.state === "heating") return toast("加熱中は給水できません", true);
  if (k.temp > 55) return toast("熱いケトルへの継ぎ足し禁止", true);
  k.water = 1.2; k.temp = 22; k.state = "filled"; k.boilTime = 0;
  toast(`KETTLE 0${k.index + 1} — 1.2L 給水`); updateUI();
}

function heatSelected() {
  if (!state.running) return;
  const k = kettleData[state.selected];
  if (k.water <= 0) { state.score = Math.max(0, state.score - 50); state.combo = 1; toast("空焚き！ −50", true); return; }
  if (k.state === "heating") { k.state = k.temp >= 92 ? "ready" : "filled"; toast("加熱を停止"); }
  else { k.state = "heating"; toast(`KETTLE 0${k.index + 1} — 加熱開始`); }
  updateUI();
}

function getFillPlan(pot, kettle) {
  const needed = Math.max(0, .9 - pot.water);
  const projectedTemp = needed > 0 ? ((pot.water * pot.temp) + (needed * kettle.temp)) / .9 : pot.temp;
  return { needed, projectedTemp };
}

function serveSelected() {
  if (!state.running) return;
  const k = kettleData[state.selected];
  const pot = potData[state.selectedPot];
  const orderIndex = state.orders.findIndex(order => order.dripper === state.selectedDripper);
  if (orderIndex < 0) return toast(`DRIPPER 0${state.selectedDripper + 1} は待機中です`, true);
  if (pot.busyTime > 0) return toast(`POT 0${state.selectedPot + 1} は使用中です`, true);
  const { needed, projectedTemp } = getFillPlan(pot, k);
  if (k.water + .001 < needed) return toast(`水量不足 — あと${Math.round(needed * 1000)}ml必要`, true);
  if (projectedTemp < 92) { state.score = Math.max(0, state.score - 30); state.combo = 1; toast(`混合後${Math.round(projectedTemp)}°C — まだぬるい！ −30`, true); return; }
  const [order] = state.orders.splice(orderIndex, 1);
  const speedBonus = Math.round(order.time * 4);
  const points = 100 + speedBonus + (state.combo - 1) * 20;
  state.score += points; state.served++; state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
  k.water = Math.max(0, Math.round((k.water - needed) * 100) / 100);
  k.temp = Math.max(22, k.temp - (3 + needed * 6));
  k.state = k.water > 0 ? (k.temp >= 92 ? "ready" : "filled") : "empty";
  k.boilTime = 0; k.pourAnim = 1;
  pot.water = .9; pot.temp = projectedTemp; pot.waterLevel = 1; pot.flash = 1; pot.busyTime = 7; pot.assignedDripper = order.dripper;
  toast(`D0${order.dripper + 1} ← P0${pot.index + 1} / +${Math.round(needed * 1000)}ml・${Math.round(projectedTemp)}°C`); updateUI();
}

function resetGame() {
  Object.assign(state, { running: true, selected: 0, selectedDripper: 0, selectedPot: 0, time: 90, score: 0, combo: 1, bestCombo: 1, served: 0, orderId: 1, orders: [], nextOrder: .6 });
  kettleData.forEach(k => Object.assign(k, { water: 0, temp: 22, state: "empty", boilTime: 0, pourAnim: 0 }));
  potData.forEach(pot => Object.assign(pot, { water: 0, temp: 22, waterLevel: 0, flash: 0, busyTime: 0, assignedDripper: null }));
  $("#intro").classList.remove("show"); $("#result").classList.remove("show");
  selectKettle(0); updateUI();
}

function endGame() {
  state.running = false;
  const rank = state.score >= 1800 ? "S" : state.score >= 1200 ? "A" : state.score >= 700 ? "B" : "C";
  $("#result-rank").textContent = `RANK ${rank}`;
  $("#result-copy").textContent = rank === "S" ? "完璧な先読み。店のリズムを最後まで守りました。" : rank === "A" ? "ナイスリベロ！あと少しで達人級です。" : "ケトルの残量と注文の残り時間を先読みしてみよう。";
  $("#final-score").textContent = state.score; $("#final-served").textContent = state.served; $("#final-combo").textContent = state.bestCombo;
  $("#result").classList.add("show");
}

function renderOrders() {
  for (let dripperIndex = 0; dripperIndex < 6; dripperIndex++) {
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
    element.classList.toggle("active", state.selectedDripper === dripperIndex);
    element.classList.toggle("idle", !order);
    element.classList.toggle("urgent", Boolean(order && life < 30));
    element.style.setProperty("--life", `${life}%`);
    element.querySelector(".order-copy small").textContent = order ? "900ml REQUEST" : "リクエスト待機中";
    element.querySelector(".order-time").textContent = order ? `${Math.ceil(order.time)}s` : "—";
  }
  ui.count.textContent = state.orders.length;
}

function updateUI() {
  const k = kettleData[state.selected];
  ui.score.textContent = String(state.score).padStart(4, "0"); ui.combo.textContent = `×${state.combo}`;
  ui.number.textContent = `0${k.index + 1}`; ui.temp.innerHTML = `${Math.round(k.temp)}<small>°C</small>`; ui.water.innerHTML = `${k.water.toFixed(1)}<small>L</small>`;
  ui.tempBar.style.width = `${Math.min(100, Math.max(0, (k.temp - 20) / 80 * 100))}%`;
  const labels = { empty: "空 — 給水してください", filled: "待機中 — 加熱できます", heating: "加熱中 — 温度上昇", ready: "準備完了 — 提供できます" };
  ui.state.textContent = labels[k.state];
  [...ui.tabs.children].forEach((tab, i) => { tab.classList.toggle("active", i === state.selected); tab.classList.toggle("hot", kettleData[i].temp >= 92); });
  const selectedOrder = state.orders.some(order => order.dripper === state.selectedDripper);
  const selectedPot = potData[state.selectedPot];
  [...ui.potTabs.children].forEach((tab, i) => {
    tab.classList.toggle("active", i === state.selectedPot);
    tab.classList.toggle("busy", potData[i].busyTime > 0);
    tab.classList.toggle("returned", potData[i].busyTime <= 0 && potData[i].water > 0);
    tab.textContent = potData[i].busyTime > 0 ? `${Math.ceil(potData[i].busyTime)}s` : `P${i + 1}`;
    tab.title = potData[i].busyTime > 0 ? "使用中" : potData[i].water > 0 ? `${Math.round(potData[i].water * 1000)}ml / ${Math.round(potData[i].temp)}°C` : "空のポット";
  });
  const availableCount = potData.filter(pot => pot.busyTime <= 0).length;
  ui.availablePots.textContent = `${availableCount}/8`;
  const { needed, projectedTemp } = getFillPlan(selectedPot, k);
  const potStatus = selectedPot.water > 0 ? `${Math.round(selectedPot.water * 1000)}ml・${Math.round(selectedPot.temp)}°` : "空";
  ui.target.textContent = selectedPot.busyTime > 0
    ? `P${String(state.selectedPot + 1).padStart(2,"0")} 使用中`
    : `D${String(state.selectedDripper + 1).padStart(2,"0")} → P${String(state.selectedPot + 1).padStart(2,"0")} ${potStatus} / +${Math.round(needed * 1000)}ml → ${Math.round(projectedTemp)}°C`;
  ui.fill.disabled = k.state === "heating" || k.temp > 55; ui.heat.disabled = k.water <= 0; ui.serve.disabled = k.water + .001 < needed || projectedTemp < 92 || !selectedOrder || selectedPot.busyTime > 0;
  renderOrders();
}

let last = performance.now();
let uiElapsed = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const rawDt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.running) {
    state.time = Math.max(0, state.time - rawDt);
    state.nextOrder -= rawDt;
    if (state.nextOrder <= 0) { addOrder(); state.nextOrder = Math.max(2.5, 5.1 - (90 - state.time) * .025) + Math.random() * 1.4; }
    state.orders.forEach(o => o.time -= rawDt);
    const expired = state.orders.filter(o => o.time <= 0).length;
    if (expired) { state.orders = state.orders.filter(o => o.time > 0); state.score = Math.max(0, state.score - expired * 80); state.combo = 1; toast(`注文切れ！ −${expired * 80}`, true); }

    kettleData.forEach(k => {
      if (k.state === "heating") {
        k.temp = Math.min(100, k.temp + 11.5 * rawDt);
        if (k.temp >= 99.5) { k.temp = 100; k.state = "ready"; }
      } else if (k.temp > 22) k.temp = Math.max(22, k.temp - .55 * rawDt);
      if (k.state === "ready" && k.temp < 92) k.state = "filled";
      if (k.temp >= 99.5) {
        k.boilTime += rawDt;
        if (k.boilTime > 9) { state.score = Math.max(0, state.score - 20); k.boilTime = 5; toast("沸騰放置 −20", true); }
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
    potData.forEach(pot => {
      pot.flash = Math.max(0, pot.flash - rawDt * .8);
      const wasBusy = pot.busyTime > 0;
      pot.busyTime = Math.max(0, pot.busyTime - rawDt);
      if (wasBusy && pot.busyTime <= 0) {
        pot.assignedDripper = null;
        pot.water = Math.round((.4 + Math.random() * .1) * 100) / 100;
        pot.temp = Math.max(22, pot.temp - (6 + Math.random() * 4));
        pot.flash = 1;
      } else if (!wasBusy && pot.water > 0) {
        pot.temp = Math.max(22, pot.temp - .18 * rawDt);
      }
      pot.waterLevel = pot.busyTime > 0 ? .55 + (pot.busyTime / 7) * .45 : pot.water / .9;
      pot.liquid.visible = pot.waterLevel > .01;
      pot.liquid.scale.y = Math.max(.02, pot.waterLevel);
      pot.liquid.position.y = .1 + .2 * pot.waterLevel;
      pot.requestRing.material.opacity = state.selectedPot === pot.index ? .95 : pot.busyTime > 0 ? .45 : .1;
      pot.requestRing.material.color.setHex(pot.busyTime > 0 ? 0xb7ee68 : pot.water > 0 ? 0x79b9c5 : 0xff9b56);
    });
    const mins = Math.floor(state.time / 60), secs = Math.floor(state.time % 60);
    ui.timer.querySelector("strong").textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    ui.timer.classList.toggle("warning", state.time < 15);
    if (state.time <= 0) endGame();
    uiElapsed += rawDt;
    if (uiElapsed >= .1) { updateUI(); uiElapsed = 0; }
  }
  kettleData.forEach((k, i) => { k.group.position.y = 1.52 + Math.sin(now * .0012 + i) * .007; });
  renderer.render(scene, camera);
}

const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => {
  pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...clickable, ...potClickable])[0];
  if (hit) {
    if (hit.object.userData.type === "pot") selectPot(hit.object.userData.index);
    else selectKettle(hit.object.userData.index);
  }
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
  if (/^[1-5]$/.test(e.key)) selectKettle(Number(e.key) - 1);
  if (e.key.toLowerCase() === "f") fillSelected();
  if (e.key.toLowerCase() === "s") serveSelected();
  if (e.code === "Space") { e.preventDefault(); heatSelected(); }
});

ui.fill.onclick = fillSelected; ui.heat.onclick = heatSelected; ui.serve.onclick = serveSelected;
$("#start-button").onclick = resetGame; $("#restart-button").onclick = resetGame;
$("#sound-toggle").onclick = (e) => { state.sound = !state.sound; e.currentTarget.classList.toggle("muted", !state.sound); };

function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize(); selectKettle(0); updateUI(); requestAnimationFrame(tick);
