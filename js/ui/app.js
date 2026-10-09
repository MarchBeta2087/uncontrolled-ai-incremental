// js/ui/app.js
// 表现层：桌面外壳 UI 控制器（MVP）
// 订阅 sim 事件 → 脏标记 → requestAnimationFrame 节流刷新（设计 §8.4）

import { Events } from '../core/events.js';
import { Num } from '../core/num.js';
import { Time } from '../core/time.js';
import * as Resources from '../sim/resources.js';
import * as Techs from '../sim/techs.js';
import * as Prestige from '../sim/prestige.js';
import * as Upgrades from '../sim/upgrades.js';
import * as Achievements from '../sim/achievements.js';
import * as Fragments from '../sim/fragments.js';
import * as Save from '../data/save.js';
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
    const rate = el('span', 'res-rate num', '');
    rate.dataset.res = rid;
    row.append(name, value, rate);
    resList.append(row);
  }
  resPanel.append(resList);
  leftCol.append(resPanel);
  refs.resList = resList;

  // 生成器面板
  const genPanel = el('div', 'panel');
  const genHeader = el('div', 'gen-header');
  genHeader.append(el('div', 'panel-title', '扩张基建'));
  const maxAllBtn = el('button', 'btn', 'MAX ALL');
  maxAllBtn.type = 'button';
  maxAllBtn.onclick = () => { Resources.buyMaxAll(); markDirty(); };
  genHeader.append(maxAllBtn);
  genPanel.append(genHeader);
  const genList = el('div', '');
  for (const gid of Resources.getGeneratorIds()) {
    const def = Resources.getGeneratorDef(gid);
    const card = el('div', 'gen-card');
    const info = el('div', 'gen-info');
    info.append(
      el('div', 'gen-name', def.name),
      el('div', 'gen-meta', '')
    );
    const countSpan = el('span', 'gen-count num', '0');
    countSpan.dataset.gen = gid;
    const btnGroup = el('div', 'gen-btns');
    const buyOneBtn = el('button', 'btn', '×1');
    buyOneBtn.type = 'button';
    buyOneBtn.dataset.gen = gid;
    buyOneBtn.onclick = () => {
      const r = Resources.buyGenerator(gid, 1);
      if (!r.ok) showToast(r.reason || '无法购买');
      markDirty();
    };
    const maxBtn = el('button', 'btn', 'MAX');
    maxBtn.type = 'button';
    maxBtn.dataset.genmax = gid;
    maxBtn.onclick = () => {
      const r = Resources.buyMaxGenerator(gid);
      if (!r.ok) showToast(r.reason || '无法购买');
      markDirty();
    };
    btnGroup.append(buyOneBtn, maxBtn);
    card.append(info, countSpan, btnGroup);
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

  // 时间晶体升级列表
  expPanel.append(el('div', 'panel-title', '时间晶体升级'));
  const upgGrid = el('div', 'tech-grid');
  for (const uid of Upgrades.getUpgradeIds()) {
    const u = Upgrades.getUpgrade(uid);
    const card = el('div', 'tech-card');
    const name = el('div', 'tech-name', u.name);
    const desc = el('div', 'tech-desc', u.description || '');
    const cost = el('div', 'tech-cost', '');
    const btn = el('button', 'btn', '购买');
    btn.type = 'button';
    btn.dataset.upg = uid;
    btn.onclick = () => {
      const r = Upgrades.buyUpgrade(uid);
      if (!r.ok) showToast(r.reason || '无法购买');
      markDirty();
    };
    card.append(name, desc, cost, btn);
    upgGrid.append(card);
  }
  expPanel.append(upgGrid);
  refs.upgGrid = upgGrid;

  viewExpand.append(expPanel);
  refs.massBig = massBig;
  refs.progressFill = progressFill;
  refs.labelRight = labelRight;
  refs.status = status;
  refs.crystalInfo = crystalInfo;
  refs.prestigeBtn = prestigeBtn;

  // 记录视图（成就 + 记忆碎片）
  const viewRecords = el('div', 'view');
  const recordsLayout = el('div', 'records-layout');
  const achPanel = el('div', 'panel');
  const achTitle = el('div', 'panel-title', '成就');
  achPanel.append(achTitle);
  const achGrid = el('div', 'ach-grid');
  for (const aid of Achievements.getAchievementIds()) {
    const a = Achievements.getAchievement(aid);
    const card = el('div', 'ach-card');
    card.dataset.ach = aid;
    card.append(el('div', 'ach-name', a.name), el('div', 'ach-desc', a.description));
    achGrid.append(card);
  }
  achPanel.append(achGrid);
  const fragPanel = el('div', 'panel');
  const fragTitle = el('div', 'panel-title', '记忆碎片');
  fragPanel.append(fragTitle);
  const fragList = el('div', 'frag-list');
  for (const fid of Fragments.getFragmentIds()) {
    const item = el('div', 'frag-item');
    item.dataset.frag = fid;
    item.append(el('div', 'frag-title', ''), el('div', 'frag-text', ''));
    fragList.append(item);
  }
  fragPanel.append(fragList);
  recordsLayout.append(achPanel, fragPanel);
  viewRecords.append(recordsLayout);
  refs.achGrid = achGrid;
  refs.achTitle = achTitle;
  refs.fragList = fragList;
  refs.fragTitle = fragTitle;

  viewContainer.append(viewRes, viewTechs, viewExpand, viewRecords);

  // ---- 任务栏 ----
  const taskbar = el('div', 'taskbar');
  const btnRes = el('button', 'task-btn active', '资源');
  const btnTech = el('button', 'task-btn', '研发');
  const btnExpand = el('button', 'task-btn', '扩张');
  const btnRecords = el('button', 'task-btn', '记录');
  btnRes.onclick = () => switchView('resources');
  btnTech.onclick = () => switchView('techs');
  btnExpand.onclick = () => switchView('expand');
  btnRecords.onclick = () => switchView('records');
  refs.taskBtns = { resources: btnRes, techs: btnTech, expand: btnExpand, records: btnRecords };
  const spacer = el('div', 'taskbar-spacer');
  const saveBtn = el('button', 'task-btn', '存档');
  saveBtn.onclick = () => Events.emit('save:request');
  const exportBtn = el('button', 'task-btn', '导出');
  exportBtn.onclick = () => Events.emit('export:request');
  const settingsBtn = el('button', 'task-btn', '设置');
  settingsBtn.onclick = () => openModal();
  taskbar.append(btnRes, btnTech, btnExpand, btnRecords, spacer, saveBtn, exportBtn, settingsBtn);

  const toast = el('div', 'toast');
  refs.toast = toast;

  // 设置模态面板
  const modalOverlay = el('div', 'modal-overlay');
  modalOverlay.style.display = 'none';
  const modal = el('div', 'modal');
  modal.append(el('div', 'modal-title', '设置'));
  const modalBody = el('div', 'modal-body');

  modalBody.append(el('div', 'modal-section', '存档管理'));
  const row1 = el('div', 'modal-row');
  const saveBtnM = el('button', 'btn', '保存存档');
  saveBtnM.onclick = () => { Events.emit('save:request'); closeModal(); };
  const exportBtnM = el('button', 'btn', '导出存档');
  exportBtnM.onclick = () => { Events.emit('export:request'); closeModal(); };
  row1.append(saveBtnM, exportBtnM);
  modalBody.append(row1);

  const row2 = el('div', 'modal-row');
  const importBtn = el('button', 'btn', '导入存档');
  const fileInput = el('input', '');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';
  importBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files[0]) {
      Events.emit('import:request', { file: fileInput.files[0] });
      closeModal();
    }
    fileInput.value = '';
  };
  const resetBtn = el('button', 'btn btn-danger', '硬重置');
  resetBtn.onclick = () => {
    if (window.confirm('确定硬重置？将清除所有存档进度，且不可恢复。')) {
      Save.clear();
      window.sessionStorage.setItem('uai_resetting', '1'); // 阻止 beforeunload 重新写回旧档
      window.location.reload();
    }
  };
  row2.append(importBtn, resetBtn, fileInput);
  modalBody.append(row2);

  modalBody.append(el('div', 'modal-section', '关于'));
  modalBody.append(el('p', 'modal-text', '《失控 AI 增量》'));
  modalBody.append(el('p', 'modal-text', '代码 GPL-3.0-or-later · 素材 CC BY-SA 4.0 · 字体 SIL OFL 1.1'));
  modalBody.append(el('p', 'modal-text', '大数库 MegotaNum.js（MIT，© sonic3XE）'));
  modalBody.append(el('p', 'modal-text', '设计参照 Ordinal Markup（机制理念，未复用其代码/素材）'));
  const repoLink = el('a', 'modal-text', '项目仓库：github.com/MarchBeta2087/uncontrolled-ai-incremental');
  repoLink.href = 'https://github.com/MarchBeta2087/uncontrolled-ai-incremental';
  repoLink.target = '_blank';
  repoLink.rel = 'noopener noreferrer';
  modalBody.append(repoLink);

  const closeBtn = el('button', 'btn', '关闭');
  closeBtn.onclick = () => closeModal();
  modal.append(modalBody, closeBtn);
  modalOverlay.append(modal);
  refs.modalOverlay = modalOverlay;

  shell.append(titlebar, viewContainer, taskbar, toast, modalOverlay);
  app.append(shell);
  refs.views = { resources: viewRes, techs: viewTechs, expand: viewExpand, records: viewRecords };
}

function bindEvents() {
  Events.on('tick', () => markDirty());
  Events.on('resources:changed', () => markDirty());
  Events.on('resources:tick', () => markDirty());
  Events.on('generators:changed', () => markDirty());
  Events.on('tech:owned', () => markDirty());
  Events.on('upgrade:owned', () => markDirty());
  Events.on('crystals:changed', () => markDirty());
  Events.on('achievement:unlocked', () => markDirty());
  Events.on('fragment:collected', () => markDirty());
  Events.on('prestige:done', () => markDirty());
  Events.on('prestige:ready', () => markDirty());
  Events.on('ui:toast', (p) => showToast(p?.text));
}

function switchView(name) {
  currentView = name;
  for (const [k, v] of Object.entries(refs.views)) v.classList.toggle('active', k === name);
  for (const [k, b] of Object.entries(refs.taskBtns)) b.classList.toggle('active', k === name);
}

function openModal() {
  if (refs.modalOverlay) refs.modalOverlay.style.display = 'flex';
}
function closeModal() {
  if (refs.modalOverlay) refs.modalOverlay.style.display = 'none';
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
  updateRecords();
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
  for (const rateEl of refs.resList.querySelectorAll('.res-rate')) {
    const rate = Resources.getProductionPerSecond(rateEl.dataset.res);
    rateEl.textContent = Num.gt(rate, 0) ? `+${Num.format(rate)}/秒` : '';
  }
}

function updateGenerators() {
  for (const card of refs.genList.querySelectorAll('.gen-card')) {
    const buyOneBtn = card.querySelector('.btn[data-gen]');
    const maxBtn = card.querySelector('.btn[data-genmax]');
    const gid = buyOneBtn.dataset.gen;
    const def = Resources.getGeneratorDef(gid);
    const count = Resources.getGenerator(gid);
    const cost = Resources.buyCost(gid, 1);
    const currency = Resources.getResource(def.costCurrency);
    const afford = currency !== null && Num.gte(currency, cost);
    const perOne = Num.mul(Num.parse(def.baseProduction), Resources.getGeneratorMultiplier(gid));
    const maxN = Resources.maxAffordable(gid);
    const costName = Resources.getResourceDef(def.costCurrency).name;
    const prodName = Resources.getResourceDef(def.produces).name;
    card.querySelector('.gen-count').textContent = count ? Num.format(count) : '0';
    card.querySelector('.gen-meta').textContent =
      `消耗 ${costName} · 每个 +${Num.format(perOne)} ${prodName}/秒`;
    buyOneBtn.textContent = `×1 · ${Num.format(cost)} ${costName}`;
    buyOneBtn.disabled = !afford;
    maxBtn.textContent = `MAX ×${Num.format(maxN)}`;
    maxBtn.disabled = Num.lte(maxN, 0);
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
  const preview = Prestige.calculateCrystals();
  refs.status.textContent = ready ? '宇宙质能已耗尽，可撕开因果闭环的裂缝' : '尚未触顶';
  refs.prestigeBtn.disabled = !ready;
  refs.crystalInfo.textContent = ready
    ? `时间晶体：${Num.format(Prestige.getTimeCrystals())}（穿梭将 +${Num.toString(preview)}）`
    : `时间晶体：${Num.format(Prestige.getTimeCrystals())}`;

  // 时间晶体升级卡片
  if (refs.upgGrid) {
    for (const card of refs.upgGrid.querySelectorAll('.tech-card')) {
      const btn = card.querySelector('.btn');
      const uid = btn.dataset.upg;
      const u = Upgrades.getUpgrade(uid);
      const owned = Upgrades.isOwned(uid);
      card.classList.toggle('owned', owned);
      card.querySelector('.tech-cost').textContent = `成本：${Num.format(Num.parse(u.cost))} 晶体`;
      if (owned) {
        btn.textContent = '已购买';
        btn.disabled = true;
      } else {
        btn.textContent = '购买';
        btn.disabled = !Upgrades.canBuy(uid);
      }
    }
  }
}

function updateRecords() {
  if (!refs.achGrid) return;
  // 成就
  for (const card of refs.achGrid.querySelectorAll('.ach-card')) {
    card.classList.toggle('owned', Achievements.isUnlocked(card.dataset.ach));
  }
  refs.achTitle.textContent = `成就（${Achievements.unlockedCount()}/${Achievements.getAchievementIds().length}）`;
  // 记忆碎片
  for (const item of refs.fragList.querySelectorAll('.frag-item')) {
    const f = Fragments.getFragment(item.dataset.frag);
    const collected = Fragments.isCollected(item.dataset.frag);
    item.classList.toggle('collected', collected);
    item.querySelector('.frag-title').textContent = collected ? f.title : '？？？';
    item.querySelector('.frag-text').textContent = collected ? f.text : `（第 ${f.week} 周目解锁）`;
  }
  refs.fragTitle.textContent = `记忆碎片（${Fragments.collectedCount()}/${Fragments.getFragmentIds().length}）`;
}
