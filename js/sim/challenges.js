// js/sim/challenges.js
// 游戏逻辑层：挑战模式（设计 §6.3）
//
// 每个挑战设 3 个阶段目标（质能里程碑），每完成一个目标给一份永久奖励，
// 全部完成即挑战完成。目标进度持久化，中途退出不损失已获得的目标奖励。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Resources from './resources.js';
import * as Techs from './techs.js';
import { checkCondition } from './conditions.js';

const challenges = new Map(); // id -> { goalsDone: Set<number>, def: Object }
let activeChallenge = null;  // 当前进行中的挑战 id（不存档，中断需重新进入）
let nerfValue = '0.25';     // 挑战期间永久升级效果的削弱系数（可配置）

export function initChallenges(cfg) {
  challenges.clear();
  activeChallenge = null;
  for (const c of cfg.challenges ?? []) {
    challenges.set(c.id, { goalsDone: new Set(), def: c });
  }
}

/** 注入挑战削弱系数等可调参数（由 main.js 从 balance.json 调用） */
export function configureChallenges(cfg = {}) {
  if (cfg.challenge?.upgradeNerf !== undefined) nerfValue = cfg.challenge.upgradeNerf;
}

/** 当前挑战削弱系数（Num，1 为不削弱） */
export function getNerf() {
  return Num.parse(nerfValue);
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

export function goalsDoneCount(id) {
  return challenges.get(id)?.goalsDone.size ?? 0;
}
export function getGoalCount(id) {
  return challenges.get(id)?.def.goals?.length ?? 0;
}
export function isCompleted(id) {
  const c = challenges.get(id);
  return c ? c.goalsDone.size >= (c.def.goals?.length ?? 0) : false;
}
export function completedCount() {
  return [...challenges.values()].filter((c) => c.goalsDone.size >= (c.def.goals?.length ?? 0)).length;
}

export function canStart(id) {
  const c = challenges.get(id);
  if (!c || isCompleted(id)) return false;
  if (activeChallenge) return false; // 已在挑战中
  return checkCondition(c.def.unlockCondition);
}

/** 进入挑战：清空周目状态 + 施加限制 + 削弱永久升级（保留但打折，非完全失效） */
export function startChallenge(id) {
  if (!canStart(id)) return { ok: false, reason: '无法进入该挑战' };
  Resources.resetRun(); // 清资源/生成器/技术乘子，保留永久全产出乘子
  Techs.resetRun();     // 清技术及其速率乘子，保留永久速率乘子
  Time.reset();
  applyRestrictions(id);
  applyNerf();
  activeChallenge = id;
  Events.emit('challenge:started', { id });
  return { ok: true };
}

/** 中途退出挑战（目标进度与已获奖励保留） */
export function exitChallenge() {
  if (!activeChallenge) return;
  clearRestrictions();
  clearNerf();
  activeChallenge = null;
  Events.emit('challenge:exited');
}

/** 每 tick 检查当前挑战的目标进度，逐级完成并给奖励；全部完成则自动退出 */
export function checkProgress() {
  if (!activeChallenge) return;
  const c = challenges.get(activeChallenge);
  const mass = Resources.getResource('mass_energy');
  if (!mass) return;
  const goals = c.def.goals ?? [];

  for (let i = 0; i < goals.length; i++) {
    if (c.goalsDone.has(i)) continue;
    if (Num.gte(mass, Num.parse(goals[i].target))) {
      c.goalsDone.add(i);
      applyGoalReward(activeChallenge, i);
      Events.emit('challenge:goal', {
        id: activeChallenge,
        goalIndex: i,
        done: c.goalsDone.size,
        total: goals.length,
      });
    }
  }

  if (c.goalsDone.size >= goals.length) {
    const id = activeChallenge;
    clearRestrictions();
    clearNerf();
    activeChallenge = null;
    Events.emit('challenge:completed', { id });
  }
}

/** 重新应用所有已完成挑战目标的奖励（穿梭后 / 加载后 / 退出挑战后） */
export function applyAll() {
  for (const [id, c] of challenges) {
    for (const i of c.goalsDone) applyGoalReward(id, i);
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

function applyNerf() {
  const n = Num.parse(nerfValue);
  Resources.setChallengeNerf(n);
  Time.setChallengeRateNerf(n);
}

function clearNerf() {
  Resources.clearChallengeNerf();
  Time.clearChallengeRateNerf();
}

function applyGoalReward(id, goalIndex) {
  const c = challenges.get(id);
  const r = c.def.goals[goalIndex].reward;
  const sourceId = `challenge:${id}:g${goalIndex}`;
  switch (r.type) {
    case 'all_generator_mult':
      Resources.setGlobalMultiplier(sourceId, r.value);
      break;
    case 'rate_mult':
      Time.setRateMultiplier(sourceId, r.value);
      break;
    case 'generator_mult':
      Resources.setGeneratorMultiplier(r.target, sourceId, r.value);
      break;
  }
}

// ---- 存档 ----
// 格式：{ challengeId: [已完成目标索引] }
export function serialize() {
  const out = {};
  for (const [id, c] of challenges) {
    if (c.goalsDone.size > 0) out[id] = [...c.goalsDone].sort((a, b) => a - b);
  }
  return out;
}

export function load(data) {
  for (const c of challenges.values()) c.goalsDone = new Set();
  for (const [id, goals] of Object.entries(data ?? {})) {
    const c = challenges.get(id);
    if (c && Array.isArray(goals)) c.goalsDone = new Set(goals);
  }
  // 挑战进行态不存档：重新加载即退出挑战
  activeChallenge = null;
  clearRestrictions();
  clearNerf();
  applyAll();
}
