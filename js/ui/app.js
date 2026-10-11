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
import * as Universe from '../sim/universe.js';
import * as Singularity from '../sim/singularity.js';
import * as Endings from '../sim/endings.js';
import * as Save from '../data/save.js';
import { platformClass } from './platform.js';
import { THEMES, getTheme, setTheme, getAccent, setAccent } from './theme.js';
import { BIG_NUMBER_MODES, getBigNumberMode, setBigNumberMode } from './format.js';
import { playSfx } from '../core/audio.js';
import { getVolumePref, setVolumePref, getMutedPref, setMutedPref } from './audio.js';
import { t, tc, setLocale, getLocale, getLocales, isAvailable } from '../i18n/index.js';

const VERSION = '0.5.0';

const refs = {};
let dirty = false;
let rafId = 0;
let currentView = 'resources';
let toastTimer = 0;
let appliedUniverseHue = -1;

/** 按当前宇宙编号设置星场背景色相（每宇宙 +40°，v0.5 换皮） */
function applyUniverseHue() {
  const u = Universe.getUniverse();
  if (u === appliedUniverseHue) return;
  appliedUniverseHue = u;
  document.documentElement.style.setProperty('--bg-hue', `${Universe.getHue()}deg`);
}

export function initUI() {
  document.body.classList.add(platformClass());
  if (Prestige.isPhase2Unlocked()) document.body.classList.add('phase2');
  buildShell();
  bindEvents();
  switchView('resources');
  applyUniverseHue();
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
  const logo = document.createElement('img');
  logo.className = 'titlebar-logo';
  logo.src = 'assets/images/logo.png';
  logo.alt = '';
  logo.width = 16;
  logo.height = 16;
  tl.append(logo, el('span', '', t('app.title')));
  const tr = el('div', 'titlebar-right');
  const timeLine = el('div', 'titlebar-time');
  const timeSpan = el('span', 'num', '--');
  timeLine.append(el('span', '', t('titlebar.time')), timeSpan);
  const metaLine = el('div', 'titlebar-meta');
  const rateSpan = el('span', '', t('titlebar.rate', { rate: 1 }));
  const weekSpan = el('span', '', t('titlebar.week', { n: 1 }));
  const universeSpan = el('span', '', t('titlebar.universe', { n: 1 }));
  metaLine.append(rateSpan, weekSpan, universeSpan);
  tr.append(timeLine, metaLine);
  titlebar.append(tl, tr);
  refs.timeText = timeSpan;
  refs.rateText = rateSpan;
  refs.weekText = weekSpan;
  refs.universeText = universeSpan;

  // ---- 视图容器 ----
  const viewContainer = el('div', 'view-container');

  // 资源视图
  const viewRes = el('div', 'view active');
  const resLayout = el('div', 'resources-layout');
  const leftCol = el('div', 'left-col');

  const clickBtn = el('button', 'click-btn', t('res.click'));
  clickBtn.type = 'button';
  clickBtn.onclick = () => { Resources.click(); playSfx('click'); markDirty(); };
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

  // 奇点 / 多宇宙（v0.5）
  expPanel.append(el('div', 'panel-title', t('singularity.panel')));
  const singularityInfo = el('div', '', t('singularity.info', { universe: 1, exponent: '308', seeds: '0' }));
  const jumpStatus = el('div', '', t('singularity.notReady'));
  const jumpBtn = el('button', 'btn btn-primary', t('singularity.jumpBtn'));
  jumpBtn.type = 'button';
  jumpBtn.disabled = true;
  jumpBtn.onclick = () => {
    if (!window.confirm(t('singularity.confirm'))) return;
    const r = Singularity.jump();
    if (!r.ok) showToast(r.reason || t('toast.cannotPrestige'));
    else showToast(t('singularity.jumped', { universe: r.universe, seeds: Num.toString(r.seeds) }));
    renderNow();
  };
  expPanel.append(singularityInfo, jumpStatus, jumpBtn);
  refs.singularityInfo = singularityInfo;
  refs.jumpStatus = jumpStatus;
  refs.jumpBtn = jumpBtn;

  const crossGrid = el('div', 'tech-grid');
  for (const cu of Universe.getCrossUniverseUpgrades()) {
    const card = el('div', 'tech-card');
    card.append(el('div', 'tech-name', tc('crossUpgrade', cu.id, 'name', cu.name)));
    card.append(el('div', 'tech-desc', tc('crossUpgrade', cu.id, 'description', cu.description || '')));
    const cost = el('div', 'tech-cost', '');
    const btn = el('button', 'btn', t('singularity.buy'));
    btn.type = 'button';
    btn.dataset.cross = cu.id;
    btn.onclick = () => {
      const r = Singularity.buyCrossUniverse(cu.id);
      if (!r.ok) showToast(r.reason || t('toast.cannotBuy'));
      markDirty();
    };
    card.append(cost, btn);
    crossGrid.append(card);
  }
  expPanel.append(crossGrid);
  refs.crossGrid = crossGrid;

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

  // 终局视图（集齐全部记忆碎片后由任务栏进入；v0.6 双结局）
  const viewEndgame = el('div', 'view');
  const egPanel = el('div', 'panel');
  egPanel.append(el('div', 'panel-title', t('nav.endgame')));

  // 未解锁：提示
  const egLocked = el('div', '');
  egLocked.append(
    el('p', 'endgame-title', t('endgame.title')),
    el('p', 'modal-text', t('endgame.comingSoon'))
  );

  // 已解锁未选择：二选一
  const egChoice = el('div', '');
  egChoice.append(
    el('p', 'endgame-title', t('endgame.choiceTitle')),
    el('p', 'modal-text', t('endgame.intro'))
  );
  const egChoiceRow = el('div', 'modal-row');
  for (const eid of Endings.getEndingIds()) {
    const e = Endings.getEnding(eid);
    const btn = el('button', 'btn btn-primary', tc('ending', eid, 'name', e.name));
    btn.type = 'button';
    btn.dataset.ending = eid;
    btn.onclick = () => {
      const r = Endings.choose(eid);
      if (!r.ok) showToast(t('endgame.chooseFailed'));
      markDirty();
    };
    egChoiceRow.append(btn);
  }
  egChoice.append(egChoiceRow);

  // 已选择：结局文本
  const egResult = el('div', '');
  const egResultTitle = el('p', 'endgame-title', '');
  const egResultText = el('p', 'modal-text', '');
  egResult.append(egResultTitle, egResultText, el('p', 'modal-text', t('endgame.freeMode')));

  // 通用信息
  const egMeta = el('div', '');
  egMeta.append(
    el('p', 'modal-text', t('endgame.license')),
    el('p', 'modal-text', t('endgame.contribute'))
  );
  const egRepo = el('a', 'modal-text', t('endgame.repo'));
  egRepo.href = 'https://github.com/MarchBeta2087/uncontrolled-ai-incremental';
  egRepo.target = '_blank';
  egRepo.rel = 'noopener noreferrer';
  egMeta.append(egRepo);

  egPanel.append(egLocked, egChoice, egResult, egMeta);
  egChoice.hidden = true;
  egResult.hidden = true;
  viewEndgame.append(egPanel);
  refs.egLocked = egLocked;
  refs.egChoice = egChoice;
  refs.egResult = egResult;
  refs.egResultTitle = egResultTitle;
  refs.egResultText = egResultText;

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
  refs.endgameReady = Endings.isUnlocked();
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

  // Tab 栏：设置 / 关于 / 版本记录
  const tabBar = el('div', 'modal-tabs');
  const tabBtns = {};
  const aboutBody = el('div', 'modal-body');
  const changelogBody = el('div', 'modal-body');
  aboutBody.hidden = true;
  changelogBody.hidden = true;
  const tabBodies = {};
  function switchTab(name) {
    for (const [k, b] of Object.entries(tabBtns)) b.classList.toggle('active', k === name);
    for (const [k, body] of Object.entries(tabBodies)) body.hidden = k !== name;
    if (name === 'changelog') ensureChangelog();
  }
  for (const [id, key] of [['settings', 'settings.tabSettings'], ['about', 'settings.tabAbout'], ['changelog', 'settings.tabChangelog']]) {
    const tabBtn = el('button', 'modal-tab', t(key));
    tabBtn.type = 'button';
    tabBtn.onclick = () => switchTab(id);
    tabBtns[id] = tabBtn;
    tabBar.append(tabBtn);
  }
  modal.append(tabBar);

  const modalBody = el('div', 'modal-body');
  tabBodies.settings = modalBody;
  tabBodies.about = aboutBody;
  tabBodies.changelog = changelogBody;

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

  // 大数记法（科学记数 / ee）
  modalBody.append(el('div', 'modal-section', t('settings.bigNumberSection')));
  const bnRow = el('div', 'modal-row');
  const bnBtns = {};
  for (const m of BIG_NUMBER_MODES) {
    const bnBtn = el('button', 'btn', t('settings.bigNumber_' + m));
    bnBtn.type = 'button';
    if (m === getBigNumberMode()) bnBtn.classList.add('btn-primary');
    bnBtn.onclick = () => {
      setBigNumberMode(m);
      for (const [k, b] of Object.entries(bnBtns)) b.classList.toggle('btn-primary', k === m);
      markDirty();
    };
    bnBtns[m] = bnBtn;
    bnRow.append(bnBtn);
  }
  modalBody.append(bnRow);
  modalBody.append(el('p', 'modal-text', t('settings.bigNumberHint')));

  // 音频
  modalBody.append(el('div', 'modal-section', t('settings.audioSection')));
  const audioRow = el('div', 'modal-row');
  const muteBtn = el('button', 'btn', getMutedPref() ? t('settings.unmute') : t('settings.mute'));
  muteBtn.type = 'button';
  if (!getMutedPref()) muteBtn.classList.add('btn-primary');
  muteBtn.onclick = () => {
    const next = !getMutedPref();
    setMutedPref(next);
    muteBtn.textContent = next ? t('settings.unmute') : t('settings.mute');
    muteBtn.classList.toggle('btn-primary', !next);
    if (!next) playSfx('click');
  };
  const volInput = el('input', '');
  volInput.type = 'range';
  volInput.min = '0';
  volInput.max = '1';
  volInput.step = '0.05';
  volInput.value = String(getVolumePref());
  volInput.oninput = () => setVolumePref(Number(volInput.value));
  volInput.onchange = () => playSfx('click');
  audioRow.append(muteBtn, volInput);
  modalBody.append(audioRow);

  // ---- 关于 tab（带 Logo）----
  const aboutLogo = document.createElement('img');
  aboutLogo.className = 'about-logo';
  aboutLogo.src = 'assets/images/logo.png';
  aboutLogo.alt = t('settings.aboutGame');
  aboutLogo.width = 64;
  aboutLogo.height = 64;
  aboutBody.append(aboutLogo);
  aboutBody.append(el('div', 'modal-section', t('settings.aboutSection')));
  aboutBody.append(el('p', 'modal-text', t('settings.aboutGame')));
  aboutBody.append(el('p', 'modal-text', t('settings.aboutVersion', { version: VERSION })));
  aboutBody.append(el('p', 'modal-text', t('settings.aboutLicense')));
  aboutBody.append(el('p', 'modal-text', t('settings.aboutNumLib')));
  aboutBody.append(el('p', 'modal-text', t('settings.aboutOrdinal')));
  const repoLink = el('a', 'modal-text', t('settings.aboutRepo'));
  repoLink.href = 'https://github.com/MarchBeta2087/uncontrolled-ai-incremental';
  repoLink.target = '_blank';
  repoLink.rel = 'noopener noreferrer';
  aboutBody.append(repoLink);

  // ---- 版本记录 tab（UTC / 北京时间双轨甘特图）----
  changelogBody.append(el('div', 'modal-section', t('settings.tabChangelog')));
  const ganttHost = el('div', 'gantt-host');
  ganttHost.append(el('p', 'modal-text', t('changelog.loading')));
  changelogBody.append(ganttHost);
  refs.ganttHost = ganttHost;
  refs.changelogLoaded = false;

  const closeBtn = el('button', 'btn', t('settings.close'));
  closeBtn.onclick = () => closeModal();
  modal.append(modalBody, aboutBody, changelogBody, closeBtn);
  switchTab('settings');
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

/** 版本记录：懒加载 config/versions.json 并渲染双轨甘特图（只执行一次） */
async function ensureChangelog() {
  if (refs.changelogLoaded || !refs.ganttHost) return;
  refs.changelogLoaded = true;
  try {
    const resp = await fetch('config/versions.json');
    if (!resp.ok) throw new Error(String(resp.status));
    const data = await resp.json();
    renderGantt(refs.ganttHost, data.versions ?? []);
  } catch (err) {
    console.error('[UI] 版本记录加载失败：', err);
    refs.ganttHost.innerHTML = '';
    refs.ganttHost.append(el('p', 'modal-text', t('changelog.loadFailed')));
  }
}

/** 渲染 UTC / 北京时间双轨甘特图 + 版本表 */
function renderGantt(host, versions) {
  host.innerHTML = '';
  const items = versions
    .map((v) => ({ ...v, ts: Date.parse(v.releasedAt) }))
    .filter((v) => Number.isFinite(v.ts))
    .sort((a, b) => a.ts - b.ts);
  if (!items.length) {
    host.append(el('p', 'modal-text', t('changelog.empty')));
    return;
  }
  const OFFSET = 8 * 3600 * 1000; // 北京时间 = UTC+8
  const t0 = items[0].ts;
  const t1 = items[items.length - 1].ts + OFFSET; // 给北京轨道右移留出空间
  const span = Math.max(1, t1 - t0);
  const pct = (ts) => ((ts - t0) / span) * 100;

  const fmtOpts = { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const utcFmt = new Intl.DateTimeFormat(getLocale(), { ...fmtOpts, timeZone: 'UTC' });
  const bjFmt = new Intl.DateTimeFormat(getLocale(), { ...fmtOpts, timeZone: 'Asia/Shanghai' });
  const fmtUTC = (ts) => utcFmt.format(new Date(ts));
  const fmtBJ = (ts) => bjFmt.format(new Date(ts));

  const tracks = [
    { label: t('changelog.utcTrack'), shift: 0, fmt: fmtUTC },
    { label: t('changelog.beijingTrack'), shift: OFFSET, fmt: fmtBJ },
  ];
  for (const track of tracks) {
    const row = el('div', 'gantt-row');
    row.append(el('div', 'gantt-label', track.label));
    const trackEl = el('div', 'gantt-track');
    items.forEach((v, i) => {
      const start = i === 0 ? v.ts - (items[1] ? items[1].ts - v.ts : 3600e3) : items[i - 1].ts;
      const left = pct(start + track.shift);
      const width = pct(v.ts + track.shift) - left;
      const bar = el('div', 'gantt-bar', v.version);
      bar.style.left = `${left}%`;
      bar.style.width = `${Math.max(0.8, width)}%`;
      bar.title = `v${v.version} · ${track.fmt(v.ts)}${v.note ? ' · ' + v.note : ''}`;
      trackEl.append(bar);
    });
    row.append(trackEl);
    host.append(row);
  }

  const axis = el('div', 'gantt-axis');
  axis.append(el('span', 'num', `${fmtUTC(items[0].ts)} UTC`));
  axis.append(el('span', 'num', `${fmtBJ(items[items.length - 1].ts)} 北京`));
  host.append(axis);

  const list = el('div', 'ver-list');
  for (const v of items) {
    const row = el('div', 'ver-row');
    row.append(
      el('span', 'ver-tag', `v${v.version}`),
      el('span', 'ver-time num', `${fmtUTC(v.ts)} UTC`),
      el('span', 'ver-time num', `${fmtBJ(v.ts)} 北京`),
      el('span', 'ver-note', v.note || '')
    );
    list.append(row);
  }
  host.append(list);

  const full = el('a', 'modal-text', t('changelog.fullLog'));
  full.href = 'CHANGELOG.md';
  full.target = '_blank';
  full.rel = 'noopener noreferrer';
  host.append(full);
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
  if (!refs.endgameReady && Endings.isUnlocked()) {
    refs.endgameReady = true;
    if (refs.endgameBtn) refs.endgameBtn.hidden = false;
    showToast(t('toast.endgameReached'));
    switchView('endgame');
  }
  renderEndgame();
}

/** 终局面板：按「未解锁 / 待选择 / 已选择」切换内容 */
function renderEndgame() {
  if (!refs.egLocked) return;
  const unlocked = Endings.isUnlocked();
  const chosen = Endings.getChosen();
  refs.egLocked.hidden = unlocked;
  refs.egChoice.hidden = !unlocked || !!chosen;
  refs.egResult.hidden = !chosen;
  if (chosen) {
    const e = Endings.getEnding(chosen);
    refs.egResultTitle.textContent = tc('ending', chosen, 'title', e?.title ?? '');
    refs.egResultText.textContent = tc('ending', chosen, 'text', e?.text ?? '');
  }
}

function updateTitlebar() {
  const gt = Time.formatGameTime();
  refs.timeText.textContent = gt.text;
  const rateMult = Num.div(Time.getRate(), Time.getBaseRate());
  refs.rateText.textContent = t('titlebar.rate', { rate: Num.format(rateMult) });
  refs.weekText.textContent = t('titlebar.week', { n: Prestige.getPrestigeCount() + 1 });
  if (refs.universeText) refs.universeText.textContent = t('titlebar.universe', { n: Universe.getUniverse() });
  applyUniverseHue();
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
      t('tech.cost', { cost: Num.format(Techs.getCost(tid)), currency: tc('resource', def.costCurrency, 'name', Resources.getResourceDef(def.costCurrency)?.name ?? '') });
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

  // 奇点 / 多宇宙
  if (refs.singularityInfo) {
    refs.singularityInfo.textContent = t('singularity.info', {
      universe: Universe.getUniverse(),
      exponent: Num.format(Universe.getCapExponent()),
      seeds: Num.format(Universe.getSeeds()),
    });
  }
  if (refs.jumpBtn) {
    const ready = Singularity.canJump();
    refs.jumpStatus.textContent = ready ? t('singularity.ready') : t('singularity.notReady');
    refs.jumpBtn.disabled = !ready;
  }
  if (refs.crossGrid) {
    for (const card of refs.crossGrid.querySelectorAll('.tech-card')) {
      const btn = card.querySelector('.btn');
      const cid = btn.dataset.cross;
      const cu = Universe.getCrossUniverseUpgrade(cid);
      const owned = Universe.isCrossOwned(cid);
      card.classList.toggle('owned', owned);
      const costEl = card.querySelector('.tech-cost');
      if (owned) {
        btn.textContent = t('singularity.owned');
        btn.disabled = true;
        costEl.textContent = t('singularity.effect', { desc: cu.description || '' });
      } else {
        btn.textContent = t('singularity.buy');
        btn.disabled = !Singularity.canBuyCrossUniverse(cid);
        costEl.textContent = t('singularity.cost', { cost: Num.format(Num.parse(cu.cost)) });
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
