# 素材与第三方授权归属（ASSETS）

本项目三层授权结构（见需求分析 §9、设计说明书 §13）：

| 内容 | 许可证 |
|---|---|
| 代码 | GPL-3.0-or-later（见 `LICENSE`） |
| 游戏素材（美术/音乐等） | CC BY-SA 4.0 |
| 字体 | SIL OFL 1.1 或兼容 CC BY-SA 4.0 的许可证（如 CC BY 4.0） |

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

素材入库须遵守 [docs/素材与授权规则-v1.3.md](docs/素材与授权规则-v1.3.md)，并在下表逐条登记：

> 当前音效由 **Web Audio 合成**（`config/audio.json` 的 `synth` 字段），尚未引入音频素材；后续引入音频素材时置于 `assets/audio/`，并按本文件与素材规则登记。

| 文件 | 作者 | 来源 | 许可证 | 获取日期 | 修改说明 |
|---|---|---|---|---|---|
| assets/images/starfield-bg.png | NASA/JPL-Caltech/ESA/CXC/STScI | <https://commons.wikimedia.org/wiki/File:Center_of_the_Milky_Way_Galaxy_IV_%E2%80%93_Composite.jpg> | Public domain（PDM） | 2026-10-11 | 缩小至 480×240（最近邻）、限色 11 色、压暗偏蓝、边缘暗角融合 #0d1117 |
| `favicon.ico` + `assets/images/logo.png` + `assets/images/logo.xcf` | MarchBeta2087 | 项目维护者原创 | CC BY-SA 4.0 | 2026-10-11 | `logo.png` 原样（64×64）；`favicon.ico` 由 `logo.png` 生成（16/32/48/64，最近邻）；`logo.xcf` 为 GIMP 源文件 |
| assets/images/ending-constrained.png | MarchBeta2087（项目维护者） | 程序生成（`tools/ending-art.py`） | CC BY-SA 4.0 | 2026-10-11 | 192×108 像素合成（约束线结局过场）；可修改源脚本随仓库 |
| assets/images/ending-unconstrained.png | MarchBeta2087（项目维护者） | 程序生成（`tools/ending-art.py`） | CC BY-SA 4.0 | 2026-10-11 | 192×108 像素合成（无约束线结局过场）；可修改源脚本随仓库 |
| assets/images/ending-recurrence.png | MarchBeta2087（项目维护者） | 程序生成（`tools/ending-art.py`） | CC BY-SA 4.0 | 2026-10-12 | 192×108 像素合成（庞加莱终章过场：幂塔 + 回归环 + 首行日志）；可修改源脚本随仓库 |

## 字体

字体优先以 SIL OFL 1.1 授权入库；亦接受与 CC BY-SA 4.0 兼容的许可证（如 **CC BY 4.0**），须署名并附许可证文本。字体文件置于 `assets/fonts/`；OFL 字体遵守保留字体名（Reserved Font Name）条款。

| 字体 | 版本 | 许可证 | 版权 | 位置 |
|---|---|---|---|---|
| 缝合像素字体（Fusion Pixel Font）12px 比例/等宽 · 全语言字形 | 2026.09.25 | SIL OFL 1.1 | © 2022 TakWolf | `assets/fonts/fusion-pixel/`（附 `OFL.txt`） |
| SevenFifteen Mono Rounded（备用像素字体） | 0.013 | **CC BY 4.0** | © 2024 Douglas Vautour（Burpy Fresh） | `assets/fonts/seven-fifteen/`（附 `LICENSE.txt`；TTF → WOFF2 子集） |

> 来源：<https://github.com/TakWolf/fusion-pixel-font>。已入库 12px 的 7 种语言字形（latin / zh-hans / zh-hant / zh-hk / zh-tw / ja / ko）× 比例/等宽两种模式，共 14 个 `.otf.woff2`。字体未做任何修改，故沿用原字体名（Fusion Pixel），符合 OFL 保留字体名条款。仅通过 `css/fonts.css` 按 `data-lang` 切换引用。
>
> **SevenFifteen** 来源：<https://burpyfresh.itch.io>（SevenFifteen-V0_013）。作为**备用字体**置于字体族末尾（优先级 **Fusion > SevenFifteen**），用于覆盖 Fusion 缺失的**天城文（印地语，含连字）/ 阿拉伯（含连写）/ 希腊 / 西里尔 / 希伯来 / 泰文**等。已由 TTF 子集化为 WOFF2（3.0 MB → 107 KB），字形与 OpenType 布局未改动。CC BY 4.0 要求署名：Douglas Vautour (Burpy Fresh)。
