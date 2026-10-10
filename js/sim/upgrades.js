// js/sim/upgrades.js
// 游戏逻辑层：时间晶体升级树（设计 §5.3，永久升级）
//
// 依赖关系：本模块依赖 prestige（读取/扣除晶体）；prestige 不依赖本模块，
// 穿梭后重新应用升级效果由 main.js 监听 'prestige:done' 调用 applyAll 完成（避免循环依赖）。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from './resources.js';
import * as Prestige from './prestige.js';
import { Events } from '../core/events.js';
import { t } from '../i18n/index.js';

const upgrades = new Map(); // id -> { owned: bool, def: Object }
const offlineMults = new Map(); // sourceId -> Num（离线收益乘子，永久）

export function initUpgrades(cfg) {
  upgrades.clear();
  for (const u of cfg.upgrades ?? []) {
    upgrades.set(u.id, { owned: false, def: u });
  }
}

export function isOwned(id) {
  return upgrades.get(id)?.owned ?? false;
}
export function getUpgrade(id) {
  return upgrades.get(id)?.def ?? null;
}
export function getUpgradeIds() {
  return [...upgrades.keys()];
}

/** 当前离线收益总乘子（时间晶体升级贡献） */
export function getOfflineMult() {
  let m = Num.parse(1);
  for (const v of offlineMults.values()) m = Num.mul(m, v);
  return m;
}

export function canBuy(id) {
  const u = upgrades.get(id);
  if (!u || u.owned) return false;
  for (const req of u.def.requires ?? []) {
    if (!upgrades.get(req)?.owned) return false;
  }
  return Num.gte(Prestige.getTimeCrystals(), Num.parse(u.def.cost));
}

export function buyUpgrade(id) {
  const u = upgrades.get(id);
  if (!u) return { ok: false, reason: t('reason.upgradeNotFound') };
  if (u.owned) return { ok: false, reason: t('reason.alreadyOwned') };
  for (const req of u.def.requires ?? []) {
    if (!upgrades.get(req)?.owned) return { ok: false, reason: t('reason.prereqMissing', { id: req }) };
  }
  const cost = Num.parse(u.def.cost);
  if (!Prestige.spendCrystals(cost)) return { ok: false, reason: t('reason.crystalsInsufficient') };
  u.owned = true;
  applyEffects(u.def.effects ?? [], id);
  Events.emit('upgrade:owned', { id });
  return { ok: true };
}

function applyEffects(effects, sourceId) {
  for (const e of effects) {
    switch (e.type) {
      case 'all_generator_mult':
        Resources.setGlobalMultiplier(sourceId, e.value);
        break;
      case 'generator_mult':
        Resources.setGeneratorMultiplier(e.target, sourceId, e.value);
        break;
      case 'click_mult':
        Resources.setClickMultiplier(sourceId, e.value);
        break;
      case 'rate_mult':
        Time.setRateMultiplier(sourceId, e.value, true); // 永久速率乘子
        break;
      case 'offline_mult':
        offlineMults.set(sourceId, Num.parse(e.value));
        break;
      default:
        console.warn(`[Upgrades] 未知效果类型: ${e.type}`);
    }
  }
}

/** 穿梭后 / 加载后重新应用所有已购升级效果（恢复永久乘子） */
export function applyAll() {
  for (const [id, u] of upgrades) {
    if (u.owned) applyEffects(u.def.effects ?? [], id);
  }
}

// ---- 存档 ----
export function serialize() {
  return [...upgrades.entries()].filter(([, u]) => u.owned).map(([id]) => id);
}

export function load(ownedList) {
  for (const u of upgrades.values()) u.owned = false;
  for (const id of ownedList ?? []) {
    const u = upgrades.get(id);
    if (u) u.owned = true;
  }
  applyAll();
}
