# -*- coding: utf-8 -*-
"""
db_connector.py - 数据库连接器（阿里云 AnalyticDB MySQL + MongoDB）
====================================================================
用于 collect.py 采集真实业务数据。连接信息可在 config/config.yaml 覆盖，
默认读取脚本同目录 config.yaml 或环境变量。

数据源说明：
1) MySQL (AnalyticDB)：业务库 sharing-citybike-pro / sharing-system-base-pro
   - 用户、订单、套餐、点位、财务等结构化业务数据
2) MongoDB (dudubox-online)：设备物联网实时状态
   - 电池 BMS 状态（SOH/循环/温度）、换电柜状态（仓位/告警/电量）

注意：本连接器仅做「可配置、可容错」的采集骨架。明天连接内网后，
需要根据实际库表结构调整 collect.py 中的查询语句与字段映射。
"""
import os
import json

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "config.yaml")


def load_config():
    """读取连接配置（config.yaml 优先，缺失时使用内置默认）。"""
    defaults = {
        "mysql": {
            "host": "db.example.com",
            "port": 3306,
            "user": "citybike_pro",
            "password"***",
            "databases": ["sharing-citybike-pro", "sharing-system-base-pro"],
        },
        "mongodb": {
            "host": "106.14.226.143",
            "port": 27017,
            "user": "dudubox_read",
            "password"***",
            "database": "dudubox-online",
        },
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            for k in ("mysql", "mongodb"):
                if k in cfg and isinstance(cfg[k], dict):
                    defaults[k].update(cfg[k])
        except Exception:
            pass
    return defaults


def mysql_connect(cfg=None):
    """建立 MySQL/AnalyticDB 连接。失败返回 None 并打印原因。"""
    cfg = cfg or load_config()["mysql"]
    try:
        import pymysql
        conn = pymysql.connect(
            host=cfg["host"], port=cfg.get("port", 3306),
            user=cfg["user"], password=cfg["password"],
            charset="utf8mb4", connect_timeout=15, read_timeout=30,
        )
        return conn
    except Exception as e:
        print("[mysql] connect failed:", e)
        return None


def mongodb_connect(cfg=None):
    """建立 MongoDB 连接（只读账号）。失败返回 None 并打印原因。"""
    cfg = cfg or load_config()["mongodb"]
    try:
        from pymongo import MongoClient
        uri = (f"mongodb://{cfg['user']}:{cfg['password']}"
               f"@{cfg['host']}:{cfg.get('port', 27017)}/admin")
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        return client[cfg["database"]]
    except Exception as e:
        print("[mongodb] connect failed:", e)
        return None


def mysql_tables(conn, database=None):
    """探测指定库（或全部库）的表清单，供校准表名使用。"""
    out = {}
    try:
        with conn.cursor() as cur:
            if database:
                dbs = [database]
            else:
                cur.execute("SHOW DATABASES")
                dbs = [r[0] for r in cur.fetchall()]
            for db in dbs:
                cur.execute(f"SHOW TABLES FROM `{db}`")
                tables = [r[0] for r in cur.fetchall()]
                if tables:
                    out[db] = tables
    except Exception as e:
        print("[mysql] probe failed:", e)
    return out
