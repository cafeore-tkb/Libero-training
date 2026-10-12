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
  group.position.set(x, 1.52, 0);
  group.userData.index = index;

  const bodyMat = new THREE.MeshStandardMaterial({ color: kettleColors[index], roughness: .34, metalness: .15 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x17201c, roughness: .55 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xbec8c1, roughness: .22, metalness: .8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.56, .64, 1.25, 24), bodyMat);
  body.position.y = .7; body.castShadow = true; group.add(body); clickable.push(body);
  body.userData.index = index;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.47, .5, .12, 24), darkMat);
  lid.position.y = 1.37; lid.castShadow = true; group.add(lid);
  const lidKnob = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .12, 16), darkMat);
  lidKnob.position.y = 1.49; group.add(lidKnob);
  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, .09, 24), darkMat);
  baseRing.position.y = .05; group.add(baseRing);

  const spoutShape = new THREE.ConeGeometry(.31, .76, 16);
  const spout = new THREE.Mesh(spoutShape, metalMat);
  spout.rotation.z = -Math.PI / 2.7; spout.position.set(-.63, 1.03, 0); spout.castShadow = true; group.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.65, .09, 10, 22, Math.PI * 1.25), darkMat);
  handle.rotation.set(Math.PI / 2, 0, -Math.PI * .63); handle.position.set(.47, .85, 0); group.add(handle);

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
  kettleData.push({ index, group, body, led, selector, steam, water: 0, temp: 22, state: "empty", boilTime: 0 });
}

[-3.8, -1.9, 0, 1.9, 3.8].forEach((x, i) => makeKettle(i, x));

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

const state = { running: false, selected: 0, time: 90, score: 0, combo: 1, bestCombo: 1, served: 0, orderId: 1, orders: [], nextOrder: 1.5, sound: true };
const $ = (q) => document.querySelector(q);
const ui = {
  score: $("#score"), combo: $("#combo"), timer: $("#timer"), orders: $("#orders"), count: $("#order-count"),
  number: $("#selected-number"), temp: $("#selected-temp"), water: $("#selected-water"), tempBar: $("#temp-bar"), state: $("#selected-state"),
  tabs: $("#kettle-tabs"), fill: $("#fill-button"), heat: $("#heat-button"), serve: $("#serve-button"), toast: $("#toast")
};

for (let i = 0; i < 5; i++) {
  const button = document.createElement("button");
  button.className = "kettle-tab"; button.textContent = `0${i + 1}`; button.onclick = () => selectKettle(i);
  ui.tabs.append(button);
}

function selectKettle(index) {
  state.selected = index;
  kettleData.forEach((k, i) => { k.selector.material.opacity = i === index ? .9 : 0; });
  updateUI();
}

let toastTimer;
function toast(message, error = false) {
  clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.className = `toast show${error ? " error" : ""}`;
  toastTimer = setTimeout(() => ui.toast.className = "toast", 1200);
}

function addOrder() {
  if (state.orders.length >= 4) return;
  const max = Math.max(16, 25 - Math.floor((90 - state.time) / 15));
  state.orders.push({ id: state.orderId++, time: max, max });
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

function serveSelected() {
  if (!state.running) return;
  const k = kettleData[state.selected];
  if (!state.orders.length) return toast("まだ注文がありません", true);
  if (k.water < .6) return toast("水量不足 — 0.6L必要", true);
  if (k.temp < 92) { state.score = Math.max(0, state.score - 30); state.combo = 1; toast(`${Math.round(k.temp)}°C — まだぬるい！ −30`, true); return; }
  const order = state.orders.shift();
  const speedBonus = Math.round(order.time * 4);
  const points = 100 + speedBonus + (state.combo - 1) * 20;
  state.score += points; state.served++; state.combo++; state.bestCombo = Math.max(state.bestCombo, state.combo);
  k.water = Math.round((k.water - .6) * 10) / 10;
  k.temp = Math.max(22, k.temp - 8);
  k.state = k.water > 0 ? (k.temp >= 92 ? "ready" : "filled") : "empty";
  k.boilTime = 0; toast(`GOOD SERVE +${points}`); updateUI();
}

function resetGame() {
  Object.assign(state, { running: true, selected: 0, time: 90, score: 0, combo: 1, bestCombo: 1, served: 0, orderId: 1, orders: [], nextOrder: 1.2 });
  kettleData.forEach(k => Object.assign(k, { water: 0, temp: 22, state: "empty", boilTime: 0 }));
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
  ui.orders.innerHTML = state.orders.map(o => {
    const life = Math.max(0, o.time / o.max * 100);
    return `<div class="order ${life < 30 ? "urgent" : ""}" style="--life:${life}%"><span class="order-no">#${String(o.id).padStart(2,"0")}</span><span class="order-copy"><b>ドリップ用</b><small>0.6L / 92°C+</small></span><span class="order-time">${Math.ceil(o.time)}s</span></div>`;
  }).join("");
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
  ui.fill.disabled = k.state === "heating" || k.temp > 55; ui.heat.disabled = k.water <= 0; ui.serve.disabled = k.water < .6 || k.temp < 92 || !state.orders.length;
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
    if (state.nextOrder <= 0) { addOrder(); state.nextOrder = Math.max(3.2, 6.2 - (90 - state.time) * .03) + Math.random() * 1.8; }
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
  const hit = raycaster.intersectObjects(clickable)[0];
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
