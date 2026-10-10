# 素材与第三方授权归属（ASSETS）

本项目三层授权结构（见需求分析 §9、设计说明书 §13）：

| 内容 | 许可证 |
|---|---|
| 代码 | GPL-3.0-or-later（见 `LICENSE`） |
| 游戏素材（美术/音乐等） | CC BY-SA 4.0 |
| 字体 | SIL OFL 1.1（单独授权） |

---

## 第三方库

| 库 | 版本 | 许可证 | 版权 | 位置 |
|---|---|---|---|---|
| MegotaNum.js | α 1.0.0 | MIT | © 2024 sonic3XE | `vendor/MegotaNum.js`（附 `vendor/LICENSE-MegotaNum.txt`） |

> MegotaNum.js 文件头部注明其内部借鉴了 Decimal.js 的代码片段与模板（Decimal.js 亦为 MIT 许可），详见其上游仓库与许可证。

## 设计参照（非代码/素材复制，仅参考游戏机制）

| 项目 | 用途 | 许可证 |
|---|---|---|
| Ordinal Markup | 参考"重置循环（Prestige）"结构设计 | MIT（© 2020 Patcail） |

> 仅借鉴游戏机制设计理念（思想不受版权保护），未复制其任何代码、素材或文案，故无需署名；此处仅作透明致谢。

---

## 游戏素材（美术 / 音乐 / 音效）

*当前尚未引入任何游戏素材。*

素材入库须遵守 [docs/素材与授权规则-v1.1.md](docs/素材与授权规则-v1.1.md)，并在下表逐条登记：

| 文件 | 作者 | 来源 | 许可证 | 获取日期 | 修改说明 |
|---|---|---|---|---|---|
| （待填） | | | | | |

## 字体

字体以 SIL OFL 1.1 授权入库，置于 `assets/fonts/`，并附各自 OFL 许可证文本；遵守保留字体名（Reserved Font Name）条款。

| 字体 | 版本 | 许可证 | 版权 | 位置 |
|---|---|---|---|---|
| 缝合像素字体（Fusion Pixel Font）12px 比例/等宽 · 全语言字形 | 2026.09.25 | SIL OFL 1.1 | © 2022 TakWolf | `assets/fonts/fusion-pixel/`（附 `OFL.txt`） |

> 来源：<https://github.com/TakWolf/fusion-pixel-font>。已入库 12px 的 7 种语言字形（latin / zh-hans / zh-hant / zh-hk / zh-tw / ja / ko）× 比例/等宽两种模式，共 14 个 `.otf.woff2`。字体未做任何修改，故沿用原字体名（Fusion Pixel），符合 OFL 保留字体名条款。仅通过 `css/fonts.css` 按 `data-lang` 切换引用。
