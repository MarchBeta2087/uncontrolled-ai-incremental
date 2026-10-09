// js/core/events.js
// 事件总线 —— 解耦 sim（游戏逻辑）与 ui（表现层）
//
// 使用约定：
//   事件名用小写冒号分隔，如 'time:error'、'prestige:ready'、'save:done'。
//   处理器抛出的异常被吞掉并打印到 console，不影响其它监听者。

const listeners = new Map(); // event -> Set<handler>

export const Events = {
  /** 注册监听，返回一个解绑函数 */
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    const set = listeners.get(event);
    if (set) set.delete(handler);
  },

  /** 只触发一次的监听 */
  once(event, handler) {
    const wrap = (payload) => {
      this.off(event, wrap);
      handler(payload);
    };
    return this.on(event, wrap);
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    // 拷贝一份，避免处理器在遍历中增删监听导致漏触发
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Events] 事件 "${event}" 的处理器抛错：`, err);
      }
    }
  },

  /** 清空指定事件（缺省清空全部） */
  clear(event) {
    if (event !== undefined) listeners.delete(event);
    else listeners.clear();
  },
};
