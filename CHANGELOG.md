# 变更日志

本项目遵循语义化版本（SemVer）。当前处于设计/开发早期，版本号以 0.x 标注未发布状态。

## [未发布]

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
- **穿梭结算不可预知**：扩张视图在触顶时显示「穿梭将 +X 时间晶体」预览。经平衡模拟校准：质能到 1e12（恒星工业阶段）约 2 分钟。

### 修复（Fixed）

- **数值显示抖动**：`Num.format` 的 ban 档阈值由 1e9 改为 1.8e308（float64 上限），消除「科学记数法 ↔ 具体数值」之间的切换抖动；未到科学记数级别一律千分位（`,` 每三位隔开）。
- **科学记数尾数舍入进位**：如 999999999 不再显示为 `10.000e8`，正确进位为 `1.000e9`。
- **产出速度未显示**：资源面板新增「+X/秒」速率；生成器卡片新增「每个 +X/秒」。
