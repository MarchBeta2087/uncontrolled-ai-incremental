// js/ui/audio.js
// 表现层：音频偏好（localStorage）+ 游戏事件 → 音效接线。
//
// 偏好独立于存档（UI 偏好，沿用 theme / language / 大数记法的做法）。
// 事件接线集中在此，避免各 sim 模块直接依赖音频。

import { Events } from '../core/events.js';
import {
  configureAudio,
  unlockAudio,
  playSfx,
  getMasterVolume,
  setMasterVolume,
  isMuted,
  setMuted,
} from '../core/audio.js';

const STORAGE_VOLUME = 'uncontrolled-ai-incremental.volume';
const STORAGE_MUTED = 'uncontrolled-ai-incremental.muted';

function readVolume(fallback) {
  try {
    const v = localStorage.getItem(STORAGE_VOLUME);
    return v === null ? fallback : Number(v);
  } catch (_) {
    return fallback;
  }
}
function readMuted(fallback) {
  try {
    const v = localStorage.getItem(STORAGE_MUTED);
    return v === null ? fallback : v === '1';
  } catch (_) {
    return fallback;
  }
}

let bound = false;

/** 配置音频、恢复偏好、注册首次手势解锁与事件接线（只执行一次） */
export function initAudioUI(cfg = {}) {
  configureAudio(cfg);
  setMasterVolume(readVolume(getMasterVolume()));
  setMuted(readMuted(isMuted()));

  if (bound || typeof globalThis.document === 'undefined') return;
  bound = true;

  const unlock = () => unlockAudio();
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(ev, unlock, { once: true, passive: true });
  }
  bindGameEvents();
}

export function getVolumePref() {
  return getMasterVolume();
}
export function setVolumePref(v) {
  setMasterVolume(v);
  try {
    localStorage.setItem(STORAGE_VOLUME, String(getMasterVolume()));
  } catch (_) {
    /* 忽略写入失败 */
  }
}
export function getMutedPref() {
  return isMuted();
}
export function setMutedPref(m) {
  setMuted(m);
  try {
    localStorage.setItem(STORAGE_MUTED, m ? '1' : '0');
  } catch (_) {
    /* 忽略写入失败 */
  }
}

function bindGameEvents() {
  Events.on('generators:changed', () => playSfx('buy'));
  Events.on('tech:owned', () => playSfx('tech'));
  Events.on('upgrade:owned', () => playSfx('tech'));
  Events.on('crossupgrade:owned', () => playSfx('tech'));
  Events.on('prestige:done', () => playSfx('prestige'));
  Events.on('phase2:unlocked', () => playSfx('achievement'));
  Events.on('achievement:unlocked', () => playSfx('achievement'));
  Events.on('fragment:collected', () => playSfx('achievement'));
  Events.on('universe:jumped', () => playSfx('universe'));
  Events.on('ending:chosen', () => playSfx('ending'));
}
