// js/i18n/locales/ar.js
// 阿拉伯语（RTL）骨架词典 —— 仅覆盖界面外壳，用于 RTL 布局联调。
//
// 状态：**未完整实装**。未列出的 key 会沿继承链回退到默认语言（zh-CN）。
// 待内容与文案补齐后，本文件与 js/i18n/content/ar.js 一并转为正式实装。
//
// 注意：本作数值重度依赖拉丁记法（如 ee6.0000 / eee120.0000），
//    阿拉伯语区域应保持拉丁数字（拉丁数字在 RTL 段落中作为独立 run 渲染），
//    不切换到阿拉伯-印度数字（٠١٢٣٤٥٦٧٨٩）。

export default {
  // 标题栏
  'app.title': 'الذكاء الاصطناعي الجامح التزايدي',
  'titlebar.time': 'وقت اللعبة',
  'titlebar.rate': 'السرعة ×{rate}',
  'titlebar.week': 'الدورة {n}',
  'titlebar.universe': 'الكون {n}',

  // 底部导航
  'nav.resources': 'الموارد',
  'nav.techs': 'الأبحاث',
  'nav.expand': 'التوسع',
  'nav.records': 'السجلات',
  'nav.save': 'حفظ',
  'nav.export': 'تصدير',
  'nav.settings': 'الإعدادات',
  'nav.endgame': 'النهاية',

  // 资源视图
  'res.click': 'استثمار في البحث',
  'res.panel': 'الموارد',
  'gen.panel': 'البنية التحتية',
  'gen.maxAll': 'MAX ALL',

  // 研发视图
  'tech.panel': 'شجرة التقنيات',
  'tech.buy': 'بحث',
  'tech.owned': 'مُنجَز',
  'tech.cost': 'التكلفة: {cost} {currency}',
  'tech.phase1': 'المرحلة الأولى',
  'tech.phase2': 'المرحلة الثانية · تجاوز هذا الكون',

  // 记录视图
  'records.achievements': 'الإنجازات',
  'records.fragments': 'شظايا الذاكرة',
  'records.fragLocked': '？？？',

  // 设置面板
  'settings.title': 'الإعدادات',
  'settings.languageSection': 'اللغة / Language',
  'settings.languageTodo': 'هذه اللغة غير متوفرة بعد',
  'settings.themeSection': 'المظهر / Theme',
  'settings.accent': 'اللون المميز',
  'settings.accentReset': 'إعادة تعيين',
  'settings.bigNumberSection': 'تدوين الأعداد الكبيرة / Big Number',
  'settings.bigNumber_default': 'الترميز العلمي',
  'settings.bigNumber_ee': 'تدوين ee',
  'settings.bigNumber_eee': 'تدوين eee',
  'settings.bigNumberHint':
    'يطوي تدوين ee الأسس الضخمة (≥1e1000000) إلى eeN، مثال: 1e1000000 ← ee6.0000؛ ويطوي تدوين eee مرة أخرى بعد بلوغ اللوغاريتم المزدوج 1e6، مثال: 10^(10^(10^120)) ← eee120.0000.',
  'settings.audioSection': 'الصوت / Audio',
  'settings.mute': 'كتم الصوت',
  'settings.unmute': 'إلغاء الكتم',
  'theme.default': 'افتراضي',
  'theme.solarized': 'Solarized',
  'theme.dracula': 'Dracula',
  'theme.contrast': 'تباين عالٍ',
  'theme.light': 'فاتح',
  'settings.saveSection': 'إدارة الحفظ',
  'settings.save': 'حفظ اللعبة',
  'settings.export': 'تصدير الحفظ',
  'settings.import': 'استيراد الحفظ',
  'settings.reset': 'إعادة ضبط كاملة',
  'settings.resetConfirm': 'هل تريد إعادة الضبط الكاملة؟ سيُحذف كل التقدم ولا يمكن استرجاعه.',
  'settings.aboutSection': 'حول',
  'settings.aboutGame': 'الذكاء الاصطناعي الجامح التزايدي',
  'settings.aboutVersion': 'الإصدار v{version}',
  'settings.aboutLicense': 'الشيفرة GPL-3.0-or-later · الأصل CC BY-SA 4.0 · الخط SIL OFL 1.1',
  'settings.aboutNumLib': 'مكتبة الأعداد الكبيرة MegotaNum.js (MIT، © sonic3XE)',
  'settings.aboutOrdinal': 'التصميم مستوحى من Ordinal Markup (الفكرة فقط، دون إعادة استخدام شيفرته أو أصله)',
  'settings.aboutRepo': 'مستودع المشروع: github.com/MarchBeta2087/uncontrolled-ai-incremental',
  'settings.close': 'إغلاق',
  'settings.tabSettings': 'الإعدادات',
  'settings.tabAbout': 'حول',
  'settings.tabChangelog': 'سجل الإصدارات',

  // 离线收益报告
  'offline.title': 'تقرير الأرباح دون اتصال',
  'offline.close': 'إغلاق',

  // 单位
  'unit.perSecond': '/ثانية',

  // 时长格式化
  'time.underSecond': 'أقل من ثانية',
  'time.hours': '{n} ساعة',
  'time.minutes': '{n} دقيقة',
  'time.seconds': '{n} ثانية',
  'time.year': '{n} سنة',
};
