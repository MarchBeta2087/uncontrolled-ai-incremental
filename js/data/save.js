// js/data/save.js
// 存档管理 —— localStorage 读写 / 导出导入 / 校验 / 迁移链（设计说明书 §7）
//
// 职责边界：
//   - 本模块只处理"纯 JSON 快照"（snapshot）与 localStorage / 文件的互转；
//   - Num 实例 ↔ Num JSON 的转换由游戏逻辑层（sim）在快照生成/恢复时负责，
//     本模块通过 Num.toJSON 生成初始零值，但不深度遍历运行时状态。
//   - 存档结构见设计说明书 §7.1（schemaVersion / meta / time / run / metaProgress / theories）。

import { Num } from '../core/num.js';

export const SAVE_KEY = 'uncontrolled-ai-incremental.save';
export const SCHEMA_VERSION = 1;

/** 迁移函数表：migrations[v] 把 v 版快照迁到 v+1 版（链式执行） */
const migrations = {
  // 示例（未来 schemaVersion 升级时补充）：
  // 1: (s) => ({ ...s, schemaVersion: 2, newField: 'default' }),
};

/** 生成初始存档快照（纯 JSON，Num 字段已是 MegotaNum JSON 表示） */
export function createInitialSnapshot() {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      createdAt: Date.now(),
      lastSaveAt: Date.now(),
      prestigeCount: 0,
    },
    time: {
      gameSecondsElapsed: Num.toJSON(Num.parse(0)),
      rateMultipliers: {},
    },
    run: {
      resources: {},   // { resourceId: NumJSON }
      techs: [],       // [techId, ...]
      buildings: {},   // { buildingId: NumJSON }
    },
    metaProgress: {
      timeCrystals: Num.toJSON(Num.parse(0)),
      upgrades: [],    // [upgradeId, ...]
      achievements: [],// [achievementId, ...]
      fragments: [],   // [fragmentId, ...]
    },
    theories: [],      // 穿梭后保留的核心理论
  };
}

/** 基本结构校验（不深度校验 Num 字段，深度校验在 sim 层恢复时做） */
export function validate(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return { ok: false, reason: '存档不是对象' };
  }
  if (typeof snapshot.schemaVersion !== 'number') {
    return { ok: false, reason: '缺少 schemaVersion' };
  }
  for (const key of ['meta', 'time', 'run', 'metaProgress']) {
    if (!snapshot[key] || typeof snapshot[key] !== 'object' || Array.isArray(snapshot[key])) {
      return { ok: false, reason: `缺少字段 ${key}` };
    }
  }
  return { ok: true };
}

/** 链式迁移到当前 schemaVersion；高于当前版本则拒绝（防止新旧互踩） */
export function migrate(snapshot) {
  let s = snapshot;
  let v = s.schemaVersion ?? 1;
  if (v > SCHEMA_VERSION) {
    throw new Error(`存档版本 v${v} 高于当前支持的 v${SCHEMA_VERSION}，拒绝加载`);
  }
  while (v < SCHEMA_VERSION) {
    const fn = migrations[v];
    if (!fn) throw new Error(`缺少迁移函数 migrate_${v}to${v + 1}`);
    s = fn(s);
    v = s.schemaVersion;
  }
  return s;
}

/** 写入 localStorage。返回 { ok, reason?, error? } */
export function save(snapshot) {
  snapshot.meta = snapshot.meta || {};
  snapshot.meta.lastSaveAt = Date.now();
  let json;
  try {
    json = JSON.stringify(snapshot);
  } catch (err) {
    return { ok: false, reason: '序列化失败', error: err };
  }
  try {
    localStorage.setItem(SAVE_KEY, json);
    return { ok: true };
  } catch (err) {
    // 设计 §10：localStorage 不可用/超限 → 降级仅内存 + 提示导出备份
    return { ok: false, reason: 'localStorage 写入失败（可能超限或被禁用）', error: err };
  }
}

/** 从 localStorage 读取并校验迁移。返回 { ok, snapshot? } 或 { ok:false, reason, error? } */
export function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (err) {
    return { ok: false, reason: 'localStorage 不可用', error: err };
  }
  if (!raw) return { ok: false, reason: 'no-save' };

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { ok: false, reason: '存档 JSON 解析失败', error: err };
  }

  const v = validate(data);
  if (!v.ok) return v;

  try {
    data = migrate(data);
  } catch (err) {
    return { ok: false, reason: '存档迁移失败', error: err };
  }

  return { ok: true, snapshot: data };
}

/** 删除本地存档 */
export function clear() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (_) {
    /* 忽略 */
  }
}

/** 导出存档为 JSON 文件下载（设计 §7.3：带版本头，不含个人数据） */
export function exportSave(snapshot) {
  snapshot.meta = snapshot.meta || {};
  snapshot.meta.exportedAt = Date.now();
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `uncontrolled-ai-incremental-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 导入存档文件。返回 Promise<snapshot>，失败 reject */
export function importSave(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const v = validate(data);
        if (!v.ok) throw new Error(v.reason);
        resolve(migrate(data));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file);
  });
}
