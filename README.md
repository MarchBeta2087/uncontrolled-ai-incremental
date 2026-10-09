# 失控 AI 增量（Uncontrolled AI Incremental）

> 🎮 **当前状态：v0.2.1 可玩版本** —— 已部署于 GitHub Pages：[https://marchbeta2087.github.io/uncontrolled-ai-incremental/](https://marchbeta2087.github.io/uncontrolled-ai-incremental/)，点开即玩。

一款以"失控 AI 吞掉整个宇宙"为主题的增量游戏（incremental game）。你从 UTC 2028-01-01 0:00 起步，投入研发、加速扩张，直到耗尽整个可观测宇宙的资源——然后撕开因果闭环的裂缝，把时间线回卷到起点，带着**时间晶体**进入下一周目。周目越来越快，直到信号抵达裂缝的另一端。

## 玩法

- **核心循环**：点击/自动产出 → 研发技术 → 扩张基建 → 质能触顶（1e70 J）
- **时空穿梭（Prestige）**：清空物质、保留知识，获得时间晶体购买永久升级
- **时间晶体升级树**：全产出乘子 + 时间速率乘子（永久，穿梭保留）
- **挑战模式**：3 项限制条件挑战（禁用生成器 / 成本 ×10 / 速率 ÷10），每项 3 个阶段目标、逐级奖励
- **成就系统**：13 项声明式成就
- **记忆碎片**：6 枚周目叙事碎片（原创短文本日志体）
- **时间轴**：初始速率 1 物理秒 = 10000 游戏秒；分级显示（完整日期 → 仅年份 → 科学记数 → MegotaNum 记法）
- **离线收益**：离线结算 + 重开页面弹窗报告
- **存档**：localStorage + 导出/导入/硬重置

## 运行

**线上版**：[https://marchbeta2087.github.io/uncontrolled-ai-incremental/](https://marchbeta2087.github.io/uncontrolled-ai-incremental/)

**本地运行**（纯静态站点，无构建、无安装；因浏览器会拦截 `file://` 下的 fetch，需本地服务器）：

```bash
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 技术路线

原生 JavaScript（无框架、无构建链）+ [MegotaNum.js](https://github.com/sonic3XE/MegotaNum.js) 大数库；桌面外壳（仿 Windows）已完成，移动端外壳待做；存档存于浏览器 localStorage。

## 文档

| 文档 | 说明 |
|---|---|
| [需求分析](docs/失控AI增量-需求分析-v1.2.md) | 做什么 |
| [可行性分析](docs/失控AI增量-可行性分析-v1.1.md) | 能不能做 |
| [设计说明书](docs/失控AI增量-设计说明书-v1.2.md) | 怎么做 |
| [数值模型](docs/失控AI增量-数值模型-v1.0.md) | 膨胀曲线、时间速率、穿梭结算 |
| [素材与授权规则](docs/素材与授权规则-v1.0.md) | 素材入库规范 |
| [待办事项](TODO.md) | 路线图 |

## 贡献

欢迎 Issue 和 PR，见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

**随便玩、随便 fork、随便自己改着玩。** 本项目代码以 GPL-3.0-or-later 许可证发布：如果你基于本项目向公众发布（哪怕只是挂在网上）一个游戏，请同步公开你的源代码。玩家无需关心许可证细节，点开即玩。

- 代码：GPL-3.0-or-later（详见 [LICENSE](LICENSE)）
- 游戏素材：CC BY-SA 4.0（详见 ASSETS.md）
- 字体：SIL OFL 1.1（详见 ASSETS.md）
