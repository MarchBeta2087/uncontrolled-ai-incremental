<!-- 目标分支请选择 dev（不是 main）。详见 CONTRIBUTING.md 与 docs/分支与发布流程.md -->

## 改动说明

<!-- 做了什么、为什么。关联 Issue：Closes #___ -->

## 类型

- [ ] feat 新功能
- [ ] fix 修复
- [ ] docs 文档
- [ ] chore 杂务 / CI
- [ ] refactor 重构
- [ ] balance 数值平衡

## 自检清单

- [ ] 目标是 `dev` 分支，且已从最新 `dev` 切出
- [ ] 遵守分层架构；数值运算一律走 Num 适配器
- [ ] 新内容走 JSON 配置，效果类型已在引擎注册
- [ ] 可调数值进 `balance.json`，未把数值写死在代码里
- [ ] 改动关键公式已更新 `test/smoke.mjs` 回归
- [ ] 改动存档结构已加 `schemaVersion` 迁移（旧档可读）
- [ ] 新增 UI/内容文案已接入 `t()` / `tc()`，并补齐所有已实装语言
- [ ] 含素材：已按[素材与授权规则](docs/素材与授权规则-v1.1.md)核实许可证，并在 `ASSETS.md` 登记
- [ ] 本地 `node test/smoke.mjs` 通过

## 截图 / 备注（可选）
