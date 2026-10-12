// js/sim/prestige.js
// 游戏逻辑层：时空穿梭（Prestige，设计 §6）
//
// 结算公式（数值模型 §7）：
//   crystals = floor( C0 × (D×K)^exponent × n^prestigeExponent )
//   D = 宇宙消耗度（触顶 = 1），K = 研发深度，n = 本次穿梭后的周目数

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Resources from './resources.js';
import * as Techs from './techs.js';
import * as Mults from './mults.js';
import * as Progress from './progress.js';
import * as Universe from './universe.js';
import * as Cap from './cap.js';
import * as Cycle from './cycle.js';
import { t } from '../i18n/index.js';

let timeCrystals = Num.parse(0);        // 当前持有（可消费）
let totalTimeCrystals = Num.parse(0);   // 历史累计获得（只增不减）
let prestigeCount = 0;

let crystalBase = Num.parse(2);
let exponent = Num.parse(0.5);
let prestigeExponent = Num.parse(0.5);

// 第二阶段（越过本宇宙）：解锁标志存于 progress 模块
let phase2UnlockCrystals = Num.parse(100);
let phase3UnlockUniverse = 9; // 第三阶段（庞加莱纪）：宇宙编号达此值时解锁（balance.json 可覆盖）
let poincareYear = Num.parse('eee120'); // 庞加莱回归时间（年），到达即触发事件
let poincareSeen = false;
let lastPrestigeCrystals = Num.parse(0); // 上一次穿梭所得晶体（供成就条件 prestige_gain_ge）

export function configurePrestige(cfg = {}) {
  Cap.configureCap(cfg);
  if (cfg.prestige?.crystalBase !== undefined) crystalBase = Num.parse(cfg.prestige.crystalBase);
  if (cfg.prestige?.exponent !== undefined) exponent = Num.parse(cfg.prestige.exponent);
  if (cfg.prestige?.prestigeExponent !== undefined) prestigeExponent = Num.parse(cfg.prestige.prestigeExponent);
  if (cfg.phase2?.unlockCrystals !== undefined) phase2UnlockCrystals = Num.parse(cfg.phase2.unlockCrystals);
  if (cfg.phase3?.unlockUniverse !== undefined) phase3UnlockUniverse = Number(cfg.phase3.unlockUniverse);
  if (cfg.phase3?.poincareYear !== undefined) poincareYear = Num.parse(cfg.phase3.poincareYear);
  Cycle.configureCycle({ seconds: cfg.phase3?.cycleSeconds });
  Resources.configureCapLink(cfg.phase3?.capLink);
}

export function initPrestige() {
  timeCrystals = Num.parse(0);
  totalTimeCrystals = Num.parse(0);
  prestigeCount = 0;
  lastPrestigeCrystals = Num.parse(0);
  Progress.setPhase2Unlocked(false);
  Progress.setPhase3Unlocked(false);
  Cycle.resetCycle();
  poincareSeen = false;
}

export function getTimeCrystals() {
  return timeCrystals;
}
/** 历史累计获得的时间晶体（只增不减，含已花费） */
export function getTotalTimeCrystals() {
  return totalTimeCrystals;
}
/** 扣除时间晶体（购买升级用），不足返回 false */
export function spendCrystals(amount) {
  const a = Num.parse(amount);
  if (Num.lt(timeCrystals, a)) return false;
  timeCrystals = Num.sub(timeCrystals, a);
  Events.emit('crystals:changed', { amount: timeCrystals });
  return true;
}
export function getPrestigeCount() {
  return prestigeCount;
}
/** 动态宇宙上限（委托 cap.js）：min(基准 × cap_mult, 当前宇宙上限目标)，再叠 cap_tetrate 塔层 */
export function getUniverseCap() {
  return Cap.getUniverseCap();
}

/** 第二阶段解锁所需的当前持有晶体数 */
export function getPhase2UnlockCrystals() {
  return phase2UnlockCrystals;
}

/** 上一次穿梭所得晶体数 */
export function getLastPrestigeCrystals() {
  return lastPrestigeCrystals;
}

/** 第二阶段是否已解锁（一次性） */
export function isPhase2Unlocked() {
  return Progress.isPhase2Unlocked();
}

/** 解锁第二阶段；返回是否本次真正解锁 */
export function unlockPhase2() {
  return Progress.unlockPhase2();
}

/** 每 tick 检查解锁条件（当前持有 ≥ 阈值） */
export function checkPhase2Unlock() {
  if (!Progress.isPhase2Unlocked() && Num.gte(timeCrystals, phase2UnlockCrystals)) {
    Progress.unlockPhase2();
  }
}

/** 第三阶段是否已解锁（一次性） */
export function isPhase3Unlocked() {
  return Progress.isPhase3Unlocked();
}

/** 解锁第三阶段；返回是否本次真正解锁 */
export function unlockPhase3() {
  return Progress.unlockPhase3();
}

/** 第三阶段解锁所需宇宙编号 */
export function getPhase3UnlockUniverse() {
  return phase3UnlockUniverse;
}

/** 每 tick 检查第三阶段解锁条件（当前宇宙 ≥ 阈值；跃迁后 universe 仍满足则即时重解锁） */
export function checkPhase3Unlock() {
  if (!Progress.isPhase3Unlocked() && Universe.getUniverse() >= phase3UnlockUniverse) {
    Progress.unlockPhase3();
  }
}

/** 庞加莱回归时间（年，Num） */
export function getPoincareYear() {
  return poincareYear;
}
export function isPoincareSeen() {
  return poincareSeen;
}
/** 每 tick 检查游戏内年份是否到达庞加莱回归时间（到达即触发，仅一次） */
export function checkPoincare() {
  if (poincareSeen) return;
  if (Num.gte(Time.getCurrentYear(), poincareYear)) {
    poincareSeen = true;
    Events.emit('poincare:reached', {});
  }
}

export function canPrestige() {
  const mass = Resources.getResource('mass_energy');
  return mass !== null && Num.gte(mass, getUniverseCap());
}

/** 计算本次穿梭可得时间晶体（不修改状态） */
export function calculateCrystals() {
  const mass = Resources.getResource('mass_energy') ?? Num.parse(0);
  // 宇宙消耗度：触顶 = 1（超出的部分按 1 计，保持 D ∈ [0,1]）
  const D = Num.min(Num.div(mass, getUniverseCap()), Num.parse(1));
  // 研发深度：已研发技术 / 当前可用技术总数（不含未解锁的第二阶段技术）
  const researched = Num.parse(Techs.ownedCount());
  const total = Num.parse(Techs.getAvailableTechIds().length);
  const K = Num.eq(total, 0) ? Num.parse(1) : Num.div(researched, total);
  // 本次穿梭后的周目数
  const n = Num.parse(prestigeCount + 1);

  const base = Num.mul(Num.mul(crystalBase, Num.pow(Num.mul(D, K), exponent)), Num.pow(n, prestigeExponent));
  return Num.floor(Num.mul(base, Mults.getCrystalMultiplier()));
}

/** 执行时空穿梭：结算 → 应用元进度 → 清空周目内状态 → 时间归零（设计 §6.3） */
export function prestige() {
  if (!canPrestige()) return { ok: false, reason: t('reason.notAtCap') };
  const crystals = calculateCrystals();
  lastPrestigeCrystals = crystals;
  timeCrystals = Num.add(timeCrystals, crystals);
  totalTimeCrystals = Num.add(totalTimeCrystals, crystals);
  prestigeCount += 1;

  Resources.reset();
  Time.reset();
  Techs.reset(); // 清空周目技术；永久技术由 reset() 末尾重放

  Events.emit('prestige:done', { crystals, prestigeCount });
  return { ok: true, crystals, prestigeCount };
}

/** 宇宙跃迁：清空当前时间晶体与阶段解锁（保留累计统计与已购升级） */
export function resetForUniverseJump() {
  timeCrystals = Num.parse(0);
  Progress.setPhase2Unlocked(false);
  Progress.setPhase3Unlocked(false);
  Events.emit('crystals:changed', { amount: timeCrystals });
}

// ---- 存档 ----
export function serialize() {
  return {
    timeCrystals: Num.toJSON(timeCrystals),
    totalTimeCrystals: Num.toJSON(totalTimeCrystals),
    prestigeCount,
    phase2Unlocked: Progress.isPhase2Unlocked(),
    phase3Unlocked: Progress.isPhase3Unlocked(),
    phase3CycleElapsed: Cycle.getCycleElapsed(),
    poincareSeen,
  };
}

export function load(state = {}) {
  timeCrystals = state.timeCrystals !== undefined ? Num.fromJSON(state.timeCrystals) : Num.parse(0);
  // 迁移前的旧存档没有 totalTimeCrystals：回退为当前持有量
  totalTimeCrystals = state.totalTimeCrystals !== undefined
    ? Num.fromJSON(state.totalTimeCrystals)
    : timeCrystals;
  prestigeCount = state.prestigeCount ?? 0;
  Progress.setPhase2Unlocked(!!state.phase2Unlocked);
  Progress.setPhase3Unlocked(!!state.phase3Unlocked);
  Cycle.setCycleElapsed(state.phase3CycleElapsed ?? 0);
  poincareSeen = !!state.poincareSeen;
}
