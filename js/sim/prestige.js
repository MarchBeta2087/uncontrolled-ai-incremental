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

let timeCrystals = Num.parse(0);
let prestigeCount = 0;

let universeCap = Num.parse('1e70');
let crystalBase = Num.parse(2);
let exponent = Num.parse(0.5);
let prestigeExponent = Num.parse(0.5);

export function configurePrestige(cfg = {}) {
  if (cfg.universe?.massEnergyCap !== undefined) universeCap = Num.parse(cfg.universe.massEnergyCap);
  if (cfg.prestige?.crystalBase !== undefined) crystalBase = Num.parse(cfg.prestige.crystalBase);
  if (cfg.prestige?.exponent !== undefined) exponent = Num.parse(cfg.prestige.exponent);
  if (cfg.prestige?.prestigeExponent !== undefined) prestigeExponent = Num.parse(cfg.prestige.prestigeExponent);
}

export function initPrestige() {
  timeCrystals = Num.parse(0);
  prestigeCount = 0;
}

export function getTimeCrystals() {
  return timeCrystals;
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
export function getUniverseCap() {
  return universeCap;
}

export function canPrestige() {
  const mass = Resources.getResource('mass_energy');
  return mass !== null && Num.gte(mass, universeCap);
}

/** 计算本次穿梭可得时间晶体（不修改状态） */
export function calculateCrystals() {
  const mass = Resources.getResource('mass_energy') ?? Num.parse(0);
  // 宇宙消耗度：触顶 = 1（超出的部分按 1 计，保持 D ∈ [0,1]）
  const D = Num.min(Num.div(mass, universeCap), Num.parse(1));
  // 研发深度：已研发技术 / 技术总数
  const researched = Num.parse(Techs.ownedCount());
  const total = Num.parse(Techs.getTechIds().length);
  const K = Num.eq(total, 0) ? Num.parse(1) : Num.div(researched, total);
  // 本次穿梭后的周目数
  const n = Num.parse(prestigeCount + 1);

  const base = Num.mul(Num.mul(crystalBase, Num.pow(Num.mul(D, K), exponent)), Num.pow(n, prestigeExponent));
  return Num.floor(base);
}

/** 执行时空穿梭：结算 → 应用元进度 → 清空周目内状态 → 时间归零（设计 §6.3） */
export function prestige() {
  if (!canPrestige()) return { ok: false, reason: '宇宙质能尚未触顶' };
  const crystals = calculateCrystals();
  timeCrystals = Num.add(timeCrystals, crystals);
  prestigeCount += 1;

  Resources.reset();
  Techs.reset();
  Time.reset();
  Time.clearRateMultipliers();

  Events.emit('prestige:done', { crystals, prestigeCount });
  return { ok: true, crystals, prestigeCount };
}

// ---- 存档 ----
export function serialize() {
  return { timeCrystals: Num.toJSON(timeCrystals), prestigeCount };
}

export function load(state = {}) {
  timeCrystals = state.timeCrystals !== undefined ? Num.fromJSON(state.timeCrystals) : Num.parse(0);
  prestigeCount = state.prestigeCount ?? 0;
}
