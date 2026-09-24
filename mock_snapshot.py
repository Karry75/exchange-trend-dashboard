# -*- coding: utf-8 -*-
"""
mock_snapshot.py - 示例快照生成器
==================================
未连接内网数据库时，生成一套业务自洽的演示数据，
保证看板在任何环境都能完整展示全部图表（简历演示 / 离线预览）。
运行：python mock_snapshot.py
"""
import random
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from snapshot_store import save_snapshot

random.seed(20260916)

# ---------- 基础参数（与框架文档口径一致） ----------
CITIES = ["深圳", "杭州", "阳朔", "广州", "东莞"]
CITY_WEIGHT = {"深圳": 0.38, "杭州": 0.24, "阳朔": 0.12, "广州": 0.16, "东莞": 0.10}
TOTAL_CABINETS = 6260          # 柜体总数（框架文档：仓库2147台 ≈ 34.3%）
WAREHOUSE_RATIO = 0.343        # 仓库闲置比例
TOTAL_BATTERIES = 37500        # 电池总数
BATTERY_PER_CABINET = round(TOTAL_BATTERIES / TOTAL_CABINETS, 1)


def city_split(total):
    out = []
    for c in CITIES:
        out.append({"name": c, "value": round(total * CITY_WEIGHT[c])})
    return out


# ---------- 1. 总览 ----------
def build_overview():
    total_users = 48600
    active_users = 31200
    month_revenue = 1865000
    month_cost = 1321000
    month_order = 918000
    cabinets_online = TOTAL_CABINETS - int(TOTAL_CABINETS * WAREHOUSE_RATIO) - 130
    cabinets_online_rate = round(cabinets_online / TOTAL_CABINETS * 100, 1)
    online_rate = 96.4  # 已上线设备的在线率
    return {
        "kpis": {
            "total_cabinets": TOTAL_CABINETS,
            "cabinets_online": cabinets_online,
            "online_rate": online_rate,
            "total_batteries": TOTAL_BATTERIES,
            "battery_per_cabinet": BATTERY_PER_CABINET,
            "warehouse_ratio": round(WAREHOUSE_RATIO * 100, 1),
            "total_users": total_users,
            "active_users": active_users,
            "month_new_users": 2140,
            "month_churn_rate": 3.2,
            "month_revenue": month_revenue,
            "month_cost": month_cost,
            "month_profit": month_revenue - month_cost,
            "gross_margin": round((month_revenue - month_cost) / month_revenue * 100, 1),
            "month_orders": month_order,
            "daily_orders_per_cabinet": round(month_order / 30 / cabinets_online, 1),
            "arpu": round(month_revenue / active_users, 1),
            "ltv": 1860,
            "cac": 86,
            "breakeven_ratio": 68.5,
            "advance_balance": 2450000,
            "refund_rate": 1.8,
            "bad_debt_rate": 0.6,
        },
        "revenue_trend": [  # 近12个月收入/成本/净利
            {"month": "2025-10", "revenue": 1420000, "cost": 1080000},
            {"month": "2025-11", "revenue": 1458000, "cost": 1105000},
            {"month": "2025-12", "revenue": 1512000, "cost": 1130000},
            {"month": "2026-01", "revenue": 1480000, "cost": 1150000},
            {"month": "2026-02", "revenue": 1395000, "cost": 1095000},
            {"month": "2026-03", "revenue": 1560000, "cost": 1180000},
            {"month": "2026-04", "revenue": 1625000, "cost": 1210000},
            {"month": "2026-05", "revenue": 1688000, "cost": 1245000},
            {"month": "2026-06", "revenue": 1710000, "cost": 1265000},
            {"month": "2026-07", "revenue": 1768000, "cost": 1290000},
            {"month": "2026-08", "revenue": 1820000, "cost": 1308000},
            {"month": "2026-09", "revenue": 1865000, "cost": 1321000},
        ],
        "order_trend": [
            {"month": "2025-10", "orders": 706000}, {"month": "2025-11", "orders": 721000},
            {"month": "2025-12", "orders": 749000}, {"month": "2026-01", "orders": 733000},
            {"month": "2026-02", "orders": 688000}, {"month": "2026-03", "orders": 772000},
            {"month": "2026-04", "orders": 805000}, {"month": "2026-05", "orders": 836000},
            {"month": "2026-06", "orders": 849000}, {"month": "2026-07", "orders": 873000},
            {"month": "2026-08", "orders": 896000}, {"month": "2026-09", "orders": 918000},
        ],
        "city_distribution": city_split(TOTAL_CABINETS),
        "device_type_ratio": [
            {"name": "换电柜-水消防", "value": 4100},
            {"name": "换电柜-气溶胶", "value": 2160},
            {"name": "电池-4824", "value": 24800},
            {"name": "电池-4814", "value": 12657},
            {"name": "电池-钠电", "value": 43},
        ],
        "user_city_ratio": city_split(total_users),
    }


# ---------- 2. 设备资产 ----------
def build_assets():
    months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
              "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    return {
        "device_type_ratio": [
            {"name": "换电柜-水消防", "value": 4100},
            {"name": "换电柜-气溶胶", "value": 2160},
            {"name": "电池-4824", "value": 24800},
            {"name": "电池-4814", "value": 12657},
            {"name": "电池-钠电", "value": 43},
        ],
        "cabinet_slot_ratio": [  # 柜型结构
            {"name": "12口柜", "value": 9}, {"name": "6口柜", "value": 2850},
            {"name": "4口柜", "value": 2210}, {"name": "3口柜", "value": 1191},
        ],
        "city_devices": city_split(TOTAL_CABINETS),
        "delivery_funnel": [  # 采购→交付→安装→上线→运营
            {"stage": "已采购", "value": 6800},
            {"stage": "已交付", "value": 6510},
            {"stage": "已安装", "value": 6340},
            {"stage": "已上线", "value": 6110},
            {"stage": "在线运营", "value": 5980},
        ],
        "online_rate_trend": [
            {"month": m, "online_rate": round(random.uniform(93.5, 97.2), 1),
             "online_cabinets": int(TOTAL_CABINETS * (0.92 + i * 0.004))}
            for i, m in enumerate(months)
        ],
        "age_structure": [  # 使用年限结构
            {"name": "1年以内", "value": 2310},
            {"name": "1-2年", "value": 1960},
            {"name": "2-3年", "value": 1320},
            {"name": "3年以上", "value": 670},
        ],
        "soh_distribution": [
            {"name": "SOH≥90%", "value": 24100},
            {"name": "SOH 80-90%", "value": 8950},
            {"name": "SOH 70-80%", "value": 3300},
            {"name": "SOH<70%", "value": 1150},
        ],
        "cycle_distribution": [  # 电池循环次数分布
            {"name": "≤300次", "value": 14800},
            {"name": "300-600次", "value": 12100},
            {"name": "600-900次", "value": 7600},
            {"name": ">900次", "value": 3000},
        ],
        "battery_ratio": {
            "battery_per_cabinet": BATTERY_PER_CABINET,
            "warehouse_cabinets": int(TOTAL_CABINETS * WAREHOUSE_RATIO),
            "warehouse_ratio": WAREHOUSE_RATIO * 100,
            "avg_age_years": 1.4,
            "design_life_years": 5,
            "avg_battery_life_years": 2.0,
        },
        "payback_period": [  # 各城市单柜回本周期（月）
            {"city": "深圳", "value": 16.2},
            {"city": "杭州", "value": 18.5},
            {"city": "广州", "value": 19.8},
            {"city": "东莞", "value": 21.3},
            {"city": "阳朔", "value": 24.6},
        ],
        "brand_ratio": [
            {"name": "品牌A", "value": 42}, {"name": "品牌B", "value": 31},
            {"name": "品牌C", "value": 18}, {"name": "品牌D", "value": 9},
        ],
        "purchase_price_trend": [  # 单柜/单块电池采购均价趋势（元）
            {"month": "2025-03", "cabinet": 24800, "battery": 1380},
            {"month": "2025-06", "cabinet": 24100, "battery": 1340},
            {"month": "2025-09", "cabinet": 23500, "battery": 1300},
            {"month": "2025-12", "cabinet": 22900, "battery": 1265},
            {"month": "2026-03", "cabinet": 22400, "battery": 1230},
            {"month": "2026-06", "cabinet": 21900, "battery": 1200},
            {"month": "2026-09", "cabinet": 21500, "battery": 1175},
        ],
    }


# ---------- 3. 用户与套餐 ----------
def build_users():
    months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
              "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    total = 36000
    users = []
    new_users = []
    for i, m in enumerate(months):
        total += int(1780 + i * 90)
        users.append({"month": m, "total": total})
        new_users.append({"month": m, "new": int(1780 + i * 90), "churn": int(540 + i * 30)})
    packages = [
        {"name": "月租套餐", "users": 14200, "price": 99, "revenue_ratio": 26.5, "renew_rate": 62.0, "churn_rate": 5.8, "monthly_exchanges": 28, "designed_exchanges": 30},
        {"name": "季租套餐", "users": 9800, "price": 279, "revenue_ratio": 23.8, "renew_rate": 71.5, "churn_rate": 3.6, "monthly_exchanges": 31, "designed_exchanges": 30},
        {"name": "半年套餐", "users": 8100, "price": 528, "revenue_ratio": 21.2, "renew_rate": 78.2, "churn_rate": 2.2, "monthly_exchanges": 33, "designed_exchanges": 32},
        {"name": "1年套餐", "users": 12100, "price": 968, "revenue_ratio": 24.1, "renew_rate": 83.6, "churn_rate": 1.1, "monthly_exchanges": 34, "designed_exchanges": 32},
        {"name": "3年及以上", "users": 4400, "price": 2680, "revenue_ratio": 4.4, "renew_rate": 91.8, "churn_rate": 0.3, "monthly_exchanges": 36, "designed_exchanges": 35},
    ]
    return {
        "user_trend": users,
        "new_user_trend": new_users,
        "package_structure": [{"name": p["name"], "value": p["users"]} for p in packages],
        "package_revenue": [{"name": p["name"], "value": p["revenue_ratio"]} for p in packages],
        "package_detail": packages,
        "kpis": {
            "total_users": 48600, "active_users": 31200, "month_new": 2140,
            "paid_conversion": 68.2, "month_active_rate": 64.2, "renew_rate": 74.8,
            "churn_rate": 3.2, "ltv": 1860, "cac": 86, "cac_ltv": 0.046,
            "long_term_ratio": round(4400 / 48600 * 100, 1),
            "avg_monthly_exchanges": 31.5,
        },
        "lifecycle_funnel": [
            {"stage": "注册用户", "value": 71300},
            {"stage": "已激活套餐", "value": 48600},
            {"stage": "完成首换", "value": 42100},
            {"stage": "月度活跃", "value": 31200},
            {"stage": "近90天续费", "value": 23400},
        ],
        "usage_intensity": packages,
        "frequency_tier": [
            {"name": "高频(>4次/日)", "value": 11.4},
            {"name": "中频(2-4次/日)", "value": 52.8},
            {"name": "低频(<2次/日)", "value": 35.8},
        ],
        "usage_decay_ratio": 6.8,  # 频次下降用户占比
        "first_exchange_hours": [  # 激活到首换时长分布（小时）
            {"name": "<1h", "value": 18}, {"name": "1-6h", "value": 27},
            {"name": "6-24h", "value": 31}, {"name": "1-3天", "value": 16},
            {"name": ">3天", "value": 8},
        ],
    }


# ---------- 4. 运营数据 ----------
def build_operations():
    return {
        "kpis": {
            "month_orders": 918000, "daily_orders": 30600,
            "daily_orders_per_cabinet": 5.1,
            "cabinet_fault_rate": 0.42,          # 次/柜/月
            "battery_fault_rate": 1.15,          # 次/百块/月
            "downtime_rate": 1.6,
            "mttr_hours": 1.8,
            "exchange_fail_rate": 2.1,
            "avg_wait_min": 1.5,
            "long_offline_ratio": 2.4,
            "low_efficiency_ratio": 12.6,
            "zombie_ratio": 4.2,
        },
        "order_month_trend": [
            {"month": "2025-10", "orders": 706000}, {"month": "2025-11", "orders": 721000},
            {"month": "2025-12", "orders": 749000}, {"month": "2026-01", "orders": 733000},
            {"month": "2026-02", "orders": 688000}, {"month": "2026-03", "orders": 772000},
            {"month": "2026-04", "orders": 805000}, {"month": "2026-05", "orders": 836000},
            {"month": "2026-06", "orders": 849000}, {"month": "2026-07", "orders": 873000},
            {"month": "2026-08", "orders": 896000}, {"month": "2026-09", "orders": 918000},
        ],
        "daily_order_trend": [
            {"date": d, "orders": int(29000 + 1600 * __import__("math").sin(d / 3.5) + random.uniform(-600, 600))}
            for d in range(1, 31)
        ],
        "per_cabinet_dist": [  # 单柜日均订单分布
            {"name": "<2单", "value": 14}, {"name": "2-4单", "value": 32},
            {"name": "4-6单", "value": 28}, {"name": "6-8单", "value": 16},
            {"name": ">8单", "value": 10},
        ],
        "hourly_distribution": [
            {"hour": h, "ratio": round((2.8 if h < 6 else 5.5) + 4.2 * (2.718 ** (-((h - 8.2) ** 2) / 9)) + 3.8 * (2.718 ** (-((h - 18.5) ** 2) / 12)), 1)}
            for h in range(0, 24)
        ],
        "exchange_cycle": [  # 平均换电周期（天）分布
            {"name": "<1天", "value": 22}, {"name": "1-2天", "value": 38},
            {"name": "2-3天", "value": 24}, {"name": "3-5天", "value": 12},
            {"name": ">5天", "value": 4},
        ],
        "fault_types": [
            {"name": "柜门故障", "value": 22}, {"name": "充电模块", "value": 18},
            {"name": "通信异常", "value": 15}, {"name": "消防误报", "value": 12},
            {"name": "屏幕故障", "value": 9}, {"name": "供电异常", "value": 8},
            {"name": "BMS故障", "value": 10}, {"name": "其他", "value": 6},
        ],
        "online_rate_month": [
            {"month": "2026-04", "value": 96.8}, {"month": "2026-05", "value": 97.1},
            {"month": "2026-06", "value": 96.5}, {"month": "2026-07", "value": 96.2},
            {"month": "2026-08", "value": 96.6}, {"month": "2026-09", "value": 96.4},
        ],
        "peak_fail_rate": 3.4,
    }


# ---------- 5. 场景点位 ----------
def build_sites():
    scenes = [
        {"name": "社区/物业", "devices": 2050, "daily_orders": 5.8, "revenue_ratio": 27.4, "breakeven": 82},
        {"name": "车行门店", "devices": 1420, "daily_orders": 6.2, "revenue_ratio": 24.1, "breakeven": 78},
        {"name": "园区", "devices": 860, "daily_orders": 4.6, "revenue_ratio": 13.8, "breakeven": 71},
        {"name": "学校周边", "devices": 690, "daily_orders": 4.1, "revenue_ratio": 10.2, "breakeven": 66},
        {"name": "商场周边", "devices": 540, "daily_orders": 5.0, "revenue_ratio": 9.6, "breakeven": 73},
        {"name": "写字楼", "devices": 380, "daily_orders": 3.8, "revenue_ratio": 5.8, "breakeven": 58},
        {"name": "交通枢纽", "devices": 210, "daily_orders": 6.8, "revenue_ratio": 4.6, "breakeven": 88},
        {"name": "其他", "devices": 110, "daily_orders": 3.2, "revenue_ratio": 4.5, "breakeven": 52},
    ]
    return {
        "scene_distribution": [{"name": s["name"], "value": s["devices"]} for s in scenes],
        "scene_detail": scenes,
        "city_sites": [
            {"city": "深圳", "sites": 812, "devices": 2380, "avg_devices_per_site": 2.9},
            {"city": "杭州", "sites": 534, "devices": 1502, "avg_devices_per_site": 2.8},
            {"city": "广州", "sites": 386, "devices": 1002, "avg_devices_per_site": 2.6},
            {"city": "东莞", "sites": 247, "devices": 626, "avg_devices_per_site": 2.5},
            {"city": "阳朔", "sites": 188, "devices": 750, "avg_devices_per_site": 4.0},
        ],
        "cooperation_terms": [
            {"name": "1年", "value": 46}, {"name": "2年", "value": 34},
            {"name": "3年", "value": 15}, {"name": "未签约", "value": 5},
        ],
        "expiry_schedule": [  # 协议到期分布（季度）
            {"quarter": "2026Q4", "value": 12}, {"quarter": "2027Q1", "value": 16},
            {"quarter": "2027Q2", "value": 22}, {"quarter": "2027Q3", "value": 18},
            {"quarter": "2027Q4", "value": 24}, {"quarter": "2028Q1", "value": 8},
        ],
        "share_models": [
            {"name": "按单分成15-30%", "value": 58},
            {"name": "年场租+电费", "value": 22},
            {"name": "电费+分成", "value": 13},
            {"name": "免费场地(街道/政府)", "value": 7},
        ],
        "site_tiers": [
            {"name": "高价值点位", "ratio": 22, "month_revenue": 6800, "gross_margin": 52},
            {"name": "普通点位", "ratio": 51, "month_revenue": 4100, "gross_margin": 38},
            {"name": "低效点位", "ratio": 27, "month_revenue": 1800, "gross_margin": 12},
        ],
        "avg_rent_ratio": 18.5,
        "free_site_ratio": 7.0,
        "avg_remaining_term": 1.6,
    }


# ---------- 6. 经营财务 ----------
def build_finance():
    pnl = []
    base_rev = 1420000
    base_cost = 1080000
    months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
              "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    for i, m in enumerate(months):
        rev = int(base_rev * (1 + i * 0.028))
        cost = int(base_cost * (1 + i * 0.02))
        pnl.append({"month": m, "revenue": rev, "cost": cost,
                    "profit": rev - cost,
                    "gross_margin": round((rev - cost) / rev * 100, 1)})
    return {
        "monthly_pnl": pnl,
        "revenue_mix": [
            {"name": "套餐收入", "value": 82.4},
            {"name": "单次换电收入", "value": 12.1},
            {"name": "电池回收残值", "value": 3.2},
            {"name": "其他", "value": 2.3},
        ],
        "cost_structure": [
            {"name": "电费", "value": 22.4},
            {"name": "场地分成/场租", "value": 14.8},
            {"name": "设备折旧", "value": 18.6},
            {"name": "运维人工", "value": 12.2},
            {"name": "推广获客", "value": 8.4},
            {"name": "平台与软件", "value": 6.8},
            {"name": "销售激励", "value": 4.9},
            {"name": "保险与合规", "value": 3.1},
            {"name": "其他", "value": 8.8},
        ],
        "quality_kpis": {
            "refund_rate": 1.8, "bad_debt_rate": 0.6, "advance_balance": 2450000,
            "advance_revenue_ratio": 1.31, "early_churn_long_term": 1.4,
            "battery_recycle_cost": 200, "battery_recycle_rate": 78.0,
        },
        "breakeven_by_city": [
            {"city": "深圳", "ratio": 82}, {"city": "杭州", "ratio": 74},
            {"city": "广州", "ratio": 68}, {"city": "东莞", "ratio": 56},
            {"city": "阳朔", "ratio": 45},
        ],
        "cac_ltv": {"cac": 86, "ltv": 1860, "ratio": 0.046},
        "per_cabinet": {
            "month_revenue": 2980, "day_revenue": 99.3,
            "month_electric_cost": 668, "electric_ratio": 22.4,
            "electric_per_exchange": 0.95,
            "valley_saving": 12.6,  # 峰谷套利节省比例
        },
    }


# ---------- 7. 数字化与运维 ----------
def build_digital():
    return {
        "capability_scores": [
            {"name": "设备数据覆盖率", "value": 97.5},
            {"name": "订单数据完整率", "value": 99.2},
            {"name": "告警准确率", "value": 91.8},
            {"name": "工单闭环率", "value": 96.4},
            {"name": "远程功能覆盖率", "value": 88.6},
            {"name": "收益账实一致性", "value": 99.8},
        ],
        "iot_kpis": {
            "device_online_rate": 96.4, "comm_fail_rate": 0.85,
            "daily_data_rows": 1820000, "single_conn_cost": 0.12,
            "alarm_to_workorder_min": 8,
        },
        "om_kpis": {
            "cabinets_per_staff": 126, "self_operate_ratio": 82.0,
            "avg_response_hours": 0.8, "mttr_hours": 1.8,
            "first_fix_rate": 91.5, "workorder_close_rate": 96.4,
            "inspection_coverage": 94.2, "spare_turnover_days": 18,
            "backup_sites": 46, "backup_ratio": 5.1,
        },
        "om_mode": [{"name": "自营运维", "value": 82}, {"name": "外包运维", "value": 18}],
        "alarm_to_workorder": [
            {"month": "2026-04", "value": 11}, {"month": "2026-05", "value": 10},
            {"month": "2026-06", "value": 9}, {"month": "2026-07", "value": 9},
            {"month": "2026-08", "value": 8}, {"month": "2026-09", "value": 8},
        ],
    }


# ---------- 8. 行业趋势 ----------
def build_industry():
    return {
        "market_size": [  # 中国电动两轮车换电市场规模（亿元）
            {"year": "2020", "value": 62}, {"year": "2021", "value": 95},
            {"year": "2022", "value": 142}, {"year": "2023", "value": 205},
            {"year": "2024", "value": 285}, {"year": "2025", "value": 378},
            {"year": "2026E", "value": 480},
        ],
        "penetration": [  # 换电渗透率趋势（%）
            {"year": "2022", "value": 3.2}, {"year": "2023", "value": 5.1},
            {"year": "2024", "value": 7.8}, {"year": "2025", "value": 10.5},
            {"year": "2026E", "value": 13.5},
        ],
        "policy_milestones": [
            {"time": "2019-04", "event": "电动自行车新国标实施，明确整车质量≤55kg，倒逼锂电轻量化"},
            {"time": "2021-08", "event": "应急管理部发布《高层民用建筑消防安全管理规定》，禁止电动自行车进楼入户充电"},
            {"time": "2022-06", "event": "多城市出台充电设施专项规划，鼓励集中充换电设施建设"},
            {"time": "2023-07", "event": "工信部推进电动自行车用锂离子蓄电池安全技术规范"},
            {"time": "2024-05", "event": "多项充换电安全强制国标征求意见，行业进入合规加速期"},
            {"time": "2025-11", "event": "新电池安全强制国标全面实施，换电柜消防合规成为行业准入门槛"},
        ],
        "competition": [
            {"name": "头部换电企业A", "share": 18.5, "cities": 320, "cabinets": 38000},
            {"name": "头部换电企业B", "share": 14.2, "cities": 260, "cabinets": 30000},
            {"name": "本地运营商(本项目)", "share": 3.6, "cities": 5, "cabinets": 6260},
            {"name": "其他运营商", "share": 63.7, "cities": 180, "cabinets": 58000},
        ],
        "tech_route": [
            {"name": "磷酸铁锂", "value": 76}, {"name": "三元锂", "value": 18},
            {"name": "钠电(试点)", "value": 3}, {"name": "其他", "value": 3},
        ],
        "industry_insights": [
            "行业驱动：新国标+消防禁令+外卖骑手刚需，换电渗透率2026年预计达13.5%",
            "商业模式：由B端骑手市场向C端居民市场渗透，'租期+电量包'模式成为主流",
            "技术演进：钠电池开始试点，有望降低冬季低温衰减与成本",
            "合规门槛：2025年电池安全强制国标实施后，中小运营商加速出清，利好头部合规企业",
        ],
    }


def main():
    snapshot = {
        "overview": build_overview(),
        "assets": build_assets(),
        "users": build_users(),
        "operations": build_operations(),
        "sites": build_sites(),
        "finance": build_finance(),
        "digital": build_digital(),
        "industry": build_industry(),
    }
    path = save_snapshot(snapshot, source="mock-demo", db_connected=False,
                         meta_extra={"note": "演示数据，用于离线预览看板效果；连接数据库后运行 collect.py 覆盖"})
    print("MOCK_SNAPSHOT_SAVED:", path)


if __name__ == "__main__":
    main()
