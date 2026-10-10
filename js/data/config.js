// js/data/config.js
// 内容层加载与校验 —— balance.json / resources.json / techs.json
//
// 设计 §5/§11：内容全部 JSON 配置驱动；加载时做 schema 校验，
// 把"内容错误"挡在运行前。效果类型为有限枚举（配置里不允许任意代码）。

// 引擎注册的效果类型（有限枚举）
export const EFFECT_TYPES = new Set([
  'generator_mult',      // 指定生成器产出 ×value
  'all_generator_mult',  // 所有生成器产出 ×value
  'click_mult',          // 点击产出 ×value
  'rate_mult',           // 时间速率 ×value
  'offline_mult',        // 离线收益 ×value
  'cap_mult',            // 宇宙上限 ×value
  'crystal_mult',        // 穿梭晶体 ×value
]);

// 成就/碎片条件类型（有限枚举，见 js/sim/conditions.js）
export const CONDITION_TYPES = new Set([
  'resource_ge',         // 资源量 >= value（target 资源 id）
  'generator_count_ge',  // 生成器数量 >= value（target 生成器 id）
  'prestige_count_ge',   // 周目数 >= value
  'tech_count_ge',       // 已研发技术数 >= value
  'tech_owned',          // 已研发指定技术（target）
  'upgrade_owned',       // 已购指定升级（target）
  'crystals_ge',         // 当前持有时间晶体 >= value
  'total_crystals_ge',   // 历史累计时间晶体 >= value
  'time_years_ge',       // 游戏内年份 >= value
]);

// 挑战限制类型（有限枚举，见 js/sim/challenges.js）
export const RESTRICTION_TYPES = new Set([
  'disable_generator',   // 禁用某生成器（target）
  'all_cost_mult',       // 所有生成器成本 ×value
  'rate_div',            // 时间速率 ÷value
]);

const DEFAULT_PATHS = {
  balance: 'config/balance.json',
  resources: 'config/resources.json',
  techs: 'config/techs.json',
  upgrades: 'config/upgrades.json',
  achievements: 'config/achievements.json',
  fragments: 'config/fragments.json',
  challenges: 'config/challenges.json',
};

async function fetchJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`加载 ${path} 失败: HTTP ${resp.status}`);
  return resp.json();
}

export async function loadConfig(paths = DEFAULT_PATHS) {
  const [balance, resources, techs, upgrades, achievements, fragments, challenges] = await Promise.all([
    fetchJSON(paths.balance),
    fetchJSON(paths.resources),
    fetchJSON(paths.techs),
    fetchJSON(paths.upgrades),
    fetchJSON(paths.achievements),
    fetchJSON(paths.fragments),
    fetchJSON(paths.challenges),
  ]);
  validateConfig({ balance, resources, techs, upgrades, achievements, fragments, challenges });
  return { balance, resources, techs, upgrades, achievements, fragments, challenges };
}

/** 校验配置合法性：id 唯一、引用存在、requires 无环、effect 类型已注册 */
export function validateConfig(cfg) {
  const errors = [];

  if (!cfg.balance || typeof cfg.balance !== 'object') {
    errors.push('balance.json 缺失或非对象');
  }

  // 资源
  const resourceIds = new Set();
  for (const r of cfg.resources?.resources ?? []) {
    if (!r.id) errors.push('存在缺少 id 的资源');
    else if (resourceIds.has(r.id)) errors.push(`资源 id 重复: ${r.id}`);
    else resourceIds.add(r.id);
  }

  // 生成器
  const generatorIds = new Set();
  for (const g of cfg.resources?.generators ?? []) {
    if (!g.id) {
      errors.push('存在缺少 id 的生成器');
      continue;
    }
    if (generatorIds.has(g.id)) errors.push(`生成器 id 重复: ${g.id}`);
    generatorIds.add(g.id);
    if (g.costCurrency && !resourceIds.has(g.costCurrency)) {
      errors.push(`生成器 ${g.id} 的 costCurrency 引用不存在的资源: ${g.costCurrency}`);
    }
    if (g.produces && !resourceIds.has(g.produces)) {
      errors.push(`生成器 ${g.id} 的 produces 引用不存在的资源: ${g.produces}`);
    }
  }

  // 技术
  const techIds = new Set();
  for (const t of cfg.techs?.techs ?? []) {
    if (!t.id) {
      errors.push('存在缺少 id 的技术');
      continue;
    }
    if (techIds.has(t.id)) errors.push(`技术 id 重复: ${t.id}`);
    techIds.add(t.id);
    if (t.costCurrency && !resourceIds.has(t.costCurrency)) {
      errors.push(`技术 ${t.id} 的 costCurrency 引用不存在的资源: ${t.costCurrency}`);
    }
    for (const req of t.requires ?? []) {
      if (!techIds.has(req)) errors.push(`技术 ${t.id} 的 requires 引用不存在/未定义的技术: ${req}`);
    }
    for (const e of t.effects ?? []) {
      if (!EFFECT_TYPES.has(e.type)) errors.push(`技术 ${t.id} 的 effect 类型未注册: ${e.type}`);
    }
  }

  // requires 无环（DFS）
  if (hasRequireCycle(cfg.techs?.techs ?? [])) {
    errors.push('技术 requires 存在环');
  }

  // 升级
  const upgradeIds = new Set();
  for (const u of cfg.upgrades?.upgrades ?? []) {
    if (!u.id) {
      errors.push('存在缺少 id 的升级');
      continue;
    }
    if (upgradeIds.has(u.id)) errors.push(`升级 id 重复: ${u.id}`);
    upgradeIds.add(u.id);
    for (const req of u.requires ?? []) {
      if (!upgradeIds.has(req)) errors.push(`升级 ${u.id} 的 requires 引用不存在/未定义的升级: ${req}`);
    }
    for (const e of u.effects ?? []) {
      if (!EFFECT_TYPES.has(e.type)) errors.push(`升级 ${u.id} 的 effect 类型未注册: ${e.type}`);
    }
  }
  if (hasRequireCycle(cfg.upgrades?.upgrades ?? [])) {
    errors.push('升级 requires 存在环');
  }

  // 成就
  const achievementIds = new Set();
  for (const a of cfg.achievements?.achievements ?? []) {
    if (!a.id) {
      errors.push('存在缺少 id 的成就');
      continue;
    }
    if (achievementIds.has(a.id)) errors.push(`成就 id 重复: ${a.id}`);
    achievementIds.add(a.id);
    if (!a.condition || !CONDITION_TYPES.has(a.condition.type)) {
      errors.push(`成就 ${a.id} 的 condition 类型未注册: ${a.condition?.type}`);
    }
  }

  // 碎片
  const fragmentIds = new Set();
  for (const f of cfg.fragments?.fragments ?? []) {
    if (!f.id) {
      errors.push('存在缺少 id 的碎片');
      continue;
    }
    if (fragmentIds.has(f.id)) errors.push(`碎片 id 重复: ${f.id}`);
    fragmentIds.add(f.id);
    if (!f.condition || !CONDITION_TYPES.has(f.condition.type)) {
      errors.push(`碎片 ${f.id} 的 condition 类型未注册: ${f.condition?.type}`);
    }
  }

  // 挑战
  const challengeIds = new Set();
  for (const c of cfg.challenges?.challenges ?? []) {
    if (!c.id) {
      errors.push('存在缺少 id 的挑战');
      continue;
    }
    if (challengeIds.has(c.id)) errors.push(`挑战 id 重复: ${c.id}`);
    challengeIds.add(c.id);
    if (!c.unlockCondition || !CONDITION_TYPES.has(c.unlockCondition.type)) {
      errors.push(`挑战 ${c.id} 的 unlockCondition 类型未注册: ${c.unlockCondition?.type}`);
    }
    for (const r of c.restrictions ?? []) {
      if (!RESTRICTION_TYPES.has(r.type)) errors.push(`挑战 ${c.id} 的 restriction 类型未注册: ${r.type}`);
    }
    for (const g of c.goals ?? []) {
      if (!g.reward || !EFFECT_TYPES.has(g.reward.type)) {
        errors.push(`挑战 ${c.id} 的目标奖励类型未注册: ${g.reward?.type}`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`配置校验失败：\n- ${errors.join('\n- ')}`);
  }
}

function hasRequireCycle(techs) {
  const byId = new Map(techs.map((t) => [t.id, t]));
  const visiting = new Set();
  const done = new Set();

  function visit(id) {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true; // 环
    visiting.add(id);
    const t = byId.get(id);
    if (t) {
      for (const req of t.requires ?? []) {
        if (visit(req)) return true;
      }
    }
    visiting.delete(id);
    done.add(id);
    return false;
  }

  for (const id of byId.keys()) {
    if (visit(id)) return true;
  }
  return false;
}
