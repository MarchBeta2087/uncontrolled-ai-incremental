// js/sim/quotes.js
// 游戏逻辑层：彩蛋语录条（Issue #52）。
//
// 只维护「已浏览」集合；是否可见由 unlockCondition 决定（由 UI/conditions 调用 checkCondition）。
// 不 import conditions（避免与 conditions → quotes 成环）。
import { Events } from '../core/events.js';

let quotes = [];
let seen = new Set();

export function initQuotes(cfg) {
  quotes = cfg?.quotes ?? [];
  seen = new Set();
}

export function getQuotes() {
  return quotes.slice();
}
export function getQuoteIds() {
  return quotes.map((q) => q.id);
}
export function getQuote(id) {
  return quotes.find((q) => q.id === id) ?? null;
}

export function isSeen(id) {
  return seen.has(id);
}
export function getSeenCount() {
  return seen.size;
}
/** 标记已浏览；返回是否首次 */
export function markSeen(id) {
  if (!id || seen.has(id)) return false;
  seen.add(id);
  Events.emit('quote:seen', { id, count: seen.size });
  return true;
}

// ---- 存档 ----
export function serialize() {
  return { seen: [...seen] };
}
export function load(state = {}) {
  const valid = new Set(quotes.map((q) => q.id));
  seen = new Set(Array.isArray(state?.seen) ? state.seen.filter((id) => valid.has(id)) : []);
}
export function reset() {
  seen = new Set();
}
