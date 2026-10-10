// js/sim/mults.js
// 共享乘子容器：宇宙上限乘子（cap_mult）与晶体产出乘子（crystal_mult）。
//
// 独立于 resources / prestige / techs，避免模块循环依赖：
//   - prestige 读取（计算动态上限、穿梭结算）；
//   - techs / upgrades 写入（应用效果）。
import { Num } from '../core/num.js';

const capMults = new Map();     // sourceId -> Num
const crystalMults = new Map(); // sourceId -> Num

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
