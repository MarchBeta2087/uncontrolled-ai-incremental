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
- `config/balance.json`：全局可调参数初值（时间、宇宙锚点、膨胀、穿梭、格式化档位阈值、离线）。
- **M1 数值模型推演**（`docs/失控AI增量-数值模型-v1.0.md`）：单周目 e-folding 膨胀骨架（τ₁=3 游戏年，第一周目约 428 游戏年触顶）、τ 减半的周目加速模型、时间晶体穿梭结算公式（首次校准为 2 晶体）、时间速率调节机制。
- **`vendor/MegotaNum.js`**：按设计说明书 §1.2 vendor 化大数库，附 MIT 许可证文本。
- 仓库 git 初始化（`main` 分支，remote 指向 github.com/MarchBeta2087/uncontrolled-ai-incremental）。
- **LICENSE**：GPL-3.0-or-later 全文（取自 GNU 官方标准文本，35KB）。
- 修正 README 设计文档链接，补充数值模型文档入口。

### 变更（Changed）

- 无。

### 修复（Fixed）

- 无。
