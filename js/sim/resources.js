// js/sim/resources.js
// 游戏逻辑层：资源与生成器系统（数值模型 §3 的 4 层链式生成器）
//
// 约定：
//   - 所有数值运算走 Num（MegotaNum 实例），禁止混用原生 Number；
//   - 本模块只负责状态与结算，不碰时间与 UI；
//   - 生成器成本为几何级数：第 n 个成本 = baseCost × growth^(n-1)。

import { Num } from '../core/num.js';
import { Events } from '../core/events.js';
import * as Progress from './progress.js';
import { t } from '../i18n/index.js';

const resources = new Map();       // id -> { amount: Num, def: Object }
const generators = new Map();      // id -> { count: Num, def: Object }
const generatorMults = new Map();  // genId -> Map(sourceId -> Num)
const clickMults = new Map();      // sourceId -> Num
const globalMults = new Map();     // sourceId -> Num（永久全产出乘子，穿梭保留）
const disabledGenerators = new Set(); // 挑战禁用的生成器 id
let challengeCostMult = Num.parse(1); // 挑战成本乘子（默认 1）
let challengeNerfExp = Num.parse(1); // 挑战削弱指数（作用于永久全产出乘子，1=不削弱，0.25=开四次方）

let clickProduction = Num.parse(0);
let clickResourceId = 'funds'; // MVP：点击产出资金

export function initResources(cfg) {
  resources.clear();
  generators.clear();
  generatorMults.clear();
  clickMults.clear();
  globalMults.clear();
  disabledGenerators.clear();
  challengeCostMult = Num.parse(1);
  challengeNerfExp = Num.parse(1);

  for (const r of cfg.resources ?? []) {
    resources.set(r.id, { amount: Num.parse(r.baseAmount ?? 0), def: r });
  }
  for (const g of cfg.generators ?? []) {
    generators.set(g.id, { count: Num.parse(0), def: g });
  }
  clickProduction = Num.parse(cfg.clickProduction ?? 0);
  if (cfg.clickResourceId) clickResourceId = cfg.clickResourceId;
}

// ---- 读取 ----
/** 第二阶段资源/生成器：未解锁时隐藏且不可购买 */
function isLocked(def) {
  return def.phase === 2 && !Progress.isPhase2Unlocked();
}

export function getResource(id) {
  const r = resources.get(id);
  return r ? r.amount : null;
}
export function getGenerator(id) {
  const g = generators.get(id);
  return g ? g.count : null;
}
export function getResourceIds() {
  return [...resources.entries()].filter(([, r]) => !isLocked(r.def)).map(([id]) => id);
}
export function getGeneratorIds() {
  return [...generators.entries()].filter(([, g]) => !isLocked(g.def)).map(([id]) => id);
}

/** 含被第二阶段锁定的条目（供 UI 预构建，解锁后由 CSS 显示） */
export function getAllResourceIds() {
  return [...resources.keys()];
}
export function getAllGeneratorIds() {
  return [...generators.keys()];
}
export function getResourceDef(id) {
  return resources.get(id)?.def ?? null;
}
export function getGeneratorDef(id) {
  return generators.get(id)?.def ?? null;
}

// ---- 乘子 ----
export function setGeneratorMultiplier(genId, sourceId, value) {
  if (!generatorMults.has(genId)) generatorMults.set(genId, new Map());
  generatorMults.get(genId).set(sourceId, Num.parse(value));
}
export function getGeneratorMultiplier(genId) {
  const map = generatorMults.get(genId);
  if (!map || map.size === 0) return Num.parse(1);
  let m = Num.parse(1);
  for (const v of map.values()) m = Num.mul(m, v);
  return m;
}

/** 某资源的总产出速率（游戏秒），用于 UI 展示 */
export function getProductionPerSecond(resourceId) {
  let total = Num.parse(0);
  const globalMult = Num.pow(getGlobalMultiplier(), challengeNerfExp);
  for (const [genId, g] of generators) {
    if (g.def.produces !== resourceId) continue;
    const perSec = Num.mul(
      Num.mul(Num.mul(Num.parse(g.def.baseProduction), g.count), getGeneratorMultiplier(genId)),
      globalMult
    );
    total = Num.add(total, perSec);
  }
  return total;
}
export function setClickMultiplier(sourceId, value) {
  clickMults.set(sourceId, Num.parse(value));
}
export function getClickMultiplier() {
  let m = Num.parse(1);
  for (const v of clickMults.values()) m = Num.mul(m, v);
  return m;
}
/** 当前每次点击的产出（含乘子） */
export function getClickProduction() {
  return Num.mul(clickProduction, getClickMultiplier());
}
/** 永久全产出乘子（时间晶体升级等，穿梭后由升级重新应用） */
export function setGlobalMultiplier(sourceId, value) {
  globalMults.set(sourceId, Num.parse(value));
}
export function getGlobalMultiplier() {
  let m = Num.parse(1);
  for (const v of globalMults.values()) m = Num.mul(m, v);
  return m;
}
export function clearGlobalMultipliers() {
  globalMults.clear();
}
/** 挑战限制：禁用/恢复某生成器 */
export function setGeneratorDisabled(genId, disabled) {
  if (disabled) disabledGenerators.add(genId);
  else disabledGenerators.delete(genId);
}
export function clearGeneratorDisabled() {
  disabledGenerators.clear();
}
/** 挑战限制：所有生成器成本乘子 */
export function setChallengeCostMult(value) {
  challengeCostMult = Num.parse(value);
}
export function clearChallengeCostMult() {
  challengeCostMult = Num.parse(1);
}
/** 挑战削弱：永久全产出乘子的削弱指数（<1 削弱，如 0.25 为乘子开四次方） */
export function setChallengeNerfExp(value) {
  challengeNerfExp = Num.parse(value);
}
export function clearChallengeNerfExp() {
  challengeNerfExp = Num.parse(1);
}
/** 清空所有技术乘子（穿梭回卷 / 重新加载周目内状态时用） */
export function clearMultipliers() {
  generatorMults.clear();
  clickMults.clear();
}

// ---- 操作 ----
export function click() {
  const res = resources.get(clickResourceId);
  if (!res) return Num.parse(0);
  const gain = Num.mul(clickProduction, getClickMultiplier());
  res.amount = Num.add(res.amount, gain);
  Events.emit('resources:changed', { id: clickResourceId, amount: res.amount });
  return gain;
}

export function spend(id, amount) {
  const r = resources.get(id);
  if (!r) return false;
  if (Num.lt(r.amount, amount)) return false;
  r.amount = Num.sub(r.amount, amount);
  Events.emit('resources:changed', { id, amount: r.amount });
  return true;
}

/** 当前已有 count 个时，再买 n 个生成器的总成本（几何级数求和，含挑战成本乘子） */
export function buyCost(genId, n) {
  const g = generators.get(genId);
  if (!g) return Num.parse(0);
  const count = Num.parse(n);
  const base = Num.mul(Num.parse(g.def.baseCost), challengeCostMult);
  const growth = Num.parse(g.def.costGrowth);
  const gCur = Num.pow(growth, g.count); // growth^current
  const gN = Num.pow(growth, count);     // growth^n
  const factor = Num.div(Num.sub(gN, Num.parse(1)), Num.sub(growth, Num.parse(1)));
  return Num.mul(Num.mul(base, gCur), factor);
}

export function buyGenerator(genId, n = 1) {
  const g = generators.get(genId);
  if (!g) return { ok: false, reason: t('reason.generatorNotFound') };
  if (isLocked(g.def)) return { ok: false, reason: t('reason.phase2Locked') };
  if (disabledGenerators.has(genId)) return { ok: false, reason: t('reason.generatorDisabled') };
  const count = Num.parse(n);
  if (Num.lte(count, 0)) return { ok: false, reason: t('reason.countPositive') };
  const cost = buyCost(genId, count);
  const currency = resources.get(g.def.costCurrency);
  if (Num.lt(currency.amount, cost)) {
    return { ok: false, reason: t('reason.insufficientResources'), cost, have: currency.amount };
  }
  currency.amount = Num.sub(currency.amount, cost);
  g.count = Num.add(g.count, count);
  Events.emit('generators:changed', { id: genId, count: g.count });
  Events.emit('resources:changed', { id: g.def.costCurrency, amount: currency.amount });
  return { ok: true, cost, count: g.count };
}

/** 当前资源能买的最大数量（几何级数反解；含挑战成本乘子，被禁用的生成器为 0） */
export function maxAffordable(genId) {
  if (disabledGenerators.has(genId)) return Num.parse(0);
  const g = generators.get(genId);
  if (!g || isLocked(g.def)) return Num.parse(0);
  const currency = resources.get(g.def.costCurrency);
  if (!currency) return Num.parse(0);
  const base = Num.mul(Num.parse(g.def.baseCost), challengeCostMult);
  const growth = Num.parse(g.def.costGrowth);
  const firstCost = Num.mul(base, Num.pow(growth, g.count));
  const ratio = Num.div(Num.mul(currency.amount, Num.sub(growth, Num.parse(1))), firstCost);
  const inside = Num.add(ratio, Num.parse(1));
  if (Num.lte(inside, 1)) return Num.parse(0);
  const n = Num.floor(Num.div(Num.log10(inside), Num.log10(growth)));
  return Num.max(n, Num.parse(0));
}

export function buyMaxGenerator(genId) {
  const n = maxAffordable(genId);
  if (Num.lte(n, 0)) return { ok: false, reason: t('reason.insufficientResources') };
  return buyGenerator(genId, n);
}

/** MAX ALL：对每个生成器各买最大数量，返回实际购买次数 */
export function buyMaxAll() {
  let bought = 0;
  for (const gid of generators.keys()) {
    if (buyMaxGenerator(gid).ok) bought++;
  }
  return bought;
}

/** 每 tick 生产结算：产出 = 基础产量 × 数量 × 技术乘子 × 全局乘子，再 × 游戏秒增量 */
export function tick(dtGameSeconds) {
  const dt = Num.parse(dtGameSeconds);
  const globalMult = Num.pow(getGlobalMultiplier(), challengeNerfExp);
  for (const [genId, g] of generators) {
    const perSec = Num.mul(
      Num.mul(Num.mul(Num.parse(g.def.baseProduction), g.count), getGeneratorMultiplier(genId)),
      globalMult
    );
    const produced = Num.mul(perSec, dt);
    const res = resources.get(g.def.produces);
    res.amount = Num.add(res.amount, produced);
  }
  Events.emit('resources:tick');
}

// ---- 存档 ----
export function serialize() {
  const resOut = {};
  for (const [id, r] of resources) resOut[id] = Num.toJSON(r.amount);
  const genOut = {};
  for (const [id, g] of generators) genOut[id] = Num.toJSON(g.count);
  return { resources: resOut, generators: genOut };
}

export function load(state) {
  for (const [id, json] of Object.entries(state.resources ?? {})) {
    const r = resources.get(id);
    if (r) r.amount = Num.fromJSON(json);
  }
  for (const [id, json] of Object.entries(state.generators ?? {})) {
    const g = generators.get(id);
    if (g) g.count = Num.fromJSON(json);
  }
}

/** 穿梭回卷：清空周目内资源与生成器，并清空技术乘子 */
export function reset() {
  for (const r of resources.values()) {
    r.amount = Num.parse(r.def.baseAmount ?? 0);
  }
  for (const g of generators.values()) {
    g.count = Num.parse(0);
  }
  clearMultipliers();
  globalMults.clear(); // 永久乘子也清（穿梭后由升级 applyAll 重新应用）
}

/** 挑战开始：清空周目内资源/生成器/技术乘子，但保留永久乘子（升级/挑战/成就奖励，挑战期间削弱） */
export function resetRun() {
  for (const r of resources.values()) {
    r.amount = Num.parse(r.def.baseAmount ?? 0);
  }
  for (const g of generators.values()) {
    g.count = Num.parse(0);
  }
  clearMultipliers(); // 清技术乘子，保留 globalMults
}
