// js/ui/app.js
// 表现层：桌面外壳 UI 控制器（MVP）
// 订阅 sim 事件 → 脏标记 → requestAnimationFrame 节流刷新（设计 §8.4）

import { Events } from '../core/events.js';
import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from '../sim/resources.js';
import * as Techs from '../sim/techs.js';
import * as Prestige from '../sim/prestige.js';
import { platformClass } from './platform.js';

const refs = {};
let dirty = false;
let rafId = 0;
let currentView = 'resources';
let toastTimer = 0;

export function initUI() {
  document.body.classList.add(platformClass());
  buildShell();
  bindEvents();
  switchView('resources');
  markDirty();
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildShell() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const shell = el('div');
  shell.id = 'shell';

  // ---- 标题栏 ----
  const titlebar = el('div', 'titlebar');
  const tl = el('div', 'titlebar-left');
  tl.append(el('span', 'titlebar-dot', '●'), el('span', '', '失控 AI 增量'));
  const tr = el('div', 'titlebar-right');
  const timeSpan = el('span', 'num', '--');
  const rateSpan = el('span', '', '速率 ×1');
  const weekSpan = el('span', '', '周目 1');
  tr.append(el('span', '', '游戏内时间 '), timeSpan, rateSpan, weekSpan);
  titlebar.append(tl, tr);
  refs.timeText = timeSpan;
  refs.rateText = rateSpan;
  refs.weekText = weekSpan;

  // ---- 视图容器 ----
  const viewContainer = el('div', 'view-container');

  // 资源视图
  const viewRes = el('div', 'view active');
  const resLayout = el('div', 'resources-layout');
  const leftCol = el('div', 'left-col');

  const clickBtn = el('button', 'click-btn', '投入研发（点击产资金）');
  clickBtn.type = 'button';
  clickBtn.onclick = () => { Resources.click(); markDirty(); };
  leftCol.append(clickBtn);

  const resPanel = el('div', 'panel');
  resPanel.append(el('div', 'panel-title', '资源'));
  const resList = el('div', '');
  for (const rid of Resources.getResourceIds()) {
    const def = Resources.getResourceDef(rid);
    const row = el('div', 'res-row');
    const name = el('span', 'res-name', def.name);
    const value = el('span', 'res-value num', '0');
    value.dataset.res = rid;
    row.append(name, value);
    resList.append(row);
  }
  resPanel.append(resList);
  leftCol.append(resPanel);
  refs.resList = resList;

  // 生成器面板
  const genPanel = el('div', 'panel');
  genPanel.append(el('div', 'panel-title', '扩张基建'));
  const genList = el('div', '');
  for (const gid of Resources.getGeneratorIds()) {
    const def = Resources.getGeneratorDef(gid);
    const card = el('div', 'gen-card');
    const info = el('div', 'gen-info');
    info.append(
      el('div', 'gen-name', def.name),
      el('div', 'gen-meta', `产 ${Resources.getResourceDef(def.produces).name}`)
    );
    const countSpan = el('span', 'gen-count num', '0');
    countSpan.dataset.gen = gid;
    const costBtn = el('button', 'btn', '');
    costBtn.type = 'button';
    costBtn.dataset.gen = gid;
    costBtn.onclick = () => {
      const r = Resources.buyGenerator(gid, 1);
      if (!r.ok) showToast(r.reason || '无法购买');
      markDirty();
    };
    card.append(info, countSpan, costBtn);
    genList.append(card);
  }
  genPanel.append(genList);
  refs.genList = genList;

  resLayout.append(leftCol, genPanel);
  viewRes.append(resLayout);

  // 研发视图
  const viewTechs = el('div', 'view');
  const techPanel = el('div', 'panel');
  techPanel.append(el('div', 'panel-title', '技术树'));
  const techGrid = el('div', 'tech-grid');
  for (const tid of Techs.getTechIds()) {
    const def = Techs.getTech(tid);
    const card = el('div', 'tech-card');
    const name = el('div', 'tech-name', def.name);
    const desc = el('div', 'tech-desc', def.description || '');
    const cost = el('div', 'tech-cost', '');
    const btn = el('button', 'btn', '研发');
    btn.type = 'button';
    btn.dataset.tech = tid;
    btn.onclick = () => {
      const r = Techs.buyTech(tid);
      if (!r.ok) showToast(r.reason || '无法研发');
      markDirty();
    };
    card.append(name, desc, cost, btn);
    techGrid.append(card);
  }
  techPanel.append(techGrid);
  viewTechs.append(techPanel);
  refs.techGrid = techGrid;

  // 扩张视图
  const viewExpand = el('div', 'view');
  const expPanel = el('div', 'panel prestige-panel');
  expPanel.append(el('div', 'panel-title', '宇宙吞噬'));
  const massBig = el('div', 'prestige-big num', '0');
  const progress = el('div', 'progress');
  const progressFill = el('div', 'progress-fill');
  progressFill.style.width = '0%';
  progress.append(progressFill);
  const progressLabel = el('div', 'progress-label');
  const labelRight = el('span', 'num', '0');
  progressLabel.append(el('span', '', '质能触顶进度'), labelRight);
  const status = el('div', '', '尚未触顶');
  const crystalInfo = el('div', '', '时间晶体：--');
  const prestigeBtn = el('button', 'btn btn-primary', '撕开裂缝（时空穿梭）');
  prestigeBtn.type = 'button';
  prestigeBtn.disabled = true;
  prestigeBtn.onclick = () => {
    const r = Prestige.prestige();
    if (!r.ok) showToast(r.reason || '无法穿梭');
    else showToast(`时空穿梭完成：+${Num.toString(r.crystals)} 时间晶体`);
    markDirty();
  };
  expPanel.append(massBig, progress, progressLabel, status, crystalInfo, prestigeBtn);
  viewExpand.append(expPanel);
  refs.massBig = massBig;
  refs.progressFill = progressFill;
  refs.labelRight = labelRight;
  refs.status = status;
  refs.crystalInfo = crystalInfo;
  refs.prestigeBtn = prestigeBtn;

  viewContainer.append(viewRes, viewTechs, viewExpand);

  // ---- 任务栏 ----
  const taskbar = el('div', 'taskbar');
  const btnRes = el('button', 'task-btn active', '资源');
  const btnTech = el('button', 'task-btn', '研发');
  const btnExpand = el('button', 'task-btn', '扩张');
  btnRes.onclick = () => switchView('resources');
  btnTech.onclick = () => switchView('techs');
  btnExpand.onclick = () => switchView('expand');
  refs.taskBtns = { resources: btnRes, techs: btnTech, expand: btnExpand };
  const spacer = el('div', 'taskbar-spacer');
  const saveBtn = el('button', 'task-btn', '存档');
  saveBtn.onclick = () => Events.emit('save:request');
  const exportBtn = el('button', 'task-btn', '导出');
  exportBtn.onclick = () => Events.emit('export:request');
  taskbar.append(btnRes, btnTech, btnExpand, spacer, saveBtn, exportBtn);

  const toast = el('div', 'toast');
  refs.toast = toast;

  shell.append(titlebar, viewContainer, taskbar, toast);
  app.append(shell);
  refs.views = { resources: viewRes, techs: viewTechs, expand: viewExpand };
}

function bindEvents() {
  Events.on('tick', () => markDirty());
  Events.on('resources:changed', () => markDirty());
  Events.on('resources:tick', () => markDirty());
  Events.on('generators:changed', () => markDirty());
  Events.on('tech:owned', () => markDirty());
  Events.on('prestige:done', () => markDirty());
  Events.on('prestige:ready', () => markDirty());
  Events.on('ui:toast', (p) => showToast(p?.text));
}

function switchView(name) {
  currentView = name;
  for (const [k, v] of Object.entries(refs.views)) v.classList.toggle('active', k === name);
  for (const [k, b] of Object.entries(refs.taskBtns)) b.classList.toggle('active', k === name);
}

function showToast(text) {
  if (!refs.toast || !text) return;
  refs.toast.textContent = text;
  refs.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove('show'), 2200);
}

function markDirty() {
  if (dirty) return;
  dirty = true;
  if (!rafId) rafId = requestAnimationFrame(render);
}

function render() {
  dirty = false;
  rafId = 0;
  updateTitlebar();
  updateResources();
  updateGenerators();
  updateTechs();
  updateExpand();
}

function updateTitlebar() {
  const t = Time.formatGameTime();
  refs.timeText.textContent = t.text;
  const rateMult = Num.div(Time.getRate(), Time.getBaseRate());
  refs.rateText.textContent = `速率 ×${Num.format(rateMult)}`;
  refs.weekText.textContent = `周目 ${Prestige.getPrestigeCount() + 1}`;
}

function updateResources() {
  for (const valueEl of refs.resList.querySelectorAll('.res-value')) {
    const amount = Resources.getResource(valueEl.dataset.res);
    valueEl.textContent = amount ? Num.format(amount) : '0';
  }
}

function updateGenerators() {
  for (const card of refs.genList.querySelectorAll('.gen-card')) {
    const btn = card.querySelector('.btn');
    const gid = btn.dataset.gen;
    const def = Resources.getGeneratorDef(gid);
    const count = Resources.getGenerator(gid);
    const cost = Resources.buyCost(gid, 1);
    const currency = Resources.getResource(def.costCurrency);
    const afford = currency !== null && Num.gte(currency, cost);
    card.querySelector('.gen-count').textContent = count ? Num.format(count) : '0';
    btn.textContent = `×1 · ${Num.format(cost)} ${Resources.getResourceDef(def.costCurrency).name}`;
    btn.disabled = !afford;
  }
}

function updateTechs() {
  for (const card of refs.techGrid.querySelectorAll('.tech-card')) {
    const btn = card.querySelector('.btn');
    const tid = btn.dataset.tech;
    const def = Techs.getTech(tid);
    const owned = Techs.isOwned(tid);
    card.classList.toggle('owned', owned);
    card.querySelector('.tech-cost').textContent =
      `成本：${Num.format(Num.parse(def.cost))} ${Resources.getResourceDef(def.costCurrency)?.name ?? ''}`;
    if (owned) {
      btn.textContent = '已研发';
      btn.disabled = true;
    } else {
      btn.textContent = '研发';
      btn.disabled = !Techs.canBuy(tid);
    }
  }
}

function updateExpand() {
  const mass = Resources.getResource('mass_energy') ?? Num.parse(0);
  const cap = Prestige.getUniverseCap();
  refs.massBig.textContent = `${Num.format(mass)} J`;
  // log 尺度进度（数值跨 70 个数量级，线性条不可读）
  const ratio = Num.div(Num.log10(Num.add(mass, 1)), Num.parse(70));
  const pct = Math.min(100, Num.toNumber(Num.mul(ratio, 100)));
  refs.progressFill.style.width = `${pct.toFixed(1)}%`;
  refs.labelRight.textContent = `${Num.format(mass)} / ${Num.format(cap)} J`;
  const ready = Prestige.canPrestige();
  refs.status.textContent = ready ? '宇宙质能已耗尽，可撕开因果闭环的裂缝' : '尚未触顶';
  refs.prestigeBtn.disabled = !ready;
  refs.crystalInfo.textContent = `时间晶体：${Num.format(Prestige.getTimeCrystals())}`;
}
