// js/sim/achievements.js
// 游戏逻辑层：成就系统（设计 §9）
// 条件声明式（type/target/value），引擎轮询触发，达成后永久保存。

import { Events } from '../core/events.js';
import { checkCondition } from './conditions.js';

const achievements = new Map(); // id -> { unlocked: bool, def: Object }

export function initAchievements(cfg) {
  achievements.clear();
  for (const a of cfg.achievements ?? []) {
    achievements.set(a.id, { unlocked: false, def: a });
  }
}

export function isUnlocked(id) {
  return achievements.get(id)?.unlocked ?? false;
}
export function getAchievement(id) {
  return achievements.get(id)?.def ?? null;
}
export function getAchievementIds() {
  return [...achievements.keys()];
}
export function unlockedCount() {
  return [...achievements.values()].filter((a) => a.unlocked).length;
}

/** 轮询所有未达成成就，返回本次新达成的 id 列表 */
export function checkAll() {
  const newly = [];
  for (const [id, a] of achievements) {
    if (!a.unlocked && checkCondition(a.def.condition)) {
      a.unlocked = true;
      newly.push(id);
      Events.emit('achievement:unlocked', { id });
    }
  }
  return newly;
}

// ---- 存档 ----
export function serialize() {
  return [...achievements.entries()].filter(([, a]) => a.unlocked).map(([id]) => id);
}

export function load(list) {
  for (const a of achievements.values()) a.unlocked = false;
  for (const id of list ?? []) {
    const a = achievements.get(id);
    if (a) a.unlocked = true;
  }
}
