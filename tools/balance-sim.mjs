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
const uniCfg = readJSON('config/universes.json');

const numMod = await import('../js/core/num.js');
const timeMod = await import('../js/core/time.js');
const resMod = await import('../js/sim/resources.js');
const techMod = await import('../js/sim/techs.js');
const prestigeMod = await import('../js/sim/prestige.js');
const upgMod = await import('../js/sim/upgrades.js');
const achMod = await import('../js/sim/achievements.js');
const fragMod = await import('../js/sim/fragments.js');
const chMod = await import('../js/sim/challenges.js');
const singMod = await import('../js/sim/singularity.js');
const universeMod = await import('../js/sim/universe.js');
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
singMod.configureSingularity(uniCfg);
singMod.initSingularity();

const fmtTime = (sec) => {
  if (sec < 60) return `${sec.toFixed(1)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}min`;
  return `${(sec / 3600).toFixed(2)}h`;
};

const DEBUG = process.argv.includes('--debug');
const MULTIVERSE = process.argv.includes('--multiverse');
const PHASE3 = process.argv.includes('--phase3') || process.env.PHASE3 === '1';
const MAX_UNIVERSES = Number(process.env.MAX_UNIVERSES || 3);
function dumpState(label) {
  if (!DEBUG) return;
  const mass = resMod.getResource('mass_energy');
  const prod = resMod.getProductionPerSecond('mass_energy');
  const rate = timeMod.Time.getRate();
  console.log(`      [${label}] 质能=${Num.format(mass)} 上限=${Num.format(prestigeMod.getUniverseCap())} 产能=${Num.format(prod)}/游戏秒 速率=${Num.format(rate)} 物理=${fmtTime(physical)}`);
}

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
  // 跨宇宙升级（有奇点种子就买）
  for (const cu of uniCfg.crossUniverseUpgrades ?? []) {
    if (singMod.canBuyCrossUniverse(cu.id)) singMod.buyCrossUniverse(cu.id);
  }
  resMod.buyMaxAll();
}

/** 重置（穿梭 / 跃迁）后重放所有元进度效果，与 main.js 的事件处理一致 */
function reapplyMeta() {
  upgMod.applyAll();
  achMod.applyAll();
  chMod.applyAll();
  singMod.applyCrossUniverse();
}

/** 距「下一次可购买」所需的游戏秒（取最小正等待） */
function timeToNextPurchase() {
  let minT = Infinity;
  let minSrc = null;
  const consider = (cost, have, rate, src) => {
    if (Num.gte(have, cost)) return;
    if (!Num.gt(rate, 0)) return;
    const t = Num.toNumber(Num.div(Num.sub(cost, have), rate));
    if (t > 0 && t < minT) { minT = t; minSrc = src; }
  };
  for (const gid of resMod.getGeneratorIds()) {
    const def = resMod.getGeneratorDef(gid);
    consider(resMod.buyCost(gid, 1), resMod.getResource(def.costCurrency), Num.parse(resMod.getProductionPerSecond(def.costCurrency)), `gen:${gid}`);
  }
  for (const tid of techMod.getTechIds()) {
    if (techMod.isOwned(tid)) continue;
    const def = techMod.getTech(tid);
    if ((def.requires ?? []).some((r) => !techMod.isOwned(r))) continue;
    if (def.phase === 2 && !prestigeMod.isPhase2Unlocked()) continue;
    if (def.phase === 3 && !prestigeMod.isPhase3Unlocked()) continue;
    // 成本高于当前宇宙上限的技术本宇宙买不到（待折叠抬升），不由贪心策略追逐
    if (Num.gt(techMod.getCost(tid), prestigeMod.getUniverseCap())) continue;
    consider(techMod.getCost(tid), resMod.getResource(def.costCurrency), Num.parse(resMod.getProductionPerSecond(def.costCurrency)), `tech:${tid}`);
  }
  timeToNextPurchase.last = minSrc;
  return minT;
}

// ---- 主循环 ----
const folds = techsCfg.techs.filter((t) => t.id.startsWith('p2_fold_')).map((t) => t.id);
const foldSeen = new Set();
const p3Arrows = techsCfg.techs.filter((t) => (t.effects ?? []).some((e) => e.type === 'cap_tetrate')).map((t) => t.id);
const p3Seen = new Set();
let physical = 0;
let iterations = 0;
let prestiges = 0;
let firstPrestigeAt = null;
let phase2At = null;
let phase2WasUnlocked = false;
let phase3At = null;
let phase3WasUnlocked = false;
let universe = 1;
let universeStart = 0;
const universeTimes = [];
const MAX_PHYSICAL = (MULTIVERSE ? 24 : 3) * 3600; // 多宇宙+第三阶段模式放宽到 24 小时
const MAX_ITER = 12_000_000;

console.log('=== 平衡模拟（估算）===');

// --phase3：直接把模拟置于第 9 宇宙（接近上限），专注验证第三阶段箭塔节奏，
// 绕过 v0.5 高宇宙贪心策略的停滞（该停滞属 v0.5 遗留，与本阶段无关）。
if (PHASE3) {
  universeMod.setUniverse(9);
  universeMod.addSeeds('1000');
  for (const cu of uniCfg.crossUniverseUpgrades ?? []) {
    if (singMod.canBuyCrossUniverse(cu.id)) singMod.buyCrossUniverse(cu.id);
  }
  reapplyMeta();
  universe = 9;
  universeStart = 0;
  prestigeMod.checkPhase3Unlock();
  resMod.load({ resources: { mass_energy: Num.toJSON(Num.mul(prestigeMod.getUniverseCap(), '0.9')) }, generators: {} });
  console.log(`[phase3] 起始宇宙 ${universe}，上限 ${Num.format(prestigeMod.getUniverseCap())}，相位已解锁=${prestigeMod.isPhase3Unlocked()}`);
}

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
    reapplyMeta();
    buyGreedy();
  }

  if (!phase2WasUnlocked && prestigeMod.isPhase2Unlocked()) {
    phase2WasUnlocked = true;
    phase2At = physical;
    console.log(`第二阶段解锁（持有 100 晶体）：${fmtTime(physical)}（已穿梭 ${prestiges} 次）`);
    dumpState('unlock');
  }

  if (!phase3WasUnlocked && prestigeMod.isPhase3Unlocked()) {
    phase3WasUnlocked = true;
    phase3At = physical;
    console.log(`第三阶段解锁（宇宙 ≥ 9）：${fmtTime(physical)}（宇宙 ${universe}）`);
    dumpState('phase3');
  }

  for (const pid of p3Arrows) {
    if (!p3Seen.has(pid) && techMod.isOwned(pid)) {
      p3Seen.add(pid);
      console.log(`  ${techsCfg.techs.find((t) => t.id === pid).name}：${fmtTime(physical)}`);
      dumpState(pid);
    }
  }

  for (const fid of folds) {
    if (!foldSeen.has(fid) && techMod.isOwned(fid)) {
      foldSeen.add(fid);
      console.log(`  ${techsCfg.techs.find((t) => t.id === fid).name}：${fmtTime(physical)}`);
      dumpState(fid);
    }
  }
  const p3Done = !prestigeMod.isPhase3Unlocked() || p3Arrows.every((id) => techMod.isOwned(id));
  if (PHASE3 && p3Arrows.length && p3Done) {
    console.log(`== 第三阶段完成：箭塔 ${p3Seen.size}/${p3Arrows.length} 层，用时 ${fmtTime(physical)} ==`);
    break;
  }
  if (foldSeen.size >= folds.length && p3Done) {
    universeTimes.push({ universe, seconds: physical - universeStart });
    console.log(`== 宇宙 ${universe} 完成 12/12 折叠：${fmtTime(physical - universeStart)}（累计 ${fmtTime(physical)}）==`);
    if (!MULTIVERSE || universe >= MAX_UNIVERSES) break;
    // 触顶后跃迁（模拟已触及当前宇宙上限）
    resMod.load({ resources: { mass_energy: Num.toJSON(prestigeMod.getUniverseCap()) }, generators: {} });
    const jumpRes = singMod.jump();
    if (!jumpRes.ok) {
      console.log(`  跃迁失败：${jumpRes.reason}`);
      break;
    }
    console.log(`  → 跃迁至宇宙 ${jumpRes.universe}，获得 ${Num.toString(jumpRes.seeds)} 枚奇点种子`);
    universe = jumpRes.universe;
    universeStart = physical;
    foldSeen.clear();
    reapplyMeta();
    buyGreedy();
    continue;
  }

  const t = timeToNextPurchase();
  let dtGame;
  if (!Number.isFinite(t) || t <= 0) {
    for (let i = 0; i < 10; i += 1) resMod.click();
    dtGame = 10;
  } else if (t > 1e15) {
    // 下一购买需超过 1e15 游戏秒：贪心策略陷入停滞，停止本宇宙
    console.log(`  停滞（宇宙 ${universe}）：下一购买 ${timeToNextPurchase.last} 需 ${t.toExponential(2)} 游戏秒`);
    break;
  } else {
    dtGame = t * 1.01 + 1;
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
if (prestigeMod.isPhase3Unlocked()) console.log(`第三阶段解锁：${phase3At ? fmtTime(phase3At) : '是'}｜箭塔 ${p3Seen.size}/${p3Arrows.length} 层`);
if (universeTimes.length) {
  console.log('--- 各宇宙用时 ---');
  for (const u of universeTimes) console.log(`  宇宙 ${u.universe}：${fmtTime(u.seconds)}`);
}
if (foldSeen.size < folds.length) {
  const mass = resMod.getResource('mass_energy');
  const cap = prestigeMod.getUniverseCap();
  console.log(`当前质能 ${Num.format(mass)} / 上限 ${Num.format(cap)}｜晶体 ${Num.format(prestigeMod.getTimeCrystals())}（累计 ${Num.format(prestigeMod.getTotalTimeCrystals())}）`);
}
