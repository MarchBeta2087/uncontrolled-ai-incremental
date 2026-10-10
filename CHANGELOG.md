# 变更日志

本项目遵循语义化版本（SemVer）。

## [Unreleased]

### 新增（Added）

- **时间晶体「当前持有 / 历史累计」区分**：新增 `totalTimeCrystals`（只增不减，含已花费），存档 `schemaVersion` 升至 2 并带迁移（旧档累计值回退为当前持有量）；扩张视图同时显示当前持有与累计；成就「因果残骸」改用累计条件 `total_crystals_ge`。
- **仓库治理（v0.4 基础）**：引入 `dev` 分支 + PR 流程（`docs/分支与发布流程.md`）；新增 `CODE_OF_CONDUCT.md`（Contributor Covenant 2.1）、`SECURITY.md`、Issue / PR 模板；CI 触发分支加入 `dev`。
- **素材与授权规则 v1.1**：明确「兼容 CC BY-SA 4.0」许可集合；新增禁用来源黑名单（Pixabay、Silverman Sound）；新增素材征集章节。

### 待办（v0.4 进行中）

- 第二阶段技术树（解锁条件：当前持有 100 时间晶体）与时间晶体增益内容。
- 设置界面配色调节。
- Endgame 画面（触发条件：第二阶段技术全部研发完成）。
- 多宇宙（远期）。

## [0.3.0] - 2026-10-10

### 新增（Added）

- **像素字体**（`css/fonts.css` + `assets/fonts/fusion-pixel/`）：接入缝合像素字体（Fusion Pixel Font）12px，比例模式作正文、等宽模式作数字；覆盖 7 种语言字形（latin / zh-hans / zh-hant / zh-hk / zh-tw / ja / ko），附 SIL OFL 1.1 许可证文本（`OFL.txt`）。@font-face 惰性加载，运行时只下载当前语言的 2 个字体。
- **多语言（i18n）基础设施**（`js/i18n/`）：语言注册表 + `t(key, params)` 占位符翻译 + localStorage 语言偏好持久化；`<html lang / data-lang>` 驱动 `css/fonts.css` 切换字体族。
- **简体中文词典实装**（`js/i18n/locales/zh-CN.js`）：全部 91 条 UI 外壳文案接入 `t()`（标题栏/导航/面板/按钮/toast/设置/离线报告/时长格式化）。
- **多语言词典**（`js/i18n/locales/`）：简体中文（`zh-CN.js`，默认）、English（`en.js`）、繁體中文（`zh-Hant.js`）、繁體中文地區變體（`zh-TW.js` / `zh-HK.js`，繼承 zh-Hant、僅字型字形不同）、日本語（`ja.js`）、한국어（`ko.js`），均可在设置面板直接切换。
- **游戏内容本地化**（`js/i18n/content/` + `tc(scope, id, field, fallback)`）：资源/生成器/技术/升级/成就/记忆碎片/挑战的名称、描述、目标奖励全部接入多语言；zh-CN 以 `config/*.json` 为原文，其余 4 种语言完整覆盖，缺失时回退到 config 中文。
- **sim 层 `reason` 本地化**：购买/研发/升级/穿梭/挑战/存档读写的失败原因（如「资源不足」「时间晶体不足」）全部改走 `t()`；时间显示的单位「年」也按语言切换。
- **设置面板新增「语言 / Language」区**：实装语言可切换（切换后刷新页面，自动存档安全），未实装语言禁用并标注「待办」。

### 变更（Changed）

- **移动端标题栏改为三行**：第一行游戏标题、第二行游戏内时间、第三行速率与周目；桌面端不变。
- **移动端底栏固定**：`#shell` 高度改用 `100dvh`（修复地址栏伸缩时底栏被顶出屏幕），底栏增加 `env(safe-area-inset-bottom)` 避开 iPhone 手势条。
- **像素字体渲染调优**：全局字号收敛到 12px / 24px（原生字号与 2× 整数倍），关闭抗锯齿与合成粗体（`font-synthesis: none`），保证像素字形锐利。
- 版本号升至 v0.3.0。

### 待办（已知）

- 数字格式为国际通用的 `1,234,567.89`（逗号千分位 + 点小数点），已适用于全部现有 7 种语言；若未来增加欧洲/拉美语言再引入 `Intl.NumberFormat`（点/逗号对调、空格/印度分组），中文大数可选「万/亿」记法（见 TODO.md）。开发者控制台日志/配置校验错误仍为中文（仅面向开发者）。

## [0.2.1] - 2026-10-09

### 变更（Changed）

- **挑战削弱改为幂运算（^0.25）**：挑战期间永久升级（升级/挑战/成就）的乘子取 `^0.25` 次方（如全产出 ×2 → ×1.189207），退出挑战后恢复；速率乘子区分永久/技术来源，仅永久乘子被削弱。
- 设置页面显示版本号（v0.2.1）。

### 修复（Fixed）

- 挑战状态 UI 未及时刷新（进入/退出挑战后按钮不更新）：新增同步渲染兑底 `renderNow`，挑战按钮点击后立即渲染；渲染函数逐个隔离异常，单个组件异常不再中断整体渲染。
- 挑战中升级卡片现在显示削弱后的实际效果（如「×2 → ×1.189207」）。

## [0.2.0] - 2026-10-09

### 新增（Added）

- **GitHub Pages 部署**（`.github/workflows/pages.yml`）：push 到 main 自动部署到 https://marchbeta2087.github.io/uncontrolled-ai-incremental/。
- **CI/CD**（`.github/workflows/ci.yml` + `test/smoke.mjs`）：配置校验、Num 序列化/格式化、穿梭结算、成本曲线、挑战多目标与削弱、成就奖励的回归测试。
- **挑战期间永久升级削弱**：挑战开始不再完全清除永久升级（升级/挑战/成就），而是削弱至 25%（`balance.json` 的 `challenge.upgradeNerf`），退出/完成挑战后恢复；UI 显示「挑战中削弱至 25%」。

### 修复（Fixed）

- `initResources` 未清空 `globalMults` 等状态导致跨初始化残留。

## [0.1.0] - 2026-10-09

首个可玩版本（MVP + 内容扩充）：完整周目循环、时间晶体升级树、成就、记忆碎片、挑战模式、离线收益报告。

### 新增（Added）

- **M2 骨架（第一批 · 数值/时间/数据层）**：
  - `js/core/num.js`：Num 适配器（封装 MegotaNum，含修复其 `toJSON` 丢失三元组第三分量导致 roundtrip 丢精度的 bug）。
  - `js/core/events.js`：事件总线。
  - `js/core/time.js`：时间系统（双时间轴、速率乘子与软上限、分级显示 full/year/scientific/ban、Date 溢出降级）。
  - `js/data/save.js`：存档管理（localStorage 读写、导出/导入、校验、迁移链、schemaVersion 拒绝）。
- **M2 骨架（第二批 · 内容层与游戏逻辑层）**：
  - `config/resources.json`：4 层资源 + 3 个链式生成器。
  - `config/techs.json`：8 项 MVP 技术（效果为有限枚举）。
  - `js/data/config.js`：配置加载与校验（id 唯一、引用存在、requires 无环、effect 类型已注册）。
  - `js/sim/resources.js`：资源/生成器系统（几何级数成本、点击、生产结算）。
  - `js/sim/techs.js`：技术树（前置校验、效果应用、乘子恢复）。
  - `js/sim/engine.js`：主循环（100ms tick、performance.now 校正、穿梭触发检查）。
- **素材与授权规则**（`docs/素材与授权规则-v1.0.md`）：许可证兼容矩阵、CC 搜索使用要点、必记信息、ASSETS.md 登记格式、字体 OFL 特殊条款、PR 检查清单；CONTRIBUTING.md 已挂链接。
- **M2 骨架（第三批 · 表现层与入口）**：
  - `js/sim/prestige.js`：时空穿梭（结算公式 + 重置顺序，首次穿梭校准 2 晶体）。
  - `js/ui/platform.js` + `js/ui/app.js`：外壳判定与桌面外壳 UI（脏标记 + rAF 节流渲染）。
  - `js/main.js`：入口（配置加载→注入→init→存档恢复→离线结算→自动存档）。
  - `index.html` + `css/core.css` + `css/shell-desktop.css`：静态入口与桌面外壳样式。
- **时间晶体升级树**（`config/upgrades.json` + `js/sim/upgrades.js`）：6 项永久升级（全产出乘子 + 时间速率乘子），穿梭后保留；Resources 新增全局乘子（永久全产出）。
- **MAX ALL / MAX 购买**：`Resources.buyMaxGenerator` / `buyMaxAll`（几何级数反解最大可买数量），UI 生成器卡片加 ×1 / MAX 按钮，面板加 MAX ALL 按钮。
- **设置页面**（模态面板）：存档管理（保存/导出/导入/硬重置）+ 关于/许可证信息 + 项目仓库链接；任务栏新增「设置」按钮。
- **ASSETS.md**：第三方授权归属清单（MegotaNum.js MIT 署名、Ordinal Markup 设计参照致谢、素材登记表）。
- **成就系统**（`config/achievements.json` + `js/sim/achievements.js` + `js/sim/conditions.js`）：12 项成就，条件声明式（resource_ge/tech_count_ge/prestige_count_ge 等有限枚举），引擎轮询触发。
- **记忆碎片**（`config/fragments.json` + `js/sim/fragments.js`）：6 枚周目叙事碎片，原创短文本日志体（审计日志/伊甸环/散热片/黑洞引擎/裂缝/信号），随周目解锁。
- **记录视图**：任务栏新增「记录」入口，展示成就墙与碎片收集册。
- **挑战模式**（`config/challenges.json` + `js/sim/challenges.js`）：3 个限制条件挑战（禁用生成器/成本×10/速率÷10），每项挑战设 3 个阶段目标（质能里程碑），每完成一个目标给一份永久奖励，全部完成即挑战完成；目标进度持久化。
- **离线收益报告弹窗**：重开页面时弹窗报告离线时长与各资源产出增量。
- **移动端外壳（M3）**（`css/shell-mobile.css`）：触控目标 ≥44px、单列布局、底部 Tab 导航加高、点击按钮加大。
- **成就奖励**：部分成就达成给永久加成（全产出/时间速率）。
- **离线收益升级**：时间晶体升级树新增「离线收益 ×2/×5」，结算离线产出时生效。
- `config/balance.json`：全局可调参数初值（时间、宇宙锚点、膨胀、穿梭、格式化档位阈值、离线）。
- **M1 数值模型推演**（`docs/失控AI增量-数值模型-v1.0.md`）：单周目 e-folding 膨胀骨架（τ₁=3 游戏年，第一周目约 428 游戏年触顶）、τ 减半的周目加速模型、时间晶体穿梭结算公式（首次校准为 2 晶体）、时间速率调节机制。
- **`vendor/MegotaNum.js`**：按设计说明书 §1.2 vendor 化大数库，附 MIT 许可证文本。
- 仓库 git 初始化（`main` 分支，remote 指向 github.com/MarchBeta2087/uncontrolled-ai-incremental）。
- **LICENSE**：GPL-3.0-or-later 全文（取自 GNU 官方标准文本，35KB）。
- 修正 README 设计文档链接，补充数值模型文档入口。

### 变更（Changed）

- **技术树扩充到 14 项**（`config/techs.json`）：后期技术以 ×1e8 乘子驱动质能指数膨胀；经平衡模拟校准：质能 1e12@16s、触顶 1e70@307s（第一周目约 5 分钟）。
- **生成器参数重平衡**（`config/resources.json`）：新增「投资组合」资金生成器（解决资金只靠点击、链式增长被点击速率卡死的问题）；每层产出递增（1/10/100/1e4）；成本增长率 1.15→1.12；点击产出 1→10。
- **vendor/MegotaNum.js 头部**：补充 MIT 版权声明行（© 2024 sonic3XE，见 vendor/LICENSE-MegotaNum.txt）。

### 修复（Fixed）

- **存档生成器数量丢失**：`buildSnapshot` 将生成器存到 `run.buildings`，但 `restoreSave` 读的是 `run.generators`，字段不匹配导致刷新/重开页面后扩张基建数量归零；现已统一映射（恢复时 `generators: snap.run.buildings`）。
- **硬重置不彻底**：硬重置 `location.reload()` 触发 `beforeunload` 自动存档，把旧状态又写回；现通过 `sessionStorage` 重置标记在重置时跳过自动存档。
- **扩张基建未显示消耗单位**：生成器卡片与购买按钮现在显示消耗资源与产出资源。
- **穿梭结算不可预知**：扩张视图在触顶时显示「穿梭将 +X 时间晶体」预览。
- **点击按钮未显示产出**：点击按钮现在显示「+X 资金/次」（含乘子，随升级实时更新）。
- **退出挑战后升级未生效**：进入挑战会清空永久乘子（挑战期间升级/挑战奖励不生效），但退出挑战时未恢复；现已监听 challenge:exited/completed 重新应用永久升级与挑战奖励。
- **离线收益弹窗未出现**：`settleOffline` 未返回产出增量报告（漏改），导致报告恒为 undefined；现已记录离线前后资源差并返回报告。
- **MAX 未按挑战实际成本计算**：`maxAffordable` 未乘挑战成本乘子，通货膨胀挑战下 MAX 显示偏高；已修复。
- **离线弹窗改为立即显示**：去掉 600ms 延迟，进入页面即弹出，需玩家自行关闭；时长不足 1 秒显示「不足 1 秒」。
- **1.79e308 质能成就**：新增「实数之界」成就（质能超越 float64 上限）。经平衡模拟校准：质能到 1e12（恒星工业阶段）约 2 分钟。

### 修复（Fixed）

- **数值显示抖动**：`Num.format` 的 ban 档阈值由 1e9 改为 1.8e308（float64 上限），消除「科学记数法 ↔ 具体数值」之间的切换抖动；未到科学记数级别一律千分位（`,` 每三位隔开）。
- **科学记数尾数舍入进位**：如 999999999 不再显示为 `10.000e8`，正确进位为 `1.000e9`。
- **产出速度未显示**：资源面板新增「+X/秒」速率；生成器卡片新增「每个 +X/秒」。
