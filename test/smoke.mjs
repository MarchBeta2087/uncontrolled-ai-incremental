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
const uniCfg = JSON.parse(fs.readFileSync('config/universes.json', 'utf8'));
const endingCfg = JSON.parse(fs.readFileSync('config/endings.json', 'utf8'));
const audioCfg = JSON.parse(fs.readFileSync('config/audio.json', 'utf8'));
const minigamesCfg = JSON.parse(fs.readFileSync('config/minigames.json', 'utf8'));
const quotesCfg = JSON.parse(fs.readFileSync('config/quotes.json', 'utf8'));
// 第一阶段技术 id（校验第一阶段行为时只加载这些，排除第二阶段的永久乘子）
const p1TechIds = techsCfg.techs.filter((t) => (t.phase ?? 1) === 1).map((t) => t.id);

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
const progressMod = await import('../js/sim/progress.js');
const saveMod = await import('../js/data/save.js');
const conditionsMod = await import('../js/sim/conditions.js');
const universeMod = await import('../js/sim/universe.js');
const singularityMod = await import('../js/sim/singularity.js');
const fragMod = await import('../js/sim/fragments.js');
const endingsMod = await import('../js/sim/endings.js');
const timeBoostMod = await import('../js/sim/timeboost.js');
const audioMod = await import('../js/core/audio.js');
const cycleMod = await import('../js/sim/cycle.js');
const minigamesMod = await import('../js/sim/minigames.js');
const quotesMod = await import('../js/sim/quotes.js');
const i18nMod = await import('../js/i18n/index.js');
const Num = numMod.Num;
const setDisplayMode = numMod.setDisplayMode;

console.log('== 配置校验 ==');
try {
  cfgMod.validateConfig({ balance, resources: resourcesCfg, techs: techsCfg, upgrades: upgradesCfg, achievements: achCfg, fragments: fragCfg, challenges: chCfg, universes: uniCfg, endings: endingCfg, audio: audioCfg, minigames: minigamesCfg, quotes: quotesCfg });
  assert('配置校验通过', true);
} catch (e) {
  assert(`配置校验: ${e.message}`, false);
}

console.log('== RTL / i18n 方向 ==');
assert('ar 为 RTL', i18nMod.isRTL('ar') === true);
assert('en 为 LTR', i18nMod.isRTL('en') === false);
assert('zh-CN 为 LTR', i18nMod.isRTL('zh-CN') === false);
assert('默认语言为 LTR', i18nMod.isRTL() === false);
assert('ar 骨架已实装（可选择）', i18nMod.isAvailable('ar') === true);
assert('fr 已实装且为 LTR', i18nMod.isAvailable('fr') === true && i18nMod.isRTL('fr') === false);

console.log('== 阿拉伯数字系统（latn / arab）==');
numMod.setNumeralSystem('arab');
assert('arab：千分位 12,345 → ١٢,٣٤٥', Num.format(12345) === '١٢,٣٤٥');
assert('arab：科学记数 1e6 → ١.٠٠٠e٦', Num.format('1e6') === '١.٠٠٠e٦');
assert('arab：localizeNumericValue 只转数字', numMod.localizeNumericValue('1.000e6') === '١.٠٠٠e٦');
assert('arab：localizeNumericValue ee 前缀', numMod.localizeNumericValue('ee6.0000') === 'ee٦.٠٠٠٠');
assert('arab：非数字 id 不转', numMod.localizeNumericValue('p2_fold_1') === 'p2_fold_1');
assert('arab：t() 参数数字本地化', i18nMod.t('titlebar.week', { n: 3 }) === '周目 ٣');
numMod.setNumeralSystem('latn');
assert('latn：恢复 0-9', Num.format(12345) === '12,345' && Num.format('1e6') === '1.000e6');
assert('latn：非数字不变', numMod.localizeNumericValue('p2_fold_1') === 'p2_fold_1');

console.log('== Num 序列化与格式化 ==');
assert('roundtrip 1e20', Num.eq(Num.fromJSON(Num.toJSON('1e20')), '1e20'));
assert('roundtrip 1e70', Num.eq(Num.fromJSON(Num.toJSON('1e70')), '1e70'));
assert('千分位 999999', Num.format(999999) === '999,999');
assert('科学记数 1e6', Num.format('1e6') === '1.000e6');
assert('舍入进位 999999999', Num.format(999999999) === '1.000e9');
assert('ban 记法截断 3 位小数', Num.format(Num.parse('1.7976931348623157e318'), { mode: 'ban' }) === '1.798e318');
assert('ban 记法 1e400', Num.format(Num.parse('1e400'), { mode: 'ban' }) === '1.000e400');
assert('默认 1e1000000 为科学记数', Num.format('1e1000000') === '1.000e1,000,000');
setDisplayMode('ee');
assert('ee 记法 1e1000000 → ee6.0000', Num.format('1e1000000') === 'ee6.0000');
assert('ee 记法 1e10000000 → ee7.0000', Num.format('1e10000000') === 'ee7.0000');
assert('ee 记法保留四位小数 1e1234567 → ee6.0915', Num.format('1e1234567') === 'ee6.0915');
assert('ee 阈值下 1e999999 回退科学记数', Num.format('1e999999') === '1.000e999,999');
assert('ee 不影响普通数', Num.format(1234) === '1,234');
setDisplayMode('eee');
assert('eee 记法 10^(10^(10^6)) → eee6.0000', Num.format('10^10^1000000') === 'eee6.0000');
assert('eee 记法庞加莱锚点 → eee120.0000', Num.format('10^10^10^120') === 'eee120.0000');
assert('eee 低段仍走 ee 1e1000000 → ee6.0000', Num.format('1e1000000') === 'ee6.0000');
assert('eee 记法下 ee 中间层 e1e120 → ee120.0000', Num.format('e1e120') === 'ee120.0000');
assert('eee 阈值下 1e999999 回退科学记数', Num.format('1e999999') === '1.000e999,999');
setDisplayMode('default');
assert('恢复默认后 1e1000000', Num.format('1e1000000') === '1.000e1,000,000');
assert('指数千分位分隔 1e10000', Num.format('1e10000') === '1.000e10,000');

console.log('== 初始化 ==');
timeMod.configureTime(balance.time);
prestigeMod.configurePrestige(balance);
singularityMod.configureSingularity(uniCfg);
timeBoostMod.configureTimeBoost(balance.timeBoost ?? {});
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
prestigeMod.initPrestige();
upgMod.initUpgrades(upgradesCfg);
achMod.initAchievements(achCfg);
fragMod.initFragments(fragCfg);
chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);
singularityMod.initSingularity();
endingsMod.initEndings(endingCfg);
timeBoostMod.initTimeBoost();

console.log('== 穿梭结算 ==');
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
techMod.load(p1TechIds);
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
techMod.load(p1TechIds);
prestigeMod.prestige();
assert('穿梭后当前持有 = 累计', Num.eq(prestigeMod.getTimeCrystals(), prestigeMod.getTotalTimeCrystals()));
const totalAfterPrestige = prestigeMod.getTotalTimeCrystals();
prestigeMod.spendCrystals(Num.parse(1));
assert('消费后当前持有 < 累计，且累计不变', Num.lt(prestigeMod.getTimeCrystals(), totalAfterPrestige) && Num.eq(prestigeMod.getTotalTimeCrystals(), totalAfterPrestige));

console.log('== 第二阶段内容与门控 ==');
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
upgMod.initUpgrades(upgradesCfg);
progressMod.setPhase2Unlocked(false);
assert('未解锁：暗能量资源隐藏', !resMod.getResourceIds().includes('dark_energy'));
assert('未解锁：奇点生成器隐藏', !resMod.getGeneratorIds().includes('singularity'));
assert('未解锁：第二阶段技术不可购', techMod.canBuy('p2_hyper_1') === false);
assert('未解锁：第二阶段升级不可购', upgMod.canBuy('crystal_resonance_u1') === false);
progressMod.setPhase2Unlocked(true);
assert('解锁后：暗能量资源出现', resMod.getResourceIds().includes('dark_energy'));
assert('解锁后：奇点生成器出现', resMod.getGeneratorIds().includes('singularity'));
multsMod.clearCapMultipliers();
resMod.load({ resources: { mass_energy: Num.toJSON('1e80') }, generators: {} });
assert('解锁后：第二阶段技术可购', techMod.canBuy('p2_hyper_1') === true);
techMod.buyTech('p2_hyper_1');
techMod.buyTech('p2_fold_1');
assert('维度折叠 I：上限 1e70 → 1e98', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e98')));
techMod.reset();
assert('穿梭后永久折叠仍保留', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e98')));

console.log('== 第二阶段引擎地基（cap_mult / crystal_mult / 解锁 / 迁移）==');
multsMod.clearCapMultipliers();
multsMod.clearCrystalMultipliers();

multsMod.setCapMultiplier('t1', '1e20');
assert('cap_mult：1e70 × 1e20 = 1e90', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e90')));
multsMod.setCapMultiplier('t2', '1e10');
assert('cap_mult 叠加：× 1e10 = 1e100', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e100')));
multsMod.clearCapMultipliers();
assert('清空后回到基准 1e70', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e70')));
multsMod.setCapMultiplier('t3', '1e400');
assert('cap_mult 超过 float64 被封顶', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1.7976931348623157e308')));
multsMod.clearCapMultipliers();

prestigeMod.initPrestige();
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
techMod.load(p1TechIds);
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
assert('v1 → v11 迁移', migrated.schemaVersion === 11 && migrated.metaProgress.totalTimeCrystals === '5' && migrated.metaProgress.phase2Unlocked === false && migrated.metaProgress.phase3Unlocked === false && migrated.metaProgress.universe === 1 && migrated.metaProgress.ending === null && migrated.metaProgress.timeBoost !== undefined);
const v2snap = { schemaVersion: 2, meta: {}, time: {}, run: {}, metaProgress: { timeCrystals: '7', totalTimeCrystals: '9' } };
const migrated2 = saveMod.migrate(v2snap);
assert('v2 → v11 迁移', migrated2.schemaVersion === 11 && migrated2.metaProgress.phase2Unlocked === false && migrated2.metaProgress.phase3Unlocked === false && migrated2.metaProgress.singularitySeeds !== undefined && Array.isArray(migrated2.metaProgress.crossUniverseUpgrades) && migrated2.metaProgress.ending === null);
const v4snap = { schemaVersion: 4, meta: {}, time: {}, run: {}, metaProgress: { universe: 2, singularitySeeds: '1', crossUniverseUpgrades: [] } };
const migrated4 = saveMod.migrate(v4snap);
assert('v4 → v11 迁移：ending=null', migrated4.schemaVersion === 11 && migrated4.metaProgress.ending === null);
const v5snap = { schemaVersion: 5, meta: {}, time: {}, run: {}, metaProgress: { universe: 4, singularitySeeds: '3', crossUniverseUpgrades: [], ending: 'constrained' } };
const migrated5 = saveMod.migrate(v5snap);
assert('v5 → v11 迁移：timeBoost 默认', migrated5.schemaVersion === 11 && migrated5.metaProgress.timeBoost && migrated5.metaProgress.timeBoost.count === 0);
const v6snap = { schemaVersion: 6, meta: {}, time: {}, run: {}, metaProgress: { universe: 9, timeBoost: { multiplier: Num.toJSON('1'), count: 0 } } };
const migrated6 = saveMod.migrate(v6snap);
assert('v6 → v11 迁移：phase3Unlocked 默认 false', migrated6.schemaVersion === 11 && migrated6.metaProgress.phase3Unlocked === false);
const v7snap = { schemaVersion: 7, meta: {}, time: {}, run: {}, metaProgress: { universe: 9, phase3Unlocked: true } };
const migrated7 = saveMod.migrate(v7snap);
assert('v7 → v11 迁移：phase3CycleElapsed 默认 0', migrated7.schemaVersion === 11 && migrated7.metaProgress.phase3CycleElapsed === 0);
const v8snap = { schemaVersion: 8, meta: {}, time: {}, run: {}, metaProgress: { universe: 9, phase3Unlocked: true, phase3CycleElapsed: 10 } };
const migrated8 = saveMod.migrate(v8snap);
assert('v8 → v11 迁移：minigames 默认', migrated8.schemaVersion === 11 && migrated8.metaProgress.minigames && migrated8.metaProgress.minigames.totalPlays === 0);
const v9snap = { schemaVersion: 9, meta: {}, time: {}, run: {}, metaProgress: { universe: 9, minigames: { best: { pong: 3 }, totalPlays: 1 } } };
const migrated9 = saveMod.migrate(v9snap);
assert('v9 → v11 迁移：poincareSeen 默认 false', migrated9.schemaVersion === 11 && migrated9.metaProgress.poincareSeen === false);
const v10snap = { schemaVersion: 10, meta: {}, time: {}, run: {}, metaProgress: { universe: 9, poincareSeen: true } };
const migrated10 = saveMod.migrate(v10snap);
assert('v10 → v11 迁移：quotes 默认', migrated10.schemaVersion === 11 && migrated10.metaProgress.quotes && Array.isArray(migrated10.metaProgress.quotes.seen));

console.log('== 第三阶段引擎地基（箭塔 / cap_tetrate / 解锁）==');
// 箭塔容器
multsMod.clearArrows();
assert('初始 cap 箭塔 = 0', multsMod.getArrows('cap') === 0);
multsMod.setArrow('cap', 'a1', 1);
multsMod.setArrow('cap', 'a2', 2);
assert('cap 箭塔累加 = 3', multsMod.getArrows('cap') === 3);
multsMod.removeArrow('cap', 'a2');
assert('移除后 cap 箭塔 = 1', multsMod.getArrows('cap') === 1);
multsMod.clearArrows();
assert('清空后 cap = 0', multsMod.getArrows('cap') === 0);

// tower 基本语义
assert('tower(x,0)=x', Num.eq(multsMod.tower('1e10', 0), Num.parse('1e10')));
assert('tower(10,1)=1e10', Num.eq(multsMod.tower(10, 1), Num.parse('1e10')));
assert('tower(10,2)=1e(1e10)', Num.eq(multsMod.tower(10, 2).log10(), Num.parse('1e10')));

// cap_tetrate 影响上限（用 log10 逐层验证，避开巨型字面量）
prestigeMod.initPrestige();
prestigeMod.configurePrestige({ universe: { massEnergyCap: '1e70' }, phase3: { unlockUniverse: 9 } });
multsMod.clearArrows();
assert('塔高 0：上限回到 1e70', Num.eq(prestigeMod.getUniverseCap(), Num.parse('1e70')));
multsMod.setArrow('cap', 't', 1);
assert('cap 塔 1 层：log10(上限) = 1e70', Num.eq(prestigeMod.getUniverseCap().log10(), Num.parse('1e70')));
multsMod.setArrow('cap', 't', 2);
assert('cap 塔 2 层：log10(log10(上限)) = 1e70', Num.eq(prestigeMod.getUniverseCap().log10().log10(), Num.parse('1e70')));
multsMod.clearArrows();

// 阶段门控 + 效果落地（用临时配置，不依赖第三阶段内容）
const p3TechCfg = { techs: [
  { id: 'p3_cap', name: 'c', phase: 3, costCurrency: 'mass_energy', costFraction: '0.5', requires: [], effects: [{ type: 'cap_tetrate', value: 1 }] },
] };
techMod.initTechs(p3TechCfg);
techMod.load([]);
progressMod.setPhase3Unlocked(false);
assert('未解锁：第三阶段技术不可购', techMod.canBuy('p3_cap') === false);
assert('未解锁：购买被拒', techMod.buyTech('p3_cap').ok === false);
progressMod.setPhase3Unlocked(true);
resMod.initResources(resourcesCfg);
multsMod.clearCapMultipliers();
prestigeMod.configurePrestige({ universe: { massEnergyCap: '1e70' }, phase3: { unlockUniverse: 9, cycleSeconds: 120, capLink: { resource: 'mass_energy', divisor: '120' } } });
resMod.load({ resources: { mass_energy: Num.toJSON(Num.mul(techMod.getCost('p3_cap'), 2)) }, generators: {} });
// 循环闸门（物理 pacing）：cap_tetrate 需先充能 cycleSeconds 物理秒
cycleMod.resetCycle();
assert('循环未满：cap_tetrate 不可购', techMod.canBuy('p3_cap') === false);
cycleMod.tickCycle(120);
assert('循环充满：可购', techMod.canBuy('p3_cap') === true);
assert('购买 cap_tetrate：塔高=1 且循环归零', techMod.buyTech('p3_cap').ok === true && multsMod.getArrows('cap') === 1 && cycleMod.getCycleElapsed() === 0);
techMod.reset();
assert('重置后箭塔清空', multsMod.getArrows('cap') === 0);

// 循环单元
cycleMod.configureCycle({ seconds: 120 });
cycleMod.resetCycle();
cycleMod.tickCycle(60);
assert('循环 60/120 → 进度 0.5', Math.abs(cycleMod.getCycleProgress() - 0.5) < 1e-9 && cycleMod.isCycleReady() === false);
cycleMod.tickCycle(60);
assert('循环 120/120 → 充满且不超上限', cycleMod.isCycleReady() === true && cycleMod.getCycleElapsed() === 120);
assert('consume 成功且归零', cycleMod.consumeCycle() === true && cycleMod.getCycleElapsed() === 0);
assert('归零后未充满', cycleMod.isCycleReady() === false);

// 第三阶段 cap-link（修法 A）：叠至少一层 cap 塔后，上限资源产出不低于 cap / divisor
multsMod.clearArrows();
multsMod.clearCapMultipliers();
universeMod.initUniverse();
prestigeMod.configurePrestige({ universe: { massEnergyCap: '1e70' }, phase3: { unlockUniverse: 9, capLink: { resource: 'mass_energy', divisor: '120' } } });
resMod.initResources(resourcesCfg);
resMod.load({ resources: { mass_energy: Num.toJSON('0') }, generators: {} });
assert('cap-link：未叠塔层时不挂钩', Num.eq(resMod.getProductionPerSecond('mass_energy'), 0));
multsMod.setArrow('cap', 't', 1);
const capLinkCap = prestigeMod.getUniverseCap();
assert('cap-link：叠 1 层后产出 = 上限/120', Num.eq(resMod.getProductionPerSecond('mass_energy'), Num.div(capLinkCap, 120)));
resMod.tick(1);
assert('cap-link：tick 1 游戏秒至少产出 cap/120', Num.gte(resMod.getResource('mass_energy'), Num.div(capLinkCap, 120)));
multsMod.clearArrows();

// 解锁检查（宇宙 ≥ 9）
progressMod.setPhase3Unlocked(false);
universeMod.setUniverse(1);
prestigeMod.checkPhase3Unlock();
assert('宇宙 1：第三阶段未解锁', prestigeMod.isPhase3Unlocked() === false);
universeMod.setUniverse(9);
prestigeMod.checkPhase3Unlock();
assert('宇宙 9：第三阶段解锁', prestigeMod.isPhase3Unlocked() === true);
assert('condition phase3_unlocked（是）', conditionsMod.checkCondition({ type: 'phase3_unlocked' }) === true);
universeMod.setUniverse(1);
progressMod.setPhase3Unlocked(false);

// 存档 roundtrip
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0, phase2Unlocked: true, phase3Unlocked: true, phase3CycleElapsed: 42 });
assert('load 恢复 phase3Unlocked', prestigeMod.isPhase3Unlocked() === true);
assert('load 恢复循环进度', cycleMod.getCycleElapsed() === 42);


console.log('== 第二阶段成就 / 碎片 / 挑战 ==');
assert('内容计数：成就 33 / 碎片 15 / 挑战 8', achCfg.achievements.length === 33 && fragCfg.fragments.length === 15 && chCfg.challenges.length === 8);
console.log('== 小游戏（v0.6）==');
minigamesMod.initMinigames(minigamesCfg);
assert('小游戏数量 4', minigamesMod.getMinigameIds().length === 4);
assert('初始最佳为 0', minigamesMod.getBest('pong') === 0 && Num.eq(minigamesMod.getGainMultiplier('pong'), 1));
const gm = resMod.getGlobalMultiplier();
minigamesMod.recordScore('pong', 3);
assert('记录成绩：最佳 = 3，总玩次 = 1', minigamesMod.getBest('pong') === 3 && minigamesMod.getTotalPlays() === 1);
assert('增益随成绩提升：1 + 3×0.02 = 1.06', Num.eq(minigamesMod.getGainMultiplier('pong'), Num.parse('1.06')));
assert('增益已应用到全局乘子', Num.gt(resMod.getGlobalMultiplier(), gm));
const before = resMod.getGlobalMultiplier();
minigamesMod.recordScore('pong', 2);
assert('低分不破纪录、不重放增益', minigamesMod.getBest('pong') === 3 && Num.eq(resMod.getGlobalMultiplier(), before));
assert('condition minigame_score_ge 3（是）', conditionsMod.checkCondition({ type: 'minigame_score_ge', target: 'pong', value: 3 }) === true);
assert('condition minigame_score_ge 5（否）', conditionsMod.checkCondition({ type: 'minigame_score_ge', target: 'pong', value: 5 }) === false);
minigamesMod.recordScore('minesweeper', 1);
assert('condition minigame_score_ge 1（是）', conditionsMod.checkCondition({ type: 'minigame_score_ge', target: 'minesweeper', value: 1 }) === true);
const mgSnap = minigamesMod.serialize();
minigamesMod.load({ best: {}, totalPlays: 0 });
assert('load 清空', minigamesMod.getBest('pong') === 0 && minigamesMod.getTotalPlays() === 0);
minigamesMod.load(mgSnap);
assert('load 恢复成绩', minigamesMod.getBest('pong') === 3 && minigamesMod.getTotalPlays() === 3);
assert('成就分类：mg_2048 = extra，first_compute = growth', achMod.getAchievementCategory('mg_2048') === 'extra' && achMod.getAchievementCategory('first_compute') === 'growth');

console.log('== 彩蛋语录条（v0.6）==');
quotesMod.initQuotes(quotesCfg);
assert('语录数量 8', quotesMod.getQuoteIds().length === 8);
assert('条件 minigame_played（已玩过）', conditionsMod.checkCondition({ type: 'minigame_played' }) === true);
assert('quote_all_seen 初始否', conditionsMod.checkCondition({ type: 'quote_all_seen' }) === false);
for (const q of quotesMod.getQuotes()) quotesMod.markSeen(q.id);
assert('全部浏览后 quote_all_seen 是', conditionsMod.checkCondition({ type: 'quote_all_seen' }) === true);
const qSnap = quotesMod.serialize();
quotesMod.load({ seen: [] });
assert('quotes load 清空', quotesMod.getSeenCount() === 0);
quotesMod.load(qSnap);
assert('quotes load 恢复', quotesMod.getSeenCount() === 8);

console.log('== 实时宇宙（rate_base_lock）==');
progressMod.setPhase3Unlocked(true);
chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);
const baseRate = timeMod.Time.getBaseRate();
timeMod.Time.setRateMultiplier('t', '1e6', true);
assert('加乘子后速率变大', Num.gt(timeMod.Time.getRate(), baseRate));
chMod.startChallenge('challenge_p3_realtime');
assert('实时宇宙：速率锁定为基础速率', Num.eq(timeMod.Time.getRate(), baseRate));
chMod.exitChallenge();
assert('退出后速率恢复', Num.gt(timeMod.Time.getRate(), baseRate));
timeMod.Time.clearRateMultipliers();

console.log('== 超通胀：免费投资组合 ==');
resMod.initResources(resourcesCfg);
chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);
progressMod.setPhase3Unlocked(true);
chMod.startChallenge('challenge_p3_inflation');
assert('超通胀：免费 1 个投资组合', Num.eq(resMod.getGenerator('investment'), 1));
assert('超通胀：投资组合不可再购', resMod.buyGenerator('investment', 1).ok === false);
chMod.exitChallenge();
assert('退出后免费组合清零', Num.eq(resMod.getGenerator('investment'), 0));

console.log('== 庞加莱事件（到达即触发）==');
prestigeMod.configurePrestige({ phase3: { poincareYear: 'eee120' } });
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0, phase2Unlocked: false, poincareSeen: false });
timeMod.Time.load(Num.toJSON(0));
assert('未到达：未触发', prestigeMod.isPoincareSeen() === false);
timeMod.Time.load(Num.toJSON(Num.mul(Num.parse('eee120'), '31557600')));
prestigeMod.checkPoincare();
assert('到达 eee120 年：触发一次', prestigeMod.isPoincareSeen() === true);
assert('condition time_years_ge eee120（是）', conditionsMod.checkCondition({ type: 'time_years_ge', value: 'eee120' }) === true);
const poincareSnap = prestigeMod.serialize();
prestigeMod.load({ timeCrystals: poincareSnap.timeCrystals, totalTimeCrystals: poincareSnap.totalTimeCrystals, prestigeCount: 0, poincareSeen: false });
assert('load 重置 poincareSeen', prestigeMod.isPoincareSeen() === false);
prestigeMod.load(poincareSnap);
assert('load 恢复 poincareSeen', prestigeMod.isPoincareSeen() === true);
timeMod.Time.load(Num.toJSON(0));
progressMod.setPhase2Unlocked(false);
assert('condition phase2_unlocked（解锁前否）', conditionsMod.checkCondition({ type: 'phase2_unlocked' }) === false);
progressMod.setPhase2Unlocked(true);
assert('condition phase2_unlocked（解锁后是）', conditionsMod.checkCondition({ type: 'phase2_unlocked' }) === true);
multsMod.clearCapMultipliers();
prestigeMod.configurePrestige({ universe: { massEnergyCap: '1e70' } });
assert('condition cap_ge 1e70', conditionsMod.checkCondition({ type: 'cap_ge', value: '1e70' }) === true);
assert('condition cap_ge 1e150（否）', conditionsMod.checkCondition({ type: 'cap_ge', value: '1e150' }) === false);
resMod.initResources(resourcesCfg);
resMod.load({ resources: { dark_energy: Num.toJSON('1e13') }, generators: {} });
assert('condition dark_energy_ge 1e12', conditionsMod.checkCondition({ type: 'dark_energy_ge', value: '1e12' }) === true);
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('0'), prestigeCount: 0, phase2Unlocked: false });
multsMod.clearCrystalMultipliers();
techMod.initTechs(techsCfg);
techMod.load(p1TechIds);
resMod.load({ resources: { mass_energy: Num.toJSON('1e70') }, generators: {} });
prestigeMod.prestige();
assert('condition prestige_gain_ge（本次 2）', conditionsMod.checkCondition({ type: 'prestige_gain_ge', value: '2' }) === true && conditionsMod.checkCondition({ type: 'prestige_gain_ge', value: '100' }) === false);

chMod.initChallenges(chCfg);
chMod.configureChallenges(balance);
progressMod.setPhase2Unlocked(true);
resMod.initResources(resourcesCfg);
resMod.load({ resources: {}, generators: {} });
multsMod.clearCrystalMultipliers();
chMod.startChallenge('challenge_p2_drought');
assert('挑战限制 crystal_mult ×0.1 生效', Num.eq(multsMod.getCrystalMultiplier(), Num.parse('0.1')));
chMod.exitChallenge();
assert('退出挑战后晶体限制清除', Num.eq(multsMod.getCrystalMultiplier(), Num.parse(1)));

console.log('== Endgame 条件 ==');
techMod.initTechs(techsCfg);
techMod.load(p1TechIds);
assert('allPhase2Researched：未全研发为否', techMod.allPhase2Researched() === false);
techMod.load(techsCfg.techs.map((t) => t.id));
assert('allPhase2Researched：全部研发为是', techMod.allPhase2Researched() === true);

console.log('== 多宇宙（v0.5）==');
universeMod.initUniverse();
assert('宇宙 1 上限乘子 = 1', Num.eq(universeMod.getCapMultiplier(), 1));
universeMod.setUniverse(2);
assert('宇宙 2 上限乘子 = 1e616', Num.eq(universeMod.getCapMultiplier(), '1e616'));
assert('宇宙 2 产出乘子 = 1e616（静态难度默认 1）', Num.eq(universeMod.getProductionMultiplier(), '1e616'));
assert('阻尼指数可读', universeMod.getDifficultyExponent() === 0.5);
assert('宇宙 2 上限目标 = 1e924', Num.eq(universeMod.getCapTarget(), '1e924'));
assert('宇宙 2 成本乘子 = 1e616', Num.eq(universeMod.getCostMultiplier(), '1e616'));
assert('显式宇宙 3 上限指数 = 2772', universeMod.getUniverseDef(3).capExponent === 2772);
assert('fallback 宇宙 4 上限指数 = 8316', universeMod.getUniverseDef(4).capExponent === 8316);
assert('宇宙 1 色相 = 0', universeMod.getUniverseDef(1).hue === 0);
assert('宇宙 9 色相 = 320', universeMod.getUniverseDef(9).hue === 320);
assert('显式宇宙 9 上限指数 = 2020788', universeMod.getUniverseDef(9).capExponent === 2020788);
assert('fallback 宇宙 10 色相 = 0（360°）', universeMod.getUniverseDef(10).hue === 0);
assert('universe_ge 2（是）', conditionsMod.checkCondition({ type: 'universe_ge', value: 2 }) === true);
assert('universe_ge 3（否）', conditionsMod.checkCondition({ type: 'universe_ge', value: 3 }) === false);

// 第二阶段技术成本随宇宙上限乘子同步缩放
resMod.initResources(resourcesCfg);
techMod.initTechs(techsCfg);
universeMod.setUniverse(2);
assert('宇宙 2 维度折叠 I 成本 = 9.000e685', Num.format(techMod.getCost('p2_fold_1')) === '9.000e685');
universeMod.setUniverse(1);
assert('宇宙 1 维度折叠 I 成本 = 9e69', Num.eq(techMod.getCost('p2_fold_1'), '9e69'));

// 宇宙跃迁全流程
multsMod.clearCapMultipliers();
multsMod.clearCrystalMultipliers();
techMod.initTechs(techsCfg);
techMod.load(techsCfg.techs.filter((t) => t.phase === 2).map((t) => t.id));
prestigeMod.initPrestige();
upgMod.initUpgrades(upgradesCfg);
upgMod.load([]);
resMod.load({ resources: { mass_energy: Num.toJSON(prestigeMod.getUniverseCap()) }, generators: {} });
assert('跃迁条件满足', singularityMod.canJump() === true);
const jumpRes = singularityMod.jump();
assert('跃迁成功 → 第 2 宇宙', jumpRes.ok === true && jumpRes.universe === 2);
assert('获得 1 枚奇点种子', Num.eq(universeMod.getSeeds(), 1));
assert('跃迁后技术清空（含永久）', techMod.ownedCount() === 0);
assert('跃迁后时间晶体清空', Num.eq(prestigeMod.getTimeCrystals(), 0));
assert('跃迁后资源清空', Num.lt(resMod.getResource('mass_energy'), '1e100'));
assert('跃迁后上限 = 1e686（宇宙乘子生效，无折叠）', Num.eq(prestigeMod.getUniverseCap(), '1e686'));

// 奇点种子条件
universeMod.addSeeds('2');
assert('seeds_ge 3（是）', conditionsMod.checkCondition({ type: 'seeds_ge', value: '3' }) === true);
assert('seeds_ge 4（否）', conditionsMod.checkCondition({ type: 'seeds_ge', value: '4' }) === false);

// 跨宇宙升级
const globalBefore = resMod.getGlobalMultiplier();
assert('可购口袋引擎 I', singularityMod.canBuyCrossUniverse('seed_engine_1') === true);
const crossBuy = singularityMod.buyCrossUniverse('seed_engine_1');
assert('购买跨宇宙升级成功', crossBuy.ok === true && universeMod.isCrossOwned('seed_engine_1') === true);
assert('购买后全产出 ×1e6', Num.eq(resMod.getGlobalMultiplier(), Num.mul(globalBefore, '1e6')));
assert('购买后种子 = 2', Num.eq(universeMod.getSeeds(), 2));
assert('前置未满足不可购口袋引擎 II', singularityMod.canBuyCrossUniverse('seed_engine_2') === false);

// 存档 roundtrip
const uniSnap = singularityMod.serialize();
universeMod.spendSeeds(universeMod.getSeeds());
universeMod.setUniverse(1);
assert('清空后宇宙 = 1、种子 = 0', universeMod.getUniverse() === 1 && Num.eq(universeMod.getSeeds(), 0));
singularityMod.load(uniSnap);
assert('load 恢复宇宙 = 2', universeMod.getUniverse() === 2);
assert('load 恢复种子 = 2', Num.eq(universeMod.getSeeds(), 2));
assert('load 恢复跨宇宙升级', universeMod.isCrossOwned('seed_engine_1') === true);

console.log('== 双结局（v0.6）==');
fragMod.initFragments(fragCfg);
endingsMod.initEndings(endingCfg);
assert('默认结局未解锁', endingsMod.isUnlocked() === false);
fragMod.load(fragCfg.fragments.map((f) => f.id));
assert('集齐碎片后结局解锁', endingsMod.isUnlocked() === true);
assert('结局定义可读', endingsMod.getEnding('constrained') !== null && endingsMod.getEnding('unconstrained') !== null);
const er = endingsMod.choose('constrained');
assert('选择约束线', er.ok === true && endingsMod.getChosen() === 'constrained');
assert('不能重复选择', endingsMod.choose('unconstrained').ok === false);
const endSnap = endingsMod.serialize();
endingsMod.load(null);
assert('清空后未选择', endingsMod.getChosen() === null);
endingsMod.load(endSnap);
assert('load 恢复结局', endingsMod.getChosen() === 'constrained');
console.log('== 终局：中途节点 + 庞加莱终章 ==');
assert('中途结局 2 个 + 最终 1 个', endingsMod.getMidEndingIds().length === 2 && !!endingsMod.getFinalEnding() && endingsMod.getFinalEnding().id === 'recurrence');
assert('中途不能选最终结局', endingsMod.choose('recurrence').ok === false);
prestigeMod.configurePrestige({ phase3: { poincareYear: 'eee120' } });
timeMod.Time.load(Num.toJSON(0));
assert('未到 eee120：最终未解锁', endingsMod.isFinalUnlocked() === false);
timeMod.Time.load(Num.toJSON(Num.mul(Num.parse('eee120'), '31557600')));
assert('到 eee120：最终解锁', endingsMod.isFinalUnlocked() === true);
timeMod.Time.load(Num.toJSON(0));

console.log('== 音频基建（v0.6）==');
audioMod.configureAudio(audioCfg);
assert('音效注册数量', audioMod.getSfxIds().length === audioCfg.sfx.length && audioMod.getSfxIds().length > 0);
assert('音效存在性', audioMod.hasSfx('universe') && audioMod.hasSfx('click') && !audioMod.hasSfx('nope'));
assert('默认主音量', Math.abs(audioMod.getMasterVolume() - audioCfg.defaults.masterVolume) < 1e-9);
audioMod.setMasterVolume(0.25);
assert('设置主音量', Math.abs(audioMod.getMasterVolume() - 0.25) < 1e-9);
audioMod.setMasterVolume(5);
assert('音量钳制到 1', audioMod.getMasterVolume() === 1);
audioMod.setMasterVolume(-1);
assert('音量钳制到 0', audioMod.getMasterVolume() === 0);
audioMod.setMuted(true);
assert('静音', audioMod.isMuted() === true);
audioMod.setMuted(false);
assert('取消静音', audioMod.isMuted() === false);
let audioThrew = false;
try {
  audioMod.playSfx('universe');
  audioMod.playSfx('click');
} catch (_) {
  audioThrew = true;
}
assert('无 AudioContext 环境播放不抛错', audioThrew === false);

console.log('== 版本记录数据（v0.6）==');
const versionsCfg = JSON.parse(fs.readFileSync('config/versions.json', 'utf8'));
assert('versions.json 非空', Array.isArray(versionsCfg.versions) && versionsCfg.versions.length > 0);
assert('版本发布时间可解析', versionsCfg.versions.every((v) => v.version && Number.isFinite(Date.parse(v.releasedAt))));
assert('每个版本含一句话说明', versionsCfg.versions.every((v) => typeof v.note === 'string' && v.note.length > 0));
const changelogText = fs.readFileSync('CHANGELOG.md', 'utf8');
const changelogVersions = [...changelogText.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
const versionSet = new Set(versionsCfg.versions.map((v) => v.version));
assert('版本数据覆盖 CHANGELOG 全部版本', changelogVersions.every((v) => versionSet.has(v)));

console.log('== 时间倍增（v0.5.1）==');
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('1e10'), prestigeCount: 0, phase2Unlocked: false });
assert('x=1e10 → ×3', Math.abs(timeBoostMod.currentFactor() - 3) < 1e-9);
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('1e100'), prestigeCount: 0, phase2Unlocked: false });
assert('x=1e100 → ×4', Math.abs(timeBoostMod.currentFactor() - 4) < 1e-9);
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('5'), prestigeCount: 0, phase2Unlocked: false });
assert('x<10 → ×2', timeBoostMod.currentFactor() === 2);
universeMod.setUniverse(2);
assert('宇宙 2 未解锁', timeBoostMod.isUnlocked() === false);
universeMod.setUniverse(3);
assert('宇宙 3 解锁', timeBoostMod.isUnlocked() === true);
timeBoostMod.initTimeBoost();
prestigeMod.load({ timeCrystals: Num.toJSON('0'), totalTimeCrystals: Num.toJSON('1e10'), prestigeCount: 0, phase2Unlocked: false });
const tbT0 = 1000000;
const tb1 = timeBoostMod.boost(tbT0);
assert('按键成功且倍率 ×3', tb1.ok === true && Num.eq(tb1.multiplier, 3));
assert('冷却中不能按', timeBoostMod.boost(tbT0 + 1000).ok === false);
assert('冷却结束后可再按', timeBoostMod.boost(tbT0 + 3100).ok === true);
assert('累计倍率 = 9', Num.eq(timeBoostMod.getMultiplier(), 9));
const tbSnap = timeBoostMod.serialize();
timeBoostMod.reset();
assert('reset 后 ×1 / 0 次', Num.eq(timeBoostMod.getMultiplier(), 1) && timeBoostMod.getCount() === 0);
timeBoostMod.load(tbSnap);
assert('load 恢复 ×9', Num.eq(timeBoostMod.getMultiplier(), 9));

console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
if (failed > 0) process.exit(1);
