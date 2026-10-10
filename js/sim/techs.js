// js/sim/techs.js
// 游戏逻辑层：技术树（设计 §5.2）
//
// 效果为有限枚举（见 js/data/config.js 的 EFFECT_TYPES），
// 引擎解析执行；配置里不允许出现任意代码。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from './resources.js';
import * as Mults from './mults.js';
import * as Progress from './progress.js';
import { Events } from '../core/events.js';
import { t } from '../i18n/index.js';

const techs = new Map(); // id -> { owned: bool, def: Object }

export function initTechs(cfg) {
  techs.clear();
  for (const t of cfg.techs ?? []) {
    techs.set(t.id, { owned: false, def: t });
  }
}

export function isOwned(id) {
  return techs.get(id)?.owned ?? false;
}
export function getTech(id) {
  return techs.get(id)?.def ?? null;
}
export function getTechIds() {
  return [...techs.keys()];
}

/** 当前可用（未因阶段锁定）的技术 id；用于晶体结算的研发深度分母 */
export function getAvailableTechIds() {
  return [...techs.entries()]
    .filter(([, t]) => !(t.def.phase === 2 && !Progress.isPhase2Unlocked()))
    .map(([id]) => id);
}

/** 是否满足购买条件（前置 + 资源） */
export function canBuy(id) {
  const tech = techs.get(id);
  if (!tech || tech.owned) return false;
  if (tech.def.phase === 2 && !Progress.isPhase2Unlocked()) return false;
  for (const req of tech.def.requires ?? []) {
    if (!techs.get(req)?.owned) return false;
  }
  const currency = Resources.getResource(tech.def.costCurrency);
  if (currency === null) return false;
  return Num.gte(currency, Num.parse(tech.def.cost));
}

export function buyTech(id) {
  const tech = techs.get(id);
  if (!tech) return { ok: false, reason: t('reason.techNotFound') };
  if (tech.def.phase === 2 && !Progress.isPhase2Unlocked()) {
    return { ok: false, reason: t('reason.phase2Locked') };
  }
  if (tech.owned) return { ok: false, reason: t('reason.alreadyResearched') };
  for (const req of tech.def.requires ?? []) {
    if (!techs.get(req)?.owned) return { ok: false, reason: t('reason.prereqMissing', { id: req }) };
  }
  if (!Resources.spend(tech.def.costCurrency, Num.parse(tech.def.cost))) {
    return { ok: false, reason: t('reason.insufficientResources') };
  }
  tech.owned = true;
  applyEffects(tech.def.effects ?? [], id);
  Events.emit('tech:owned', { id });
  return { ok: true };
}

function applyEffects(effects, sourceId, skipRate = false) {
  for (const e of effects) {
    switch (e.type) {
      case 'generator_mult':
        Resources.setGeneratorMultiplier(e.target, sourceId, e.value);
        break;
      case 'all_generator_mult':
        for (const gid of Resources.getGeneratorIds()) {
          Resources.setGeneratorMultiplier(gid, sourceId, e.value);
        }
        break;
      case 'click_mult':
        Resources.setClickMultiplier(sourceId, e.value);
        break;
      case 'rate_mult':
        if (!skipRate) Time.setRateMultiplier(sourceId, e.value);
        break;
      case 'cap_mult':
        Mults.setCapMultiplier(sourceId, e.value);
        break;
      case 'crystal_mult':
        Mults.setCrystalMultiplier(sourceId, e.value);
        break;
      default:
        console.warn(`[Techs] 未知效果类型: ${e.type}`);
    }
  }
}

export function ownedCount() {
  return [...techs.values()].filter((t) => t.owned).length;
}

/** 移除某技术贡献的「非资源类」乘子（速率 / 上限 / 晶体） */
function removeEffects(id, def) {
  for (const e of def.effects ?? []) {
    if (e.type === 'rate_mult') Time.removeRateMultiplier(id);
    else if (e.type === 'cap_mult') Mults.removeCapMultiplier(id);
    else if (e.type === 'crystal_mult') Mults.removeCrystalMultiplier(id);
  }
}

/** 重放所有已研发的永久技术效果（重置后调用） */
export function applyPermanent(skipRate = false) {
  for (const [id, t] of techs) {
    if (t.def.permanent && t.owned) applyEffects(t.def.effects ?? [], id, skipRate);
  }
}

/** 穿梭回卷：清空非永久技术与相关乘子；永久技术保留并重放 */
export function reset() {
  for (const [id, t] of techs) {
    if (t.def.permanent) continue;
    removeEffects(id, t.def);
    t.owned = false;
  }
  Resources.clearMultipliers();
  Time.clearRateMultipliers();
  applyPermanent();
}

/** 挑战开始：清空非永久技术及技术乘子；永久技术保留并重放 */
export function resetRun() {
  for (const [id, t] of techs) {
    if (t.def.permanent) continue;
    if (t.owned) {
      removeEffects(id, t.def);
      t.owned = false;
    }
  }
  Resources.clearMultipliers();
  applyPermanent();
}

// ---- 存档 ----
export function serialize() {
  return [...techs.entries()].filter(([, t]) => t.owned).map(([id]) => id);
}

/** 从已研发列表恢复；只重建资源乘子，速率乘子由 time.rateMultipliers 快照恢复（见 Time.load） */
export function load(ownedList) {
  Resources.clearMultipliers();
  for (const t of techs.values()) t.owned = false;
  for (const id of ownedList ?? []) {
    const t = techs.get(id);
    if (t) {
      t.owned = true;
      applyEffects(t.def.effects ?? [], id, true);
    }
  }
}
