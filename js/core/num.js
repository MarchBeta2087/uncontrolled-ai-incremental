// js/core/num.js
// Num 适配器 —— 封装 MegotaNum.js
//
// 设计说明书 §2.1 / §2.2 的硬性约定：
//   1. 逻辑层只认本模块这一组接口，换库只改本文件；
//   2. 所有资源量、成本、产量一律为 Num（MegotaNum 实例），禁止混用原生 Number 参与运算；
//   3. 比较、阈值判断必须走 cmp / eq / gt / lt，不得依赖 `>` 隐式转换。
//
// MegotaNum 的实例方法均为"clone 后运算并返回新实例"，不修改原对象，可安全共享。

const MegotaNum = globalThis.MegotaNum;

if (typeof MegotaNum !== 'function') {
  throw new Error('[Num] 未检测到 MegotaNum.js，请确认 index.html 先加载了 vendor/MegotaNum.js');
}

/** 把 number / string / JSON 对象 / MegotaNum 实例统一转为 MegotaNum 实例 */
function toNum(x) {
  if (x instanceof MegotaNum) return x;
  return new MegotaNum(x);
}

// 格式化默认档位阈值（与 config/balance.json 的 format 键对应，可被 configureNum 覆盖）
const defaults = {
  sciThreshold: '1e6',     // 普通记数（千分位）→ 科学记数的阈值（绝对值）
  banThreshold: '1.8e308', // 科学记数 → MegotaNum 记法的阈值（float64 上限，超此才落 ban）
  eeThreshold: '1e1000000',// ban 档内、指数达 7 位数时启用 ee 记法的阈值（#19）
  eeeThreshold: '1e6',     // ee 档内、双重对数 L2 达此值时启用 eee 记法（v0.6）；注意：这是 L2 阈值，不是值阈值
  decimals: 3,             // 小数位数
  displayMode: 'default',  // 大数记法偏好：'default'（科学记数 / ban）| 'ee'（loglog）| 'eee'（logloglog），由 UI 层设置
};

/** 大数记法偏好可选值（供设置面板枚举） */
export const DISPLAY_MODES = ['default', 'ee', 'eee'];

// ---- 数字系统（阿拉伯语双数字，v0.6）----
// 'latn'：西阿拉伯数字 0-9（默认）；'arab'：东阿拉伯-印度数字 ٠-٩。
// 仅影响显示字符串，不影响内部数值与存档。
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
let numeralSystem = 'latn';

/** 数字系统可选值（供设置面板枚举） */
export const NUMERAL_SYSTEMS = ['latn', 'arab'];

/** 设置数字系统（'latn' | 'arab'） */
export function setNumeralSystem(mode) {
  if (!NUMERAL_SYSTEMS.includes(mode)) return false;
  numeralSystem = mode;
  return true;
}

export function getNumeralSystem() {
  return numeralSystem;
}

/** 将字符串中的 ASCII 数字 0-9 替换为当前数字系统（阿拉伯-印度数字）；幂等，可安全重复调用 */
export function localizeDigits(s) {
  if (numeralSystem !== 'arab') return String(s);
  return String(s).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[+d]);
}

/**
 * 仅当整串“看起来是一个数”（含科学记数 / ee·eee 前缀，允许千分位与 ×10^ 记号）时才转换，
 * 避免把 id（如 p2_fold_1）、版本号前缀（v0.5.1）等里的数字也换掉。
 */
export function localizeNumericValue(v) {
  if (numeralSystem !== 'arab') return v;
  const s = String(v);
  return /^(?:e{1,3})?[+-]?[0-9][0-9,.\s×^eE+/-]*$/.test(s) ? localizeDigits(s) : s;
}

// ---- 数字格式（Intl 分组/小数分隔符 + 中文万/亿，v0.6）----
// 由 i18n 层在语言切换时注入 BCP-47 locale；分组/分隔符随语言变化（fr/es/pt/hi 等）。
let numberLocale = 'en';
let groupSep = ',';
let decimalSep = '.';
let indianGroup = false;
let cnUnits = false;

/** 由 i18n 层在切换语言时调用，注入 BCP-47 locale */
export function setNumberLocale(locale) {
  numberLocale = locale || 'en';
  try {
    const parts = new Intl.NumberFormat(numberLocale).formatToParts(1234567.89);
    groupSep = (parts.find((p) => p.type === 'group') || {}).value || ',';
    decimalSep = (parts.find((p) => p.type === 'decimal') || {}).value || '.';
  } catch (_) {
    groupSep = ',';
    decimalSep = '.';
  }
  indianGroup = /^hi\b/.test(numberLocale);
}
export function getNumberLocale() {
  return numberLocale;
}
/** 中文万/亿记法开关（仅对 zh 语言生效，且 1e4 ≤ |x| < 1e12） */
export function setCnUnits(v) {
  cnUnits = !!v;
}
export function getCnUnits() {
  return cnUnits;
}

/** 按当前 locale 分组（支持印度 2-2-3 分组） */
function groupDigits(digits) {
  if (indianGroup) {
    if (digits.length <= 3) return digits;
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, groupSep) + groupSep + last3;
  }
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
}
/** 把 toFixed 输出的 `.` 小数分隔符换成当前 locale */
function dec(str) {
  return decimalSep === '.' ? str : str.replace('.', decimalSep);
}
function trimFixed(v, d) {
  return dec(v.toFixed(d).replace(/\.?0+$/, ''));
}

/** 千分位普通记数：1234.5 -> "1,234.5"（分组/小数分隔符随 locale） */
function formatFull(n, decimals) {
  const v = n.toNumber();
  let str;
  if (Number.isInteger(v)) {
    str = String(v);
  } else {
    str = v.toFixed(decimals).replace(/\.?0+$/, '');
  }
  const neg = str.startsWith('-');
  const body = neg ? str.slice(1) : str;
  const [intPart, decPart] = body.split('.');
  const intWithSep = groupDigits(intPart);
  const out = decPart !== undefined ? `${intWithSep}${decimalSep}${decPart}` : intWithSep;
  return neg ? '-' + out : out;
}

/** 中文万/亿记法：1e4 ≤ |x| < 1e12 */
function formatCnUnits(abs, decimals, sign) {
  const yi = 1e8;
  const wan = 1e4;
  if (abs >= yi) return `${sign}${trimFixed(abs / yi, decimals)}亿`;
  return `${sign}${trimFixed(abs / wan, decimals)}万`;
}

/** 超大数记法（MegotaNum）：把 "1.7976931348623277e318" 这类尾数截断到 decimals 位；层记法（如 10^^N）保持原样 */
function formatBan(n, decimals) {
  const s = n.toString();
  const m = s.match(/^(-?\d+(?:\.\d+)?)e(-?\d+)$/);
  if (!m) return s;
  let mant = Number(m[1]);
  let exp = Number(m[2]);
  const factor = Math.pow(10, decimals);
  mant = Math.round(mant * factor) / factor;
  if (Math.abs(mant) >= 10) {
    mant /= 10;
    exp += 1;
  }
  return `${dec(mant.toFixed(decimals))}e${groupInt(exp)}`;
}

/** 整数千分位分组（用于指数显示，提升可读性）：1000000 -> "1,000,000" */
function groupInt(v) {
  const s = String(v);
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  const grouped = groupDigits(digits);
  return neg ? '-' + grouped : grouped;
}

/** 科学记数：1.2345e6 -> "1.235e6"（style=times 时为 "1.235×10^6"）；指数加千分位分隔 */
function formatScientific(n, decimals, style) {
  const sign = n.sign === -1 ? '-' : '';
  const abs = n.abs();
  if (abs.eq(0)) return '0';
  const exponent = abs.log10().floor();
  let expNum = exponent.toNumber();
  const mantissa = abs.div(Num.pow(10, exponent));
  let mantNum = mantissa.toNumber();
  // 尾数四舍五入进位：如 9.9999 → 10.000 应显示为 1.000e(exp+1)
  const factor = Math.pow(10, decimals);
  mantNum = Math.round(mantNum * factor) / factor;
  if (mantNum >= 10) {
    mantNum /= 10;
    expNum += 1;
  }
  if (style === 'times') {
    return `${sign}${dec(mantNum.toFixed(decimals))}×10^${groupInt(expNum)}`;
  }
  return `${sign}${dec(mantNum.toFixed(decimals))}e${groupInt(expNum)}`;
}

/**
 * ee / eee 记法（loglog / logloglog；#19 / v0.6）。
 *   1e1000000            → "ee6.0000"
 *   10^(10^(10^6))       → "eee6.0000"（L2 达 eeeThreshold 后启用）
 *   10^(10^(10^120))     → "eee120.0000"（庞加莱锚点）
 * 全部用 Num 运算，避免旧实现 `log10().toNumber()` 在指数 > 1.8e308 时溢出回退。
 */
function formatLogLog(n, decimals, eeeThreshold, allowEee) {
  const sign = n.sign === -1 ? '-' : '';
  const abs = n.abs();
  const exp = abs.log10(); // 十进制指数（Num，ban 档内可远超 float64）
  if (exp.lte(1)) return formatBan(n, decimals);
  const loglog = exp.log10(); // 双重对数（ee 档参数 L2）
  if (loglog.gte(eeeThreshold)) {
    // eee 档：L2 本身已达多位数，折叠为 logloglog（v0.6）
    if (allowEee) {
      const logloglog = loglog.log10();
      const v = logloglog.isFinite() ? logloglog.toNumber() : NaN;
      if (Number.isFinite(v)) return `${sign}eee${dec(v.toFixed(decimals))}`;
    }
    // ee 档（allowEee=false）或第三重对数仍溢出：交回 ban 档，MegotaNum 原生分层 e 记法更可读
    return formatBan(n, decimals);
  }
  const l2 = loglog.toNumber();
  if (!Number.isFinite(l2)) return formatBan(n, decimals);
  return `${sign}ee${dec(l2.toFixed(decimals))}`;
}

export const Num = {
  // ---- 构造与序列化 ----
  parse: toNum,
  // 注意：MegotaNum 自带的 toJSON 有 bug（丢失三元组第三分量，导致 roundtrip 丢精度），
  // 此处序列化完整三元组 [a,b,c] + layer + sign，并用 fromArray 的三元组分支恢复。
  fromJSON(x) {
    if (x instanceof MegotaNum) return x;
    if (x && typeof x === 'object' && Array.isArray(x.array)) {
      return MegotaNum.fromArray(x.array, x.sign, x.layer);
    }
    return new MegotaNum(x);
  },
  toJSON(x) {
    const n = toNum(x);
    return {
      array: n.array.map((e) => [e[0], e[1], e[2]]),
      layer: n.layer,
      sign: n.sign,
    };
  },
  clone(x) {
    return toNum(x).clone();
  },

  // ---- 常量 ----
  get ZERO() {
    return MegotaNum.ZERO;
  },
  get ONE() {
    return MegotaNum.ONE;
  },

  // ---- 四则运算与函数（均为纯函数，返回新 Num）----
  add(a, b) {
    return toNum(a).add(b);
  },
  sub(a, b) {
    return toNum(a).sub(b);
  },
  mul(a, b) {
    return toNum(a).mul(b);
  },
  div(a, b) {
    return toNum(a).div(b);
  },
  pow(a, b) {
    return toNum(a).pow(b);
  },
  sqrt(a) {
    return toNum(a).sqrt();
  },
  abs(a) {
    return toNum(a).abs();
  },
  neg(a) {
    return toNum(a).neg();
  },
  floor(a) {
    return toNum(a).floor();
  },
  log10(a) {
    return toNum(a).log10();
  },
  min(a, b) {
    return toNum(a).min(b);
  },
  max(a, b) {
    return toNum(a).max(b);
  },

  // ---- 比较（一律走实例方法，禁止隐式转换）----
  cmp(a, b) {
    return toNum(a).cmp(b);
  },
  eq(a, b) {
    return toNum(a).eq(b);
  },
  gt(a, b) {
    return toNum(a).gt(b);
  },
  gte(a, b) {
    return toNum(a).gte(b);
  },
  lt(a, b) {
    return toNum(a).lt(b);
  },
  lte(a, b) {
    return toNum(a).lte(b);
  },

  // ---- 判定 ----
  isNaN(a) {
    return toNum(a).isNaN();
  },
  isFinite(a) {
    return toNum(a).isFinite();
  },
  isZero(a) {
    return toNum(a).eq(0);
  },

  // ---- 显示格式化 ----
  // opts: { mode: 'auto'|'full'|'scientific'|'ban', decimals, sciThreshold, banThreshold, scientificStyle }
  format(x, opts = {}) {
    const n = toNum(x);
    if (n.isNaN()) return 'NaN';
    if (!n.isFinite()) return n.sign === -1 ? '-Infinity' : 'Infinity';

    const decimals = opts.decimals ?? defaults.decimals;
    const sciThreshold = toNum(opts.sciThreshold ?? defaults.sciThreshold);
    const banThreshold = toNum(opts.banThreshold ?? defaults.banThreshold);
    const eeThreshold = toNum(opts.eeThreshold ?? defaults.eeThreshold);
    const eeeThreshold = toNum(opts.eeeThreshold ?? defaults.eeeThreshold);
    const displayMode = opts.displayMode ?? defaults.displayMode;
    const abs = n.abs();

    // 中文万/亿记法（可选，仅 zh）：1e4 ≤ |x| < 1e12
    if (cnUnits && /^zh/.test(numberLocale) && abs.gte('1e4') && abs.lt('1e12')) {
      return localizeDigits(formatCnUnits(abs.toNumber(), decimals, n.sign === -1 ? '-' : ''));
    }

    let mode = opts.mode || 'auto';
    if (mode === 'auto') {
      if (abs.lt(sciThreshold)) mode = 'full';
      else if (abs.lt(banThreshold)) mode = 'scientific';
      else mode = 'ban';
    }

    // ee / eee 记法（#19 / v0.6）：偏好开启且数值达阈值时，覆盖 ban 档为 loglog / logloglog
    let out;
    if ((displayMode === 'ee' || displayMode === 'eee' || mode === 'ee' || mode === 'eee') && abs.gte(eeThreshold)) {
      const allowEee = displayMode === 'eee' || mode === 'eee';
      out = formatLogLog(n, opts.eeDecimals ?? 4, eeeThreshold, allowEee);
    } else {
      switch (mode) {
        case 'full':
          out = formatFull(n, decimals);
          break;
        case 'scientific':
          out = formatScientific(n, decimals, opts.scientificStyle);
          break;
        case 'ban':
        default:
          out = formatBan(n, decimals);
          break;
      }
    }
    // 数字系统（阿拉伯-印度数字）在最终输出层统一替换
    return localizeDigits(out);
  },

  // ---- 便捷转换 ----
  toNumber(x) {
    return toNum(x).toNumber();
  },
  toString(x) {
    return toNum(x).toString();
  },
};

/** 覆盖格式化默认档位阈值（由 main.js 从 balance.json 注入） */
export function configureNum(cfg = {}) {
  if (cfg.sciThreshold !== undefined) defaults.sciThreshold = cfg.sciThreshold;
  if (cfg.banThreshold !== undefined) defaults.banThreshold = cfg.banThreshold;
  if (cfg.eeThreshold !== undefined) defaults.eeThreshold = cfg.eeThreshold;
  if (cfg.eeeThreshold !== undefined) defaults.eeeThreshold = cfg.eeeThreshold;
  if (cfg.decimals !== undefined) defaults.decimals = cfg.decimals;
}

/** 设置大数记法偏好（'default' | 'ee' | 'eee'）；由 UI 层在启动与切换时调用。 */
export function setDisplayMode(mode) {
  if (!DISPLAY_MODES.includes(mode)) return false;
  defaults.displayMode = mode;
  return true;
}

export function getDisplayMode() {
  return defaults.displayMode;
}
