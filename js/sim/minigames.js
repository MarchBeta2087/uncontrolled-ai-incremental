// js/sim/minigames.js
// 游戏逻辑层：小游戏（v0.6 庞加莱纪）。
//
// 职责：读取 config/minigames.json，记录每局成绩与历史最佳，按配置把「最佳成绩」
// 折算成**永久增益**（乘子 = clamp(1 + best × perScore, 1, max)）。
// 不 import conditions（避免与 conditions → minigames 成环）；解锁判定由 UI 用 checkCondition。
import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from './resources.js';
import { Events } from '../core/events.js';

const games = new Map(); // id -> def
const best = new Map();  // id -> Number（历史最佳成绩）
let totalPlays = 0;

export function initMinigames(cfg) {
  games.clear();
  best.clear();
  totalPlays = 0;
  for (const g of cfg?.minigames ?? []) {
    games.set(g.id, g);
    best.set(g.id, 0);
  }
}

export function getMinigame(id) {
  return games.get(id) ?? null;
}
export function getMinigameIds() {
  return [...games.keys()];
}
export function getBest(id) {
  return best.get(id) ?? 0;
}
export function getTotalPlays() {
  return totalPlays;
}
export function getUnlockCondition(id) {
  return games.get(id)?.unlockCondition ?? null;
}

/** 某小游戏当前增益乘子（Num） */
export function getGainMultiplier(id) {
  const g = games.get(id);
  if (!g?.gain) return Num.parse(1);
  const m = Num.add(Num.parse(1), Num.mul(Num.parse(getBest(id)), Num.parse(g.gain.perScore)));
  return Num.min(m, Num.parse(g.gain.max));
}

/** 重放全部小游戏增益（穿梭 / 跃迁 / 挑战后调用，与升级 applyAll 并列） */
export function applyAll() {
  for (const g of games.values()) {
    if (!g.gain) continue;
    const v = getGainMultiplier(g.id);
    switch (g.gain.type) {
      case 'all_generator_mult':
        Resources.setGlobalMultiplier('minigame:' + g.id, v);
        break;
      case 'rate_mult':
        Time.setRateMultiplier('minigame:' + g.id, v, true);
        break;
      case 'generator_mult':
        if (g.gain.target) Resources.setGeneratorMultiplier(g.gain.target, 'minigame:' + g.id, v);
        break;
      default:
        break;
    }
  }
}

/** 记录一局成绩：刷新最佳则重放增益；返回是否破纪录 */
export function recordScore(id, score) {
  const g = games.get(id);
  if (!g) return false;
  totalPlays += 1;
  const s = Math.max(0, Math.floor(Number(score) || 0));
  const record = s > getBest(id);
  if (record) {
    best.set(id, s);
    applyAll();
  }
  Events.emit('minigame:played', { id, score: s, best: getBest(id), record });
  return record;
}

// ---- 存档 ----
export function serialize() {
  const out = {};
  for (const [id, s] of best) out[id] = s;
  return { best: out, totalPlays };
}

export function load(state = {}) {
  for (const id of games.keys()) {
    const s = Number(state?.best?.[id]);
    best.set(id, Number.isFinite(s) && s > 0 ? Math.floor(s) : 0);
  }
  totalPlays = Number(state?.totalPlays) > 0 ? Math.floor(Number(state.totalPlays)) : 0;
  applyAll();
}

/** 初始化后立即重放（fresh save / init 时） */
export function reset() {
  for (const id of games.keys()) best.set(id, 0);
  totalPlays = 0;
  applyAll();
}
