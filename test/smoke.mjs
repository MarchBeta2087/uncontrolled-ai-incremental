// test/smoke.mjs —— CI 冒烟测试
// 覆盖：配置校验、Num 序列化/格式化、穿梭结算、成本曲线、挑战多目标、成就奖励、升级、存档 roundtrip。
// 用法：node test/smoke.mjs（失败以非零退出码结束）

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.MegotaNum = require('../vendor/MegotaNum.js');

let passed = 0;
let failed = 0;
function assert(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const balance = JSON.parse(fs.readFileSync('config/balance.json', 'utf8'));
const resourcesCfg = JSON.parse(fs.readFileSync('config/resources.json', 'utf8'));
const techsCfg = JSON.parse(fs.readFileSync('config/techs.json', 'utf8'));
const upgradesCfg = JSON.parse(fs.readFileSync('config/upgrades.json', 'utf8'));
const achCfg = JSON.parse(fs.readFileSync('config/achievements.json', 'utf8'));
const fragCfg = JSON.parse(fs.readFileSync('config/fragments.json', 'utf8'));
const chCfg = JSON.parse(fs.readFileSync('config/challenges.json', 'utf8'));

const numMod = await import('../js/core/num.js');
const timeMod = await import('../js/core/time.js');
const cfgMod = await import('../js/data/config.js');
const resMod = await import('../js/sim/resources.js');
const techMod = await import('../js/sim/techs.js');
const prestigeMod = await import('../js/sim/prestige.js');
const upgMod = await import('../js/sim/upgrades.js');
const achMod = await import('../js/sim/achievements.js');
const chMod = await import('../js/sim/challenges.js');
const multsMod = await import('../js/sim/mults.js');
const saveMod = await import('../js/data/save.js');
const Num = numMod.Num;

console.log('== 配置校验 ==');
try {
  cfgMod.validateConfig({ balance, resources: resourcesCfg, techs: techsCfg, upgrades: upgradesCfg, achievements: achCfg, fragments: fragCfg, challenges: chCfg });
  assert('配置校验通过', true);
} catch (e) {
  assert(`配置校验: ${e.message}`, false);
}

console.log('== Num 序列化与格式化 ==');
assert('roundtrip 1e20', Num.eq(Num.fromJSON(Num.toJSON('1e20')), '1e20'));
assert('roundtrip 1e70', Num.eq(Num.fromJSON(Num.toJSON('1e70')), '1e70'));
assert('千分位 999999', Num.format(999999) === '999,999');
assert('科学记数 1e6', Num.format('1e6') === '1.000e6');
assert('舍入进位 999999999', Num.format(999999999) === '1.000e9');

console.log('== 初始化 ==');
timeMod.configureTime(balance.time);
prestigeMod.configurePrestige(balance);
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
prestigeMod.initPrestige();
upgMod.initUpgrades(upgradesCfg);
achMod.initAchievements(achCfg);
chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);

console.log('== 穿梭结算 ==');
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
techMod.load(techsCfg.techs.map((t) => t.id));
prestigeMod.load({ timeCrystals: Num.toJSON('0'), prestigeCount: 0 });
assert('首次穿梭结算 2 晶体', Num.eq(prestigeMod.calculateCrystals(), 2));

console.log('== 成本曲线与 MAX ==');
resMod.initResources(resourcesCfg);
resMod.load({ resources: { funds: Num.toJSON('100') }, generators: {} });
assert('investment 成本 15', Num.eq(resMod.buyCost('investment', 1), 15));
assert('MAX investment 可买 5', Num.eq(resMod.maxAffordable('investment'), 5));

console.log('== 挑战多目标 + 削弱 ==');
prestigeMod.load({ timeCrystals: Num.toJSON('5'), prestigeCount: 1 });
upgMod.buyUpgrade('causal_residue_1'); // 全产出 ×2
const beforeNerf = resMod.getGlobalMultiplier();
chMod.startChallenge('challenge_no_investment');
assert('挑战中永久乘子保留(削弱)', Num.eq(resMod.getGlobalMultiplier(), beforeNerf));
// 挑战中产出削弱：全局乘子 2 → 2^0.25
resMod.load({ resources: {}, generators: { compute_node: Num.toJSON('1') } });
const prod = resMod.getProductionPerSecond('compute');
assert('挑战中产出削弱 10×2^0.25≈11.892', Num.eq(prod, Num.mul(10, Num.pow(2, Num.parse('0.25')))));
// 目标推进
resMod.load({ resources: { mass_energy: Num.toJSON('1e12') }, generators: {} });
chMod.checkProgress();
assert('目标1 完成', chMod.goalsDoneCount('challenge_no_investment') === 1);
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
chMod.checkProgress();
assert('挑战全部完成', chMod.isCompleted('challenge_no_investment'));
// 完成后削弱解除，但挑战目标奖励(×2×3×5=×30)与升级(×2)已永久生效
resMod.load({ resources: {}, generators: { compute_node: Num.toJSON('1') } });
const prodAfter = resMod.getProductionPerSecond('compute');
assert('挑战后削弱解除 10×2×30=600', Num.eq(prodAfter, 600));

console.log('== 成就奖励 ==');
achMod.load([]);
resMod.initResources(resourcesCfg);
prestigeMod.load({ timeCrystals: Num.toJSON('0'), prestigeCount: 0 }); // 重置周目，避免 first_prestige 同时触发
resMod.load({ resources: { compute: Num.toJSON('1') }, generators: {} });
achMod.checkAll();
assert('first_compute 无奖励', Num.eq(resMod.getGlobalMultiplier(), 1));
prestigeMod.load({ timeCrystals: Num.toJSON('0'), prestigeCount: 1 });
achMod.checkAll();
assert('first_prestige 奖励 ×1.5', Num.eq(resMod.getGlobalMultiplier(), 1.5));

console.log('== 时间晶体：当前持有 vs 历史累计 ==');
prestigeMod.initPrestige();
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0 });
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
techMod.load(techsCfg.techs.map((t) => t.id));
prestigeMod.prestige();
assert('穿梭后当前持有 = 累计', Num.eq(prestigeMod.getTimeCrystals(), prestigeMod.getTotalTimeCrystals()));
const totalAfterPrestige = prestigeMod.getTotalTimeCrystals();
prestigeMod.spendCrystals(Num.parse(1));
assert('消费后当前持有 < 累计，且累计不变', Num.lt(prestigeMod.getTimeCrystals(), totalAfterPrestige) && Num.eq(prestigeMod.getTotalTimeCrystals(), totalAfterPrestige));

console.log('== 第二阶段引擎地基（cap_mult / crystal_mult / 解锁 / 迁移）==');
multsMod.clearCapMultipliers();
multsMod.clearCrystalMultipliers();

multsMod.setCapMultiplier('t1', '1e20');
assert('cap_mult：1e70 × 1e20 = 1e90', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e90')));
multsMod.setCapMultiplier('t2', '1e10');
assert('cap_mult 叠加：× 1e10 = 1e100', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e100')));
multsMod.clearCapMultipliers();
assert('清空后回到基准 1e70', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e70')));

prestigeMod.initPrestige();
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
techMod.load(techsCfg.techs.map((t) => t.id));
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0, phase2Unlocked: false });
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
multsMod.setCrystalMultiplier('t1', '3');
assert('crystal_mult：基础 2 × 3 = 6', Num.eq(prestigeMod.calculateCrystals(), 6));
multsMod.clearCrystalMultipliers();

prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0, phase2Unlocked: false });
prestigeMod.checkPhase2Unlock();
assert('未达 100 晶体：未解锁', prestigeMod.isPhase2Unlocked() === false);
prestigeMod.load({ timeCrystals: Num.toJSON('100'), totalTimeCrystals: Num.toJSON('100'), prestigeCount: 0, phase2Unlocked: false });
prestigeMod.checkPhase2Unlock();
assert('持有 100 晶体：解锁', prestigeMod.isPhase2Unlocked() === true);
prestigeMod.load({ timeCrystals: Num.toJSON('10'), totalTimeCrystals: Num.toJSON('200'), prestigeCount: 0, phase2Unlocked: true });
assert('已解锁后花晶体：不回锁', prestigeMod.isPhase2Unlocked() === true);

const permTechCfg = { techs: [
  { id: 'perm_test', name: 'p', costCurrency: 'mass_energy', cost: '1', requires: [], permanent: true, effects: [{ type: 'all_generator_mult', value: '10' }] },
  { id: 'run_test', name: 'r', costCurrency: 'mass_energy', cost: '1', requires: [], effects: [{ type: 'all_generator_mult', value: '5' }] },
] };
techMod.initTechs(permTechCfg);
techMod.load(['perm_test', 'run_test']);
resMod.initResources(resourcesCfg);
resMod.load({ resources: {}, generators: {} });
techMod.reset();
assert('穿梭后永久技术保留', techMod.isOwned('perm_test') === true);
assert('穿梭后普通技术清除', techMod.isOwned('run_test') === false);

const v1snap = { schemaVersion: 1, meta: {}, time: {}, run: {}, metaProgress: { timeCrystals: '5', upgrades: [] } };
const migrated = saveMod.migrate(v1snap);
assert('v1 → v3 迁移', migrated.schemaVersion === 3 && migrated.metaProgress.totalTimeCrystals === '5' && migrated.metaProgress.phase2Unlocked === false);
const v2snap = { schemaVersion: 2, meta: {}, time: {}, run: {}, metaProgress: { timeCrystals: '7', totalTimeCrystals: '9' } };
const migrated2 = saveMod.migrate(v2snap);
assert('v2 → v3 迁移', migrated2.schemaVersion === 3 && migrated2.metaProgress.phase2Unlocked === false);

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) process.exit(1);
