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
import { t } from '../i18n/index.js';

let timeCrystals = Num.parse(0);        // 当前持有（可消费）
let totalTimeCrystals = Num.parse(0);   // 历史累计获得（只增不减）
let prestigeCount = 0;

let baseCap = Num.parse('1e70');        // 基准宇宙上限（由 balance.json 注入）
let crystalBase = Num.parse(2);
let exponent = Num.parse(0.5);
let prestigeExponent = Num.parse(0.5);

// 第二阶段（越过本宇宙）：解锁标志存于 progress 模块
let phase2UnlockCrystals = Num.parse(100);

export function configurePrestige(cfg = {}) {
  if (cfg.universe?.massEnergyCap !== undefined) baseCap = Num.parse(cfg.universe.massEnergyCap);
  if (cfg.prestige?.crystalBase !== undefined) crystalBase = Num.parse(cfg.prestige.crystalBase);
  if (cfg.prestige?.exponent !== undefined) exponent = Num.parse(cfg.prestige.exponent);
  if (cfg.prestige?.prestigeExponent !== undefined) prestigeExponent = Num.parse(cfg.prestige.prestigeExponent);
  if (cfg.phase2?.unlockCrystals !== undefined) phase2UnlockCrystals = Num.parse(cfg.phase2.unlockCrystals);
}

export function initPrestige() {
  timeCrystals = Num.parse(0);
  totalTimeCrystals = Num.parse(0);
  prestigeCount = 0;
  Progress.setPhase2Unlocked(false);
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
/** 动态宇宙上限 = 基准上限 × 所有 cap_mult 之积 */
// float64 上限：宇宙质能天花板（超过即不可表示）
const FLOAT64_MAX = Num.parse('1.7976931348623157e308');

/** 动态宇宙上限 = min(基准上限 × 所有 cap_mult 之积, float64 上限) */
export function getUniverseCap() {
  return Num.min(Num.mul(baseCap, Mults.getCapMultiplier()), FLOAT64_MAX);
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
  timeCrystals = Num.add(timeCrystals, crystals);
  totalTimeCrystals = Num.add(totalTimeCrystals, crystals);
  prestigeCount += 1;

  Resources.reset();
  Time.reset();
  Techs.reset(); // 清空周目技术；永久技术由 reset() 末尾重放

  Events.emit('prestige:done', { crystals, prestigeCount });
  return { ok: true, crystals, prestigeCount };
}

// ---- 存档 ----
export function serialize() {
  return {
    timeCrystals: Num.toJSON(timeCrystals),
    totalTimeCrystals: Num.toJSON(totalTimeCrystals),
    prestigeCount,
    phase2Unlocked: Progress.isPhase2Unlocked(),
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
}
