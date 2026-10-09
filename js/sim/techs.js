// js/sim/techs.js
// 游戏逻辑层：技术树（设计 §5.2）
//
// 效果为有限枚举（见 js/data/config.js 的 EFFECT_TYPES），
// 引擎解析执行；配置里不允许出现任意代码。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from './resources.js';
import { Events } from '../core/events.js';

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

/** 是否满足购买条件（前置 + 资源） */
export function canBuy(id) {
  const t = techs.get(id);
  if (!t || t.owned) return false;
  for (const req of t.def.requires ?? []) {
    if (!techs.get(req)?.owned) return false;
  }
  const currency = Resources.getResource(t.def.costCurrency);
  if (currency === null) return false;
  return Num.gte(currency, Num.parse(t.def.cost));
}

export function buyTech(id) {
  const t = techs.get(id);
  if (!t) return { ok: false, reason: '技术不存在' };
  if (t.owned) return { ok: false, reason: '已研发' };
  for (const req of t.def.requires ?? []) {
    if (!techs.get(req)?.owned) return { ok: false, reason: `前置未满足: ${req}` };
  }
  if (!Resources.spend(t.def.costCurrency, Num.parse(t.def.cost))) {
    return { ok: false, reason: '资源不足' };
  }
  t.owned = true;
  applyEffects(t.def.effects ?? [], id);
  Events.emit('tech:owned', { id });
  return { ok: true };
}

function applyEffects(effects, sourceId) {
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
        Time.setRateMultiplier(sourceId, e.value);
        break;
      default:
        console.warn(`[Techs] 未知效果类型: ${e.type}`);
    }
  }
}

// ---- 存档 ----
export function serialize() {
  return [...techs.entries()].filter(([, t]) => t.owned).map(([id]) => id);
}

/** 从已研发列表恢复；先清空技术相关乘子再重新应用，避免残留 */
export function load(ownedList) {
  Resources.clearMultipliers();
  Time.clearRateMultipliers();
  for (const t of techs.values()) t.owned = false;
  for (const id of ownedList ?? []) {
    const t = techs.get(id);
    if (t) {
      t.owned = true;
      applyEffects(t.def.effects ?? [], id);
    }
  }
}
