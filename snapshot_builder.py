# -*- coding: utf-8 -*-
"""
snapshot_builder.py - 全量快照构建器（文档 11 板块 263 指标 + 图片指标 + 三大地图 + 明细）
=============================================================================================
在 mock_snapshot.py 既有 9 模块基础上，叠加：
  assets扩展(采购交付/融资/生命周期/供应商)  revenue(板块八)  expense(板块九)
  efficiency(板块十一)  iot(图片指标)  maps(三大地图)  details(全量明细)
离线可用：全部数据写入本地快照，不连库。
运行：python snapshot_builder.py
"""
import random
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_snapshot as M
from snapshot_store import save_snapshot

random.seed(20260916)

CITIES = ["深圳", "杭州", "阳朔", "广州", "东莞"]
CITY_LNG_LAT = {
    "深圳": [114.06, 22.55], "杭州": [120.15, 30.28], "阳朔": [110.49, 24.78],
    "广州": [113.26, 23.13], "东莞": [113.75, 23.02],
    "佛山": [113.12, 23.02], "珠海": [113.57, 22.27], "中山": [113.39, 22.52],
    "惠州": [114.42, 23.11], "汕头": [116.68, 23.35], "温州": [120.70, 28.00],
    "宁波": [121.55, 29.88], "绍兴": [120.58, 30.03], "桂林": [110.29, 25.27],
    "柳州": [109.42, 24.33], "南宁": [108.37, 22.82],
}
SCENES = ["物业小区", "社区门店", "产业园区", "学校周边", "商场周边", "写字楼", "合作车行", "交通枢纽"]


def city_split(total):
    out = []
    for c in CITIES:
        out.append({"name": c, "value": round(total * M.CITY_WEIGHT[c])})
    return out


# =====================================================================
# 1. 设备资产扩展：采购交付(1.3) / 品牌型号(1.4) / 采购价格(1.5) / 融资(22-24)
# =====================================================================
def build_assets_ext():
    return {
        # 1.2 资产底数（补充字段）
        "asset_ledger": {
            "total_cabinets": 6260, "warehouse_cabinets": 2147, "warehouse_ratio": 34.3,
            "slot_12": 9, "slot_6": 2850, "slot_4": 2210, "slot_3": 1191,
            "sodium_batteries": 43, "normal_batteries_4824": 24800, "normal_batteries_4814": 12657,
        },
        # 1.3 采购交付状态漏斗
        "procurement_funnel": [
            {"stage": "已采购", "value": 6480},
            {"stage": "已交付", "value": 6300},
            {"stage": "已安装", "value": 5910},
            {"stage": "已上线", "value": 4113},
            {"stage": "运营中", "value": 3983},
        ],
        "procurement_status": {
            "procured": 6480, "delivered": 6300, "installed": 5910, "online": 4113, "operating": 3983,
            "delivery_rate": round(6300 / 6480 * 100, 1),
            "install_rate": round(5910 / 6300 * 100, 1),
            "online_conv": round(4113 / 5910 * 100, 1),
            "financeable": 4550, "financeable_ratio": round(4550 / 6480 * 100, 1),
            "not_invested": 2147,
        },
        # 1.4 品牌型号规格
        "brand_ratio_ext": [
            {"name": "柜体-品牌A(水消防)", "value": 4100},
            {"name": "柜体-品牌B(气溶胶)", "value": 1510},
            {"name": "柜体-品牌C(气溶胶)", "value": 650},
            {"name": "电池-4824", "value": 24800},
            {"name": "电池-4814", "value": 12657},
            {"name": "电池-钠电", "value": 43},
        ],
        "fire_route": [{"name": "水消防", "value": 4100}, {"name": "气溶胶", "value": 2160}],
        "supplier": {
            "top3_ratio": 82.6, "supplier_count": 6,
            "supplier_trend": [
                {"month": "2026-04", "value": 86.2}, {"month": "2026-05", "value": 85.1},
                {"month": "2026-06", "value": 84.0}, {"month": "2026-07", "value": 83.4},
                {"month": "2026-08", "value": 82.9}, {"month": "2026-09", "value": 82.6},
            ],
            "warranty_avg_months": 24, "warranty_expire_ratio": 8.2,
        },
        # 1.5 采购价格与总金额
        "purchase": {
            "cabinet_avg_price": 16800, "cabinet_price_by_slot": [
                {"name": "12口柜", "value": 32800}, {"name": "6口柜", "value": 18600},
                {"name": "4口柜", "value": 14800}, {"name": "3口柜", "value": 11200},
            ],
            "battery_avg_price": {"4824": 980, "4814": 760, "sodium": 1180},
            "total_purchase_amount": 97200000, "paid_amount": 58300000,
            "pay_ratio": round(58300000 / 97200000 * 100, 1),
            "related_trade": "否",
            "price_trend": [
                {"month": "2026-04", "cabinet": 17200, "battery": 1010},
                {"month": "2026-05", "cabinet": 17050, "battery": 1000},
                {"month": "2026-06", "cabinet": 16920, "battery": 995},
                {"month": "2026-07", "cabinet": 16860, "battery": 988},
                {"month": "2026-08", "cabinet": 16820, "battery": 985},
                {"month": "2026-09", "cabinet": 16800, "battery": 980},
            ],
        },
        # 融资相关
        "financing": {
            "restricted_devices": 3850, "restricted_ratio": round(3850 / 6480 * 100, 1),
            "financed_amount": 32000000, "finance_methods": [
                {"name": "银行融资租赁", "value": 46}, {"name": "融资租赁公司", "value": 28},
                {"name": "设备抵押贷款", "value": 18}, {"name": "其他", "value": 8},
            ],
        },
        # 2.1 使用年限与生命周期
        "lifecycle": {
            "avg_use_years": 1.8, "design_life_cabinet": 8, "design_life_battery": 2,
            "life_used_ratio": round(1.8 / 8 * 100, 1),
            "batch_deploy": [
                {"batch": "2024-Q3", "value": 850}, {"batch": "2024-Q4", "value": 1200},
                {"batch": "2025-Q1", "value": 980}, {"batch": "2025-Q2", "value": 1050},
                {"batch": "2025-Q3", "value": 920}, {"batch": "2025-Q4", "value": 610},
                {"batch": "2026-Q1", "value": 420}, {"batch": "2026-Q2", "value": 230},
            ],
            "age_structure": [
                {"name": "<1年", "value": 31}, {"name": "1-2年", "value": 42},
                {"name": "2-3年", "value": 21}, {"name": ">3年", "value": 6},
            ],
            # 2.2 老旧与报废
            "second_hand_ratio": 3.4, "near_scrap_ratio": 2.8,
            "soh_low_ratio": 5.6, "aging_speed": [
                {"month": "2026-04", "value": 3.1}, {"month": "2026-05", "value": 3.3},
                {"month": "2026-06", "value": 3.5}, {"month": "2026-07", "value": 3.8},
                {"month": "2026-08", "value": 4.1}, {"month": "2026-09", "value": 4.4},
            ],
            # 2.3 回本周期
            "payback_ext": {
                "avg_months": 22.5, "repaid_ratio": 46.8, "payback_trend": [
                    {"month": "2026-04", "value": 24.2}, {"month": "2026-05", "value": 23.8},
                    {"month": "2026-06", "value": 23.4}, {"month": "2026-07", "value": 23.0},
                    {"month": "2026-08", "value": 22.7}, {"month": "2026-09", "value": 22.5},
                ],
                "by_city": [
                    {"name": "深圳", "value": 18.2}, {"name": "杭州", "value": 21.6},
                    {"name": "广州", "value": 24.8}, {"name": "东莞", "value": 26.3},
                    {"name": "阳朔", "value": 31.5},
                ],
            },
        },
    }


# =====================================================================
# 2. 板块八：收入分析专项（收入模式/用户规模/单柜收入/收入质量/套餐专项）
# =====================================================================
def build_revenue():
    return {
        "kpis": {
            "month_revenue": 1865000, "arpu": 59.8, "pay_conv_ratio": 68.4,
            "month_active_ratio": 64.2, "renew_ratio": 82.6, "churn_ratio": 3.2,
            "advance_balance": 2450000, "refund_rate": 1.8, "bad_debt_rate": 0.6,
            "new_discount": 8.5, "renew_price_gap": 4.2, "long_term_ratio_3y": 22.4,
            "net_new_users": 1680, "ltv": 1860,
        },
        "user_scale": [
            {"month": "2026-04", "registered": 42800, "paid": 29200, "active": 28400},
            {"month": "2026-05", "registered": 44800, "paid": 30000, "active": 29200},
            {"month": "2026-06", "registered": 46200, "paid": 30600, "active": 29800},
            {"month": "2026-07", "registered": 47400, "paid": 31000, "active": 30300},
            {"month": "2026-08", "registered": 48400, "paid": 31300, "active": 30800},
            {"month": "2026-09", "registered": 48600, "paid": 31600, "active": 31200},
        ],
        "revenue_mix_ext": [
            {"name": "社区居民月租", "value": 42.6}, {"name": "社区居民季租", "value": 14.8},
            {"name": "半年租", "value": 9.6}, {"name": "1年租", "value": 15.2},
            {"name": "3年及以上", "value": 13.4}, {"name": "其他收入", "value": 4.4},
        ],
        "per_cabinet_ext": {
            "month_revenue": 2980, "day_revenue": 99.3, "target_ratio": 86.4,
            "mom_trend": [
                {"month": "2026-04", "value": 2750}, {"month": "2026-05", "value": 2810},
                {"month": "2026-06", "value": 2840}, {"month": "2026-07", "value": 2900},
                {"month": "2026-08", "value": 2950}, {"month": "2026-09", "value": 2980},
            ],
            "by_site_type": [
                {"name": "交通枢纽", "value": 3520}, {"name": "写字楼", "value": 3180},
                {"name": "商场周边", "value": 3050}, {"name": "物业小区", "value": 2960},
                {"name": "产业园区", "value": 2810}, {"name": "社区门店", "value": 2680},
                {"name": "学校周边", "value": 2420}, {"name": "合作车行", "value": 2240},
            ],
        },
        "quality": {
            "refund_reason": [{"name": "搬家迁移", "value": 42}, {"name": "不再使用", "value": 28},
                              {"name": "服务不满意", "value": 17}, {"name": "价格因素", "value": 13}],
            "prepay_leverage": [
                {"month": "2026-04", "value": 1.42}, {"month": "2026-05", "value": 1.39},
                {"month": "2026-06", "value": 1.36}, {"month": "2026-07", "value": 1.33},
                {"month": "2026-08", "value": 1.31}, {"month": "2026-09", "value": 1.31},
            ],
            "long_term_prechurn": 2.6, "battery_recycle_cost": 86000,
        },
        "package_trend": [
            {"name": "月租", "renew": 74.2, "upgrade": 4.6, "downgrade": 3.1},
            {"name": "季租", "renew": 79.5, "upgrade": 5.8, "downgrade": 2.4},
            {"name": "半年租", "renew": 84.1, "upgrade": 6.2, "downgrade": 1.8},
            {"name": "1年租", "renew": 88.6, "upgrade": 3.4, "downgrade": 1.2},
            {"name": "3年及以上", "renew": 93.2, "upgrade": 1.2, "downgrade": 0.6},
        ],
        "unlimited_overuse_ratio": 8.4,
        "package_users": [
            {"name": "月租", "users": 12100, "revenue_ratio": 42.6, "arpu": 65.2, "exchanges": 22},
            {"name": "季租", "users": 5200, "revenue_ratio": 14.8, "arpu": 52.6, "exchanges": 19},
            {"name": "半年租", "users": 3400, "revenue_ratio": 9.6, "arpu": 52.0, "exchanges": 18},
            {"name": "1年租", "users": 5900, "revenue_ratio": 15.2, "arpu": 47.6, "exchanges": 17},
            {"name": "3年及以上", "users": 5000, "revenue_ratio": 13.4, "arpu": 49.5, "exchanges": 16},
        ],
        "pricing_benchmark": [
            {"name": "本项目月租", "value": 128}, {"name": "竞品A月租", "value": 138},
            {"name": "竞品B月租", "value": 118}, {"name": "本项目年租", "value": 1080},
            {"name": "竞品A年租", "value": 1180}, {"name": "竞品B年租", "value": 980},
        ],
    }


# =====================================================================
# 3. 板块九：支出分析专项（CAPEX/电费/分成/获客/运维/平台/激励/门店/套餐/其他）
# =====================================================================
def build_expense():
    return {
        "kpis": {
            "month_cost": 1321000, "cost_income_ratio": round(1321000 / 1865000 * 100, 1),
            "electric_ratio": 22.4, "share_ratio": 15.8, "opex_ratio": 18.6,
            "cac": 86, "cac_ltv": 0.046, "mttr_hours": 1.8,
            "month_capex_dep": 240000, "software_ratio": 4.2,
        },
        # 9.1 硬件购置与折旧
        "capex": {
            "cabinet_total": 6260, "cabinet_avg": 16800, "battery_total": 37500, "battery_avg": 960,
            "cabinet_capex": 105168000, "battery_capex": 36000000, "install_transport": 4860000,
            "single_cabinet_capex": 23400, "month_dep": 240000, "residual_ratio": 12.0,
            "early_scrap_ratio": 1.6, "life_real_vs_theory": [
                {"name": "电池-理论", "value": 24}, {"name": "电池-实际", "value": 21},
                {"name": "柜体-理论", "value": 96}, {"name": "柜体-实际", "value": 78},
            ],
        },
        # 9.2 网点电费
        "electricity": {
            "month_cost": 295000, "per_cabinet": 668, "ratio_income": 22.4,
            "per_exchange": 0.95, "price_range": "0.7-2元/度", "valley_saving": 12.6,
            "trend": [
                {"month": "2026-04", "value": 281000}, {"month": "2026-05", "value": 285000},
                {"month": "2026-06", "value": 290000}, {"month": "2026-07", "value": 296000},
                {"month": "2026-08", "value": 298000}, {"month": "2026-09", "value": 295000},
            ],
            "by_city": [{"name": "深圳", "value": 112000}, {"name": "杭州", "value": 71000},
                        {"name": "广州", "value": 47000}, {"name": "东莞", "value": 30000},
                        {"name": "阳朔", "value": 35000}],
        },
        # 9.3 网点分成与渠道成本
        "share_cost": {
            "month_cost": 208000, "ratio_income": 15.8, "per_cabinet": 470,
            "mode": [{"name": "按次分成15%-30%", "value": 46}, {"name": "年场租+电费", "value": 24},
                     {"name": "电费+分成", "value": 20}, {"name": "免费场地", "value": 10}],
            "trend": [
                {"month": "2026-04", "value": 196000}, {"month": "2026-05", "value": 199000},
                {"month": "2026-06", "value": 201000}, {"month": "2026-07", "value": 204000},
                {"month": "2026-08", "value": 207000}, {"month": "2026-09", "value": 208000},
            ],
            "acquisition_cost_per_site": 3200,
        },
        # 9.4 推广与获客成本
        "acquisition": {
            "month_cost": 145000, "cac": 86, "channels": [
                {"name": "车行门店导购", "value": 44}, {"name": "线上广告", "value": 22},
                {"name": "老客推荐", "value": 21}, {"name": "地推活动", "value": 13},
            ],
            "cac_trend": [
                {"month": "2026-04", "value": 92}, {"month": "2026-05", "value": 90},
                {"month": "2026-06", "value": 89}, {"month": "2026-07", "value": 88},
                {"month": "2026-08", "value": 87}, {"month": "2026-09", "value": 86},
            ],
            "referral_renew_ratio": 88.4,
        },
        # 9.5 运维与人工成本
        "opex": {
            "month_cost": 246000, "staff_count": 32, "per_cabinet": 556,
            "repair_cost_single": 186, "repair_asset_ratio": 2.4,
            "fault_churn_ratio": 0.8, "fault_loss_exchanges": 1250,
            "cost_trend": [
                {"month": "2026-04", "value": 238000}, {"month": "2026-05", "value": 241000},
                {"month": "2026-06", "value": 243000}, {"month": "2026-07", "value": 244000},
                {"month": "2026-08", "value": 245000}, {"month": "2026-09", "value": 246000},
            ],
        },
        # 9.6 平台与软件成本
        "platform_cost": {
            "month_cost": 56000, "ratio_income": 4.2, "iot_fee_per_device": 9.5,
            "trend": [
                {"month": "2026-04", "value": 54000}, {"month": "2026-05", "value": 54500},
                {"month": "2026-06", "value": 55000}, {"month": "2026-07", "value": 55500},
                {"month": "2026-08", "value": 55800}, {"month": "2026-09", "value": 56000},
            ],
            "pay_fee_rate": 0.6,
        },
        # 9.7 员工销售激励
        "incentive": {
            "month_cost": 68000, "per_staff": 2125, "ratio_revenue": 5.1,
            "structure": [{"name": "地推销售", "value": 48}, {"name": "运营人员", "value": 30},
                          {"name": "客服", "value": 12}, {"name": "管理层", "value": 10}],
            "trend": [
                {"month": "2026-04", "value": 62000}, {"month": "2026-05", "value": 64000},
                {"month": "2026-06", "value": 65000}, {"month": "2026-07", "value": 66500},
                {"month": "2026-08", "value": 67500}, {"month": "2026-09", "value": 68000},
            ],
        },
        # 9.8 门店/车行导购激励
        "store_incentive": {
            "month_cost": 88000, "stores": 156, "per_store": 564,
            "return_structure": [{"name": "激活返佣", "value": 62}, {"name": "续租返佣", "value": 38}],
            "renew_vs_natural": [{"name": "导购渠道", "value": 88.4}, {"name": "自然获客", "value": 80.2}],
            "per_staff_activate": 14.2, "day30_renew": 82.5,
            "payback_months": 5.2,
        },
        # 9.9 套餐对应支出专项
        "package_cost": [
            {"name": "月租", "cost": 52.4, "ratio": 80.4, "margin": 19.6},
            {"name": "季租", "cost": 41.8, "ratio": 79.5, "margin": 20.5},
            {"name": "半年租", "cost": 40.2, "ratio": 77.3, "margin": 22.7},
            {"name": "1年租", "cost": 36.8, "ratio": 77.3, "margin": 22.7},
            {"name": "3年及以上", "cost": 37.5, "ratio": 75.8, "margin": 24.2},
        ],
        # 9.10 其他支出
        "other_cost": {
            "insurance_ratio": 1.2, "compliance_per_cabinet": 360,
            "recycle_recovery_ratio": 68.0,
            "structure": [{"name": "保险", "value": 22}, {"name": "合规", "value": 16},
                          {"name": "税费", "value": 38}, {"name": "总部分摊", "value": 24}],
        },
    }


# =====================================================================
# 4. 板块十一：运营效率与网点分析
# =====================================================================
def build_efficiency():
    return {
        # 11.1 网点分层与选址
        "site_layer": {
            "site_count": 898, "avg_cabinet_per_site": 7.0, "city_site_ratio": city_split(898),
            "expand_speed": [
                {"month": "2026-04", "value": 842}, {"month": "2026-05", "value": 856},
                {"month": "2026-06", "value": 868}, {"month": "2026-07", "value": 877},
                {"month": "2026-08", "value": 886}, {"month": "2026-09", "value": 898},
            ],
            "daily_exchanges": [
                {"name": "交通枢纽", "value": 148}, {"name": "写字楼", "value": 132},
                {"name": "商场周边", "value": 124}, {"name": "物业小区", "value": 118},
                {"name": "产业园区", "value": 108}, {"name": "社区门店", "value": 96},
                {"name": "学校周边", "value": 82}, {"name": "合作车行", "value": 71},
            ],
            "full_rate": [
                {"name": "高峰期", "value": 86.4}, {"name": "平峰期", "value": 62.8},
                {"name": "低谷期", "value": 34.2},
            ],
            "tier": [
                {"name": "高收入点位", "value": 18.2}, {"name": "普通点位", "value": 62.4},
                {"name": "低效点位", "value": 19.4},
            ],
            "tier_metrics": [
                {"name": "高收入点位", "revenue": 6120, "margin": 42.6},
                {"name": "普通点位", "revenue": 2980, "margin": 24.8},
                {"name": "低效点位", "revenue": 1320, "margin": -6.2},
            ],
        },
        # 11.2 电池周转与调度
        "battery_turnover": {
            "turnover_ratio": 1.42, "daily_exchanges": 30600, "fail_ratio": 2.1,
            "avg_wait_min": 2.6, "dispatch_cost_income": 3.4,
            "status": [{"name": "在柜充电", "value": 62}, {"name": "满电待换", "value": 24},
                       {"name": "在途调度", "value": 3}, {"name": "维修中", "value": 2},
                       {"name": "仓库储备", "value": 9}],
            "fail_trend": [
                {"month": "2026-04", "value": 2.6}, {"month": "2026-05", "value": 2.5},
                {"month": "2026-06", "value": 2.4}, {"month": "2026-07", "value": 2.3},
                {"month": "2026-08", "value": 2.2}, {"month": "2026-09", "value": 2.1},
            ],
        },
        # 11.3 用户使用频次与换电周期
        "user_freq": {
            "daily_per_user": 1.36, "weekly_per_user": 8.9, "monthly_per_user": 18.6,
            "tier": [{"name": "高频(>4次/日)", "value": 18.2}, {"name": "中频(2-4次/日)", "value": 46.8},
                     {"name": "低频(<2次/日)", "value": 35.0}],
            "trend": [
                {"month": "2026-04", "value": 17.2}, {"month": "2026-05", "value": 17.5},
                {"month": "2026-06", "value": 17.8}, {"month": "2026-07", "value": 18.0},
                {"month": "2026-08", "value": 18.3}, {"month": "2026-09", "value": 18.6},
            ],
            "decline_users_ratio": 6.8, "avg_cycle_hours": 42.5,
            "hour_dist": [
                {"hour": "0-2", "value": 3.2}, {"hour": "2-4", "value": 1.4}, {"hour": "4-6", "value": 2.8},
                {"hour": "6-8", "value": 9.6}, {"hour": "8-10", "value": 13.2}, {"hour": "10-12", "value": 11.4},
                {"hour": "12-14", "value": 10.8}, {"hour": "14-16", "value": 8.2}, {"hour": "16-18", "value": 9.4},
                {"hour": "18-20", "value": 12.6}, {"hour": "20-22", "value": 11.2}, {"hour": "22-24", "value": 6.2},
            ],
            "peak_fail_ratio": 3.8, "season_factor": 1.08,
            "first_exchange_hours": [
                {"name": "<1小时", "value": 42}, {"name": "1-6小时", "value": 28},
                {"name": "6-24小时", "value": 18}, {"name": "1-3天", "value": 8},
                {"name": ">3天", "value": 4},
            ],
            "lifecycle_exchanges": 246,
        },
        # 11.4 用户行为与留存
        "user_behavior": {
            "retention": [
                {"month": "1月", "value": 100}, {"month": "2月", "value": 92},
                {"month": "3月", "value": 86}, {"month": "4月", "value": 81},
                {"month": "5月", "value": 77}, {"month": "6月", "value": 73},
                {"month": "7月", "value": 70}, {"month": "8月", "value": 67},
                {"month": "9月", "value": 65}, {"month": "10月", "value": 63},
                {"month": "11月", "value": 61}, {"month": "12月", "value": 60},
            ],
            "location_pref": [{"name": "居住地附近", "value": 58}, {"name": "工作地附近", "value": 27},
                              {"name": "通勤沿途", "value": 11}, {"name": "其他", "value": 4}],
            "churn_reason": [{"name": "搬家", "value": 34}, {"name": "车辆处理", "value": 26},
                             {"name": "价格", "value": 16}, {"name": "服务体验", "value": 12},
                             {"name": "其他", "value": 12}],
        },
    }


# =====================================================================
# 5. 图片指标：物联网平台（图片1-5 内容映射）
# =====================================================================
def build_iot():
    # 电池实时参数明细（图2 设备列表电池参数表 + 图3 电池详情）
    battery_params = []
    models = ["4824", "4814", "4824", "4814", "钠电"]
    for i in range(1, 31):
        sn = "BN" + str(202600000 + i * 137)
        model = random.choice(models[:4])
        soc = random.randint(8, 100)
        voltage = round(48 + (soc - 50) * 0.018 + random.uniform(-0.3, 0.3), 2)
        temp = round(random.uniform(18, 42), 1)
        cycles = random.randint(30, 680)
        soh = round(random.uniform(72, 99), 1)
        in_cabinet = random.random() > 0.22
        battery_params.append({
            "sn": sn, "model": model, "status": "在线" if random.random() > 0.06 else "离线",
            "soc": soc, "voltage": voltage, "temperature": temp,
            "cycles": cycles, "soh": soh, "in_cabinet": in_cabinet,
            "cabinet_no": "CAB-" + str(random.randint(1, 6260)).zfill(5) if in_cabinet else "--",
            "comm": "正常" if random.random() > 0.04 else "异常",
        })
    # 电芯明细（图4 机柜管理电芯列表）
    cell_list = []
    for i in range(1, 41):
        cell_list.append({
            "cell_id": "CELL-" + str(880000 + i * 19), "battery_sn": battery_params[i % 30]["sn"],
            "status": random.choice(["正常", "正常", "正常", "预警", "故障"]),
            "voltage": round(random.uniform(3.15, 4.22), 3),
            "temperature": round(random.uniform(18, 40), 1),
            "internal_resistance": round(random.uniform(18, 46), 1),
            "use_hours": random.randint(120, 8600),
        })
    # 告警明细
    alarm_list = []
    alarm_types = ["电池温度过高", "电芯压差过大", "通讯异常", "柜门异常", "充电模块故障", "消防误报", "电池SOC过低", "离柜异常"]
    for i in range(1, 26):
        alarm_list.append({
            "id": "ALM-" + str(900000 + i * 77), "time": f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}",
            "device": "CAB-" + str(random.randint(1, 6260)).zfill(5),
            "type": random.choice(alarm_types), "level": random.choice(["普通", "普通", "重要", "紧急"]),
            "status": random.choice(["已处理", "已处理", "处理中", "待处理"]),
            "handler": random.choice(["张工", "李工", "王工", "陈工", "--"]),
        })
    return {
        # 图1 物联网平台总览
        "platform_overview": {
            "total_stations": 52497, "online_stations": 50392, "offline_stations": 2105,
            "station_online_rate": 96.0,
            "total_devices": 6260, "devices_online": 3983, "devices_offline": 2277,
            "today_alarms": 186, "pending_alarms": 23, "today_workorders": 96,
            "battery_monitored": 37500, "battery_in_cabinet": 23250, "battery_out_cabinet": 14250,
            "province_dist": [
                {"name": "广东", "value": 62}, {"name": "浙江", "value": 24}, {"name": "广西", "value": 14},
            ],
            "cell_status": [{"name": "正常", "value": 96.4}, {"name": "预警", "value": 2.8}, {"name": "故障", "value": 0.8}],
            "voltage_dist": [
                {"name": "<40V", "value": 8}, {"name": "40-46V", "value": 22},
                {"name": "46-50V", "value": 38}, {"name": "50-53V", "value": 24}, {"name": ">53V", "value": 8},
            ],
            "soc_dist": [
                {"name": "0-20%", "value": 12}, {"name": "20-40%", "value": 18},
                {"name": "40-60%", "value": 24}, {"name": "60-80%", "value": 26}, {"name": "80-100%", "value": 20},
            ],
            "alarm_trend": [
                {"month": "2026-04", "value": 246}, {"month": "2026-05", "value": 228},
                {"month": "2026-06", "value": 214}, {"month": "2026-07", "value": 203},
                {"month": "2026-08", "value": 195}, {"month": "2026-09", "value": 186},
            ],
        },
        # 图2/图3 电池实时参数
        "battery_params": battery_params,
        "battery_detail": {
            "fields": ["SN", "型号", "状态", "SOC", "电压(V)", "温度(℃)", "循环次数", "健康度SOH(%)", "所在柜", "通讯状态"],
        },
        # 图4 电芯状态
        "cell_status": {
            "total_cells": 450000, "normal": 96.4, "warning": 2.8, "fault": 0.8,
            "cell_list": cell_list,
        },
        # 图5 电池管理状态汇总
        "battery_manage": {
            "adr_status": [{"name": "ADR正常", "value": 98.2}, {"name": "ADR异常", "value": 1.8}],
            "comm_status": [{"name": "通讯正常", "value": 96.5}, {"name": "通讯异常", "value": 3.5}],
            "voltage_ok": 97.4, "soc_ok": 96.8, "temp_ok": 97.9,
        },
        "alarm_list": alarm_list,
    }


# =====================================================================
# 6. 三大地图：设备密集 / 用户车辆密集 / 网点密集
# =====================================================================
def build_maps():
    def _pt(city, cabinets, batteries, users, vehicles, sites, revenue):
        lng, lat = CITY_LNG_LAT[city]
        return {
            "name": city, "lng": lng, "lat": lat,
            "cabinets": cabinets, "batteries": batteries, "online_rate": round(94 + random.random() * 5, 1),
            "users": users, "vehicles": vehicles, "density": round(users / max(sites, 1), 1),
            "sites": sites, "avg_cabinet": round(cabinets / max(sites, 1), 1),
            "revenue": revenue, "daily_exchanges": round(batteries * 0.82),
        }
    return {
        # 设备（换电柜和电池）密集地图
        "device": [
            _pt("深圳", 2379, 14250, 18468, 16800, 341, 708000),
            _pt("杭州", 1502, 9000, 11664, 10600, 216, 448000),
            _pt("广州", 1002, 6000, 7776, 7100, 143, 299000),
            _pt("东莞", 626, 3750, 4860, 4400, 90, 187000),
            _pt("阳朔", 751, 4500, 5832, 5300, 108, 224000),
            _pt("佛山", 180, 1080, 1200, 1100, 26, 54000),
            _pt("珠海", 140, 840, 950, 880, 20, 42000),
            _pt("中山", 120, 720, 820, 760, 18, 36000),
            _pt("惠州", 110, 660, 750, 690, 16, 33000),
            _pt("汕头", 90, 540, 620, 570, 14, 27000),
            _pt("温州", 130, 780, 860, 800, 20, 39000),
            _pt("宁波", 110, 660, 720, 660, 16, 33000),
            _pt("绍兴", 80, 480, 560, 520, 12, 24000),
            _pt("桂林", 90, 540, 610, 560, 14, 27000),
            _pt("柳州", 80, 480, 540, 500, 12, 24000),
            _pt("南宁", 100, 600, 650, 600, 15, 30000),
        ],
        # 用户车辆密集地图
        "user_vehicle": [
            _pt("深圳", 0, 0, 18468, 16800, 341, 0),
            _pt("杭州", 0, 0, 11664, 10600, 216, 0),
            _pt("广州", 0, 0, 7776, 7100, 143, 0),
            _pt("东莞", 0, 0, 4860, 4400, 90, 0),
            _pt("阳朔", 0, 0, 5832, 5300, 108, 0),
            _pt("佛山", 0, 0, 1200, 1100, 26, 0),
            _pt("珠海", 0, 0, 950, 880, 20, 0),
            _pt("中山", 0, 0, 820, 760, 18, 0),
            _pt("惠州", 0, 0, 750, 690, 16, 0),
            _pt("汕头", 0, 0, 620, 570, 14, 0),
            _pt("温州", 0, 0, 860, 800, 20, 0),
            _pt("宁波", 0, 0, 720, 660, 16, 0),
            _pt("绍兴", 0, 0, 560, 520, 12, 0),
            _pt("桂林", 0, 0, 610, 560, 14, 0),
            _pt("柳州", 0, 0, 540, 500, 12, 0),
            _pt("南宁", 0, 0, 650, 600, 15, 0),
        ],
        # 网点密集地图
        "site": [
            _pt("深圳", 2379, 14250, 0, 0, 341, 708000),
            _pt("杭州", 1502, 9000, 0, 0, 216, 448000),
            _pt("广州", 1002, 6000, 0, 0, 143, 299000),
            _pt("东莞", 626, 3750, 0, 0, 90, 187000),
            _pt("阳朔", 751, 4500, 0, 0, 108, 224000),
            _pt("佛山", 180, 1080, 0, 0, 26, 54000),
            _pt("珠海", 140, 840, 0, 0, 20, 42000),
            _pt("中山", 120, 720, 0, 0, 18, 36000),
            _pt("惠州", 110, 660, 0, 0, 16, 33000),
            _pt("汕头", 90, 540, 0, 0, 14, 27000),
            _pt("温州", 130, 780, 0, 0, 20, 39000),
            _pt("宁波", 110, 660, 0, 0, 16, 33000),
            _pt("绍兴", 80, 480, 0, 0, 12, 24000),
            _pt("桂林", 90, 540, 0, 0, 14, 27000),
            _pt("柳州", 80, 480, 0, 0, 12, 24000),
            _pt("南宁", 100, 600, 0, 0, 15, 30000),
        ],
    }


# =====================================================================
# 7. 全量明细数据（点击数字下钻）
# =====================================================================
# -*- coding: utf-8 -*-
"""临时补丁：新 build_details 函数体（22 类明细表）"""
import random

def build_details():
    """全量业务明细表（22 类）：每个 KPI 都有对应明细数据支撑，均含业务筛选维度字段"""
    # ---------- 代理商 / 商户 / 人员池（供各表引用） ----------
    agents = ["前海移动", "量讯物联", "齐犇科技", "好马奇", "工宇智能", "安智华"]
    merchants = ["顺丰速运", "美团配送", "达达快送", "中通快递", "菜鸟驿站", "京东物流"]
    managers = ["张伟", "李娜", "王强", "陈静", "刘洋", "赵敏"]
    creators = ["135" + str(random.randint(10000000, 99999999)) for _ in range(8)]
    salesmen = ["136" + str(random.randint(10000000, 99999999)) for _ in range(6)]

    def pick_city():
        return random.choices(CITIES, weights=[0.38, 0.24, 0.12, 0.16, 0.10])[0]

    # ---------- 换电柜详情 ----------
    cabinets = []
    site_names = []
    for c in CITIES:
        for s in range(1, 41):
            site_names.append(f"{c}-{random.choice(SCENES)}-{s:02d}号")
    for i in range(1, 61):
        city = pick_city()
        slot = random.choices(["6口", "6口", "6口", "4口", "4口", "3口", "12口"], weights=[30, 30, 25, 20, 20, 12, 1])[0]
        site = random.choice(site_names)
        cabinets.append({
            "id": "CAB-" + str(i).zfill(5), "sn": "CAB-SN-" + str(880000 + i * 137),
            "city": city, "site": site, "site_id": "SITE-" + str(random.randint(1, 60)).zfill(4),
            "slot": slot, "status": "运营中", "online": "在线" if random.random() > 0.12 else "离线",
            "daily_orders": random.randint(4, 16), "month_revenue": random.randint(1500, 5200),
            "use_years": round(random.uniform(0.3, 3.4), 1),
            "payback": "已回本" if random.random() > 0.5 else "未回本",
            "agent": random.choice(agents), "merchant": random.choice(merchants),
            "firmware": "V" + str(random.randint(2, 6)) + "." + str(random.randint(0, 9)) + "." + str(random.randint(0, 9)),
        })

    # ---------- 电池详情 ----------
    batteries = []
    for i in range(1, 81):
        city = pick_city()
        model = random.choices(["4824", "4814", "4824", "钠电"], weights=[40, 35, 25, 1])[0]
        batteries.append({
            "id": "BT-" + str(i).zfill(5), "sn": "BT-SN-" + str(660000 + i * 233),
            "model": model, "city": city,
            "status": random.choice(["在柜", "在柜", "在柜", "满电待换", "维修中", "仓库"]),
            "soc": random.randint(5, 100), "voltage": round(random.uniform(46, 54), 1),
            "temperature": round(random.uniform(18, 42), 1),
            "cycles": random.randint(30, 700), "soh": round(random.uniform(72, 99), 1),
            "use_months": random.randint(1, 24),
            "cabinet": "CAB-" + str(random.randint(1, 60)).zfill(5),
        })

    # ---------- 电芯明细 ----------
    cells = []
    for i in range(1, 51):
        cells.append({
            "id": "CELL-" + str(880000 + i * 19), "battery": "BT-" + str(random.randint(1, 80)).zfill(5),
            "status": random.choice(["正常", "正常", "正常", "预警", "故障"]),
            "voltage": round(random.uniform(3.15, 4.22), 3),
            "temperature": round(random.uniform(18, 40), 1),
            "use_hours": random.randint(120, 8600),
        })

    # ---------- 换电柜告警 ----------
    alarms = []
    alarm_types = ["电池温度过高", "电芯压差过大", "通讯异常", "柜门异常", "充电模块故障", "消防误报", "电池SOC过低", "离柜异常"]
    for i in range(1, 46):
        city = pick_city()
        alarms.append({
            "id": "ALM-" + str(900000 + i * 77),
            "time": f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}",
            "device": "CAB-" + str(random.randint(1, 6260)).zfill(5),
            "device_sn": "CAB-SN-" + str(random.randint(880000, 900000)),
            "type": random.choice(alarm_types), "level": random.choice(["普通", "普通", "重要", "紧急"]),
            "status": random.choice(["已处理", "已处理", "处理中", "待处理"]),
            "handler": random.choice(["张工", "李工", "王工", "陈工", "--"]),
            "city": city, "agent": random.choice(agents),
        })

    # ---------- 用户详情 ----------
    users = []
    packages = ["月租", "季租", "半年租", "1年租", "3年及以上"]
    for i in range(1, 61):
        city = pick_city()
        users.append({
            "id": "U-" + str(50000 + i * 17),
            "phone": "13" + str(random.randint(100000000, 999999999)),
            "name": random.choice(["王明", "李强", "张军", "刘杰", "陈洋", "杨辉", "赵勇", "孙涛", "周斌", "吴华"]),
            "city": city, "package": random.choice(packages),
            "status": random.choice(["活跃", "活跃", "活跃", "沉默", "已流失"]),
            "activate_date": f"2026-{random.randint(1,9):02d}-{random.randint(1,28):02d}",
            "month_exchanges": random.randint(2, 60), "arpu": round(random.uniform(38, 88), 1),
            "renewed": "是" if random.random() > 0.2 else "否",
            "agent": random.choice(agents), "merchant": random.choice(merchants),
            "deposit": random.choice([0, 0, 0, 99, 199, 299]),
        })

    # ---------- 网点详情 ----------
    sites = []
    share_modes = ["按次分成15%-30%", "年场租+电费", "电费+分成", "免费场地"]
    for i in range(1, 61):
        city = pick_city()
        sites.append({
            "id": "SITE-" + str(i).zfill(4), "name": f"{city}-{random.choice(SCENES)}-{i:02d}号",
            "city": city, "type": random.choice(SCENES),
            "mode": random.choice(share_modes), "share_ratio": round(random.uniform(0, 30), 1),
            "elec_price": round(random.uniform(0.7, 2.0), 2),
            "cabinets": random.randint(2, 16), "month_orders": random.randint(300, 6000),
            "month_revenue": random.randint(1800, 9000), "profit": "盈利" if random.random() > 0.3 else "亏损",
            "expire": f"202{random.randint(6, 9)}-Q{random.randint(1, 4)}",
            "agent": random.choice(agents), "merchant": random.choice(merchants),
            "manager": random.choice(managers),
        })

    # ---------- 换电订单详情 ----------
    orders = []
    for i in range(1, 61):
        city = pick_city()
        pay_time = f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}"
        refund = "--"
        if random.random() < 0.15:
            refund = f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}"
        orders.append({
            "id": "ORD-" + str(700000 + i * 31),
            "time": pay_time, "pay_time": pay_time, "refund_time": refund,
            "user": "U-" + str(random.randint(1, 60) * 17 + 50000),
            "user_phone": "13" + str(random.randint(100000000, 999999999)),
            "city": city,
            "site": "SITE-" + str(random.randint(1, 60)).zfill(4),
            "site_name": f"{city}-{random.choice(SCENES)}-{random.randint(1,40):02d}号",
            "cabinet": "CAB-" + str(random.randint(1, 60)).zfill(5),
            "battery": "BT-" + str(random.randint(1, 80)).zfill(5),
            "type": random.choice(["换电", "换电", "换电", "退换", "维修取电"]),
            "amount": round(random.uniform(0, 3), 2),
            "income_unit": random.choice(["公司", "网点", "代理商"]),
            "out_unit": random.choice(["用户", "代理商", "公司"]),
            "pay_no": "PAY-" + str(random.randint(100000, 999999)),
            "status": random.choice(["成功", "成功", "成功", "已退款", "失败"]),
        })

    # ---------- 套餐订单详情（租期卡 / 电量卡） ----------
    packages = [
        {"id": "PKG-R01", "name": "社区居民月租", "category": "租期卡", "price": 128, "term": "1个月", "power": "8000%电量包", "users": 12100, "revenue": 1548800, "renew": 74.2, "upgrade": 4.6, "downgrade": 3.1, "churn": 4.6, "arpu": 65.2, "exchanges": 22},
        {"id": "PKG-R02", "name": "社区居民季租", "category": "租期卡", "price": 350, "term": "3个月", "power": "8000%电量包", "users": 5200, "revenue": 728000, "renew": 79.5, "upgrade": 5.8, "downgrade": 2.4, "churn": 3.8, "arpu": 52.6, "exchanges": 19},
        {"id": "PKG-R03", "name": "半年租", "category": "租期卡", "price": 620, "term": "6个月", "power": "8000%电量包", "users": 3400, "revenue": 842000, "renew": 84.1, "upgrade": 6.2, "downgrade": 1.8, "churn": 3.1, "arpu": 52.0, "exchanges": 18},
        {"id": "PKG-R04", "name": "1年租", "category": "租期卡", "price": 1080, "term": "12个月", "power": "8000%电量包", "users": 5900, "revenue": 2548000, "renew": 88.6, "upgrade": 3.4, "downgrade": 1.2, "churn": 2.6, "arpu": 47.6, "exchanges": 17},
        {"id": "PKG-R05", "name": "3年及以上", "category": "租期卡", "price": 2880, "term": "36个月", "power": "8000%电量包+200元回收", "users": 5000, "revenue": 5760000, "renew": 93.2, "upgrade": 1.2, "downgrade": 0.6, "churn": 2.1, "arpu": 49.5, "exchanges": 16},
        {"id": "PKG-E01", "name": "电量卡-100度", "category": "电量卡", "price": 60, "term": "100度", "power": "100度电", "users": 1800, "revenue": 108000, "renew": 68.5, "upgrade": 3.2, "downgrade": 2.1, "churn": 5.2, "arpu": 42.0, "exchanges": 12},
        {"id": "PKG-E02", "name": "电量卡-200度", "category": "电量卡", "price": 110, "term": "200度", "power": "200度电", "users": 2300, "revenue": 253000, "renew": 71.8, "upgrade": 4.0, "downgrade": 1.9, "churn": 4.7, "arpu": 44.5, "exchanges": 13},
        {"id": "PKG-E03", "name": "电量卡-500度", "category": "电量卡", "price": 260, "term": "500度", "power": "500度电", "users": 1200, "revenue": 312000, "renew": 76.3, "upgrade": 4.8, "downgrade": 1.5, "churn": 4.2, "arpu": 46.8, "exchanges": 15},
    ]

    # ---------- 分成账单详情 ----------
    revenue_shares = []
    share_fees = ["换电分成", "租赁分成", "电费分成", "广告分成", "导购返佣"]
    for i in range(1, 51):
        city = pick_city()
        revenue_shares.append({
            "bill_id": "SHARE-" + str(300000 + i * 37),
            "fee_name": random.choice(share_fees), "fee_id": "FEE-" + str(400 + i),
            "month": f"2026-{random.randint(1,9):02d}",
            "site_name": f"{city}-{random.choice(SCENES)}-{random.randint(1,40):02d}号",
            "city": city, "agent": random.choice(agents),
            "creator_phone": random.choice(creators),
            "income_phone": random.choice(creators + salesmen),
            "out_phone": random.choice(creators + salesmen),
            "amount": round(random.uniform(200, 12000), 2),
            "ratio": round(random.uniform(10, 30), 1),
            "status": random.choice(["已结算", "已结算", "待结算", "审核中"]),
            "settle_time": f"2026-09-{random.randint(1,16):02d}" if random.random() > 0.3 else "--",
        })

    # ---------- 协议及押金详情 ----------
    agreements = []
    agree_types = ["网点合作协议", "电池押金协议", "代理商框架协议", "商户入驻协议"]
    for i in range(1, 41):
        city = pick_city()
        agreements.append({
            "id": "AGR-" + str(200000 + i * 53),
            "type": random.choice(agree_types),
            "object": (f"{city}-{random.choice(SCENES)}-{random.randint(1,40):02d}号" if random.random() > 0.4 else "BT-" + str(random.randint(1, 80)).zfill(5)),
            "party": random.choice(agents + merchants + managers),
            "amount": round(random.uniform(500, 50000), 2),
            "deposit": round(random.uniform(0, 8000), 2),
            "status": random.choice(["生效中", "生效中", "已到期", "待续签"]),
            "sign_date": f"202{random.randint(3,6)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "expire_date": f"202{random.randint(6,9)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "agent": random.choice(agents), "merchant": random.choice(merchants),
        })

    # ---------- 优惠券：代理商发券统计 ----------
    coupon_agent_stats = []
    for a in agents:
        issued = random.randint(500, 5000)
        redeemed = random.randint(int(issued * 0.3), int(issued * 0.85))
        coupon_agent_stats.append({
            "agent": a, "period": "2026-09",
            "coupon_count": issued,
            "total_amount": round(issued * random.choice([5, 10, 20, 50]), 2),
            "redeemed_count": redeemed,
            "redeem_rate": round(redeemed / issued * 100, 1),
        })

    # ---------- 优惠券：兑换码 ----------
    coupon_codes = []
    coupon_tpl = [("COUP-100", "新客立减10元", 10), ("COUP-101", "满99减20", 20), ("COUP-102", "续租5折券", 30), ("COUP-103", "电量卡9折", 15)]
    for i in range(1, 61):
        tpl = random.choice(coupon_tpl)
        redeemed = random.random() > 0.4
        coupon_codes.append({
            "code": "QH-" + str(500000 + i * 997),
            "coupon_id": tpl[0], "name": tpl[1], "face_value": tpl[2],
            "type": random.choice(["新客券", "满减券", "折扣券", "兑换券"]),
            "status": "已兑换" if redeemed else "未兑换",
            "issuer": random.choice(agents + managers),
            "redeemer": random.choice(managers + salesmen) if redeemed else "--",
            "redeem_time": f"2026-09-{random.randint(1,16):02d}" if redeemed else "--",
            "valid_from": "2026-09-01", "valid_to": "2026-12-31",
        })

    # ---------- 优惠券：用户优惠券 ----------
    user_coupons = []
    for i in range(1, 51):
        used = random.random() > 0.4
        user_coupons.append({
            "id": "UC-" + str(100000 + i * 71),
            "code": "QH-" + str(500000 + i * 997),
            "coupon_id": random.choice(coupon_tpl)[0],
            "name": random.choice([t[1] for t in coupon_tpl]),
            "face_value": random.choice([10, 15, 20, 30]),
            "user_id": "U-" + str(50000 + random.randint(1, 60) * 17),
            "user_phone": "13" + str(random.randint(100000000, 999999999)),
            "source": random.choice(["代理商发放", "新客礼包", "活动奖励", "推荐有礼"]),
            "status": "已使用" if used else "未使用",
            "used_time": f"2026-09-{random.randint(1,16):02d}" if used else "--",
            "redeemer": random.choice(managers + salesmen) if used else "--",
            "valid_to": "2026-12-31",
        })

    # ---------- 人员详情（多角色） ----------
    people = []
    roles = ["代理商", "代理商员工", "渠道商", "商户", "导购", "业务员", "消费者", "创客"]
    for i in range(1, 61):
        role = random.choice(roles)
        city = pick_city()
        people.append({
            "id": "P-" + str(30000 + i * 13),
            "phone": "1" + random.choice(["3", "5", "7", "8", "9"]) + str(random.randint(100000000, 999999999)),
            "name": random.choice(["李明", "王芳", "张强", "刘敏", "陈杰", "杨丽", "赵磊", "孙燕", "周鹏", "吴婷"]),
            "role": role,
            "city": city,
            "org": random.choice(agents + merchants) if role in ["代理商", "代理商员工", "渠道商", "商户"] else "--",
            "status": random.choice(["在职", "在职", "在职", "离职", "停用"]),
            "register_date": f"202{random.randint(3,6)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "orders": random.randint(0, 300), "revenue": round(random.uniform(0, 50000), 2),
        })

    # ---------- 费用名称详情 ----------
    fee_names = [
        {"fee_id": "FEE-001", "name": "换电分成", "category": "支出", "biz_type": "分成结算", "status": "启用", "note": "按次分成15%-30%给网点/商户"},
        {"fee_id": "FEE-002", "name": "租赁分成", "category": "支出", "biz_type": "分成结算", "status": "启用", "note": "租赁套餐按比例分成"},
        {"fee_id": "FEE-003", "name": "电费分成", "category": "支出", "biz_type": "分成结算", "status": "启用", "note": "与场地按电费结算分成"},
        {"fee_id": "FEE-004", "name": "导购返佣", "category": "支出", "biz_type": "激励返佣", "status": "启用", "note": "门店导购激活/续租返佣"},
        {"fee_id": "FEE-005", "name": "员工提成", "category": "支出", "biz_type": "激励返佣", "status": "启用", "note": "业务员业绩提成"},
        {"fee_id": "FEE-006", "name": "平台服务费", "category": "支出", "biz_type": "平台费用", "status": "启用", "note": "物联网平台年费"},
        {"fee_id": "FEE-007", "name": "电费结算", "category": "支出", "biz_type": "能耗费用", "status": "启用", "note": "按度数与单价结算"},
        {"fee_id": "FEE-008", "name": "场地租金", "category": "支出", "biz_type": "场地费用", "status": "启用", "note": "年场租"},
        {"fee_id": "FEE-009", "name": "套餐收入", "category": "收入", "biz_type": "主营收入", "status": "启用", "note": "租期卡/电量卡销售"},
        {"fee_id": "FEE-010", "name": "押金收入", "category": "收入", "biz_type": "资金池", "status": "启用", "note": "电池押金"},
        {"fee_id": "FEE-011", "name": "广告收入", "category": "收入", "biz_type": "增值收入", "status": "停用", "note": "柜体广告位"},
        {"fee_id": "FEE-012", "name": "回收残值", "category": "收入", "biz_type": "资产处置", "status": "启用", "note": "电池回收残值"},
    ]

    # ---------- 电费统计结算详情 ----------
    electricity_bills = []
    for i in range(1, 41):
        city = pick_city()
        merchant = random.choice(merchants)
        settle = random.random() > 0.25
        electricity_bills.append({
            "bill_id": "ELEC-" + str(800000 + i * 29),
            "month": f"2026-{random.randint(1,9):02d}",
            "agent": random.choice(agents),
            "merchant_id": "M-" + str(1000 + i),
            "merchant_name": merchant,
            "merchant_phone": "13" + str(random.randint(100000000, 999999999)),
            "site_name": f"{city}-{random.choice(SCENES)}-{random.randint(1,40):02d}号",
            "city": city,
            "degree": round(random.uniform(500, 15000), 1),
            "unit_price": round(random.uniform(0.7, 2.0), 2),
            "amount": round(random.uniform(500, 25000), 2),
            "settle_time": f"2026-09-{random.randint(1,16):02d}" if settle else "--",
            "settle_status": "已结算" if settle else "待结算",
        })

    # ---------- 交易流水表 ----------
    transactions = []
    txn_types = ["换电支付", "套餐购买", "分成结算", "电费结算", "退款", "押金收退", "优惠券核销", "转账"]
    for i in range(1, 61):
        city = pick_city()
        transactions.append({
            "txn_id": "TXN-" + str(400000 + i * 43),
            "time": f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}",
            "type": random.choice(txn_types),
            "item": random.choice(["换电服务", "套餐续费", "网点分成", "电费", "电池押金", "优惠券"]),
            "amount": round(random.uniform(0.01, 12000), 2),
            "income_unit": random.choice(["公司", "网点", "代理商", "商户", "用户"]),
            "out_unit": random.choice(["用户", "代理商", "公司", "商户"]),
            "channel": random.choice(["微信支付", "支付宝", "银行卡", "余额", "线下转账"]),
            "related_order": "ORD-" + str(700000 + random.randint(1, 60) * 31) if random.random() > 0.3 else "--",
            "pay_no": "PAY-" + str(random.randint(100000, 999999)),
            "status": random.choice(["成功", "成功", "成功", "处理中", "失败"]),
        })

    # ---------- 支付及转账记录 ----------
    payments = []
    pay_types = ["支付", "支付", "转账", "退款"]
    pay_methods = ["微信支付", "支付宝", "银行卡", "公司对公", "现金"]
    for i in range(1, 51):
        refund = "--"
        if random.random() < 0.2:
            refund = f"2026-09-{random.randint(1,16):02d}"
        payments.append({
            "pay_id": "PAY-" + str(900000 + i * 61),
            "time": f"2026-09-{random.randint(1,16):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}",
            "type": random.choice(pay_types),
            "amount": round(random.uniform(1, 50000), 2),
            "method": random.choice(pay_methods),
            "pay_no": "PAY-" + str(random.randint(100000, 999999)),
            "payer": random.choice(["用户", "代理商", "公司", "商户"]),
            "payee": random.choice(["公司", "代理商", "商户", "网点"]),
            "status": random.choice(["成功", "成功", "成功", "待确认", "失败"]),
            "refund_time": refund,
        })

    # ---------- 电池健康度循环次数明细 ----------
    battery_cycles = []
    for i in range(1, 81):
        cycles = random.randint(30, 720)
        soh = round(random.uniform(70, 99.5), 1)
        health = "优秀" if soh >= 90 else ("良好" if soh >= 85 else ("一般" if soh >= 80 else "较差"))
        city = pick_city()
        model = random.choices(["4824", "4814", "4824", "钠电"], weights=[40, 35, 25, 1])[0]
        battery_cycles.append({
            "battery_id": "BT-" + str(i).zfill(5),
            "sn": "BT-SN-" + str(660000 + i * 233),
            "model": model, "cycles": cycles, "soh": soh, "health_level": health,
            "voltage": round(random.uniform(46, 54), 1),
            "temperature": round(random.uniform(18, 42), 1),
            "use_months": random.randint(1, 24),
            "cabinet": "CAB-" + str(random.randint(1, 60)).zfill(5),
            "city": city,
            "status": random.choice(["在柜", "在柜", "维修中", "仓库"]),
        })

    # ---------- 采购批次（保留） ----------
    procurement = [
        {"batch": "2024-Q3", "type": "换电柜", "model": "6口柜", "qty": 850, "price": 18600, "amount": 15810000, "supplier": "品牌A", "date": "2024-08", "status": "已交付", "warranty_to": "2026-08"},
        {"batch": "2024-Q4", "type": "换电柜", "model": "4口柜", "qty": 1200, "price": 14800, "amount": 17760000, "supplier": "品牌A", "date": "2024-11", "status": "已交付", "warranty_to": "2026-11"},
        {"batch": "2025-Q1", "type": "换电柜", "model": "6口柜", "qty": 980, "price": 18000, "amount": 17640000, "supplier": "品牌B", "date": "2025-02", "status": "已交付", "warranty_to": "2027-02"},
        {"batch": "2025-Q2", "type": "换电柜", "model": "3口柜", "qty": 1050, "price": 11200, "amount": 11760000, "supplier": "品牌A", "date": "2025-05", "status": "已交付", "warranty_to": "2027-05"},
        {"batch": "2025-Q3", "type": "换电柜", "model": "4口柜", "qty": 920, "price": 14500, "amount": 13340000, "supplier": "品牌C", "date": "2025-08", "status": "已交付", "warranty_to": "2027-08"},
        {"batch": "2025-Q4", "type": "换电柜", "model": "6口柜", "qty": 610, "price": 17200, "amount": 10492000, "supplier": "品牌B", "date": "2025-11", "status": "已安装", "warranty_to": "2027-11"},
        {"batch": "2026-Q1", "type": "换电柜", "model": "3口柜", "qty": 420, "price": 10800, "amount": 4536000, "supplier": "品牌A", "date": "2026-02", "status": "已安装", "warranty_to": "2028-02"},
        {"batch": "2026-Q2", "type": "换电柜", "model": "6口柜", "qty": 230, "price": 16800, "amount": 3864000, "supplier": "品牌B", "date": "2026-05", "status": "交付中", "warranty_to": "2028-05"},
        {"batch": "2024-Q3", "type": "电池", "model": "4824", "qty": 15500, "price": 980, "amount": 15190000, "supplier": "电池厂X", "date": "2024-08", "status": "已交付", "warranty_to": "2026-08"},
        {"batch": "2025-Q1", "type": "电池", "model": "4814", "qty": 9800, "price": 760, "amount": 7448000, "supplier": "电池厂Y", "date": "2025-02", "status": "已交付", "warranty_to": "2027-02"},
        {"batch": "2025-Q3", "type": "电池", "model": "4824", "qty": 11500, "price": 950, "amount": 10925000, "supplier": "电池厂X", "date": "2025-08", "status": "已交付", "warranty_to": "2027-08"},
        {"batch": "2026-Q1", "type": "电池", "model": "钠电", "qty": 43, "price": 1180, "amount": 50740, "supplier": "电池厂Z", "date": "2026-02", "status": "试点中", "warranty_to": "2028-02"},
    ]

    expense_items = [
        {"month": "2026-09", "item": "电费", "amount": 295000, "ratio": 22.3, "note": "0.7-2元/度，峰谷充电"},
        {"month": "2026-09", "item": "网点分成", "amount": 208000, "ratio": 15.7, "note": "按次分成15%-30%"},
        {"month": "2026-09", "item": "运维人工", "amount": 246000, "ratio": 18.6, "note": "32人，人均126柜"},
        {"month": "2026-09", "item": "推广获客", "amount": 145000, "ratio": 11.0, "note": "CAC 86元"},
        {"month": "2026-09", "item": "员工激励", "amount": 68000, "ratio": 5.1, "note": "提成+奖金"},
        {"month": "2026-09", "item": "门店导购返佣", "amount": 88000, "ratio": 6.7, "note": "激活+续租返佣"},
        {"month": "2026-09", "item": "平台与软件", "amount": 56000, "ratio": 4.2, "note": "物联网年费+服务器"},
        {"month": "2026-09", "item": "折旧摊销", "amount": 240000, "ratio": 18.2, "note": "柜+电池按月折旧"},
        {"month": "2026-09", "item": "其他", "amount": 28000, "ratio": 2.1, "note": "保险/合规/税费"},
    ]

    revenue_items = [
        {"month": "2026-09", "item": "月租套餐", "amount": 794900, "ratio": 42.6},
        {"month": "2026-09", "item": "季租套餐", "amount": 276000, "ratio": 14.8},
        {"month": "2026-09", "item": "半年租", "amount": 179000, "ratio": 9.6},
        {"month": "2026-09", "item": "1年租", "amount": 283500, "ratio": 15.2},
        {"month": "2026-09", "item": "3年及以上", "amount": 249900, "ratio": 13.4},
        {"month": "2026-09", "item": "其他收入", "amount": 82000, "ratio": 4.4},
    ]

    return {
        "cabinets": cabinets, "batteries": batteries, "cells": cells, "alarms": alarms,
        "users": users, "sites": sites, "orders": orders, "packages": packages,
        "procurement": procurement, "expense_items": expense_items, "revenue_items": revenue_items,
        "revenue_shares": revenue_shares, "agreements": agreements,
        "coupon_agent_stats": coupon_agent_stats, "coupon_codes": coupon_codes, "user_coupons": user_coupons,
        "people": people, "fee_names": fee_names, "electricity_bills": electricity_bills,
        "transactions": transactions, "payments": payments, "battery_cycles": battery_cycles,
    }

def build_full_snapshot():
    snapshot = {
        "overview": M.build_overview(),
        "assets": M.build_assets(),
        "users": M.build_users(),
        "operations": M.build_operations(),
        "sites": M.build_sites(),
        "finance": M.build_finance(),
        "digital": M.build_digital(),
        "industry": M.build_industry(),
        # 新增模块
        "assets_ext": build_assets_ext(),
        "revenue": build_revenue(),
        "expense": build_expense(),
        "efficiency": build_efficiency(),
        "iot": build_iot(),
        "maps": build_maps(),
        "details": build_details(),
    }
    # finance 补充引用
    snapshot["finance"]["revenue_kpis"] = snapshot["revenue"]["kpis"]
    snapshot["finance"]["expense_kpis"] = snapshot["expense"]["kpis"]
    snapshot["finance"]["revenue_mix_ext"] = snapshot["revenue"]["revenue_mix_ext"]
    snapshot["finance"]["package_cost"] = snapshot["expense"]["package_cost"]
    return snapshot


def main():
    snapshot = build_full_snapshot()
    path = save_snapshot(snapshot, source="mock-demo-full", db_connected=False,
                         meta_extra={"note": "全量演示快照：文档11板块263指标+图片指标+三大地图+明细下钻；连接数据库后运行 collect.py 覆盖"})
    print("FULL_SNAPSHOT_SAVED:", path)


if __name__ == "__main__":
    main()
