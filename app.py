# -*- coding: utf-8 -*-
"""
app.py - 电动自行车换电行业趋势发展综合分析看板（Flask 主程序）
================================================================
启动：python app.py  ->  http://127.0.0.1:8096/
离线机制：所有数据来自本地 snapshots/ 快照，不依赖数据库；
         每次连接数据库采集后自动更新 latest.json，离线照常展示最后一次数据。
"""
import os
import json
import sys

from flask import Flask, jsonify, render_template, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from snapshot_store import load_snapshot, snapshot_info, list_archives, SNAPSHOT_DIR

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder="static", template_folder="templates")
PORT = int(os.environ.get("PORT", 8097))


@app.route("/")
def index():
    return render_template("index.html", port=PORT)


@app.route("/api/snapshot")
def api_snapshot():
    snap = load_snapshot()
    if snap is None:
        return jsonify({"error": "no snapshot"}), 404
    return jsonify(snap)


@app.route("/api/info")
def api_info():
    return jsonify(snapshot_info())


@app.route("/api/archives")
def api_archives():
    return jsonify(list_archives())


@app.route("/api/archive/<name>")
def api_archive(name):
    safe = os.path.basename(name)
    if not safe.endswith(".json"):
        return jsonify({"error": "bad name"}), 400
    snap = load_snapshot(os.path.join(SNAPSHOT_DIR, safe))
    if snap is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(snap)


if __name__ == "__main__":
    print(f"换电行业综合看板已启动: http://127.0.0.1:{PORT}/")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
