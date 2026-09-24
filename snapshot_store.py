# -*- coding: utf-8 -*-
"""
snapshot_store.py - 快照数据读写层
====================================
核心机制：所有看板数据均以「JSON 快照」形式落盘到 snapshots/ 目录。
- latest.json  : 最近一次成功采集的数据（看板离线展示用）
- <时间戳>.json: 每次采集的历史归档（保留最近 N 份）
看板启动时只读取快照，不直连数据库，因此离线/断网也能正常打开并查看
「最后一次链接数据库」时的完整数据。

约定快照顶层结构（各模块 key 固定，字段缺失时前端自动降级展示）：
{
  "meta": {"snapshot_time","source","db_connected","db_host"},
  "overview": {...}, "assets": {...}, "users": {...},
  "operations": {...}, "sites": {...}, "finance": {...},
  "digital": {...}, "industry": {...}
}
"""
import json
import os
import shutil
from datetime import datetime

SNAPSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
LATEST_FILE = os.path.join(SNAPSHOT_DIR, "latest.json")
MAX_ARCHIVE = 30  # 最多保留的历史归档份数


def ensure_dir():
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)


def save_snapshot(data: dict, source: str = "unknown", db_connected: bool = False,
                  db_host: str = "", meta_extra: dict = None) -> str:
    """保存一份快照：写入带时间戳归档文件 + 覆盖 latest.json。返回快照文件路径。"""
    ensure_dir()
    now = datetime.now()
    data = dict(data or {})
    meta = {
        "snapshot_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "source": source,
        "db_connected": bool(db_connected),
        "db_host": db_host or "",
    }
    if isinstance(meta_extra, dict):
        meta.update(meta_extra)
    data["meta"] = meta

    # 时间戳归档
    ts_name = now.strftime("%Y%m%d_%H%M%S") + ".json"
    ts_path = os.path.join(SNAPSHOT_DIR, ts_name)
    with open(ts_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    # 覆盖 latest
    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    # 清理过旧归档
    archives = sorted([p for p in os.listdir(SNAPSHOT_DIR)
                       if p.endswith(".json") and p != "latest.json"])
    for old in archives[:-MAX_ARCHIVE]:
        try:
            os.remove(os.path.join(SNAPSHOT_DIR, old))
        except OSError:
            pass
    return ts_path


def load_snapshot(path: str = None) -> dict:
    """读取快照；path 为空时读 latest.json。文件不存在返回 None。"""
    p = path or LATEST_FILE
    if not os.path.exists(p):
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def list_archives() -> list:
    """列出全部快照归档（含 latest 指向的时间戳）。"""
    ensure_dir()
    items = []
    for p in sorted(os.listdir(SNAPSHOT_DIR)):
        if p.endswith(".json"):
            full = os.path.join(SNAPSHOT_DIR, p)
            try:
                with open(full, "r", encoding="utf-8") as f:
                    meta = json.load(f).get("meta", {})
            except Exception:
                meta = {}
            items.append({"file": p, "time": meta.get("snapshot_time", ""),
                          "source": meta.get("source", ""),
                          "db_connected": meta.get("db_connected", False)})
    items.sort(key=lambda x: x["file"], reverse=True)
    return items


def snapshot_info() -> dict:
    """看板启动时展示的快照元信息。"""
    snap = load_snapshot()
    if not snap or "meta" not in snap:
        return {"available": False, "message": "暂无数据快照，请先运行 collect.py 采集数据，或运行 mock_snapshot.py 生成演示数据。"}
    meta = snap["meta"]
    return {
        "available": True,
        "snapshot_time": meta.get("snapshot_time", ""),
        "source": meta.get("source", ""),
        "db_connected": meta.get("db_connected", False),
        "db_host": meta.get("db_host", ""),
        "archives": len(list_archives()),
    }
