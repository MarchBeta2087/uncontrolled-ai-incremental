# 待办事项（TODO）

> **阅读约定**
> - 本文件只列**版本内、可执行**的任务；勾选表示已完成。
> - **长期开放 / 外部依赖**（多语言母语者复核、素材征集、v2.0 红线三条件）**不阻塞发布**，统一见 [docs/开放任务.md](docs/开放任务.md) 与 [Discussion #67](https://github.com/MarchBeta2087/uncontrolled-ai-incremental/discussions/67)。
> - 当前状态：**v0.5.1 已发布；v0.6.0「庞加莱纪」功能全部完成，待发版。**

---

## 下一步：发布 v0.6.0

> 步骤见 [docs/分支与发布流程.md](docs/分支与发布流程.md) §3。

- [ ] `CHANGELOG`：将 `[Unreleased]` 定版为 `[0.6.0]`
- [ ] `config/versions.json`：补 `0.6.0` 的 `releasedAt`（移除 `unreleased: true`）
- [ ] `README`：状态行更新为「v0.6.0 可玩版本」
- [ ] `js/ui/app.js`：`VERSION` 更新为 `0.6.0`
- [ ] `dev → main` PR → tag `v0.6.0` → Pages 部署

## 待办（版本内 / maintainer 可执行）

_（暂无。新功能请先开 Issue 讨论后再进本区。）_

## v0.6 庞加莱纪（Issue #51）—— 功能完成

设计见 [docs/v0.6-庞加莱纪设计.md](docs/v0.6-庞加莱纪设计.md)；分批推进。

- [x] **PR A**：eee 记法档位（`Num.format` + 设置面板 + 5 语言）
- [x] **PR B**：第三阶段引擎地基（箭塔容器 + `cap_tetrate` + 阶段解锁 + 存档 v7）
- [x] **PR C**：第三阶段内容与平衡（cap-link + 技术树 12 项 + balance-sim `--phase3` + [docs/v0.6-平衡模拟.md](docs/v0.6-平衡模拟.md)）
- [x] **第三阶段物理 pacing**：时间闸门（`cycleSeconds`，每层 ≈ 2min）+ 存档 v8
- [x] **PR D**：小游戏（PONG / 扫雷 / 贪吃蛇 / 2048；Canvas 手写零素材 + 配置驱动 + 成就 + 永久增益 + 存档 v9）
- [x] **PR E**：新挑战 ×3 + 记忆碎片 ×3 + 庞加莱回归事件（到达即触发）+ 成就「又见初始」+ 全语言 i18n
- [x] **终局重构**：舍入纪双结局降为中途节点（保留插图）+ 庞加莱终章（单选收束，PIL 插图 `ending-recurrence.png`）
- [x] **数字格式**：`Intl` 分组/小数分隔符（fr/es/pt/hi/ar）+ 中文「万/亿」可选
- [x] **彩蛋语录条**（Issue #52）：`config/quotes.json`（8 条）+ 任务栏上方细条轮播 + 成就「博览群书」+ 存档 v11
- [x] **素材**：音频包（7 音效 + BGM，`tools/audio-gen.py`）+ 结局像素画细化（`tools/ending-art.py`）
- [x] **文档同步**：README / ADR-004 / 设计说明书·数值模型导读 / 游戏内版本记录「开发中」条目

---

## 历史版本（已完成，供追溯）

### M1 / M2 基线（v0.1–v0.3）

- [x] M1 数值模型推演
- [x] M2 MVP 核心闭环（资源/科技/穿梭/存档）
- [x] 时间晶体升级树
- [x] MAX ALL 购买
- [x] 成就系统（27 项 → 现 33 项）
- [x] 记忆碎片（12 枚 → 现 15 枚）
- [x] 设置页面（存档管理 + 关于）
- [x] 挑战模式（5 项 → 现 8 项）
- [x] 离线收益报告弹窗
- [x] 移动端外壳（M3）：触控尺寸、单列布局、底部 Tab 导航
- [x] GitHub Pages 部署 + CI/CD
- [x] 数值模型文档修订（拆解预算与实际实现对齐）

### v0.4 第二阶段（越过本宇宙）

设计见 [docs/v0.4-第二阶段设计.md](docs/v0.4-第二阶段设计.md)。

- [x] 引擎地基：动态上限（`cap_mult`）、晶体乘子（`crystal_mult`）、永久技术、一次性解锁、存档 v3 + 迁移
- [x] 内容：35 项技术 + 暗能量系统（资源/生成器/技术）+ 5 项时间晶体升级
- [x] UI：分阶段展示、锁与解锁反馈、动态上限；内容本地化
- [x] 成就 +8、记忆碎片 +3、挑战 +2 + 新条件/限制类型
- [x] 修复：宇宙上限封顶 float64、ban 记法截断 3 位小数
- [x] 设置界面配色调节（4 套预设 + 自定义强调色）
- [x] Endgame 画面（触发：第二阶段技术全部研发完成）
- [x] `tools/balance-sim.mjs` + [docs/v0.4-平衡模拟.md](docs/v0.4-平衡模拟.md)
- [x] 第二阶段平衡校准（约 1–7 分钟/层）

### v0.5 多宇宙（越过单个宇宙）

设计见 [docs/v0.5-多宇宙设计.md](docs/v0.5-多宇宙设计.md)。

- [x] 引擎地基：`config/universes.json` + `js/sim/universe.js` / `singularity.js`、`getUniverseCap` 目标封顶、第二阶段成本宇宙缩放、`universe_ge`/`seeds_ge` 条件、存档 v4 + 迁移
- [x] UI：标题栏宇宙编号、扩张视图「奇点 / 多宇宙」面板、多语言文案
- [x] 跨宇宙升级树扩容 + 成就 + 碎片（口袋纪 ×3）
- [x] `balance-sim` 多宇宙扩展 + [docs/v0.5-平衡模拟.md](docs/v0.5-平衡模拟.md)
- [x] 宇宙背景 `hue-rotate` 换皮（九宇宙 1–9）
- [x] [docs/v0.5-高宇宙平衡评估.md](docs/v0.5-高宇宙平衡评估.md)：第 7/8 宇宙停滞诊断 + `difficultyExponent` 修复

### v0.5.0 舍入纪（原 v0.6，已并入；见 ADR-001 / ADR-002）

- [x] 大数记法 `ee` / loglog（含四位小数）
- [x] 双结局 + 终局条件修正
- [x] 音频基建 + 跃迁 sting
- [x] 字体基建：SevenFifteen 备用字体（CC BY 4.0；ADR-002）

### v0.5.1（补丁）

- [x] 设置分栏（设置 / 关于 / 版本记录）+ UTC / 北京双轨甘特图
- [x] 成就「指数百万」「第九口袋 · 舍入纪」；结局图接入管道
- [x] 时间倍增（宇宙 ≥3；冷却 3 物理秒；跃迁重置）
- [x] 取消时间速率软上限
- [x] 存档 `schemaVersion 5 → 6` + 迁移
- [x] 修复：多宇宙面板本地化、科学记数指数千分位、按钮像素字体、标签页标题本地化

### 素材与多语言

> 原「v0.6 舍入纪」的剩余素材类事项（已并入 v0.5.0 / v0.6）。

- [x] 印地语界面（`hi`）
- [x] 阿拉伯语界面（RTL + 内容 + 双数字系统）
- [x] 法语 / 西班牙语 / 葡萄牙语界面（fr / es / pt）
- [x] 结局过场像素画 ×3（程序生成细化版；征集见「长期开放」）
- [x] 音频素材包（7 音效 + BGM）

### 多语言 / i18n

- [x] 缝合像素字体（12px，全语言字形），按 `data-lang` 切换
- [x] i18n 基础设施（注册表 + `t()`/`tc()` + 继承链 + localStorage）
- [x] 简体中文 UI 外壳全部接入 `t()`
- [x] 词典 7 基础语言 + 阿拉伯语 / 法语 / 西语 / 葡语 / 印地语（共 12）
- [x] 游戏内容本地化（`js/i18n/content/`）
- [x] sim 层 `reason` 本地化
- [x] 数字格式（可选）：`Intl` 分组/小数分隔符 + 中文「万/亿」

### 远期 / 备选（已完成项）

- [x] 多结局（无约束线 / 约束线）→ 现为中途节点（见终局重构）
- [x] 音频基建与跃迁 sting
- [x] 音频素材包（OGG 替换 synth；BGM 循环 + 设置开关）
- [x] 音乐 / 美术素材包（音乐已入库；美术以 Logo / 星场 / 结局图 / 像素字体为准）
- [x] 彩蛋 / 隐藏内容（滚动语录条）
- [x] 文档同步约定（CONTRIBUTING §8 + PR 模板 + `docs/archived/`）

---

## 长期开放 / 外部依赖（不阻塞发布）

> 见 [docs/开放任务.md](docs/开放任务.md)。以下条目**不计入版本完成度**，不阻塞任何发布；仅作跟踪。

- [ ] **多语言母语者复核**（除简体中文外的全部语言：zh-Hant / ja / ko / en / ar / fr / es / pt / hi）——长期开放，[Discussion #67](https://github.com/MarchBeta2087/uncontrolled-ai-incremental/discussions/67)
- [ ] **结局过场像素画 ×3 素材征集**（手绘替换程序细化版）
- [ ] **v2.0 红线三条件**（见 [ADR-003](docs/决策记录.md)）：
  - [ ] 条件 1：metanum [Issue #17](https://github.com/dlsdl/metanum/issues/17) 被关闭**且修复随发布版可用**
  - [ ] 条件 2：PowiainaNum.js [Issue #19](https://github.com/VeryrrDefine/PowiainaNum.js/issues/19) 关闭，仓库内出现 OSI 批准许可证文本
  - [ ] 条件 3：出现强于/相当于 PowiainaNum.js（$f_{\omega^3+1}$）、兼容 GPL-3.0-or-later 且无严重 Bug 的大数库（含本项目自造 HeptoNum.js）
  - [ ] （分支 B）HeptoNum.js：记号规范文档 → 实现 → 与 MegotaNum 在 $f_{\omega^2+1}$ 以下差分测试 → MIT 发布
- [ ] 每版本评审时例行扫描三条件状态（maintainer）
