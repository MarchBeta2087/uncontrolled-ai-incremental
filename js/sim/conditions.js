// js/sim/conditions.js
// 条件判定引擎 —— 成就与记忆碎片共用的声明式条件检查
//
// 条件类型为有限枚举（在 js/data/config.js 的 CONDITION_TYPES 中注册校验），
// 本模块用 switch 硬编码实现，配置里不允许任意代码。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from './resources.js';
import * as Techs from './techs.js';
import * as Prestige from './prestige.js';
import * as Upgrades from './upgrades.js';
import * as Progress from './progress.js';

/** 判定单个条件是否满足 */
export function checkCondition(cond) {
  if (!cond || typeof cond !== 'object') return false;
  switch (cond.type) {
    case 'resource_ge': {
      const amount = Resources.getResource(cond.target);
      return amount !== null && Num.gte(amount, Num.parse(cond.value));
    }
    case 'generator_count_ge': {
      const count = Resources.getGenerator(cond.target);
      return count !== null && Num.gte(count, Num.parse(cond.value));
    }
    case 'prestige_count_ge':
      return Prestige.getPrestigeCount() >= Number(cond.value);
    case 'tech_count_ge':
      return Techs.ownedCount() >= Number(cond.value);
    case 'tech_owned':
      return Techs.isOwned(cond.target);
    case 'upgrade_owned':
      return Upgrades.isOwned(cond.target);
    case 'crystals_ge':
      return Num.gte(Prestige.getTimeCrystals(), Num.parse(cond.value));
    case 'total_crystals_ge':
      return Num.gte(Prestige.getTotalTimeCrystals(), Num.parse(cond.value));
    case 'time_years_ge':
      return Num.gte(Time.getCurrentYear(), Num.parse(cond.value));
    case 'phase2_unlocked':
      return Progress.isPhase2Unlocked();
    case 'prestige_gain_ge':
      return Num.gte(Prestige.getLastPrestigeCrystals(), Num.parse(cond.value));
    case 'cap_ge':
      return Num.gte(Prestige.getUniverseCap(), Num.parse(cond.value));
    case 'dark_energy_ge':
      return Num.gte(Resources.getResource('dark_energy') ?? Num.parse(0), Num.parse(cond.value));
    default:
      return false;
  }
}
