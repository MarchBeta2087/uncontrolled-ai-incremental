// tools/balance-sim.mjs —— 粗略平衡模拟（Node，无浏览器）
//
// 用法：node tools/balance-sim.mjs
// 策略：事件驱动 + 贪心自动购买（买满生成器、能研就研、解锁第二阶段后才买晶体升级）。
// 输出：首次穿梭、第二阶段解锁、各层折叠的物理时间估算。
// 说明：为估算性质，非精确值；用于判断「每层折叠 ~2–5 分钟」目标是否合理。

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.MegotaNum = require('../vendor/MegotaNum.js');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const balance = readJSON('config/balance.json');
const resourcesCfg = readJSON('config/resources.json');
const techsCfg = readJSON('config/techs.json');
const upgradesCfg = readJSON('config/upgrades.json');
const achCfg = readJSON('config/achievements.json');
const fragCfg = readJSON('config/fragments.json');
const chCfg = readJSON('config/challenges.json');

const numMod = await import('../js/core/num.js');
const timeMod = await import('../js/core/time.js');
const resMod = await import('../js/sim/resources.js');
const techMod = await import('../js/sim/techs.js');
const prestigeMod = await import('../js/sim/prestige.js');
const upgMod = await import('../js/sim/upgrades.js');
const achMod = await import('../js/sim/achievements.js');
const fragMod = await import('../js/sim/fragments.js');
const chMod = await import('../js/sim/challenges.js');
const { Num } = numMod;

// ---- 初始化 ----
numMod.configureNum(balance.format);
timeMod.configureTime(balance.time);
prestigeMod.configurePrestige(balance);
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
prestigeMod.initPrestige();
upgMod.initUpgrades(upgradesCfg);
achMod.initAchievements(achCfg);
fragMod.initFragments(fragCfg);
chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);

const fmtTime = (sec) => {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}min`;
  return `${(sec / 3600).toFixed(2)}h`;
};

function buyGreedy() {
  for (const tid of techMod.getTechIds()) {
    if (techMod.canBuy(tid)) techMod.buyTech(tid);
  }
  // 解锁第二阶段后才买晶体升级（否则一直攒钱到 100 晶体以触发解锁）
  if (prestigeMod.isPhase2Unlocked()) {
    for (const uid of upgMod.getUpgradeIds()) {
      if (upgMod.canBuy(uid)) upgMod.buyUpgrade(uid);
    }
  }
  resMod.buyMaxAll();
}

/** 距「下一次可购买」所需的游戏秒（取最小正等待） */
function timeToNextPurchase() {
  let minT = Infinity;
  const consider = (cost, have, rate) => {
    if (Num.gte(have, cost)) return;
    if (!Num.gt(rate, 0)) return;
    const t = Num.toNumber(Num.div(Num.sub(cost, have), rate));
    if (t > 0 && t < minT) minT = t;
  };
  for (const gid of resMod.getGeneratorIds()) {
    const def = resMod.getGeneratorDef(gid);
    consider(resMod.buyCost(gid, 1), resMod.getResource(def.costCurrency), Num.parse(resMod.getProductionPerSecond(def.costCurrency)));
  }
  for (const tid of techMod.getTechIds()) {
    if (techMod.isOwned(tid)) continue;
    const def = techMod.getTech(tid);
    if ((def.requires ?? []).some((r) => !techMod.isOwned(r))) continue;
    if (def.phase === 2 && !prestigeMod.isPhase2Unlocked()) continue;
    consider(Num.parse(def.cost), resMod.getResource(def.costCurrency), Num.parse(resMod.getProductionPerSecond(def.costCurrency)));
  }
  return minT;
}

// ---- 主循环 ----
const folds = techsCfg.techs.filter((t) => t.id.startsWith('p2_fold_')).map((t) => t.id);
const foldSeen = new Set();
let physical = 0;
let iterations = 0;
let prestiges = 0;
let firstPrestigeAt = null;
let phase2At = null;
let phase2WasUnlocked = false;
const MAX_PHYSICAL = 3 * 3600; // 3 小时物理时间上限
const MAX_ITER = 3_000_000;

console.log('=== 平衡模拟（估算）===');

while (physical < MAX_PHYSICAL && iterations < MAX_ITER) {
  iterations += 1;
  buyGreedy();
  prestigeMod.checkPhase2Unlock();

  if (!firstPrestigeAt && prestigeMod.canPrestige()) {
    firstPrestigeAt = physical;
    console.log(`首次触顶（可穿梭）：${fmtTime(physical)}`);
  }
  if (prestigeMod.canPrestige()) {
    prestigeMod.prestige();
    prestiges += 1;
    buyGreedy();
  }

  if (!phase2WasUnlocked && prestigeMod.isPhase2Unlocked()) {
    phase2WasUnlocked = true;
    phase2At = physical;
    console.log(`第二阶段解锁（持有 100 晶体）：${fmtTime(physical)}（已穿梭 ${prestiges} 次）`);
  }

  for (const fid of folds) {
    if (!foldSeen.has(fid) && techMod.isOwned(fid)) {
      foldSeen.add(fid);
      console.log(`  ${techsCfg.techs.find((t) => t.id === fid).name}：${fmtTime(physical)}`);
    }
  }
  if (foldSeen.size >= folds.length) break;

  const t = timeToNextPurchase();
  let dtGame;
  if (!Number.isFinite(t) || t <= 0) {
    for (let i = 0; i < 10; i += 1) resMod.click();
    dtGame = 10;
  } else {
    dtGame = Math.min(t * 1.01 + 1, 1e18);
  }
  const rate = timeMod.Time.getRate();
  const dtReal = Math.max(1e-12, Num.toNumber(Num.div(dtGame, rate)));
  const inc = timeMod.Time.tick(dtReal);
  resMod.tick(inc);
  physical += dtReal;
}

console.log('=== 汇总 ===');
console.log(`迭代次数：${iterations.toLocaleString()}｜穿梭次数：${prestiges}｜物理时间：${fmtTime(physical)}`);
console.log(`首次触顶：${firstPrestigeAt ? fmtTime(firstPrestigeAt) : '未达到'}`);
console.log(`第二阶段解锁：${phase2At ? fmtTime(phase2At) : '未达到'}`);
console.log(`已完成折叠：${foldSeen.size}/${folds.length}`);
if (foldSeen.size < folds.length) {
  const mass = resMod.getResource('mass_energy');
  const cap = prestigeMod.getUniverseCap();
  console.log(`当前质能 ${Num.format(mass)} / 上限 ${Num.format(cap)}｜晶体 ${Num.format(prestigeMod.getTimeCrystals())}（累计 ${Num.format(prestigeMod.getTotalTimeCrystals())}）`);
}
