// js/i18n/locales/en.js
// English dictionary (sample locale, complete).
// 字体变体：latin（见 js/i18n/index.js 的 fontVariant 与 css/fonts.css 的 data-lang 映射）。

export default {
  // Title bar
  'app.title': 'Uncontrolled AI Incremental',
  'titlebar.time': 'In-game time',
  'titlebar.rate': 'Speed ×{rate}',
  'titlebar.week': 'Run {n}',

  // Bottom navigation
  'nav.resources': 'Resources',
  'nav.techs': 'Research',
  'nav.expand': 'Expand',
  'nav.records': 'Records',
  'nav.save': 'Save',
  'nav.export': 'Export',
  'nav.settings': 'Settings',

  // Resources view
  'res.click': 'Invest in R&D',
  'res.clickWith': 'Invest in R&D (+{amount} {name}/click)',
  'res.panel': 'Resources',
  'gen.panel': 'Infrastructure',
  'gen.maxAll': 'MAX ALL',
  'gen.buyOne': '×1',
  'gen.max': 'MAX',
  'gen.meta': 'Costs {costName} · +{perOne} {prodName}/sec each',
  'gen.buyCost': '×1 · {cost} {costName}',
  'gen.buyMax': 'MAX ×{n}',

  // Research view
  'tech.panel': 'Tech Tree',
  'tech.buy': 'Research',
  'tech.owned': 'Researched',
  'tech.cost': 'Cost: {cost} {currency}',

  // Expand view
  'expand.panel': 'Devour the Universe',
  'expand.progress': 'Mass-energy cap progress',
  'expand.notReady': 'Not at cap yet',
  'expand.ready': 'Universe mass-energy exhausted — tear open the causal loop',
  'expand.crystals': 'Time Crystals: {n}',
  'expand.crystalsPreview': 'Time Crystals: {n} (prestige grants +{preview})',
  'expand.prestigeBtn': 'Tear the Rift (Prestige)',
  'expand.prestigeDone': 'Prestige complete: +{crystals} Time Crystals',
  'expand.upgrades': 'Time Crystal Upgrades',
  'expand.upgradesNerf': 'Time Crystal Upgrades (challenge: effects ^{nerf})',
  'expand.upgradeBuy': 'Buy',
  'expand.upgradeOwned': 'Owned',
  'expand.upgradeCost': 'Cost: {cost} crystals',
  'expand.upgradeEffectNerf': 'Effect ×{value} → ×{nerfed}',
  'expand.challenges': 'Challenges',
  'expand.goalTarget': 'Goal {i}: {target} J mass-energy',
  'expand.goalProgress': 'Progress {done}/{total} goals',
  'expand.challengeCompleted': 'Completed',
  'expand.challengeActive': 'In challenge (exit)',
  'expand.challengeEnter': 'Enter challenge',
  'expand.challengeLocked': 'Locked',

  // Records view
  'records.achievements': 'Achievements',
  'records.achievementsCount': 'Achievements ({n}/{total})',
  'records.fragments': 'Memory Fragments',
  'records.fragmentsCount': 'Memory Fragments ({n}/{total})',
  'records.fragLocked': '???',
  'records.fragLockedHint': '(unlocks on run {week})',

  // Toasts
  'toast.saved': 'Saved',
  'toast.saveFailed': 'Save failed: {reason}',
  'toast.exported': 'Save file exported',
  'toast.imported': 'Save imported',
  'toast.importFailed': 'Import failed: {reason}',
  'toast.loadFailed': 'Save load failed: {reason}',
  'toast.startFailed': 'Startup failed: {msg}',
  'toast.cannotBuy': 'Cannot buy',
  'toast.cannotResearch': 'Cannot research',
  'toast.cannotPrestige': 'Cannot prestige',
  'toast.cannotEnterChallenge': 'Cannot enter challenge',
  'toast.challengeExit': 'Challenge exited',
  'toast.challengeEntered': 'Challenge started: {name}',

  // Offline earnings report
  'offline.title': 'Offline Earnings Report',
  'offline.duration': 'Offline time: {duration}',
  'offline.empty': 'No production while offline (no auto production yet)',
  'offline.close': 'Close',

  // Settings panel
  'settings.title': 'Settings',
  'settings.languageSection': 'Language',
  'settings.languageTodo': 'This language is not implemented yet (TODO)',
  'settings.saveSection': 'Save Management',
  'settings.save': 'Save',
  'settings.export': 'Export save',
  'settings.import': 'Import save',
  'settings.reset': 'Hard reset',
  'settings.resetConfirm': 'Hard reset? This wipes all progress and cannot be undone.',
  'settings.aboutSection': 'About',
  'settings.aboutGame': 'Uncontrolled AI Incremental',
  'settings.aboutVersion': 'Version v{version}',
  'settings.aboutLicense': 'Code GPL-3.0-or-later · Assets CC BY-SA 4.0 · Font SIL OFL 1.1',
  'settings.aboutNumLib': 'Big-number library MegotaNum.js (MIT, © sonic3XE)',
  'settings.aboutOrdinal': 'Design references Ordinal Markup (mechanics only; no code/assets reused)',
  'settings.aboutRepo': 'Repository: github.com/MarchBeta2087/uncontrolled-ai-incremental',
  'settings.close': 'Close',

  // Units
  'unit.perSecond': '/sec',

  // Duration formatting
  'time.underSecond': 'under 1 second',
  'time.hours': '{n} h',
  'time.minutes': '{n} min',
  'time.seconds': '{n} sec',
  'time.year': 'Year {n}',

  // Reasons (returned by sim layer, shown in toasts)
  'reason.generatorNotFound': 'Generator not found',
  'reason.generatorDisabled': 'This generator is disabled in the current challenge',
  'reason.countPositive': 'Quantity must be a positive integer',
  'reason.insufficientResources': 'Not enough resources',
  'reason.techNotFound': 'Tech not found',
  'reason.alreadyResearched': 'Already researched',
  'reason.prereqMissing': 'Prerequisite not met: {id}',
  'reason.upgradeNotFound': 'Upgrade not found',
  'reason.alreadyOwned': 'Already owned',
  'reason.crystalsInsufficient': 'Not enough Time Crystals',
  'reason.notAtCap': 'Universe mass-energy has not reached the cap yet',
  'reason.cannotEnterChallenge': 'Cannot enter this challenge',
  'reason.saveNotObject': 'Save is not an object',
  'reason.missingSchemaVersion': 'Missing schemaVersion',
  'reason.missingField': 'Missing field {key}',
  'reason.serializeFailed': 'Serialization failed',
  'reason.localStorageWriteFailed': 'localStorage write failed (full or blocked)',
  'reason.localStorageUnavailable': 'localStorage unavailable',
  'reason.saveParseFailed': 'Save JSON parse failed',
  'reason.saveMigrateFailed': 'Save migration failed',
  'reason.readFileFailed': 'Failed to read file',
  'reason.saveVersionTooNew': 'Save version v{version} is newer than supported v{current}, refusing to load',
  'reason.missingMigration': 'Missing migration function {key}',
};
