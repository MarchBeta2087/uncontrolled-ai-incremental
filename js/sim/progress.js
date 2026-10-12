// js/sim/progress.js
// 全局进度标志（低层模块，无业务依赖）：第二阶段 / 第三阶段是否解锁。
//
// 单独成模块是为了让 resources / techs / upgrades 都能读取该标志，
// 而又不与 prestige 形成循环依赖（prestige → resources/techs）。
import { Events } from '../core/events.js';

let phase2Unlocked = false;
let phase3Unlocked = false;

export function isPhase2Unlocked() {
  return phase2Unlocked;
}

export function setPhase2Unlocked(v) {
  phase2Unlocked = !!v;
}

/** 一次性解锁；返回是否本次真正解锁 */
export function unlockPhase2() {
  if (phase2Unlocked) return false;
  phase2Unlocked = true;
  Events.emit('phase2:unlocked', {});
  return true;
}

// ---- 第三阶段（v0.6 庞加莱纪）----
export function isPhase3Unlocked() {
  return phase3Unlocked;
}

export function setPhase3Unlocked(v) {
  phase3Unlocked = !!v;
}

/** 一次性解锁；返回是否本次真正解锁 */
export function unlockPhase3() {
  if (phase3Unlocked) return false;
  phase3Unlocked = true;
  Events.emit('phase3:unlocked', {});
  return true;
}
