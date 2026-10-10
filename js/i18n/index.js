// js/i18n/index.js
// 多语言（i18n）基础：语言注册表 + 翻译函数 t(key, params) + 语言偏好持久化。
//
// 现状：zh-CN（默认）、zh-Hant、zh-TW、zh-HK、en、ja、ko 已实装；
// zh-TW / zh-HK 继承 zh-Hant 文案、仅字型字形不同；
// <html lang / data-lang> 交给 css/fonts.css 用于切换对应的像素字体族。
//
// 语言偏好独立于游戏存档，存 localStorage（UI 偏好，不进 save schema）。

import zhCN from './locales/zh-CN.js';
import zhHant from './locales/zh-Hant.js';
import zhTW from './locales/zh-TW.js';
import zhHK from './locales/zh-HK.js';
import en from './locales/en.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import contentZhHant from './content/zh-Hant.js';
import contentEn from './content/en.js';
import contentJa from './content/ja.js';
import contentKo from './content/ko.js';

const DEFAULT_LOCALE = 'zh-CN';
const STORAGE_KEY = 'uncontrolled-ai-incremental.locale';

/** 语言注册表：dict 为 null 表示尚未实装（待办） */
const REGISTRY = [
  { code: 'zh-CN', name: '简体中文', fontVariant: 'zh-hans', dict: zhCN },
  { code: 'zh-Hant', name: '繁體中文', fontVariant: 'zh-hant', dict: zhHant },
  { code: 'zh-TW', name: '繁體中文（台灣）', fontVariant: 'zh-tw', dict: zhTW, parent: 'zh-Hant' },
  { code: 'zh-HK', name: '繁體中文（香港）', fontVariant: 'zh-hk', dict: zhHK, parent: 'zh-Hant' },
  { code: 'ja', name: '日本語', fontVariant: 'ja', dict: ja },
  { code: 'ko', name: '한국어', fontVariant: 'ko', dict: ko },
  { code: 'en', name: 'English', fontVariant: 'latin', dict: en },
];

const byCode = new Map(REGISTRY.map((l) => [l.code, l]));

/** 游戏内容本地化：非默认语言覆盖 config 中文；缺失时回退到 config 原文 */
const CONTENT = {
  'zh-Hant': contentZhHant,
  en: contentEn,
  ja: contentJa,
  ko: contentKo,
};

function readStoredLocale() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return byCode.has(code) && byCode.get(code).dict ? code : DEFAULT_LOCALE;
  } catch (_) {
    return DEFAULT_LOCALE;
  }
}

let current = readStoredLocale();

function applyHtmlAttrs() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (!html) return;
  html.lang = current;
  html.dataset.lang = current;
}

// 模块加载时应用一次（ES module 在 DOM 就绪后执行，document.documentElement 已可用）
applyHtmlAttrs();

export function getLocale() {
  return current;
}

export function getLocales() {
  return REGISTRY;
}

export function isAvailable(code) {
  const loc = byCode.get(code);
  return !!(loc && loc.dict);
}

/** 切换语言；未实装或未知语言返回 false。 */
export function setLocale(code) {
  const loc = byCode.get(code);
  if (!loc || !loc.dict) return false;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch (_) {
    /* 忽略写入失败，仅本次会话生效 */
  }
  applyHtmlAttrs();
  return true;
}

/** 沿继承链查找 key：当前语言 → parent → … → 默认 zh-CN → key 本身。 */
export function t(key, params) {
  let s;
  let code = current;
  while (code) {
    const v = byCode.get(code)?.dict?.[key];
    if (v !== undefined) { s = v; break; }
    code = byCode.get(code)?.parent;
  }
  if (s === undefined) s = zhCN[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/**
 * 游戏内容翻译：tc(scope, id, field, fallback)。
 * scope ∈ { resource, generator, tech, upgrade, achievement, fragment, challenge }；
 * 沿继承链查找；未提供翻译（或语言为 zh-CN）时回退到 config/*.json 中的中文原文。
 */
export function tc(scope, id, field, fallback) {
  let code = current;
  while (code) {
    const node = CONTENT[code]?.[scope]?.[id];
    if (node && node[field] !== undefined) return node[field];
    code = byCode.get(code)?.parent;
  }
  return fallback;
}
