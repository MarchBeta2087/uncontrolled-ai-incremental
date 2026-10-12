// js/sim/mults.js
// 共享乘子容器：宇宙上限乘子（cap_mult）、晶体产出乘子（crystal_mult），
// 以及第三阶段（v0.6）的「上限箭塔层数」（cap_tetrate）。
//
// 独立于 resources / prestige / techs，避免模块循环依赖：
//   - prestige 读取（计算动态上限、穿梭结算）；
//   - resources 读取产出箭塔层数；
//   - techs / upgrades 写入（应用效果）。
import { Num } from '../core/num.js';

const capMults = new Map();     // sourceId -> Num
const crystalMults = new Map(); // sourceId -> Num
// 箭塔层数：kind = 'cap'（上限）；sourceId -> Number（整数层数）
const arrows = { cap: new Map() };

function product(map) {
  let m = Num.parse(1);
  for (const v of map.values()) m = Num.mul(m, v);
  return m;
}

// ---- 宇宙上限乘子 ----
export function setCapMultiplier(sourceId, value) {
  capMults.set(sourceId, Num.parse(value));
}
export function removeCapMultiplier(sourceId) {
  capMults.delete(sourceId);
}
export function clearCapMultipliers() {
  capMults.clear();
}
export function getCapMultiplier() {
  return product(capMults);
}

// ---- 晶体产出乘子 ----
export function setCrystalMultiplier(sourceId, value) {
  crystalMults.set(sourceId, Num.parse(value));
}
export function removeCrystalMultiplier(sourceId) {
  crystalMults.delete(sourceId);
}
export function clearCrystalMultipliers() {
  crystalMults.clear();
}
export function getCrystalMultiplier() {
  return product(crystalMults);
}

// ---- 箭塔层数（第三阶段，v0.6）----
/** 叠塔：对数值连续施加 n 次 10^x（n=0 时原样返回）。 */
export function tower(x, layers) {
  let v = Num.parse(x);
  const n = Math.max(0, Math.floor(Number(layers) || 0));
  for (let i = 0; i < n; i++) v = Num.pow(10, v);
  return v;
}

/** 设置某来源贡献的箭塔层数（整数） */
export function setArrow(kind, sourceId, count) {
  const map = arrows[kind];
  if (!map) return;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  map.set(sourceId, n);
}

export function removeArrow(kind, sourceId) {
  arrows[kind]?.delete(sourceId);
}

export function clearArrows(kind) {
  if (kind === undefined) {
    arrows.cap.clear();
    return;
  }
  arrows[kind]?.clear();
}

/** 当前箭塔总层数（各来源之和） */
export function getArrows(kind) {
  let n = 0;
  for (const v of arrows[kind]?.values() ?? []) n += v;
  return n;
}
