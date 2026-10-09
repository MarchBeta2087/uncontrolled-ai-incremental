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
]);

const DEFAULT_PATHS = {
  balance: 'config/balance.json',
  resources: 'config/resources.json',
  techs: 'config/techs.json',
};

async function fetchJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`加载 ${path} 失败: HTTP ${resp.status}`);
  return resp.json();
}

export async function loadConfig(paths = DEFAULT_PATHS) {
  const [balance, resources, techs] = await Promise.all([
    fetchJSON(paths.balance),
    fetchJSON(paths.resources),
    fetchJSON(paths.techs),
  ]);
  validateConfig({ balance, resources, techs });
  return { balance, resources, techs };
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
