// js/sim/fragments.js
// 游戏逻辑层：记忆碎片（设计 §8.4，需求 §8.4）
// 周目叙事收集品；文案为原创短文本日志体，达成条件后进入碎片收集册。

import { Events } from '../core/events.js';
import { checkCondition } from './conditions.js';

const fragments = new Map(); // id -> { collected: bool, def: Object }

export function initFragments(cfg) {
  fragments.clear();
  for (const f of cfg.fragments ?? []) {
    fragments.set(f.id, { collected: false, def: f });
  }
}

export function isCollected(id) {
  return fragments.get(id)?.collected ?? false;
}
export function getFragment(id) {
  return fragments.get(id)?.def ?? null;
}
export function getFragmentIds() {
  return [...fragments.keys()];
}
export function collectedCount() {
  return [...fragments.values()].filter((f) => f.collected).length;
}

/** 轮询所有未收集碎片，返回本次新收集的 id 列表 */
export function checkAll() {
  const newly = [];
  for (const [id, f] of fragments) {
    if (!f.collected && checkCondition(f.def.condition)) {
      f.collected = true;
      newly.push(id);
      Events.emit('fragment:collected', { id });
    }
  }
  return newly;
}

// ---- 存档 ----
export function serialize() {
  return [...fragments.entries()].filter(([, f]) => f.collected).map(([id]) => id);
}

export function load(list) {
  for (const f of fragments.values()) f.collected = false;
  for (const id of list ?? []) {
    const f = fragments.get(id);
    if (f) f.collected = true;
  }
}
