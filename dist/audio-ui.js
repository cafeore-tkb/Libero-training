// A standard media-element test deliberately uses a different playback path
// from the game's Web Audio graph. Nothing is fetched from a third-party host.
export function testToneWav() {
  const rate = 22050;
  const count = Math.round(rate * .65);
  const data = new ArrayBuffer(44 + count * 2);
  const view = new DataView(data);
  const tag = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  tag(0, "RIFF"); view.setUint32(4, data.byteLength - 8, true); tag(8, "WAVE");
  tag(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const local = t < .3 ? t : t - .3;
    const envelope = Math.max(0, Math.min(local / .02, (.24 - local) / .04, 1));
    const sample = Math.sin(2 * Math.PI * (t < .3 ? 440 : 660) * local) * envelope * .18;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  return data;
}

export function bindAudioUI(feedback) {
  const dialog = document.querySelector("#audio-dialog");
  const status = document.querySelector("#audio-status");
  const result = document.querySelector("#audio-test-result");
  const native = document.querySelector("#native-audio-test");
  const volume = document.querySelector("#audio-volume");
  const level = document.querySelector("#audio-volume-value");
  const musicStatus = document.querySelector("#music-playback-status");
  const musicRetry = document.querySelector("#music-retry");
  let timer;
  let testNumber = 0;
  function refreshMusic() {
    const music = feedback.audioStatus().music;
    const labels = { idle: "待機中", playing: "再生中", loading: "読み込み中", blocked: "再生許可待ち", error: "再生エラー", paused: "一時停止中", muted: "OFF" };
    musicStatus.textContent = music ? `BGM：${music.error || labels[music.state] || music.state}` : "";
    musicRetry.hidden = !music?.active || !["blocked", "error"].includes(music.state);
  }
  document.addEventListener("music-status-change", refreshMusic);
  musicRetry.onclick = () => { feedback.retryMusic(); refreshMusic(); };
  function refresh() {
    const audio = feedback.audioStatus();
    const labels = { uninitialized: "未接続", running: "音声エンジン動作中", suspended: "音声の開始待ち", interrupted: "音声が中断されています", closed: "音声の接続が切れています" };
    status.textContent = audio.error || `効果音：${labels[audio.state] || audio.state}`;
    document.querySelector("#audio-mute-status").textContent = `BGM ${audio.musicEnabled ? "ON" : "OFF"} / 効果音 ${audio.soundEnabled ? "ON" : "OFF"}`;
    volume.value = Math.round(audio.volume * 100);
    level.textContent = `${volume.value}%`;
    native.volume = audio.volume;
    refreshMusic();
  }
  document.querySelectorAll("[data-open-audio]").forEach(button => button.addEventListener("click", () => {
    if (dialog.open) return;
    document.dispatchEvent(new Event("audio-settings-open"));
    if (!native.src) native.src = URL.createObjectURL(new Blob([testToneWav()], { type: "audio/wav" }));
    result.textContent = "テスト音はBGM・効果音のOFF設定に関係なく鳴ります。";
    refresh(); dialog.showModal();
    timer = setInterval(refresh, 250);
  }));
  document.querySelector("#audio-close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    clearInterval(timer); testNumber++;
    native.pause(); native.currentTime = 0;
    document.dispatchEvent(new Event("audio-settings-close"));
  });
  document.querySelector("#audio-reconnect").onclick = () => {
    testNumber++;
    feedback.reconnectAudio(); refresh();
    result.textContent = "音声を再接続しました。テスト音を確認してください。";
  };
  document.querySelector("#audio-test").onclick = async () => {
    const currentTest = ++testNumber;
    result.textContent = "テスト音を開始しています…";
    const started = await feedback.testAudio();
    if (!dialog.open || currentTest !== testNumber) return;
    refresh();
    result.textContent = started ? (feedback.audioStatus().volume === 0 ? "ゲーム音量が0%です。スライダーで上げてください。" : "テスト音を出力しました。聞こえなければ、下の標準プレーヤーもお試しください。") : "開始できませんでした。「音声を再接続」を押してください。";
  };
  volume.oninput = () => { feedback.setVolume(Number(volume.value) / 100); refresh(); };
  native.addEventListener("error", () => { result.textContent = "標準プレーヤーでも音声を開けませんでした。ブラウザーの設定を確認してください。"; });
  refreshMusic();
}
