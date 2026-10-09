// js/core/time.js
// 时间系统 —— 游戏内时钟（设计说明书 §3）
//
// 核心约定：
//   1. 状态只存一个量 gameSecondsElapsed（Num 实例），自 UTC 2028-01-01 00:00:00 起累计的游戏内秒；
//   2. 初始速率 1 物理秒 = 10000 游戏秒，当前速率 = 初始 × 各速率乘子之积（乘子用 Num，设软上限）；
//   3. 分级显示（需求 §5.1）：Y<10^6 完整日期 → 10^6≤Y<10^8 仅年份 → Y≥10^8 科学记数 → 超 float64 走 MegotaNum 记法。

import { Num } from './num.js';
import { Events } from './events.js';

// 与 config/balance.json 初值一致，可被 configureTime 覆盖
const DEFAULTS = {
  baseRate: '10000',
  rateMultiplierCap: '1e30',
  julianYearSeconds: '31557600',
  startYear: 2028,
  startTimestampMs: Date.UTC(2028, 0, 1, 0, 0, 0),
  yearFullLimit: '1e6',       // 完整日期显示上限（游戏内公元年）
  yearScientificLimit: '1e8', // 科学记数法门槛（游戏内公元年）
};

// JS Date 可表示的最大毫秒数对应的秒数（约 ±8.64e12 秒 ≈ 273,790 年）
// 设计 §3.2 要求 Y<10^6 用原生 Date 格式化，但 Date 在约 27 万年处即溢出，
// 因此该区间内超 Date 上限的部分降级为"仅年份"显示（见 formatGameTime）。
const DATE_MAX_SECONDS = 8.64e12;

let BASE_RATE = Num.parse(DEFAULTS.baseRate);
let RATE_CAP = Num.parse(DEFAULTS.rateMultiplierCap);
let JULIAN_YEAR = Num.parse(DEFAULTS.julianYearSeconds);
let START_YEAR = DEFAULTS.startYear;
let START_MS = DEFAULTS.startTimestampMs;
let YEAR_FULL_LIMIT = Num.parse(DEFAULTS.yearFullLimit);
let YEAR_SCI_LIMIT = Num.parse(DEFAULTS.yearScientificLimit);

let gameSecondsElapsed = Num.parse(0);
const rateMultipliers = new Map(); // id -> Num（各机制贡献的时间速率乘子）
let challengeRateDiv = Num.parse(1); // 挑战速率惩罚（默认 1）
let challengeRateNerf = Num.parse(1); // 挑战削弱系数（作用于永久速率乘子，默认 1）

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatFullDate(date) {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`;
}

function formatYearOnly(Y) {
  const y = Num.floor(Y).toNumber();
  return `${y.toLocaleString('en-US')} 年`;
}

export const Time = {
  // ---- 速率乘子管理 ----
  setRateMultiplier(id, value) {
    const v = Num.parse(value);
    if (Num.isNaN(v)) return;
    rateMultipliers.set(id, v);
  },
  removeRateMultiplier(id) {
    rateMultipliers.delete(id);
  },
  clearRateMultipliers() {
    rateMultipliers.clear();
  },

  /** 移除指定来源的速率乘子（挑战开始清技术速率乘子用，保留永久速率乘子） */
  removeRateMultiplier(id) {
    rateMultipliers.delete(id);
  },

  /** 挑战限制：时间速率惩罚（÷value） */
  setChallengeRateDiv(value) {
    challengeRateDiv = Num.parse(value);
  },
  clearChallengeRateDiv() {
    challengeRateDiv = Num.parse(1);
  },

  /** 挑战削弱：永久速率乘子削弱系数 */
  setChallengeRateNerf(value) {
    challengeRateNerf = Num.parse(value);
  },
  clearChallengeRateNerf() {
    challengeRateNerf = Num.parse(1);
  },

  /** 基础速率（不含乘子） */
  getBaseRate() {
    return BASE_RATE;
  },

  /** 当前时间速率（游戏秒/物理秒），已含软上限、挑战惩罚与挑战削弱 */
  getRate() {
    let r = BASE_RATE;
    for (const m of rateMultipliers.values()) {
      r = Num.mul(r, m);
    }
    if (Num.gt(r, RATE_CAP)) r = RATE_CAP;
    r = Num.div(r, challengeRateDiv);
    r = Num.mul(r, challengeRateNerf);
    return r;
  },

  // ---- 时间推进 ----
  /**
   * 结算一个物理 tick 的时间增量。
   * @param {number} dtRealSeconds 物理秒差值（float64，仅 tick 间隔用）
   * @returns {object} 本次游戏秒增量（Num），供生产链按游戏内时间结算
   */
  tick(dtRealSeconds) {
    const inc = Num.mul(Num.parse(dtRealSeconds), this.getRate());
    const next = Num.add(gameSecondsElapsed, inc);
    if (Num.isNaN(next)) {
      // 设计 §10：时间轴运算异常 → 冻结在本次合法值，UI 显示"时间轴异常"
      Events.emit('time:error', { reason: 'NaN', at: gameSecondsElapsed });
      return Num.parse(0);
    }
    gameSecondsElapsed = next;
    return inc;
  },

  /** 穿梭回卷：时间归零（回 2028-01-01 00:00:00），速率乘子由穿梭结算重算 */
  reset() {
    gameSecondsElapsed = Num.parse(0);
  },

  // ---- 读取状态 ----
  getGameSecondsElapsed() {
    return gameSecondsElapsed;
  },

  /** 当前游戏内公元纪年（Num）：2028 + 经过秒 / 儒略年 */
  getCurrentYear() {
    return Num.add(Num.div(gameSecondsElapsed, JULIAN_YEAR), Num.parse(START_YEAR));
  },

  // ---- 分级显示 ----
  /** 返回 { text, mode }，text 为显示字符串，mode 为 'full'|'year'|'scientific'|'ban' */
  formatGameTime() {
    const years = Num.div(gameSecondsElapsed, JULIAN_YEAR);
    const Y = Num.add(years, Num.parse(START_YEAR));

    if (Num.lt(Y, YEAR_FULL_LIMIT)) {
      const sec = gameSecondsElapsed.toNumber();
      if (sec <= DATE_MAX_SECONDS) {
        const date = new Date(START_MS + sec * 1000);
        return { text: formatFullDate(date), mode: 'full' };
      }
      // Date 溢出（约 27 万年 < Y < 100 万年）：降级为仅年份
      return { text: formatYearOnly(Y), mode: 'year' };
    }
    if (Num.lt(Y, YEAR_SCI_LIMIT)) {
      return { text: formatYearOnly(Y), mode: 'year' };
    }
    // Y ≥ 10^8：科学记数；Y 超 float64 上限(1.8e308)才落 MegotaNum 记法（设计 §3.2）
    const mode = Num.lt(Y, Num.parse('1.8e308')) ? 'scientific' : 'ban';
    const text = Num.format(Y, {
      mode,
      scientificStyle: 'times',
    });
    return { text: `${text} 年`, mode };
  },

  // ---- 存档 ----
  serialize() {
    return Num.toJSON(gameSecondsElapsed);
  },
  serializeRateMultipliers() {
    const out = {};
    for (const [id, v] of rateMultipliers) out[id] = Num.toJSON(v);
    return out;
  },
  load(secondsJSON, rateMultipliersJSON = {}) {
    const v = Num.fromJSON(secondsJSON);
    if (Num.isNaN(v)) throw new Error('[Time] 存档中的游戏内秒为 NaN');
    gameSecondsElapsed = v;
    rateMultipliers.clear();
    for (const [id, mj] of Object.entries(rateMultipliersJSON)) {
      const mv = Num.fromJSON(mj);
      if (!Num.isNaN(mv)) rateMultipliers.set(id, mv);
    }
  },
};

/** 由 main.js 从 balance.json 注入参数覆盖默认值 */
export function configureTime(cfg = {}) {
  if (cfg.baseRate !== undefined) BASE_RATE = Num.parse(cfg.baseRate);
  if (cfg.rateMultiplierCap !== undefined) RATE_CAP = Num.parse(cfg.rateMultiplierCap);
  if (cfg.julianYearSeconds !== undefined) JULIAN_YEAR = Num.parse(cfg.julianYearSeconds);
  if (cfg.startYear !== undefined) START_YEAR = cfg.startYear;
  if (cfg.startTimestampMs !== undefined) START_MS = cfg.startTimestampMs;
  if (cfg.yearFullLimit !== undefined) YEAR_FULL_LIMIT = Num.parse(cfg.yearFullLimit);
  if (cfg.yearScientificLimit !== undefined) YEAR_SCI_LIMIT = Num.parse(cfg.yearScientificLimit);
}
