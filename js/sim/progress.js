// js/sim/progress.js
// 全局进度标志（低层模块，无业务依赖）：目前仅「第二阶段是否解锁」。
//
// 单独成模块是为了让 resources / techs / upgrades 都能读取该标志，
// 而又不与 prestige 形成循环依赖（prestige → resources/techs）。
import { Events } from '../core/events.js';

let phase2Unlocked = false;

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
