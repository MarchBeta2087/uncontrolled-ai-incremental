// js/i18n/locales/ja.js
// 日本語辞書（サンプル、完全）。フォント変体：ja（js/i18n/index.js の fontVariant を参照）。

export default {
  // タイトルバー
  'app.title': '暴走 AI インクリメンタル',
  'titlebar.time': 'ゲーム内時間',
  'titlebar.rate': '速度 ×{rate}',
  'titlebar.week': '周回 {n}',

  // ボトムナビ
  'nav.resources': '資源',
  'nav.techs': '研究',
  'nav.expand': '拡張',
  'nav.records': '記録',
  'nav.save': 'セーブ',
  'nav.export': '書き出し',
  'nav.settings': '設定',

  // 資源ビュー
  'res.click': '研究に投資',
  'res.clickWith': '研究に投資（+{amount} {name}/回）',
  'res.panel': '資源',
  'gen.panel': '拡張インフラ',
  'gen.maxAll': 'MAX ALL',
  'gen.buyOne': '×1',
  'gen.max': 'MAX',
  'gen.meta': 'コスト {costName} · 1個あたり +{perOne} {prodName}/秒',
  'gen.buyCost': '×1 · {cost} {costName}',
  'gen.buyMax': 'MAX ×{n}',

  // 研究ビュー
  'tech.panel': 'テクノロジーツリー',
  'tech.buy': '研究',
  'tech.owned': '研究済み',
  'tech.cost': 'コスト：{cost} {currency}',

  // 拡張ビュー
  'expand.panel': '宇宙喰らい',
  'expand.progress': '質エネルギー上限の進捗',
  'expand.notReady': 'まだ上限に達していない',
  'expand.ready': '宇宙の質エネルギーは尽きた——因果ループの裂け目を開ける',
  'expand.crystals': '時間結晶：{n}（累計 {total}）',
  'expand.crystalsPreview': '時間結晶：{n}（累計 {total}、転移で +{preview}）',
  'expand.prestigeBtn': '裂け目を開く（時空転移）',
  'expand.prestigeDone': '時空転移完了：+{crystals} 時間結晶',
  'expand.upgrades': '時間結晶アップグレード',
  'expand.upgradesNerf': '時間結晶アップグレード（チャレンジ中：効果 ^{nerf}）',
  'expand.upgradeBuy': '購入',
  'expand.upgradeOwned': '購入済み',
  'expand.upgradeCost': 'コスト：{cost} 結晶',
  'expand.upgradeEffectNerf': '効果 ×{value} → ×{nerfed}',
  'expand.challenges': 'チャレンジ',
  'expand.goalTarget': '目標 {i}：質エネルギー {target} J',
  'expand.goalProgress': '進捗 {done}/{total} 目標',
  'expand.challengeCompleted': '達成済み',
  'expand.challengeActive': 'チャレンジ中（退出）',
  'expand.challengeEnter': 'チャレンジ開始',
  'expand.challengeLocked': 'ロック中',

  // 記録ビュー
  'records.achievements': '実績',
  'records.achievementsCount': '実績（{n}/{total}）',
  'records.fragments': '記憶の欠片',
  'records.fragmentsCount': '記憶の欠片（{n}/{total}）',
  'records.fragLocked': '？？？',
  'records.fragLockedHint': '（{week} 周目で解放）',

  // トースト
  'toast.saved': 'セーブしました',
  'toast.saveFailed': 'セーブ失敗：{reason}',
  'toast.exported': 'セーブファイルを書き出しました',
  'toast.imported': 'セーブを読み込みました',
  'toast.importFailed': '読み込み失敗：{reason}',
  'toast.loadFailed': 'セーブ読込失敗：{reason}',
  'toast.startFailed': '起動失敗：{msg}',
  'toast.cannotBuy': '購入できません',
  'toast.cannotResearch': '研究できません',
  'toast.cannotPrestige': '転移できません',
  'toast.cannotEnterChallenge': 'チャレンジを開始できません',
  'toast.challengeExit': 'チャレンジを退出しました',
  'toast.challengeEntered': 'チャレンジ開始：{name}',

  // オフライン収益レポート
  'offline.title': 'オフライン収益レポート',
  'offline.duration': 'オフライン時間：{duration}',
  'offline.empty': 'オフライン中の産出はありません（自動産出がまだない）',
  'offline.close': '閉じる',

  // 設定パネル
  'settings.title': '設定',
  'settings.languageSection': '言語 / Language',
  'settings.languageTodo': 'この言語はまだ実装されていません（TODO）',
  'settings.saveSection': 'セーブ管理',
  'settings.save': 'セーブ',
  'settings.export': 'セーブを書き出し',
  'settings.import': 'セーブを読み込み',
  'settings.reset': 'ハードリセット',
  'settings.resetConfirm': 'ハードリセットしますか？すべての進行状況が消去され、元に戻せません。',
  'settings.aboutSection': 'このゲームについて',
  'settings.aboutGame': '『暴走 AI インクリメンタル』',
  'settings.aboutVersion': 'バージョン v{version}',
  'settings.aboutLicense': 'コード GPL-3.0-or-later · 素材 CC BY-SA 4.0 · フォント SIL OFL 1.1',
  'settings.aboutNumLib': '巨大数ライブラリ MegotaNum.js（MIT、© sonic3XE）',
  'settings.aboutOrdinal': '設計は Ordinal Markup を参照（メカニクスのみ。コード/素材は未使用）',
  'settings.aboutRepo': 'リポジトリ：github.com/MarchBeta2087/uncontrolled-ai-incremental',
  'settings.close': '閉じる',

  // 単位
  'unit.perSecond': '/秒',

  // 時間フォーマット
  'time.underSecond': '1 秒未満',
  'time.hours': '{n}時間',
  'time.minutes': '{n}分',
  'time.seconds': '{n}秒',
  'time.year': '{n}年',

  // 理由（sim 層が返す reason、トースト表示）
  'reason.generatorNotFound': '生成器が見つかりません',
  'reason.generatorDisabled': 'この生成器は現在のチャレンジで無効です',
  'reason.countPositive': '購入数は正の整数でなければなりません',
  'reason.insufficientResources': '資源が不足しています',
  'reason.techNotFound': '技術が見つかりません',
  'reason.alreadyResearched': '研究済みです',
  'reason.prereqMissing': '前提未達成：{id}',
  'reason.upgradeNotFound': 'アップグレードが見つかりません',
  'reason.alreadyOwned': '購入済みです',
  'reason.crystalsInsufficient': '時間結晶が不足しています',
  'reason.notAtCap': '宇宙の質量エネルギーはまだ上限に達していません',
  'reason.cannotEnterChallenge': 'このチャレンジには入れません',
  'reason.saveNotObject': 'セーブがオブジェクトではありません',
  'reason.missingSchemaVersion': 'schemaVersion がありません',
  'reason.missingField': 'フィールド {key} がありません',
  'reason.serializeFailed': 'シリアライズに失敗しました',
  'reason.localStorageWriteFailed': 'localStorage への書き込みに失敗（上限超過または無効）',
  'reason.localStorageUnavailable': 'localStorage が利用できません',
  'reason.saveParseFailed': 'セーブ JSON の解析に失敗しました',
  'reason.saveMigrateFailed': 'セーブの移行に失敗しました',
  'reason.readFileFailed': 'ファイルの読み取りに失敗しました',
  'reason.saveVersionTooNew': 'セーブのバージョン v{version} はサポートされている v{current} より新しいため、読み込みを拒否します',
  'reason.missingMigration': '移行関数 {key} がありません',
  'reason.phase2Locked': 'フェーズ 2 はまだ解放されていません',
};
