// js/sim/challenges.js
// 游戏逻辑层：挑战模式（设计 §6.3）
//
// 挑战 = 限制条件的周目：进入后清空周目状态并施加限制，触顶（穿梭）即完成并获得永久奖励。
// 挑战完成判定依赖 'prestige:done' 事件，由 main.js 在穿梭后调用 onPrestige()（避免循环依赖）。

import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Resources from './resources.js';
import * as Techs from './techs.js';
import { checkCondition } from './conditions.js';

const challenges = new Map(); // id -> { completed: bool, def: Object }
let activeChallenge = null;  // 当前进行中的挑战 id（不存档，中断即需重新开始）

export function initChallenges(cfg) {
  challenges.clear();
  activeChallenge = null;
  for (const c of cfg.challenges ?? []) {
    challenges.set(c.id, { completed: false, def: c });
  }
}

export function isCompleted(id) {
  return challenges.get(id)?.completed ?? false;
}
export function getChallenge(id) {
  return challenges.get(id)?.def ?? null;
}
export function getChallengeIds() {
  return [...challenges.keys()];
}
export function getActiveChallenge() {
  return activeChallenge;
}
export function completedCount() {
  return [...challenges.values()].filter((c) => c.completed).length;
}

export function canStart(id) {
  const c = challenges.get(id);
  if (!c || c.completed) return false;
  if (activeChallenge) return false; // 已在挑战中
  return checkCondition(c.def.unlockCondition);
}

/** 进入挑战：清空周目状态 + 施加限制 */
export function startChallenge(id) {
  if (!canStart(id)) return { ok: false, reason: '无法进入该挑战' };
  Resources.reset();
  Techs.reset();
  Time.reset();
  Time.clearRateMultipliers();
  applyRestrictions(id);
  activeChallenge = id;
  Events.emit('challenge:started', { id });
  return { ok: true };
}

/** 中途退出挑战（放弃，不结算奖励） */
export function exitChallenge() {
  if (!activeChallenge) return;
  clearRestrictions();
  activeChallenge = null;
  Events.emit('challenge:exited');
}

/** 穿梭完成时调用：若在挑战中，则挑战完成 */
export function onPrestige() {
  if (!activeChallenge) return;
  const id = activeChallenge;
  challenges.get(id).completed = true;
  clearRestrictions();
  activeChallenge = null;
  Events.emit('challenge:completed', { id });
}

/** 重新应用所有已完成挑战的奖励（穿梭后 / 加载后） */
export function applyAll() {
  for (const [id, c] of challenges) {
    if (c.completed) applyReward(id);
  }
}

function applyRestrictions(id) {
  const c = challenges.get(id);
  for (const r of c.def.restrictions ?? []) {
    switch (r.type) {
      case 'disable_generator':
        Resources.setGeneratorDisabled(r.target, true);
        break;
      case 'all_cost_mult':
        Resources.setChallengeCostMult(r.value);
        break;
      case 'rate_div':
        Time.setChallengeRateDiv(r.value);
        break;
    }
  }
}

function clearRestrictions() {
  Resources.clearGeneratorDisabled();
  Resources.clearChallengeCostMult();
  Time.clearChallengeRateDiv();
}

function applyReward(id) {
  const c = challenges.get(id);
  const r = c.def.reward;
  switch (r.type) {
    case 'all_generator_mult':
      Resources.setGlobalMultiplier('challenge:' + id, r.value);
      break;
    case 'rate_mult':
      Time.setRateMultiplier('challenge:' + id, r.value);
      break;
    case 'generator_mult':
      Resources.setGeneratorMultiplier(r.target, 'challenge:' + id, r.value);
      break;
  }
}

// ---- 存档 ----
export function serialize() {
  return [...challenges.entries()].filter(([, c]) => c.completed).map(([id]) => id);
}

export function load(list) {
  for (const c of challenges.values()) c.completed = false;
  for (const id of list ?? []) {
    const c = challenges.get(id);
    if (c) c.completed = true;
  }
  // 挑战进行态不存档：重新加载即退出挑战（中断需重来）
  activeChallenge = null;
  clearRestrictions();
  applyAll();
}
