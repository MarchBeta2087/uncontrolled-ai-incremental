# 变更日志

本项目遵循语义化版本（SemVer）。当前处于设计/开发早期，版本号以 0.x 标注未发布状态。

## [未发布]

### 新增（Added）

- **M2 骨架（第一批）**：
  - `js/core/num.js`：Num 适配器（封装 MegotaNum，含修复其 `toJSON` 丢失三元组第三分量导致 roundtrip 丢精度的 bug）。
  - `js/core/events.js`：事件总线。
  - `js/core/time.js`：时间系统（双时间轴、速率乘子与软上限、分级显示 full/year/scientific/ban、Date 溢出降级）。
  - `js/data/save.js`：存档管理（localStorage 读写、导出/导入、校验、迁移链、schemaVersion 拒绝）。
- `config/balance.json`：补充 `format.numberSciThreshold` / `numberBanThreshold`（资源数值格式化阈值）。
- **M1 数值模型推演**（`docs/失控AI增量-数值模型-v1.0.md`）：单周目 e-folding 膨胀骨架（τ₁=3 游戏年，第一周目约 428 游戏年触顶）、τ 减半的周目加速模型、时间晶体穿梭结算公式（首次校准为 2 晶体）、时间速率调节机制。
- **`config/balance.json`**：全局可调参数初值（时间、宇宙锚点、膨胀、穿梭、格式化、离线）。
- **`vendor/MegotaNum.js`**：按设计说明书 §1.2 vendor 化大数库，附 MIT 许可证文本。
- 仓库 git 初始化（`main` 分支，remote 指向 github.com/MarchBeta2087/uncontrolled-ai-incremental）。
- **LICENSE**：GPL-3.0-or-later 全文（取自 GNU 官方标准文本，35KB）。
- 修正 README 设计文档链接，补充数值模型文档入口。

### 变更（Changed）

- 无。

### 修复（Fixed）

- 无。
