// js/main.js
// 入口：加载配置 → 注入 → 初始化 sim → 恢复存档 → 启动 UI 与主循环 → 自动存档

import { loadConfig } from './data/config.js';
import { configureNum, Num } from './core/num.js';
import { configureTime, Time } from './core/time.js';
import { Events } from './core/events.js';
import * as Resources from './sim/resources.js';
import * as Techs from './sim/techs.js';
import * as Prestige from './sim/prestige.js';
import * as Upgrades from './sim/upgrades.js';
import * as Engine from './sim/engine.js';
import * as Save from './data/save.js';
import { initUI } from './ui/app.js';

const AUTO_SAVE_MS = 30_000;
const MAX_OFFLINE_SECONDS = 8 * 3600; // 离线结算上限 8 小时

let meta = { createdAt: Date.now() };
let offlineDiscount = 1.0;

async function bootstrap() {
  try {
    const cfg = await loadConfig();

    // 注入配置
    configureNum({
      sciThreshold: cfg.balance.format.numberSciThreshold,
      banThreshold: cfg.balance.format.numberBanThreshold,
    });
    configureTime(cfg.balance.time);
    Engine.configureEngine(cfg.balance);
    Prestige.configurePrestige(cfg.balance);
    offlineDiscount = cfg.balance.offline?.rateDiscount ?? 1.0;

    // 初始化 sim
    Resources.initResources(cfg.resources);
    Techs.initTechs(cfg.techs);
    Prestige.initPrestige();
    Upgrades.initUpgrades(cfg.upgrades);

    // 恢复存档（含离线结算）
    restoreSave();

    // UI 与主循环
    initUI();
    Engine.start();

    // 自动存档：每 30 秒 + 页面隐藏 + 关闭前（设计 §7.1）
    setInterval(() => save(), AUTO_SAVE_MS);
    window.addEventListener('beforeunload', () => save());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
    });

    // UI 触发的存档请求
    Events.on('save:request', () => {
      const r = save();
      Events.emit('ui:toast', { text: r.ok ? '已存档' : `存档失败：${r.reason}` });
    });
    Events.on('export:request', () => {
      Save.exportSave(buildSnapshot());
      Events.emit('ui:toast', { text: '已导出存档文件' });
    });
    Events.on('import:request', async (payload) => {
      try {
        const snap = await Save.importSave(payload.file);
        restoreFromSnapshot(snap);
        save();
        Events.emit('ui:toast', { text: '存档导入成功' });
      } catch (err) {
        Events.emit('ui:toast', { text: `导入失败：${err.message}` });
      }
    });
    // 穿梭后重新应用永久升级效果
    Events.on('prestige:done', () => Upgrades.applyAll());
  } catch (err) {
    console.error('[main] 启动失败：', err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `<div style="padding:20px;color:#f85149;font-family:monospace">启动失败：${err.message}</div>`;
    }
  }
}

function restoreSave() {
  const res = Save.load();
  if (!res.ok) {
    if (res.reason === 'no-save') return; // 首次启动
    console.warn('[main] 存档加载失败：', res.reason, res.error);
    Events.emit('ui:toast', { text: `存档加载失败：${res.reason}` });
    return;
  }
  restoreFromSnapshot(res.snapshot);
}

/** 从存档快照恢复全部状态（供启动加载与导入共用） */
function restoreFromSnapshot(snap) {
  meta = snap.meta ?? meta;

  // 时间（含速率乘子快照）
  Time.load(snap.time.gameSecondsElapsed, snap.time.rateMultipliers);
  // 周目内状态：存档字段 buildings 映射回内部 generators
  Resources.load({
    resources: snap.run.resources,
    generators: snap.run.buildings,
  });
  Techs.load(snap.run.techs);
  // 元进度
  Prestige.load({
    timeCrystals: snap.metaProgress?.timeCrystals,
    prestigeCount: snap.meta?.prestigeCount,
  });
  Upgrades.load(snap.metaProgress?.upgrades);

  // 离线结算（设计 §3.3）：离线物理秒 × 当时速率 × 折扣
  settleOffline(snap);
}

function settleOffline(snap) {
  const last = snap.meta?.lastSaveAt;
  if (!last) return;
  const now = Date.now();
  let offlineReal = (now - last) / 1000;
  if (offlineReal <= 0) return; // 系统时间回拨
  offlineReal = Math.min(offlineReal, MAX_OFFLINE_SECONDS);
  const offlineGame = Num.mul(Num.parse(offlineReal * offlineDiscount), Time.getRate());
  Resources.tick(offlineGame);
}

function buildSnapshot() {
  const run = Resources.serialize();
  const prestige = Prestige.serialize();
  return {
    schemaVersion: Save.SCHEMA_VERSION,
    meta: {
      ...meta,
      lastSaveAt: Date.now(),
      prestigeCount: prestige.prestigeCount,
    },
    time: {
      gameSecondsElapsed: Time.serialize(),
      rateMultipliers: Time.serializeRateMultipliers(),
    },
    run: {
      resources: run.resources,
      techs: Techs.serialize(),
      buildings: run.generators,
    },
    metaProgress: {
      timeCrystals: prestige.timeCrystals,
      upgrades: Upgrades.serialize(),
      achievements: [],
      fragments: [],
    },
    theories: [],
  };
}

function save() {
  const snapshot = buildSnapshot();
  return Save.save(snapshot);
}

bootstrap();
