// js/sim/cycle.js
// 第三阶段（v0.6 庞加莱纪）「循环」闸门。
//
// 动机：塔高 ≥2 时 `上限 / 常数 ≡ 上限`（MegotaNum 塔表示丢失分数），
// 因此 cap-link 无法给出 pacing。改为**时间累积**：每买一层 cap_tetrate
// 需先把循环充能到 `cycleSeconds` 物理秒。
//
// 低层模块（只依赖 Events），供 techs（canBuy/consume）与 engine（tick）使用。
import { Events } from '../core/events.js';

let cycleSeconds = 120; // 每层所需物理秒（balance.json: phase3.cycleSeconds）
let elapsed = 0;        // 已充能物理秒（上限 cycleSeconds）

export function configureCycle(cfg = {}) {
  if (cfg.seconds !== undefined && Number.isFinite(Number(cfg.seconds)) && Number(cfg.seconds) > 0) {
    cycleSeconds = Number(cfg.seconds);
  }
}

export function getCycleSeconds() {
  return cycleSeconds;
}
export function getCycleElapsed() {
  return elapsed;
}
/** 充能进度 0–1 */
export function getCycleProgress() {
  return cycleSeconds > 0 ? Math.min(1, elapsed / cycleSeconds) : 1;
}
export function isCycleReady() {
  return elapsed >= cycleSeconds;
}

/** 推进物理秒（由 engine 每 tick 调用；离线结算不推进） */
export function tickCycle(dtRealSeconds) {
  if (!Number.isFinite(dtRealSeconds) || dtRealSeconds <= 0) return;
  const wasReady = isCycleReady();
  elapsed = Math.min(cycleSeconds, elapsed + dtRealSeconds);
  if (!wasReady && isCycleReady()) Events.emit('cycle:ready', {});
}

/** 消耗一次完整循环（买 cap_tetrate 时调用）；未充满返回 false */
export function consumeCycle() {
  if (!isCycleReady()) return false;
  elapsed = 0;
  Events.emit('cycle:consumed', {});
  return true;
}

export function resetCycle() {
  elapsed = 0;
}

/** 存档恢复用 */
export function setCycleElapsed(v) {
  const n = Number(v);
  elapsed = Number.isFinite(n) && n > 0 ? Math.min(cycleSeconds, n) : 0;
}
