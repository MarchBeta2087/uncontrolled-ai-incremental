// js/sim/timeboost.js
// 时间倍增（v0.5.1）：宇宙 ≥4 解锁；每按一次，时间速率 ×max(2, 2 + log10(log10(x)))，
// 其中 x = 累计时间晶体（x ≤ 10 时 ×2）；冷却 3 物理秒；跃迁到下一宇宙后重置。
//
// 累加乘子以「永久速率乘子」注册到 Time（穿梭保留），跃迁时清零并重放。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Prestige from './prestige.js';
import * as Universe from './universe.js';

const SOURCE = 'timeboost';

let multiplier = Num.parse(1); // 本宇宙累计倍率
let count = 0;                 // 本宇宙按键次数
let lastBoostMs = -Infinity;   // 上次按键的物理时间（Date.now）
let unlockUniverse = 4;
let cooldownMs = 3000;

export function configureTimeBoost(cfg = {}) {
  if (cfg.unlockUniverse !== undefined) unlockUniverse = Number(cfg.unlockUniverse);
  if (cfg.cooldownMs !== undefined) cooldownMs = Number(cfg.cooldownMs);
}

export function initTimeBoost() {
  multiplier = Num.parse(1);
  count = 0;
  lastBoostMs = -Infinity;
  apply();
}

/** 本次按键的倍率：x = 累计时间晶体；x ≤ 10 → 2，否则 2 + log10(log10(x)) */
export function currentFactor() {
  const x = Prestige.getTotalTimeCrystals();
  const logx = Num.log10(x).toNumber(); // log10(累计晶体)
  if (!Number.isFinite(logx) || logx <= 0) return 2; // x ≤ 1
  const ll = Math.log10(logx); // log10(log10(x))
  return Math.max(2, 2 + ll);
}

/** 宇宙 ≥ unlockUniverse 才解锁（默认 4） */
export function isUnlocked() {
  return Universe.getUniverse() >= unlockUniverse;
}

export function getMultiplier() {
  return multiplier;
}
export function getCount() {
  return count;
}

/** 冷却剩余毫秒（0 = 可立即按键） */
export function getCooldownRemaining(nowMs = Date.now()) {
  const remain = lastBoostMs + cooldownMs - nowMs;
  return remain > 0 ? remain : 0;
}

export function canBoost(nowMs = Date.now()) {
  return isUnlocked() && getCooldownRemaining(nowMs) === 0;
}

/** 按键：成功则累乘倍率 */
export function boost(nowMs = Date.now()) {
  if (!isUnlocked()) return { ok: false, reason: 'locked' };
  if (getCooldownRemaining(nowMs) > 0) return { ok: false, reason: 'cooldown' };
  const factor = currentFactor();
  multiplier = Num.mul(multiplier, factor);
  count += 1;
  lastBoostMs = nowMs;
  apply();
  Events.emit('timeboost:used', { factor, multiplier, count });
  return { ok: true, factor, multiplier, count };
}

/** 重放速率乘子（穿梭后 / 加载后调用） */
export function apply() {
  Time.setRateMultiplier(SOURCE, multiplier, true);
}

/** 宇宙跃迁：重置本宇宙的时间倍增 */
export function reset() {
  multiplier = Num.parse(1);
  count = 0;
  lastBoostMs = -Infinity;
  Time.setRateMultiplier(SOURCE, Num.parse(1), true);
}

// ---- 存档 ----
export function serialize() {
  return { multiplier: Num.toJSON(multiplier), count };
}
export function load(state) {
  multiplier = state?.multiplier !== undefined ? Num.fromJSON(state.multiplier) : Num.parse(1);
  count = state?.count ?? 0;
  lastBoostMs = -Infinity;
  apply();
}
