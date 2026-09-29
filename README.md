---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: cf39b019f7b5dc24daabe04594d78564_e62c8520b1d811f19482525400393706
    ReservedCode1: ggmJyEyowPPgSOh000bzMYJXUYuEhdqM0Z6R6OHj9gVeklIKorx16JEqz3YpdExD5mmjJfHQBEGIIrBIySmFbo8c07AWXUcx6/yKaJCqbfIoCW9PJ0nd9vDSBdmOE2d7WyQEyziiHqvaKdHl4PRrfFeoPaG9/3reMZQRHVt4/4DPlC5qknDpUq2rpDc=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: cf39b019f7b5dc24daabe04594d78564_e62c8520b1d811f19482525400393706
    ReservedCode2: ggmJyEyowPPgSOh000bzMYJXUYuEhdqM0Z6R6OHj9gVeklIKorx16JEqz3YpdExD5mmjJfHQBEGIIrBIySmFbo8c07AWXUcx6/yKaJCqbfIoCW9PJ0nd9vDSBdmOE2d7WyQEyziiHqvaKdHl4PRrfFeoPaG9/3reMZQRHVt4/4DPlC5qknDpUq2rpDc=
---

# 电动自行车换电行业趋势发展综合分析看板

## 在线访问

- 本站看板（在线）：https://karry75.github.io/exchange-trend-dashboard/
- 全部看板作品集（导航页）：https://karry75.github.io/dashboard-portal/

## 技术速览

- **形态**：单文件静态看板（HTML + JavaScript + ECharts），数据以离线快照形式随页面加载，纯前端渲染、无后端依赖。
- **原理**：业务库（阿里云 AnalyticDB）→ Python 抽取/构建管线 → 脱敏聚合快照 → 静态页面；页面打开即渲染，支持按维度筛选与下钻。
- **用途**：电动自行车换电行业趋势发展综合分析看板：行业规模、政策与竞争格局。
- **脱敏**：公开发布版本已移除数据库连接信息、账号口令与个人敏感字段，仅保留聚合指标。


面向换电行业（电动自行车换电/两轮车换电）的一站式业务综合分析看板，覆盖**设备资产、用户与套餐生命周期、运营数据、场景点位、经营财务、数字化与运维能力、行业趋势**七大主题，共 9 个页面。

## 核心特性

- **离线可用**：看板不直连数据库，只读取本地 `snapshots/latest.json` 快照。连接数据库采集一次后，即使断网也能正常打开看板、查看最后一次采集的数据。
- **深色科技风**：ECharts 本地化渲染，图表丰富（柱/折/饼/环/漏斗/雷达/仪表/双轴），移动端可用。
- **可追溯**：每次采集自动保留时间戳归档（最多 30 份），可查看历史数据。

## 快速开始

```bash
# 1. 启动看板（离线预览，使用当前快照）
python app.py
# 打开 http://127.0.0.1:8097/

# 2.（可选）连接数据库采集真实数据
#    先探测库表结构、校准表名
python collect.py --probe
#    校准后全量采集并写入快照（自动更新 latest.json）
python collect.py
```

## 目录结构

```
exchange_trend_dashboard/
├── app.py                 # Flask 主程序（端口 8097，可用环境变量 PORT 覆盖）
├── db_connector.py        # 数据库连接器（MySQL/阿里云ADS + MongoDB）
├── snapshot_store.py      # 快照读写层（latest.json + 时间戳归档）
├── collect.py             # 在线采集脚本（--probe 探测 / 全量采集）
├── mock_snapshot.py       # 演示数据生成器（离线预览用）
├── snapshots/
│   ├── latest.json        # 当前生效快照（看板数据源）
│   └── 20260916_*.json    # 历史归档
├── static/
│   ├── css/style.css      # 深色科技风样式
│   ├── js/app.js          # 前端渲染引擎（ECharts）
│   ├── js/echarts.min.js  # 本地 ECharts（无外网依赖）
│   └── favicon.svg
└── templates/index.html   # 看板页面骨架（9 个 Tab）
```

## 看板模块（9 Tab）

| Tab | 核心内容 |
|-----|---------|
| 总览驾驶舱 | 核心 KPI、收入/成本/净利趋势、订单趋势、城市分布、设备结构、健康雷达 |
| 设备资产 | 柜体/电池结构、交付漏斗、在线率趋势、电池寿命/SOH/循环、回本周期、采购价趋势 |
| 用户与套餐 | 用户增长/新增流失、套餐结构与收入、生命周期漏斗、套餐明细表、续费/流失、使用强度、首换时长 |
| 运营数据 | 订单趋势、单柜产能、24h时段、换电频次、故障结构、在线率、低效/僵尸设备仪表 |
| 场景点位 | 场景分布与效率、城市点位、合作期限、到期预警、分成模式、点位分级与质量 |
| 经营财务 | 月度 P&L、收入构成、成本结构、盈亏平衡达成、CAC/LTV、单柜经济模型、预收款池 |
| 数字化与运维 | 数字化能力评分、IoT 健康雷达、运维雷达、运维模式、告警→工单链路、工单漏斗 |
| 行业趋势 | 市场规模、渗透率、政策里程碑时间线、竞争格局、技术路线、行业洞察 |
| 数据说明 | 快照信息、离线机制说明、指标口径、历史归档 |

## 连接数据库（明天内网操作指引）

1. 修改 `db_connector.py` 中的连接信息（MySQL：阿里云 AnalyticDB `sharing-citybike-pro` 业务库 + `sharing-system-base-pro` 基础库；MongoDB：dudubox-online）。
2. 运行 `python collect.py --probe`，核对探测出的物理表名与 `collect.py` 中映射的 `物理表名` 是否一致；不一致则修改后重试。
3. 运行 `python collect.py` 全量采集，采集完成自动写入 `snapshots/latest.json`。
4. 刷新 `http://127.0.0.1:8097/` 即可看到真实数据；之后断网仍可查看本次采集结果。

> 采集逻辑按模块隔离，单个模块失败不影响其他模块（日志记录在 temp/collect.log）。
*（内容由AI生成，仅供参考）*
