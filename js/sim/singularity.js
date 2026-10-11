// js/sim/singularity.js
// 第三层重置：宇宙跃迁（v0.5，见 docs/v0.5-多宇宙设计.md）。
//
// 纪律（与 prestige 一致）：结算 → 元进度快照 → 清空 → 永久效果重放。
// 跃迁清空：资源 / 生成器 / 全部技术（含 permanent）/ 时间轴 / 当前时间晶体 / 第二阶段解锁；
// 跃迁保留：奇点种子、跨宇宙升级、时间晶体升级、成就、碎片、统计量（由 main.js 重放）。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Universe from './universe.js';
import * as Resources from './resources.js';
import * as Techs from './techs.js';
import * as Prestige from './prestige.js';
import * as Mults from './mults.js';
import * as TimeBoost from './timeboost.js';
import { t } from '../i18n/index.js';

export function configureSingularity(cfg = {}) {
  Universe.configureUniverse(cfg);
}

export function initSingularity() {
  Universe.initUniverse();
  applyCrossUniverse();
}

// ---- 跨宇宙升级效果（复用现有 EFFECT_TYPES）----
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
        Time.setRateMultiplier(sourceId, e.value, true);
        break;
      case 'cap_mult':
        Mults.setCapMultiplier(sourceId, e.value);
        break;
      case 'crystal_mult':
        Mults.setCrystalMultiplier(sourceId, e.value);
        break;
      default:
        console.warn(`[Singularity] 未知效果类型: ${e.type}`);
    }
  }
}

/** 重放宇宙自身乘子（上限 / 经济 / 速率）与所有已购跨宇宙升级效果；跨宇宙效果在穿梭后需重放 */
export function applyCrossUniverse() {
  Mults.setCapMultiplier('universe:cap', Universe.getCapMultiplier());
  // 先应用跨宇宙升级，使元进度产出乘子完整
  for (const id of Universe.getOwnedCrossUpgrades()) {
    const u = Universe.getCrossUniverseUpgrade(id);
    if (u) applyEffects(u.effects ?? [], 'cross:' + id);
  }
  // 自适应难度：移除宇宙产出乘子后读取其余元进度产出乘子（时间晶体升级 / 成就 / 跨宇宙升级），
  // 令 universe:prod = 上限乘子 / (静态难度 × metaProd^阻尼)。阻尼使元进度收益有界，
  // 既保留「越玩越强」，又避免后续宇宙瞬时通关（见 docs/v0.5-平衡模拟.md）。
  Resources.removeGlobalMultiplier('universe:prod');
  const meta = Num.max(Resources.getGlobalMultiplier(), Num.parse(1));
  const damped = Num.pow(meta, Universe.getDifficultyExponent());
  const prodMult = Num.div(Universe.getProductionMultiplier(), damped);
  Resources.setGlobalMultiplier('universe:prod', prodMult);
  Time.setRateMultiplier('universe:rate', Universe.getRateMultiplier(), true);
}

// ---- 跃迁 ----
/** 是否可跃迁：当前宇宙第二阶段全部研发（奇点折叠完成） */
export function canJump() {
  return Techs.allPhase2Researched();
}

export function getSeedReward() {
  return Universe.getSeedReward();
}

export function jump() {
  if (!canJump()) return { ok: false, reason: t('reason.cannotJump') };
  const reward = Universe.getSeedReward();
  const from = Universe.getUniverse();

  // 结算：发放奇点种子（跨宇宙保留）
  Universe.addSeeds(reward);

  // 清空：周目内一切 + 阶段 2 解锁 + 当前时间晶体
  Resources.reset();
  Techs.resetAll();
  Time.reset();
  Prestige.resetForUniverseJump();
  TimeBoost.reset();

  // 前进到下一宇宙并重放跨宇宙永久效果
  Universe.setUniverse(from + 1);
  applyCrossUniverse();

  Events.emit('universe:jumped', { from, to: from + 1, seeds: reward });
  return { ok: true, seeds: reward, universe: from + 1 };
}

// ---- 跨宇宙升级 ----
export function canBuyCrossUniverse(id) {
  const u = Universe.getCrossUniverseUpgrade(id);
  if (!u || Universe.isCrossOwned(id)) return false;
  for (const req of u.requires ?? []) {
    if (!Universe.isCrossOwned(req)) return false;
  }
  return Num.gte(Universe.getSeeds(), Num.parse(u.cost));
}

export function buyCrossUniverse(id) {
  const u = Universe.getCrossUniverseUpgrade(id);
  if (!u) return { ok: false, reason: t('reason.upgradeNotFound') };
  if (Universe.isCrossOwned(id)) return { ok: false, reason: t('reason.alreadyOwned') };
  for (const req of u.requires ?? []) {
    if (!Universe.isCrossOwned(req)) return { ok: false, reason: t('reason.prereqMissing', { id: req }) };
  }
  if (!Universe.spendSeeds(Num.parse(u.cost))) return { ok: false, reason: t('reason.seedsInsufficient') };
  Universe.ownCrossUpgrade(id);
  applyEffects(u.effects ?? [], 'cross:' + id);
  Events.emit('crossupgrade:owned', { id });
  return { ok: true };
}

// ---- 存档 ----
export function serialize() {
  return Universe.serialize();
}

export function load(state) {
  Universe.load(state);
  applyCrossUniverse();
}
