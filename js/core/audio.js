// js/core/audio.js
// 核心层：音频引擎（Web Audio API 封装）。
//
// 设计：
//   - 无 AudioContext 的环境（Node / 旧浏览器）静默降级，playSfx 不抛错；
//   - 音效声明式（config/audio.json）：file 指向素材，或 synth 用振荡器合成（无需素材、规避授权）；
//   - 自动播放策略：AudioContext 初始 suspended，须在首次用户手势时调用 unlockAudio()；
//   - 同 id 播放最小间隔门控，避免 MAX ALL 等批量操作造成音效轰炸。

let ctx = null;
let masterGain = null;
const sfxMap = new Map();
const fileBuffers = new Map(); // file 路径 -> AudioBuffer
const lastPlayMs = new Map();  // id -> 上次播放时间（performance.now）

let masterVolume = 0.6;
let muted = false;

// BGM（环境循环）
let bgmDef = null;
let bgmBuffer = null;
let bgmSource = null;
let bgmEnabled = true;

const MIN_INTERVAL_MS = 25;

export function configureAudio(cfg = {}) {
  sfxMap.clear();
  for (const s of cfg.sfx ?? []) {
    if (s && s.id) sfxMap.set(s.id, s);
  }
  bgmDef = cfg.bgm ?? null;
  if (cfg.defaults?.masterVolume !== undefined) masterVolume = clamp01(cfg.defaults.masterVolume);
  if (cfg.defaults?.muted !== undefined) muted = !!cfg.defaults.muted;
}

export function getSfxIds() {
  return [...sfxMap.keys()];
}
export function hasSfx(id) {
  return sfxMap.has(id);
}

export function getMasterVolume() {
  return masterVolume;
}
export function setMasterVolume(v) {
  masterVolume = clamp01(v);
  applyGain();
}
export function isMuted() {
  return muted;
}
export function setMuted(m) {
  muted = !!m;
  applyGain();
}

// ---- BGM ----
export function hasBgm() {
  return !!(bgmDef && bgmDef.file);
}
export function getBgmVolume() {
  return bgmDef?.volume ?? 0.4;
}
export function isBgmEnabled() {
  return bgmEnabled;
}
/** 开关背景音乐（UI 偏好）；关闭时立即停止 */
export function setBgmEnabled(v) {
  bgmEnabled = !!v;
  if (!bgmEnabled) stopBgm();
  else startBgm();
}
/** 开始背景音乐循环（需已有 AudioContext；素材缺失/解码失败则静默） */
export function startBgm() {
  if (!bgmEnabled || !bgmDef?.file) return;
  const c = ensureCtx();
  if (!c || bgmSource) return;
  const play = (buf) => {
    if (!bgmEnabled || bgmSource) return;
    bgmBuffer = buf;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = c.createGain();
    g.gain.value = clamp01(bgmDef.volume ?? 0.4);
    src.connect(g);
    g.connect(masterGain);
    src.start();
    bgmSource = src;
  };
  if (bgmBuffer) {
    play(bgmBuffer);
    return;
  }
  fetch(bgmDef.file)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    .then((buf) => c.decodeAudioData(buf))
    .then(play)
    .catch(() => {
      /* 素材缺失或解码失败：静默 */
    });
}
export function stopBgm() {
  if (!bgmSource) return;
  try {
    bgmSource.stop();
  } catch (_) {
    /* ignore */
  }
  try {
    bgmSource.disconnect();
  } catch (_) {
    /* ignore */
  }
  bgmSource = null;
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function applyGain() {
  if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
}

function ensureCtx() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    masterGain = ctx.createGain();
    applyGain();
    masterGain.connect(ctx.destination);
  } catch (_) {
    ctx = null;
    masterGain = null;
  }
  return ctx;
}

/** 在首次用户手势时调用，解锁自动播放限制 */
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') {
    const p = c.resume();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
  startBgm();
}

/** 播放音效；未鉴权/无素材/无 AudioContext 时静默跳过 */
export function playSfx(id) {
  if (muted) return;
  const def = sfxMap.get(id);
  if (!def) return;

  const nowMs = globalThis.performance?.now ? globalThis.performance.now() : Date.now();
  const last = lastPlayMs.get(id) ?? -Infinity;
  if (nowMs - last < MIN_INTERVAL_MS) return;
  lastPlayMs.set(id, nowMs);

  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    const p = c.resume();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
  if (def.file) playFile(c, def);
  else if (def.synth) playSynth(c, def.synth, def.volume);
}

function playSynth(c, s, defVolume) {
  const start = c.currentTime + (s.delay ?? 0);
  const dur = Math.max(0.01, s.duration ?? 0.12);
  const vol = clamp01((defVolume ?? 1) * (s.volume ?? 0.2));
  const ratios = Array.isArray(s.chord) && s.chord.length ? s.chord : [1];
  const f0 = s.freq ?? 440;
  const f1 = s.freqTo ?? f0;
  for (const ratio of ratios) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = s.wave ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(1, f0 * ratio), start);
    if (s.freqTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * ratio), start + dur);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + Math.min(0.02, dur * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }
}

function playFile(c, def) {
  const key = def.file;
  if (fileBuffers.has(key)) {
    playBuffer(c, fileBuffers.get(key), def.volume);
    return;
  }
  fetch(key)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    .then((buf) => c.decodeAudioData(buf))
    .then((audioBuf) => {
      fileBuffers.set(key, audioBuf);
      playBuffer(c, audioBuf, def.volume);
    })
    .catch(() => {
      /* 素材缺失或解码失败：静默（音效为可选增强） */
    });
}

function playBuffer(c, audioBuf, vol) {
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = audioBuf;
  gain.gain.value = clamp01(vol ?? 1);
  src.connect(gain);
  gain.connect(masterGain);
  src.start();
}
