// js/sim/endings.js
// 游戏逻辑层：双结局（v0.6 舍入纪，见 #19）。
//
// 解锁：集齐全部记忆碎片（叙事收束）。玩家在终局视图中二选一，选择后永久记录。
// 选择后进入「自由模式」：机制照常（宇宙仍可继续跃迁），叙事已完成。

import { Events } from '../core/events.js';
import * as Fragments from './fragments.js';

let endings = [];
let chosen = null; // 已选结局 id，或 null

export function initEndings(cfg = {}) {
  endings = cfg.endings ?? [];
  chosen = null;
}

export function getEndingIds() {
  return endings.map((e) => e.id);
}
export function getEnding(id) {
  return endings.find((e) => e.id === id) ?? null;
}

/** 是否已解锁（集齐全部记忆碎片） */
export function isUnlocked() {
  const total = Fragments.getFragmentIds().length;
  return total > 0 && Fragments.collectedCount() === total;
}

export function getChosen() {
  return chosen;
}
export function isChosen(id) {
  return chosen === id;
}

/** 选择结局；返回 { ok, id? , reason? } */
export function choose(id) {
  if (!isUnlocked()) return { ok: false, reason: 'locked' };
  if (chosen) return { ok: false, reason: 'already' };
  if (!getEnding(id)) return { ok: false, reason: 'notfound' };
  chosen = id;
  Events.emit('ending:chosen', { id });
  return { ok: true, id };
}

// ---- 存档 ----
export function serialize() {
  return chosen;
}
export function load(value) {
  chosen = typeof value === 'string' ? value : null;
}
