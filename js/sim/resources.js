// js/sim/resources.js
// 游戏逻辑层：资源与生成器系统（数值模型 §3 的 4 层链式生成器）
//
// 约定：
//   - 所有数值运算走 Num（MegotaNum 实例），禁止混用原生 Number；
//   - 本模块只负责状态与结算，不碰时间与 UI；
//   - 生成器成本为几何级数：第 n 个成本 = baseCost × growth^(n-1)。

import { Num } from '../core/num.js';
import { Events } from '../core/events.js';

const resources = new Map();       // id -> { amount: Num, def: Object }
const generators = new Map();      // id -> { count: Num, def: Object }
const generatorMults = new Map();  // genId -> Map(sourceId -> Num)
const clickMults = new Map();      // sourceId -> Num

let clickProduction = Num.parse(0);
let clickResourceId = 'funds'; // MVP：点击产出资金

export function initResources(cfg) {
  resources.clear();
  generators.clear();
  generatorMults.clear();
  clickMults.clear();

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
export function getResource(id) {
  const r = resources.get(id);
  return r ? r.amount : null;
}
export function getGenerator(id) {
  const g = generators.get(id);
  return g ? g.count : null;
}
export function getResourceIds() {
  return [...resources.keys()];
}
export function getGeneratorIds() {
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
export function setClickMultiplier(sourceId, value) {
  clickMults.set(sourceId, Num.parse(value));
}
export function getClickMultiplier() {
  let m = Num.parse(1);
  for (const v of clickMults.values()) m = Num.mul(m, v);
  return m;
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

/** 当前已有 count 个时，再买 n 个生成器的总成本（几何级数求和） */
export function buyCost(genId, n) {
  const g = generators.get(genId);
  if (!g) return Num.parse(0);
  const count = Num.parse(n);
  const base = Num.parse(g.def.baseCost);
  const growth = Num.parse(g.def.costGrowth);
  const gCur = Num.pow(growth, g.count); // growth^current
  const gN = Num.pow(growth, count);     // growth^n
  const factor = Num.div(Num.sub(gN, Num.parse(1)), Num.sub(growth, Num.parse(1)));
  return Num.mul(Num.mul(base, gCur), factor);
}

export function buyGenerator(genId, n = 1) {
  const g = generators.get(genId);
  if (!g) return { ok: false, reason: '生成器不存在' };
  const count = Num.parse(n);
  if (Num.lte(count, 0)) return { ok: false, reason: '购买数量须为正整数' };
  const cost = buyCost(genId, count);
  const currency = resources.get(g.def.costCurrency);
  if (Num.lt(currency.amount, cost)) {
    return { ok: false, reason: '资源不足', cost, have: currency.amount };
  }
  currency.amount = Num.sub(currency.amount, cost);
  g.count = Num.add(g.count, count);
  Events.emit('generators:changed', { id: genId, count: g.count });
  Events.emit('resources:changed', { id: g.def.costCurrency, amount: currency.amount });
  return { ok: true, cost, count: g.count };
}

/** 每 tick 生产结算：产出 = 基础产量 × 数量 × 乘子，再 × 游戏秒增量 */
export function tick(dtGameSeconds) {
  const dt = Num.parse(dtGameSeconds);
  for (const [genId, g] of generators) {
    const perSec = Num.mul(
      Num.mul(Num.parse(g.def.baseProduction), g.count),
      getGeneratorMultiplier(genId)
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
