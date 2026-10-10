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
import * as Challenges from '../sim/challenges.js';
import * as Save from '../data/save.js';
import { platformClass } from './platform.js';
import { THEMES, getTheme, setTheme, getAccent, setAccent } from './theme.js';
import { t, tc, setLocale, getLocale, getLocales, isAvailable } from '../i18n/index.js';

const VERSION = '0.4.0';

const refs = {};
let dirty = false;
let rafId = 0;
let currentView = 'resources';
let toastTimer = 0;

export function initUI() {
  document.body.classList.add(platformClass());
  if (Prestige.isPhase2Unlocked()) document.body.classList.add('phase2');
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
  tl.append(el('span', 'titlebar-dot', '●'), el('span', '', t('app.title')));
  const tr = el('div', 'titlebar-right');
  const timeLine = el('div', 'titlebar-time');
  const timeSpan = el('span', 'num', '--');
  timeLine.append(el('span', '', t('titlebar.time')), timeSpan);
  const metaLine = el('div', 'titlebar-meta');
  const rateSpan = el('span', '', t('titlebar.rate', { rate: 1 }));
  const weekSpan = el('span', '', t('titlebar.week', { n: 1 }));
  metaLine.append(rateSpan, weekSpan);
  tr.append(timeLine, metaLine);
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

  const clickBtn = el('button', 'click-btn', t('res.click'));
  clickBtn.type = 'button';
  clickBtn.onclick = () => { Resources.click(); markDirty(); };
  leftCol.append(clickBtn);
  refs.clickBtn = clickBtn;

  const resPanel = el('div', 'panel');
  resPanel.append(el('div', 'panel-title', t('res.panel')));
  const resList = el('div', '');
  for (const rid of Resources.getAllResourceIds()) {
    const def = Resources.getResourceDef(rid);
    const row = el('div', 'res-row');
    if (def.phase === 2) row.dataset.phase = '2';
    const name = el('span', 'res-name', tc('resource', rid, 'name', def.name));
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
  genHeader.append(el('div', 'panel-title', t('gen.panel')));
  const maxAllBtn = el('button', 'btn', t('gen.maxAll'));
  maxAllBtn.type = 'button';
  maxAllBtn.onclick = () => { Resources.buyMaxAll(); markDirty(); };
  genHeader.append(maxAllBtn);
  genPanel.append(genHeader);
  const genList = el('div', '');
  for (const gid of Resources.getAllGeneratorIds()) {
    const def = Resources.getGeneratorDef(gid);
    const card = el('div', 'gen-card');
    if (def.phase === 2) card.dataset.phase = '2';
    const info = el('div', 'gen-info');
    info.append(
      el('div', 'gen-name', tc('generator', gid, 'name', def.name)),
      el('div', 'gen-meta', '')
    );
    const countSpan = el('span', 'gen-count num', '0');
    countSpan.dataset.gen = gid;
    const btnGroup = el('div', 'gen-btns');
    const buyOneBtn = el('button', 'btn', t('gen.buyOne'));
    buyOneBtn.type = 'button';
    buyOneBtn.dataset.gen = gid;
    buyOneBtn.onclick = () => {
      const r = Resources.buyGenerator(gid, 1);
      if (!r.ok) showToast(r.reason || t('toast.cannotBuy'));
      markDirty();
    };
    const maxBtn = el('button', 'btn', t('gen.max'));
    maxBtn.type = 'button';
    maxBtn.dataset.genmax = gid;
    maxBtn.onclick = () => {
      const r = Resources.buyMaxGenerator(gid);
      if (!r.ok) showToast(r.reason || t('toast.cannotBuy'));
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
  techPanel.append(el('div', 'panel-title', t('tech.panel')));
  const techWrap = el('div', '');
  const p1Heading = el('div', 'phase-heading', t('tech.phase1'));
  const p1Grid = el('div', 'tech-grid');
  const p2Lock = el('div', 'phase-lock', t('tech.phase2LockNotice', { n: Num.format(Prestige.getPhase2UnlockCrystals()) }));
  const p2Heading = el('div', 'phase-heading', t('tech.phase2'));
  p2Heading.dataset.phase = '2';
  const p2Grid = el('div', 'tech-grid');
  p2Grid.dataset.phase = '2';
  for (const tid of Techs.getTechIds()) {
    const def = Techs.getTech(tid);
    const card = el('div', 'tech-card');
    if (def.phase === 2) card.dataset.phase = '2';
    const name = el('div', 'tech-name', tc('tech', tid, 'name', def.name));
    const desc = el('div', 'tech-desc', tc('tech', tid, 'description', def.description || ''));
    const cost = el('div', 'tech-cost', '');
    const btn = el('button', 'btn', t('tech.buy'));
    btn.type = 'button';
    btn.dataset.tech = tid;
    btn.onclick = () => {
      const r = Techs.buyTech(tid);
      if (!r.ok) showToast(r.reason || t('toast.cannotResearch'));
      markDirty();
    };
    card.append(name, desc, cost, btn);
    (def.phase === 2 ? p2Grid : p1Grid).append(card);
  }
  techWrap.append(p1Heading, p1Grid, p2Lock, p2Heading, p2Grid);
  techPanel.append(techWrap);
  viewTechs.append(techPanel);
  refs.techGrid = techWrap;

  // 扩张视图
  const viewExpand = el('div', 'view');
  const expPanel = el('div', 'panel prestige-panel');
  expPanel.append(el('div', 'panel-title', t('expand.panel')));
  const massBig = el('div', 'prestige-big num', '0');
  const progress = el('div', 'progress');
  const progressFill = el('div', 'progress-fill');
  progressFill.style.width = '0%';
  progress.append(progressFill);
  const progressLabel = el('div', 'progress-label');
  const labelRight = el('span', 'num', '0');
  progressLabel.append(el('span', '', t('expand.progress')), labelRight);
  const status = el('div', '', t('expand.notReady'));
  const crystalInfo = el('div', '', t('expand.crystals', { n: '--', total: '--' }));
  const prestigeBtn = el('button', 'btn btn-primary', t('expand.prestigeBtn'));
  prestigeBtn.type = 'button';
  prestigeBtn.disabled = true;
  prestigeBtn.onclick = () => {
    const r = Prestige.prestige();
    if (!r.ok) showToast(r.reason || t('toast.cannotPrestige'));
    else showToast(t('expand.prestigeDone', { crystals: Num.toString(r.crystals) }));
    markDirty();
  };
  expPanel.append(massBig, progress, progressLabel, status, crystalInfo, prestigeBtn);

  // 时间晶体升级列表
  const upgTitle = el('div', 'panel-title', t('expand.upgrades'));
  expPanel.append(upgTitle);
  refs.upgTitle = upgTitle;
  const upgGrid = el('div', 'tech-grid');
  for (const uid of Upgrades.getUpgradeIds()) {
    const u = Upgrades.getUpgrade(uid);
    const card = el('div', 'tech-card');
    if (u.phase === 2) card.dataset.phase = '2';
    const name = el('div', 'tech-name', tc('upgrade', uid, 'name', u.name));
    const desc = el('div', 'tech-desc', tc('upgrade', uid, 'description', u.description || ''));
    const cost = el('div', 'tech-cost', '');
    const btn = el('button', 'btn', t('expand.upgradeBuy'));
    btn.type = 'button';
    btn.dataset.upg = uid;
    btn.onclick = () => {
      const r = Upgrades.buyUpgrade(uid);
      if (!r.ok) showToast(r.reason || t('toast.cannotBuy'));
      markDirty();
    };
    card.append(name, desc, cost, btn);
    upgGrid.append(card);
  }
  expPanel.append(upgGrid);
  refs.upgGrid = upgGrid;

  // 挑战列表
  expPanel.append(el('div', 'panel-title', t('expand.challenges')));
  const chGrid = el('div', 'tech-grid');
  for (const cid of Challenges.getChallengeIds()) {
    const c = Challenges.getChallenge(cid);
    const card = el('div', 'tech-card');
    card.dataset.ch = cid;
    card.append(el('div', 'tech-name', tc('challenge', cid, 'name', c.name)));
    card.append(el('div', 'tech-desc', tc('challenge', cid, 'description', c.description)));
    const goalsList = el('div', 'ch-goals');
    const goalRewards = tc('challenge', cid, 'goals', null);
    for (let i = 0; i < (c.goals?.length ?? 0); i++) {
      const g = c.goals[i];
      const row = el('div', 'ch-goal');
      row.dataset.goal = i;
      row.append(
        el('span', 'ch-goal-target', t('expand.goalTarget', { i: i + 1, target: g.target })),
        el('span', 'ch-goal-reward', goalRewards?.[i] ?? g.rewardDescription)
      );
      goalsList.append(row);
    }
    card.append(goalsList);
    const progress = el('div', 'tech-cost', '');
    card.append(progress);
    const btn = el('button', 'btn', '');
    btn.type = 'button';
    btn.dataset.ch = cid;
    btn.onclick = () => {
      if (Challenges.getActiveChallenge() === cid) {
        Challenges.exitChallenge();
        showToast(t('toast.challengeExit'));
      } else {
        const r = Challenges.startChallenge(cid);
        if (!r.ok) showToast(r.reason || t('toast.cannotEnterChallenge'));
        else showToast(t('toast.challengeEntered', { name: tc('challenge', cid, 'name', c.name) }));
      }
      renderNow();
    };
    card.append(btn);
    chGrid.append(card);
  }
  expPanel.append(chGrid);
  refs.chGrid = chGrid;

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
  const achTitle = el('div', 'panel-title', t('records.achievements'));
  achPanel.append(achTitle);
  const achGrid = el('div', 'ach-grid');
  for (const aid of Achievements.getAchievementIds()) {
    const a = Achievements.getAchievement(aid);
    const card = el('div', 'ach-card');
    card.dataset.ach = aid;
    card.append(
      el('div', 'ach-name', tc('achievement', aid, 'name', a.name)),
      el('div', 'ach-desc', tc('achievement', aid, 'description', a.description))
    );
    achGrid.append(card);
  }
  achPanel.append(achGrid);
  const fragPanel = el('div', 'panel');
  const fragTitle = el('div', 'panel-title', t('records.fragments'));
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

  // 终局视图（第二阶段技术全部研发后，由任务栏按钮进入）
  const viewEndgame = el('div', 'view');
  const egPanel = el('div', 'panel');
  egPanel.append(el('div', 'panel-title', t('nav.endgame')));
  egPanel.append(el('p', 'endgame-title', t('endgame.title')));
  egPanel.append(el('p', 'modal-text', t('endgame.comingSoon')));
  egPanel.append(el('p', 'modal-text', t('endgame.license')));
  egPanel.append(el('p', 'modal-text', t('endgame.contribute')));
  const egRepo = el('a', 'modal-text', t('endgame.repo'));
  egRepo.href = 'https://github.com/MarchBeta2087/uncontrolled-ai-incremental';
  egRepo.target = '_blank';
  egRepo.rel = 'noopener noreferrer';
  egPanel.append(egRepo);
  viewEndgame.append(egPanel);

  viewContainer.append(viewRes, viewTechs, viewExpand, viewRecords, viewEndgame);

  // ---- 任务栏 ----
  const taskbar = el('div', 'taskbar');
  const btnRes = el('button', 'task-btn active', t('nav.resources'));
  const btnTech = el('button', 'task-btn', t('nav.techs'));
  const btnExpand = el('button', 'task-btn', t('nav.expand'));
  const btnRecords = el('button', 'task-btn', t('nav.records'));
  const btnEndgame = el('button', 'task-btn', t('nav.endgame'));
  btnRes.onclick = () => switchView('resources');
  btnTech.onclick = () => switchView('techs');
  btnExpand.onclick = () => switchView('expand');
  btnRecords.onclick = () => switchView('records');
  btnEndgame.onclick = () => switchView('endgame');
  refs.endgameReady = Techs.allPhase2Researched();
  btnEndgame.hidden = !refs.endgameReady;
  refs.endgameBtn = btnEndgame;
  refs.taskBtns = { resources: btnRes, techs: btnTech, expand: btnExpand, records: btnRecords, endgame: btnEndgame };
  const spacer = el('div', 'taskbar-spacer');
  const saveBtn = el('button', 'task-btn', t('nav.save'));
  saveBtn.onclick = () => Events.emit('save:request');
  const exportBtn = el('button', 'task-btn', t('nav.export'));
  exportBtn.onclick = () => Events.emit('export:request');
  const settingsBtn = el('button', 'task-btn', t('nav.settings'));
  settingsBtn.onclick = () => openModal();
  taskbar.append(btnRes, btnTech, btnExpand, btnRecords, btnEndgame, spacer, saveBtn, exportBtn, settingsBtn);

  const toast = el('div', 'toast');
  refs.toast = toast;

  // 设置模态面板
  const modalOverlay = el('div', 'modal-overlay');
  modalOverlay.style.display = 'none';
  const modal = el('div', 'modal');
  modal.append(el('div', 'modal-title', t('settings.title')));
  const modalBody = el('div', 'modal-body');

  modalBody.append(el('div', 'modal-section', t('settings.saveSection')));
  const row1 = el('div', 'modal-row');
  const saveBtnM = el('button', 'btn', t('settings.save'));
  saveBtnM.onclick = () => { Events.emit('save:request'); closeModal(); };
  const exportBtnM = el('button', 'btn', t('settings.export'));
  exportBtnM.onclick = () => { Events.emit('export:request'); closeModal(); };
  row1.append(saveBtnM, exportBtnM);
  modalBody.append(row1);

  const row2 = el('div', 'modal-row');
  const importBtn = el('button', 'btn', t('settings.import'));
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
  const resetBtn = el('button', 'btn btn-danger', t('settings.reset'));
  resetBtn.onclick = () => {
    if (window.confirm(t('settings.resetConfirm'))) {
      Save.clear();
      window.sessionStorage.setItem('uai_resetting', '1'); // 阻止 beforeunload 重新写回旧档
      window.location.reload();
    }
  };
  row2.append(importBtn, resetBtn, fileInput);
  modalBody.append(row2);

  // 语言选择（仅 zh-CN 已实装，其余为待办）
  modalBody.append(el('div', 'modal-section', t('settings.languageSection')));
  const langRow = el('div', 'modal-row');
  for (const loc of getLocales()) {
    const langBtn = el('button', 'btn', loc.name);
    langBtn.type = 'button';
    if (isAvailable(loc.code)) {
      if (loc.code === getLocale()) langBtn.classList.add('btn-primary');
      langBtn.onclick = () => {
        if (setLocale(loc.code)) window.location.reload();
      };
    } else {
      langBtn.disabled = true;
      langBtn.title = t('settings.languageTodo');
    }
    langRow.append(langBtn);
  }
  modalBody.append(langRow);

  // 配色主题
  modalBody.append(el('div', 'modal-section', t('settings.themeSection')));
  const themeRow = el('div', 'modal-row');
  const themeBtns = {};
  for (const id of THEMES) {
    const themeBtn = el('button', 'btn', t('theme.' + id));
    themeBtn.type = 'button';
    if (id === getTheme()) themeBtn.classList.add('btn-primary');
    themeBtn.onclick = () => {
      setTheme(id);
      for (const [tid, b] of Object.entries(themeBtns)) b.classList.toggle('btn-primary', tid === id);
    };
    themeBtns[id] = themeBtn;
    themeRow.append(themeBtn);
  }
  modalBody.append(themeRow);

  const accentRow = el('div', 'modal-row');
  accentRow.append(el('span', 'modal-text', t('settings.accent')));
  const accentInput = el('input', '');
  accentInput.type = 'color';
  accentInput.value = getAccent() || '#58a6ff';
  accentInput.oninput = () => setAccent(accentInput.value);
  const accentReset = el('button', 'btn', t('settings.accentReset'));
  accentReset.type = 'button';
  accentReset.onclick = () => { setAccent(''); accentInput.value = '#58a6ff'; };
  accentRow.append(accentInput, accentReset);
  modalBody.append(accentRow);

  modalBody.append(el('div', 'modal-section', t('settings.aboutSection')));
  modalBody.append(el('p', 'modal-text', t('settings.aboutGame')));
  modalBody.append(el('p', 'modal-text', t('settings.aboutVersion', { version: VERSION })));
  modalBody.append(el('p', 'modal-text', t('settings.aboutLicense')));
  modalBody.append(el('p', 'modal-text', t('settings.aboutNumLib')));
  modalBody.append(el('p', 'modal-text', t('settings.aboutOrdinal')));
  const repoLink = el('a', 'modal-text', t('settings.aboutRepo'));
  repoLink.href = 'https://github.com/MarchBeta2087/uncontrolled-ai-incremental';
  repoLink.target = '_blank';
  repoLink.rel = 'noopener noreferrer';
  modalBody.append(repoLink);

  const closeBtn = el('button', 'btn', t('settings.close'));
  closeBtn.onclick = () => closeModal();
  modal.append(modalBody, closeBtn);
  modalOverlay.append(modal);
  refs.modalOverlay = modalOverlay;

  // 离线收益报告模态
  const offlineOverlay = el('div', 'modal-overlay');
  offlineOverlay.style.display = 'none';
  const offlineModal = el('div', 'modal');
  offlineModal.append(el('div', 'modal-title', t('offline.title')));
  const offlineBody = el('div', 'modal-body');
  const offlineTime = el('p', 'modal-text', '');
  const offlineList = el('div', 'offline-list');
  offlineBody.append(offlineTime, offlineList);
  const offlineClose = el('button', 'btn', t('offline.close'));
  offlineClose.onclick = () => { offlineOverlay.style.display = 'none'; };
  offlineModal.append(offlineBody, offlineClose);
  offlineOverlay.append(offlineModal);
  refs.offlineOverlay = offlineOverlay;
  refs.offlineTime = offlineTime;
  refs.offlineList = offlineList;

  shell.append(titlebar, viewContainer, taskbar, toast, modalOverlay, offlineOverlay);
  app.append(shell);
  refs.views = { resources: viewRes, techs: viewTechs, expand: viewExpand, records: viewRecords, endgame: viewEndgame };
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
  Events.on('challenge:started', () => markDirty());
  Events.on('challenge:exited', () => markDirty());
  Events.on('challenge:completed', () => markDirty());
  Events.on('ui:offline-report', (report) => showOfflineReport(report));
  Events.on('prestige:done', () => markDirty());
  Events.on('prestige:ready', () => markDirty());
  Events.on('phase2:unlocked', () => {
    document.body.classList.add('phase2');
    showToast(t('toast.phase2Unlocked'));
    renderNow();
  });
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

function formatDuration(seconds) {
  const s = Math.floor(seconds);
  if (s < 1) return t('time.underSecond');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(t('time.hours', { n: h }));
  if (m > 0) parts.push(t('time.minutes', { n: m }));
  if (sec > 0 || parts.length === 0) parts.push(t('time.seconds', { n: sec }));
  return parts.join(' ');
}

function showOfflineReport(report) {
  if (!refs.offlineOverlay || !report) return;
  refs.offlineTime.textContent = t('offline.duration', { duration: formatDuration(report.offlineRealSeconds) });
  refs.offlineList.innerHTML = '';
  if (!report.gains || report.gains.length === 0) {
    refs.offlineList.append(el('p', 'modal-text', t('offline.empty')));
  } else {
    for (const g of report.gains) {
      const row = el('div', 'offline-row');
      row.append(el('span', '', g.name), el('span', 'num', `+${Num.format(g.gain)}`));
      refs.offlineList.append(row);
    }
  }
  refs.offlineOverlay.style.display = 'flex';
}

function markDirty() {
  if (dirty) return;
  dirty = true;
  if (!rafId) rafId = requestAnimationFrame(render);
}

/** 同步立即渲染（挑战按钮等关键交互用，确保状态即时反映） */
function renderNow() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  dirty = false;
  render();
}

function safeUpdate(fn, name) {
  try {
    fn();
  } catch (err) {
    console.error(`[UI] ${name} 渲染异常：`, err);
  }
}

function render() {
  dirty = false;
  rafId = 0;
  safeUpdate(updateTitlebar, 'updateTitlebar');
  safeUpdate(updateResources, 'updateResources');
  safeUpdate(updateGenerators, 'updateGenerators');
  safeUpdate(updateTechs, 'updateTechs');
  safeUpdate(updateExpand, 'updateExpand');
  safeUpdate(updateRecords, 'updateRecords');
  safeUpdate(updateEndgame, 'updateEndgame');
}

function updateEndgame() {
  if (refs.endgameReady || !Techs.allPhase2Researched()) return;
  refs.endgameReady = true;
  if (refs.endgameBtn) refs.endgameBtn.hidden = false;
  showToast(t('toast.endgameReached'));
  switchView('endgame');
}

function updateTitlebar() {
  const gt = Time.formatGameTime();
  refs.timeText.textContent = gt.text;
  const rateMult = Num.div(Time.getRate(), Time.getBaseRate());
  refs.rateText.textContent = t('titlebar.rate', { rate: Num.format(rateMult) });
  refs.weekText.textContent = t('titlebar.week', { n: Prestige.getPrestigeCount() + 1 });
}

function updateResources() {
  for (const valueEl of refs.resList.querySelectorAll('.res-value')) {
    const amount = Resources.getResource(valueEl.dataset.res);
    valueEl.textContent = amount ? Num.format(amount) : '0';
  }
  for (const rateEl of refs.resList.querySelectorAll('.res-rate')) {
    const rate = Resources.getProductionPerSecond(rateEl.dataset.res);
    rateEl.textContent = Num.gt(rate, 0) ? `+${Num.format(rate)}${t('unit.perSecond')}` : '';
  }
  if (refs.clickBtn) {
    const resName = tc('resource', 'funds', 'name', Resources.getResourceDef('funds')?.name) ?? t('res.panel');
    refs.clickBtn.textContent = t('res.clickWith', {
      amount: Num.format(Resources.getClickProduction()),
      name: resName,
    });
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
    const costName = tc('resource', def.costCurrency, 'name', Resources.getResourceDef(def.costCurrency).name);
    const prodName = tc('resource', def.produces, 'name', Resources.getResourceDef(def.produces).name);
    card.querySelector('.gen-count').textContent = count ? Num.format(count) : '0';
    card.querySelector('.gen-meta').textContent =
      t('gen.meta', { costName, perOne: Num.format(perOne), prodName });
    buyOneBtn.textContent = t('gen.buyCost', { cost: Num.format(cost), costName });
    buyOneBtn.disabled = !afford;
    maxBtn.textContent = t('gen.buyMax', { n: Num.format(maxN) });
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
      t('tech.cost', { cost: Num.format(Num.parse(def.cost)), currency: tc('resource', def.costCurrency, 'name', Resources.getResourceDef(def.costCurrency)?.name ?? '') });
    if (owned) {
      btn.textContent = t('tech.owned');
      btn.disabled = true;
    } else {
      btn.textContent = t('tech.buy');
      btn.disabled = !Techs.canBuy(tid);
    }
  }
}

function updateExpand() {
  const mass = Resources.getResource('mass_energy') ?? Num.parse(0);
  const cap = Prestige.getUniverseCap();
  refs.massBig.textContent = `${Num.format(mass)} J`;
  // log 尺度进度（数值跨 70 个数量级，线性条不可读）
  const capLog = Num.log10(Prestige.getUniverseCap());
  const ratio = Num.div(Num.log10(Num.add(mass, 1)), capLog);
  const pct = Math.min(100, Num.toNumber(Num.mul(ratio, 100)));
  refs.progressFill.style.width = `${pct.toFixed(1)}%`;
  refs.labelRight.textContent = `${Num.format(mass)} / ${Num.format(cap)} J`;
  const ready = Prestige.canPrestige();
  const preview = Prestige.calculateCrystals();
  refs.status.textContent = ready ? t('expand.ready') : t('expand.notReady');
  refs.prestigeBtn.disabled = !ready;
  const crystalsHeld = Num.format(Prestige.getTimeCrystals());
  const crystalsTotal = Num.format(Prestige.getTotalTimeCrystals());
  refs.crystalInfo.textContent = ready
    ? t('expand.crystalsPreview', { n: crystalsHeld, total: crystalsTotal, preview: Num.toString(preview) })
    : t('expand.crystals', { n: crystalsHeld, total: crystalsTotal });

  // 升级标题：挑战中显示削弱提示
  if (refs.upgTitle) {
    const active = Challenges.getActiveChallenge();
    if (active) {
      refs.upgTitle.textContent = t('expand.upgradesNerf', { nerf: Challenges.getNerf().toString() });
    } else {
      refs.upgTitle.textContent = t('expand.upgrades');
    }
  }

  // 时间晶体升级卡片
  if (refs.upgGrid) {
    const activeChallenge = Challenges.getActiveChallenge();
    for (const card of refs.upgGrid.querySelectorAll('.tech-card')) {
      const btn = card.querySelector('.btn');
      const uid = btn.dataset.upg;
      const u = Upgrades.getUpgrade(uid);
      const owned = Upgrades.isOwned(uid);
      card.classList.toggle('owned', owned);
      const costEl = card.querySelector('.tech-cost');
      if (owned) {
        btn.textContent = t('expand.upgradeOwned');
        btn.disabled = true;
        // 挑战中显示削弱后的实际效果（乘子 ^nerf）
        if (activeChallenge && u.effects?.length) {
          const e = u.effects[0];
          const nerfed = Num.pow(Num.parse(e.value), Challenges.getNerf());
          costEl.textContent = t('expand.upgradeEffectNerf', { value: e.value, nerfed: Num.format(nerfed, { decimals: 6 }) });
        } else {
          costEl.textContent = t('expand.upgradeCost', { cost: Num.format(Num.parse(u.cost)) });
        }
      } else {
        btn.textContent = t('expand.upgradeBuy');
        btn.disabled = !Upgrades.canBuy(uid);
        costEl.textContent = t('expand.upgradeCost', { cost: Num.format(Num.parse(u.cost)) });
      }
    }
  }

  // 挑战卡片
  if (refs.chGrid) {
    for (const card of refs.chGrid.querySelectorAll('.tech-card')) {
      const btn = card.querySelector('.btn');
      const cid = btn.dataset.ch;
      const done = Challenges.goalsDoneCount(cid);
      const total = Challenges.getGoalCount(cid);
      const completed = Challenges.isCompleted(cid);
      const active = Challenges.getActiveChallenge() === cid;
      card.classList.toggle('owned', completed);
      for (const row of card.querySelectorAll('.ch-goal')) {
        row.classList.toggle('done', Number(row.dataset.goal) < done);
      }
      card.querySelector('.tech-cost').textContent = t('expand.goalProgress', { done, total });
      if (completed) {
        btn.textContent = t('expand.challengeCompleted');
        btn.disabled = true;
      } else if (active) {
        btn.textContent = t('expand.challengeActive');
        btn.disabled = false;
      } else {
        btn.textContent = Challenges.canStart(cid) ? t('expand.challengeEnter') : t('expand.challengeLocked');
        btn.disabled = !Challenges.canStart(cid);
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
  refs.achTitle.textContent = t('records.achievementsCount', {
    n: Achievements.unlockedCount(),
    total: Achievements.getAchievementIds().length,
  });
  // 记忆碎片
  for (const item of refs.fragList.querySelectorAll('.frag-item')) {
    const f = Fragments.getFragment(item.dataset.frag);
    const collected = Fragments.isCollected(item.dataset.frag);
    item.classList.toggle('collected', collected);
    item.querySelector('.frag-title').textContent = collected ? tc('fragment', item.dataset.frag, 'title', f.title) : t('records.fragLocked');
    item.querySelector('.frag-text').textContent = collected ? tc('fragment', item.dataset.frag, 'text', f.text) : t('records.fragLockedHint', { week: f.week });
  }
  refs.fragTitle.textContent = t('records.fragmentsCount', {
    n: Fragments.collectedCount(),
    total: Fragments.getFragmentIds().length,
  });
}
