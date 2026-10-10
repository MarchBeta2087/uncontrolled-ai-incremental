// js/ui/theme.js
// 配色主题：预设主题 + 自定义强调色，存 localStorage（UI 偏好，不进存档）。
// 通过 <html data-theme="..."> 切换预设；自定义强调色由内联 CSS 变量覆写。

const STORAGE_THEME = 'uncontrolled-ai-incremental.theme';
const STORAGE_ACCENT = 'uncontrolled-ai-incremental.accent';

export const THEMES = ['default', 'solarized', 'dracula', 'contrast', 'light'];

function read(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (_) {
    /* 忽略写入失败 */
  }
}

let theme = read(STORAGE_THEME, 'default');
if (!THEMES.includes(theme)) theme = 'default';
let accent = read(STORAGE_ACCENT, '');

export function getTheme() {
  return theme;
}
export function getAccent() {
  return accent;
}

function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(rgb) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}
function lighten(hex, amt) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.map((v) => v + (255 - v) * amt));
}
function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastOn(hex) {
  return luminance(hex) > 0.5 ? '#000000' : '#ffffff';
}

export function applyTheme() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.dataset.theme = theme;
  if (accent) {
    html.style.setProperty('--accent', accent);
    html.style.setProperty('--accent-strong', lighten(accent, 0.18));
    html.style.setProperty('--accent-contrast', contrastOn(accent));
  } else {
    html.style.removeProperty('--accent');
    html.style.removeProperty('--accent-strong');
    html.style.removeProperty('--accent-contrast');
  }
}

export function setTheme(id) {
  if (!THEMES.includes(id)) return false;
  theme = id;
  write(STORAGE_THEME, id);
  applyTheme();
  return true;
}

export function setAccent(color) {
  accent = color ? String(color) : '';
  write(STORAGE_ACCENT, accent);
  applyTheme();
  return true;
}

// 模块加载即应用，避免首帧闪烁
applyTheme();
