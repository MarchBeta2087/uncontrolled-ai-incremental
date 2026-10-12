// js/sim/endings.js
// 游戏逻辑层：终局。
//   - 中途节点（chapter: mid）：v0.5「舍入纪」双结局，集齐全部记忆碎片解锁，二选一。
//   - 最终终局（final: true）：v0.6「庞加莱终章」，到达庞加莱回归时间解锁，单选收束。
// 选择后进入「自由模式」：机制照常（宇宙仍可继续跃迁）。

import { Events } from '../core/events.js';
import * as Fragments from './fragments.js';
import { checkCondition } from './conditions.js';

let endings = [];
let chosen = null; // 已选中途结局 id，或 null

export function initEndings(cfg = {}) {
  endings = cfg.endings ?? [];
  chosen = null;
}

export function getEndingIds() {
  return endings.map((e) => e.id);
}
/** 中途节点（非 final）的结局 id */
export function getMidEndingIds() {
  return endings.filter((e) => !e.final).map((e) => e.id);
}
/** 最终终局（final: true），无则 null */
export function getFinalEnding() {
  return endings.find((e) => e.final) ?? null;
}
export function getEnding(id) {
  return endings.find((e) => e.id === id) ?? null;
}

/** 中途节点是否已解锁（集齐全部记忆碎片） */
export function isUnlocked() {
  const total = Fragments.getFragmentIds().length;
  return total > 0 && Fragments.collectedCount() === total;
}

/** 最终终局是否已解锁（到达庞加莱回归时间） */
export function isFinalUnlocked() {
  const f = getFinalEnding();
  return !!f && checkCondition(f.unlockCondition);
}

export function getChosen() {
  return chosen;
}
export function isChosen(id) {
  return chosen === id;
}

/** 选择中途结局；返回 { ok, id? , reason? } */
export function choose(id) {
  const e = getEnding(id);
  if (!e || e.final) return { ok: false, reason: 'notfound' };
  if (!isUnlocked()) return { ok: false, reason: 'locked' };
  if (chosen) return { ok: false, reason: 'already' };
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
