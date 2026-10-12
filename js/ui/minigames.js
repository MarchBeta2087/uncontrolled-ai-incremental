// js/ui/minigames.js
// 小游戏表现层（v0.6 庞加莱纪）：全部 Canvas 手写、零素材。
// 四个游戏：pong / minesweeper / snake / game2048。键盘 + 指针（点击/滑动）+ 触控方向键。
// 成绩通过 Minigames.recordScore 落地（刷新最佳会重放永久增益并触发成就轮询）。

import { t } from '../i18n/index.js';
import * as Minigames from '../sim/minigames.js';

const SIZE = 240;

let overlay = null;
let canvas = null;
let ctx = null;
let titleEl = null;
let scoreEl = null;
let bestEl = null;
let hintEl = null;
let rafId = 0;
let lastTs = 0;
let active = null; // 当前游戏实例
let onKeyHandler = null;
let padEl = null;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

function ensureOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'mg-overlay';
  overlay.style.display = 'none';

  const panel = document.createElement('div');
  panel.className = 'mg-panel';

  const head = document.createElement('div');
  head.className = 'mg-head';
  titleEl = document.createElement('div');
  titleEl.className = 'mg-title';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.type = 'button';
  closeBtn.textContent = t('mg.close');
  closeBtn.onclick = () => closeMinigame();
  head.append(titleEl, closeBtn);

  scoreEl = document.createElement('div');
  scoreEl.className = 'mg-score';
  bestEl = document.createElement('div');
  bestEl.className = 'mg-best';

  canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'mg-canvas';
  ctx = canvas.getContext('2d');

  padEl = document.createElement('div');
  padEl.className = 'mg-pad';

  hintEl = document.createElement('div');
  hintEl.className = 'mg-hint';

  panel.append(head, scoreEl, bestEl, canvas, padEl, hintEl);
  overlay.append(panel);
  document.body.append(overlay);

  // 方向键（触控）
  const dirs = [
    ['up', 0, -1],
    ['left', -1, 0],
    ['down', 0, 1],
    ['right', 1, 0],
  ];
  const order = ['up', 'left', 'right', 'down'];
  const grid = document.createElement('div');
  grid.className = 'mg-dpad';
  const byDir = Object.fromEntries(dirs.map(([k, dx, dy]) => [k, { dx, dy }]));
  for (const k of order) {
    const b = document.createElement('button');
    b.className = 'btn mg-dir';
    b.type = 'button';
    b.textContent = { up: '▲', left: '◀', right: '▶', down: '▼' }[k];
    const press = (e) => {
      e.preventDefault();
      if (active?.onDir) active.onDir(byDir[k].dx, byDir[k].dy);
    };
    b.addEventListener('pointerdown', press);
    grid.append(b);
  }
  padEl.append(grid);

  onKeyHandler = (e) => {
    if (!active) return;
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      if (active.onDir) active.onDir(dir[0], dir[1]);
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (active.onAction) active.onAction();
    } else if (e.key === 'Escape') {
      closeMinigame();
    }
  };
  window.addEventListener('keydown', onKeyHandler);

  canvas.addEventListener('pointerdown', (e) => {
    if (!active?.onPointer) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE;
    const y = ((e.clientY - r.top) / r.height) * SIZE;
    active.onPointer(x, y, 'down');
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!active?.onPointer) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE;
    const y = ((e.clientY - r.top) / r.height) * SIZE;
    active.onPointer(x, y, 'up');
  });
}

export function closeMinigame() {
  if (!overlay || !active) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  active = null;
  overlay.style.display = 'none';
}

export function isMinigameOpen() {
  return !!overlay && overlay.style.display !== 'none';
}

export function openMinigame(id) {
  const def = Minigames.getMinigame(id);
  if (!def) return;
  ensureOverlay();
  titleEl.textContent = t('mg.' + id + '.name');
  hintEl.textContent = t('mg.' + id + '.hint');
  padEl.style.display = id === 'minesweeper' ? 'none' : 'flex';

  active = createGame(id, def);
  active.init();
  overlay.style.display = 'flex';
  lastTs = performance.now();
  updateHud();
  rafId = requestAnimationFrame(loop);
}

function loop(ts) {
  if (!active) return;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  active.update(dt);
  active.draw(ctx);
  updateHud();
  rafId = requestAnimationFrame(loop);
}

function updateHud() {
  if (!active) return;
  const id = active.id;
  scoreEl.textContent = t('mg.score', { score: active.score() });
  bestEl.textContent = t('mg.best', { best: Minigames.getBest(id) });
}

function finish(score) {
  const id = active?.id;
  if (!id) return;
  const record = Minigames.recordScore(id, score);
  updateHud();
  hintEl.textContent = record ? t('mg.record') : t('mg.gameover', { score });
}

// ---- 绘图小工具 ----
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function text(c, str, x, y, color, align = 'center') {
  c.fillStyle = color;
  c.font = '12px monospace';
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(str, Math.round(x), Math.round(y));
}

// ================= PONG =================
function createPong() {
  const PH = 48, PW = 5, AW = 5, AH = 48;
  let py, ay, ball, ps, as, over, bias, aiErr;
  const resetBall = (dir) => {
    ball = { x: SIZE / 2, y: SIZE / 2, vx: 2.4 * dir, vy: (Math.random() * 2 - 1) * 1.6 };
  };
  return {
    id: 'pong',
    init() {
      py = SIZE / 2 - PH / 2;
      ay = SIZE / 2 - AH / 2;
      ps = 0; as = 0; over = false; bias = 0; aiErr = 0;
      resetBall(Math.random() < 0.5 ? -1 : 1);
    },
    score() { return ps; },
    onDir(dx, dy) { if (!over && dy) py = Math.max(0, Math.min(SIZE - PH, py + dy * 16)); },
    onPointer(x, y) { if (!over) py = Math.max(0, Math.min(SIZE - PH, y - PH / 2)); },
    update() {
      if (over) return;
      // AI：追踪球 + 学习偏差
      const predict = ball.y + ball.vy * 8 + bias;
      const target = predict - AH / 2;
      ay += Math.max(-2.6, Math.min(2.6, target - ay));
      ay = Math.max(0, Math.min(SIZE - AH, ay));
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < 3) { ball.y = 3; ball.vy = Math.abs(ball.vy); }
      if (ball.y > SIZE - 3) { ball.y = SIZE - 3; ball.vy = -Math.abs(ball.vy); }
      if (ball.x < PW + 6 && ball.vx < 0) {
        if (ball.y >= py && ball.y <= py + PH) {
          ball.vx = Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (py + PH / 2)) * 0.08;
          bias = bias * 0.85 + (ball.y - (ay + AH / 2)) * 0.15; // 学习玩家打法
        } else { as++; resetBall(-1); return; }
      }
      if (ball.x > SIZE - AW - 6 && ball.vx > 0) {
        if (ball.y >= ay && ball.y <= ay + AH) {
          ball.vx = -Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (ay + AH / 2)) * 0.08;
        } else { ps++; resetBall(1); }
      }
      if (ps >= 5 || as >= 5) { over = true; finish(ps); }
    },
    draw(c) {
      rect(c, 0, 0, SIZE, SIZE, cssVar('--panel'));
      rect(c, 4, py, PW, PH, cssVar('--accent'));
      rect(c, SIZE - 4 - AW, ay, AW, AH, cssVar('--text-dim'));
      rect(c, ball.x - 3, ball.y - 3, 6, 6, cssVar('--text'));
      text(c, `${ps} : ${as}`, SIZE / 2, 12, cssVar('--text-dim'));
    },
  };
}

// ================= 扫雷 =================
function createMinesweeper() {
  const N = 9, MINES = 10, CELL = SIZE / N;
  let grid, revealed, flagged, over, won, first, flagMode;
  const neighbors = (i, j) => {
    const out = [];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const a = i + di, b = j + dj;
      if (a >= 0 && a < N && b >= 0 && b < N) out.push([a, b]);
    }
    return out;
  };
  const place = (si, sj) => {
    let placed = 0;
    while (placed < MINES) {
      const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);
      if (grid[i][j] === -1) continue;
      if (Math.abs(i - si) <= 1 && Math.abs(j - sj) <= 1) continue;
      grid[i][j] = -1; placed++;
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (grid[i][j] === -1) continue;
      grid[i][j] = neighbors(i, j).filter(([a, b]) => grid[a][b] === -1).length;
    }
  };
  const reveal = (i, j) => {
    if (revealed[i][j] || flagged[i][j]) return;
    revealed[i][j] = true;
    if (grid[i][j] === 0) neighbors(i, j).forEach(([a, b]) => reveal(a, b));
  };
  const checkWin = () => {
    let ok = true;
    for (let i = 0; i < N && ok; i++) for (let j = 0; j < N; j++) {
      if (grid[i][j] !== -1 && !revealed[i][j]) { ok = false; break; }
    }
    return ok;
  };
  return {
    id: 'minesweeper',
    init() {
      grid = Array.from({ length: N }, () => Array(N).fill(0));
      revealed = Array.from({ length: N }, () => Array(N).fill(false));
      flagged = Array.from({ length: N }, () => Array(N).fill(false));
      over = false; won = false; first = true; flagMode = false;
      place(0, 0);
    },
    score() { return won ? 1 : 0; },
    onAction() { flagMode = !flagMode; },
    onPointer(x, y, type) {
      if (over || type !== 'down') return;
      const j = Math.floor(x / CELL), i = Math.floor(y / CELL);
      if (i < 0 || i >= N || j < 0 || j >= N) return;
      if (flagMode) { if (!revealed[i][j]) flagged[i][j] = !flagged[i][j]; return; }
      if (flagged[i][j]) return;
      if (first) { if (grid[i][j] === -1) { grid = Array.from({ length: N }, () => Array(N).fill(0)); revealed = Array.from({ length: N }, () => Array(N).fill(false)); flagged = Array.from({ length: N }, () => Array(N).fill(false)); place(i, j); } first = false; }
      if (grid[i][j] === -1) { over = true; won = false; revealed[i][j] = true; finish(0); return; }
      reveal(i, j);
      if (checkWin()) { over = true; won = true; finish(1); }
    },
    draw(c) {
      rect(c, 0, 0, SIZE, SIZE, cssVar('--panel-2'));
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x = j * CELL, y = i * CELL;
        if (!revealed[i][j]) {
          rect(c, x + 1, y + 1, CELL - 2, CELL - 2, flagged[i][j] ? cssVar('--warning') : cssVar('--border'));
        } else if (grid[i][j] === -1) {
          rect(c, x + 1, y + 1, CELL - 2, CELL - 2, '#f85149');
        } else {
          rect(c, x + 1, y + 1, CELL - 2, CELL - 2, cssVar('--panel'));
          if (grid[i][j] > 0) text(c, String(grid[i][j]), x + CELL / 2, y + CELL / 2, cssVar('--text'));
        }
      }
      if (flagMode) text(c, t('mg.minesweeper.flagOn'), SIZE / 2, SIZE - 8, cssVar('--warning'));
    },
  };
}

// ================= 贪吃蛇 =================
function createSnake() {
  const N = 12, CELL = SIZE / N;
  let snake, dir, nextDir, food, over, acc, stepMs;
  const spawnFood = () => {
    const free = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (!snake.some((s) => s.x === i && s.y === j)) free.push({ x: i, y: j });
    }
    food = free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
  };
  return {
    id: 'snake',
    init() {
      snake = [{ x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }];
      dir = { x: 1, y: 0 }; nextDir = dir; over = false; acc = 0; stepMs = 0.14;
      spawnFood();
    },
    score() { return Math.max(0, snake.length - 3); },
    onDir(dx, dy) { if (dx || dy) { if (dx === -dir.x && dy === -dir.y) return; nextDir = { x: dx, y: dy }; } },
    update(dt) {
      if (over) return;
      acc += dt;
      if (acc < stepMs) return;
      acc = 0;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N || snake.some((s) => s.x === head.x && s.y === head.y)) {
        over = true; finish(Math.max(0, snake.length - 3)); return;
      }
      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) spawnFood();
      else snake.pop();
    },
    draw(c) {
      rect(c, 0, 0, SIZE, SIZE, cssVar('--panel'));
      rect(c, food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, cssVar('--warning'));
      snake.forEach((s, i) => rect(c, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? cssVar('--accent') : cssVar('--text-dim')));
    },
  };
}

// ================= 2048 =================
function create2048() {
  const N = 4, GAP = 4, CELL = (SIZE - GAP * (N + 1)) / N;
  let board, over, won;
  const pos = (i, j) => ({ x: GAP + j * (CELL + GAP), y: GAP + i * (CELL + GAP) });
  const empty = () => { const out = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!board[i][j]) out.push([i, j]); return out; };
  const addTile = () => { const e = empty(); if (!e.length) return; const [i, j] = e[Math.floor(Math.random() * e.length)]; board[i][j] = Math.random() < 0.9 ? 2 : 4; };
  const highest = () => { let m = 0; for (const row of board) for (const v of row) m = Math.max(m, v); return m; };
  const canMove = () => {
    if (empty().length) return true;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (j < N - 1 && board[i][j] === board[i][j + 1]) return true;
      if (i < N - 1 && board[i][j] === board[i + 1][j]) return true;
    }
    return false;
  };
  const slide = (row) => {
    const a = row.filter((v) => v);
    for (let i = 0; i < a.length - 1; i++) {
      if (a[i] === a[i + 1]) { a[i] *= 2; a.splice(i + 1, 1); if (a[i] >= 2048) won = true; }
    }
    while (a.length < N) a.push(0);
    return a;
  };
  const move = (dx, dy) => {
    if (over) return;
    const before = JSON.stringify(board);
    if (dx) {
      for (let i = 0; i < N; i++) {
        let row = board[i].slice();
        if (dx > 0) row.reverse();
        row = slide(row);
        if (dx > 0) row.reverse();
        board[i] = row;
      }
    } else {
      for (let j = 0; j < N; j++) {
        let col = board.map((r) => r[j]);
        if (dy > 0) col.reverse();
        col = slide(col);
        if (dy > 0) col.reverse();
        for (let i = 0; i < N; i++) board[i][j] = col[i];
      }
    }
    if (JSON.stringify(board) !== before) {
      addTile();
      if (!canMove()) { over = true; finish(highest()); }
    }
  };
  return {
    id: 'game2048',
    init() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      over = false; won = false;
      addTile(); addTile();
    },
    score() { return highest(); },
    onDir(dx, dy) { if (dx || dy) move(dx, dy); },
    draw(c) {
      rect(c, 0, 0, SIZE, SIZE, cssVar('--panel-2'));
      const colors = { 0: cssVar('--panel'), 2: '#3a4a5a', 4: '#4a5a3a', 8: '#6a5a3a', 16: '#8a4a3a', 32: '#a85a3a', 64: '#c86a2a' };
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const { x, y } = pos(i, j);
        rect(c, x, y, CELL, CELL, colors[board[i][j]] || cssVar('--accent'));
        if (board[i][j]) text(c, String(board[i][j]), x + CELL / 2, y + CELL / 2, cssVar('--text'));
      }
    },
  };
}

function createGame(id, def) {
  switch (id) {
    case 'pong': return createPong();
    case 'minesweeper': return createMinesweeper();
    case 'snake': return createSnake();
    case 'game2048': return create2048();
    default: return createSnake();
  }
}
