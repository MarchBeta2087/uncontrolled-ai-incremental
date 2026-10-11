// js/ui/format.js
// 大数记法偏好（UI 偏好，存 localStorage，不进存档）。
//   'default'：科学记数 / ban 档（现状）；
//   'ee'：指数达 7 位数起改用 ee / loglog 记法（#19），如 1e1000000 → ee6.0000。

import { DISPLAY_MODES, setDisplayMode } from '../core/num.js';

const STORAGE_MODE = 'uncontrolled-ai-incremental.bigNumberMode';

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

let mode = read();

// 模块加载即应用，确保首帧格式化即使用偏好
setDisplayMode(mode);

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

export { DISPLAY_MODES as BIG_NUMBER_MODES };
