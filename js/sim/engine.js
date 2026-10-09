// js/sim/engine.js
// 游戏逻辑层：模拟引擎主循环（设计 §4.1）
//
//   - 固定步长 100ms，setInterval 漂移由 performance.now() 差值校正；
//   - 每 tick 顺序：时间增量 → 资源生产链 → 穿梭触发检查 → 置脏标记（发事件）。

import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import { Events } from '../core/events.js';
import * as Resources from './resources.js';

const TICK_MS = 100;
const MAX_DT_REAL = 10; // 主循环单次最大物理秒（防后台切回大跳变；离线结算另行处理）

let running = false;
let timer = null;
let lastReal = 0;

let universeCap = Num.parse('1e70'); // 触顶锚点（由 balance.json 注入）
let capResourceId = 'mass_energy';   // MVP：触顶资源

export function configureEngine(cfg = {}) {
  if (cfg.universe?.massEnergyCap !== undefined) {
    universeCap = Num.parse(cfg.universe.massEnergyCap);
  }
}

export function start() {
  if (running) return;
  running = true;
  lastReal = performance.now();
  timer = setInterval(loop, TICK_MS);
}

export function stop() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
}

export function isRunning() {
  return running;
}

function loop() {
  const now = performance.now();
  let dtReal = (now - lastReal) / 1000; // 物理秒
  lastReal = now;
  if (dtReal < 0) dtReal = 0;            // 系统时间回拨保护
  if (dtReal > MAX_DT_REAL) dtReal = MAX_DT_REAL;

  const dtGame = Time.tick(dtReal);      // 游戏秒增量（含速率乘子）
  Resources.tick(dtGame);                // 生产链结算
  checkPrestige();                       // 穿梭触发检查
  Events.emit('tick', { dtReal, dtGame });
}

function checkPrestige() {
  const amount = Resources.getResource(capResourceId);
  if (amount && Num.gte(amount, universeCap)) {
    // 触顶：发穿梭就绪事件；穿梭确认面板与结算由穿梭模块/UI 后续处理
    Events.emit('prestige:ready', { resourceId: capResourceId, amount, cap: universeCap });
  }
}
