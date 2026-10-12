// js/ui/format.js
// 大数记法偏好 + 数字系统偏好（UI 偏好，存 localStorage，不进存档）。
//   大数记法 'default'：科学记数 / ban 档（现状）；'ee' / 'eee'：loglog / logloglog。
//   数字系统 'latn'：西阿拉伯数字 0-9（默认）；'arab'：东阿拉伯-印度数字 ٠-٩。

import {
  DISPLAY_MODES,
  NUMERAL_SYSTEMS,
  setDisplayMode,
  setNumeralSystem,
} from '../core/num.js';

const STORAGE_MODE = 'uncontrolled-ai-incremental.bigNumberMode';
const STORAGE_NUMERAL = 'uncontrolled-ai-incremental.numeralSystem';

function read() {
  try {
    const v = localStorage.getItem(STORAGE_MODE);
    return DISPLAY_MODES.includes(v) ? v : 'default';
  } catch (_) {
    return 'default';
  }
}
function write(mode) {
  try {
    localStorage.setItem(STORAGE_MODE, mode);
  } catch (_) {
    /* 忽略写入失败 */
  }
}

function readNumeral() {
  try {
    const v = localStorage.getItem(STORAGE_NUMERAL);
    return NUMERAL_SYSTEMS.includes(v) ? v : 'latn';
  } catch (_) {
    return 'latn';
  }
}
function writeNumeral(mode) {
  try {
    localStorage.setItem(STORAGE_NUMERAL, mode);
  } catch (_) {
    /* 忽略写入失败 */
  }
}

let mode = read();
let numeral = readNumeral();

// 模块加载即应用，确保首帧格式化即使用偏好
setDisplayMode(mode);
setNumeralSystem(numeral);

export function getBigNumberMode() {
  return mode;
}

export function setBigNumberMode(m) {
  if (!DISPLAY_MODES.includes(m)) return false;
  mode = m;
  write(m);
  setDisplayMode(m);
  return true;
}

export function getNumeralStyle() {
  return numeral;
}

export function setNumeralStyle(m) {
  if (!NUMERAL_SYSTEMS.includes(m)) return false;
  numeral = m;
  writeNumeral(m);
  setNumeralSystem(m);
  return true;
}

export { DISPLAY_MODES as BIG_NUMBER_MODES, NUMERAL_SYSTEMS as NUMERAL_STYLES };
