// js/sim/universe.js
// 低层状态：多宇宙编号、奇点种子、跨宇宙升级 owned，以及由配置推导的上限 / 成本 / 速率乘子。
//
// 本模块**不 import 任何 sim 业务模块**，以便被 conditions / techs / prestige 读取而不成环：
//   - conditions 读取 getUniverse() / getSeeds() → universe_ge / seeds_ge；
//   - techs 读取 getCostMultiplier() → 第二阶段技术成本缩放；
//   - prestige 读取 getCapTarget() → 宇宙上限封顶。
// 实际的跃迁编排见 js/sim/singularity.js。

import { Num } from '../core/num.js';

const FLOAT64_MAX = Num.parse('1.7976931348623157e308');

let config = null;
let universe = 1;
let seeds = Num.parse(0);
const crossOwned = new Set();

// 由当前宇宙推导的派生值
let capTarget = FLOAT64_MAX;
let capMult = Num.parse(1);
let costMult = Num.parse(1);
let rateMult = Num.parse(1);
let currentDef = { id: 1, capExponent: 308, seedReward: '1', rateMult: '1' };

export function configureUniverse(cfg = {}) {
  config = cfg;
  computeDerived();
}

export function initUniverse() {
  universe = 1;
  seeds = Num.parse(0);
  crossOwned.clear();
  computeDerived();
}

/** 第 n 宇宙定义：显式配置优先，否则按 fallback 公式生成（无限 New Game+） */
export function getUniverseDef(n) {
  const explicit = (config?.universes ?? []).find((u) => Number(u.id) === Number(n));
  if (explicit) {
    return {
      id: Number(n),
      name: explicit.name ?? null,
      capExponent: Number(explicit.capExponent ?? 308),
      seedReward: Num.parse(explicit.seedReward ?? '1'),
      rateMult: Num.parse(explicit.rateMult ?? '1'),
      restrictions: explicit.restrictions ?? [],
    };
  }
  const fb = config?.fallback ?? {};
  const base = Number(fb.capExponentBase ?? 308);
  const growth = Number(fb.capExponentGrowth ?? 3);
  const seedBase = Num.parse(fb.seedRewardBase ?? '1');
  const seedGrowth = Num.parse(fb.seedRewardGrowth ?? '2');
  return {
    id: Number(n),
    name: null,
    capExponent: base * Math.pow(growth, Number(n) - 1),
    seedReward: Num.mul(seedBase, Num.pow(seedGrowth, Num.parse(Number(n) - 1))),
    rateMult: Num.parse(fb.rateMultiplier ?? '1'),
    restrictions: [],
  };
}

/**
 * 宇宙上限乘子：10^(capExponent − 308)。宇宙 1 = 1（保持 v0.4 的 float64 叙事），
 * 宇宙 ≥2 越过 float64（MegotaNum 表示）。
 */
function computeDerived() {
  currentDef = getUniverseDef(universe);
  if (universe === 1) {
    capTarget = FLOAT64_MAX;
    capMult = Num.parse(1);
  } else {
    capTarget = Num.parse(`1e${currentDef.capExponent}`);
    // 用字符串构造精确的 10^(exp-308)，避免 Num.pow 的尾数误差
    capMult = Num.parse(`1e${currentDef.capExponent - 308}`);
  }
  costMult = capMult;
  rateMult = currentDef.rateMult;
}

// ---- 读取 ----
export function getUniverse() {
  return universe;
}
export function getCapTarget() {
  return capTarget;
}
export function getCapMultiplier() {
  return capMult;
}
export function getCostMultiplier() {
  return costMult;
}
export function getRateMultiplier() {
  return rateMult;
}
export function getSeeds() {
  return seeds;
}
export function getSeedReward() {
  return currentDef.seedReward;
}
export function getCapExponent() {
  return currentDef.capExponent;
}

// ---- 种子 ----
export function addSeeds(amount) {
  seeds = Num.add(seeds, Num.parse(amount));
}
export function spendSeeds(amount) {
  const a = Num.parse(amount);
  if (Num.lt(seeds, a)) return false;
  seeds = Num.sub(seeds, a);
  return true;
}

// ---- 跨宇宙升级 ----
export function getCrossUniverseUpgrades() {
  return config?.crossUniverseUpgrades ?? [];
}
export function getCrossUniverseUpgrade(id) {
  return (config?.crossUniverseUpgrades ?? []).find((u) => u.id === id) ?? null;
}
export function isCrossOwned(id) {
  return crossOwned.has(id);
}
export function ownCrossUpgrade(id) {
  crossOwned.add(id);
}
export function getOwnedCrossUpgrades() {
  return [...crossOwned];
}

// ---- 宇宙切换 ----
export function setUniverse(n) {
  universe = Number(n);
  computeDerived();
}

// ---- 存档 ----
export function serialize() {
  return {
    universe,
    singularitySeeds: Num.toJSON(seeds),
    crossUniverseUpgrades: [...crossOwned],
  };
}

export function load(state = {}) {
  universe = Number(state.universe ?? 1);
  if (!Number.isFinite(universe) || universe < 1) universe = 1;
  seeds = state.singularitySeeds !== undefined ? Num.fromJSON(state.singularitySeeds) : Num.parse(0);
  crossOwned.clear();
  for (const id of state.crossUniverseUpgrades ?? []) {
    if (getCrossUniverseUpgrade(id)) crossOwned.add(id);
  }
  computeDerived();
}
