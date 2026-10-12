// js/sim/cap.js
// 低层模块：宇宙上限的计算（基准 × cap_mult，封顶当前宇宙上限目标，再叠 cap_tetrate 塔层）。
//
// 单独成模块，是为了让 resources（第三阶段产出下限）与 techs（第三阶段成本）
// 都能读取上限，而不与 prestige 形成循环依赖（prestige → resources/techs）。
import { Num } from '../core/num.js';
import * as Mults from './mults.js';
import * as Universe from './universe.js';

let baseCap = Num.parse('1e70'); // 基准上限（balance.json: universe.massEnergyCap）

export function configureCap(cfg = {}) {
  if (cfg.universe?.massEnergyCap !== undefined) baseCap = Num.parse(cfg.universe.massEnergyCap);
}

export function getBaseCap() {
  return baseCap;
}

/** 动态宇宙上限 = tower( min(基准上限 × Π cap_mult, 当前宇宙上限目标), cap 塔层 ) */
export function getUniverseCap() {
  const base = Num.min(Num.mul(baseCap, Mults.getCapMultiplier()), Universe.getCapTarget());
  return Mults.tower(base, Mults.getArrows('cap'));
}
