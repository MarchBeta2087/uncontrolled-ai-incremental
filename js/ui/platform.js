// js/ui/platform.js
// 平台判定（设计 §8.1）：决定加载哪套外壳样式与布局

/** 移动端判定：触屏粗指针 或 视口宽度 < 768 */
export function isMobile() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

/** 返回外壳 class 名：'shell-desktop' | 'shell-mobile'（MVP 仅实现桌面外壳） */
export function platformClass() {
  return isMobile() ? 'shell-mobile' : 'shell-desktop';
}
