/* ============================================================
 * 换电行业综合分析看板 - 前端渲染引擎 v2（全量指标版）
 * 数据来源：/api/snapshot（本地快照，离线可用）
 * ============================================================ */
(function () {
  "use strict";

  var SNAPSHOT = null;
  var renderedTabs = {};
  var chartInstances = {};
  var GEO_LOADED = {};

  var PALETTE = ["#38bdf8", "#22d3ee", "#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf", "#fb923c", "#60a5fa"];
  var GRID = { left: 48, right: 20, top: 34, bottom: 30 };
  var FONT = '"Microsoft YaHei","PingFang SC",sans-serif';

  var BASE_AXIS = {
    axisLine: { lineStyle: { color: "#2a3b5c" } },
    axisLabel: { color: "#8ea0bd", fontSize: 11 },
    splitLine: { lineStyle: { color: "rgba(56,130,246,.08)" } }
  };

  function $(id) { return document.getElementById(id); }
  function fmtNum(v) {
    if (v === null || v === undefined || isNaN(v)) return "--";
    if (v >= 10000) return (v / 10000).toFixed(1) + "万";
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    return String(v);
  }
  function fmtMoney(v) {
    if (v === null || v === undefined || isNaN(v)) return "--";
    if (v >= 10000) return (v / 10000).toFixed(1) + "万";
    return String(v);
  }
  function isEmpty(o) { return o === null || o === undefined || (Array.isArray(o) && o.length === 0) || (typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === 0); }

  function chart(id) {
    var el = $(id);
    if (!el) return null;
    if (chartInstances[id]) { chartInstances[id].dispose(); }
    var inst = echarts.init(el, null, { renderer: "canvas" });
    chartInstances[id] = inst;
    return inst;
  }
  function setOption(id, option) {
    var inst = chart(id);
    if (!inst) return;
    inst.setOption(option, true);
  }
  function emptyChart(id, text) {
    setOption(id, {
      backgroundColor: "transparent",
      title: { text: text || "暂无数据", left: "center", top: "middle", textStyle: { color: "#5b6b8c", fontSize: 13, fontWeight: "normal" } }
    });
  }
  function baseTooltip(extra) {
    return Object.assign({
      backgroundColor: "rgba(10,18,36,.92)",
      borderColor: "rgba(56,130,246,.35)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      confine: true
    }, extra || {});
  }

  /* ---------------- KPI 卡（支持明细下钻） ---------------- */
  function renderKpis(id, items) {
    var wrap = $(id);
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (it) {
      var div = document.createElement("div");
      div.className = "kpi " + (it.cls || "");
      if (it.detail) { div.className += " clickable"; div.setAttribute("data-detail", it.detail); }
      var hint = it.hint ? '<div class="kpi-hint">' + it.hint + "</div>" : "";
      div.innerHTML = '<div class="kpi-label">' + it.label + '</div><div class="kpi-value">' + it.value + (it.unit ? "<small>" + it.unit + "</small>" : "") + "</div>" + hint;
      wrap.appendChild(div);
    });
  }

  /* ---------------- 通用图表快捷函数 ---------------- */
  function pie(id, data, extra) {
    if (isEmpty(data)) { emptyChart(id); return; }
    var e = extra || {};
    setOption(id, {
      tooltip: baseTooltip({ trigger: "item", formatter: e.formatter || "{b}: {c} ({d}%)" }),
      legend: { bottom: 0, textStyle: { color: "#8ea0bd", fontSize: 11 } },
      series: [{ type: "pie", radius: e.radius || ["38%", "64%"], center: e.center || ["50%", "46%"], itemStyle: { borderRadius: 6, borderColor: "#0b1220", borderWidth: 2 }, label: { color: "#cbd5e1", fontSize: 11 }, data: data, color: e.color || PALETTE }]
    });
  }
  function bar(id, data, xName, yName, opts) {
    if (isEmpty(data)) { emptyChart(id); return; }
    opts = opts || {};
    setOption(id, {
      tooltip: baseTooltip({ trigger: "axis" }),
      grid: GRID,
      xAxis: Object.assign({ type: "category", data: data.map(function (r) { return r[xName]; }) }, BASE_AXIS),
      yAxis: Object.assign({ type: "value", name: opts.name || "", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
      series: [{ name: yName || "", type: "bar", data: data.map(function (r) { return r[yName]; }), barWidth: opts.width || 18, itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: opts.color0 || "#22d3ee" }, { offset: 1, color: opts.color1 || "#38bdf8" }] }, borderRadius: [4, 4, 0, 0] }, label: opts.label ? { show: true, position: "top", color: "#cbd5e1", fontSize: 10 } : null }]
    });
  }
  function line(id, data, xName, yName, color, opts) {
    if (isEmpty(data)) { emptyChart(id); return; }
    opts = opts || {};
    setOption(id, {
      tooltip: baseTooltip({ trigger: "axis" }),
      grid: GRID,
      xAxis: Object.assign({ type: "category", data: data.map(function (r) { return r[xName]; }) }, BASE_AXIS),
      yAxis: Object.assign({ type: "value", name: opts.name || "", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: opts.fmt } }, BASE_AXIS),
      series: [{ name: yName || "", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: data.map(function (r) { return r[yName]; }), lineStyle: { width: 2.5, color: color || "#38bdf8" }, itemStyle: { color: color || "#38bdf8" }, areaStyle: opts.area !== false ? { opacity: .1 } : null }]
    });
  }
  function funnel(id, data) {
    if (isEmpty(data)) { emptyChart(id); return; }
    setOption(id, {
      tooltip: baseTooltip({ trigger: "item", formatter: "{b}: {c}" }),
      series: [{ type: "funnel", left: "12%", right: "12%", top: 20, bottom: 10, minSize: "28%", maxSize: "100%", sort: "descending", gap: 3, label: { color: "#e2e8f0", fontSize: 11, formatter: "{b}  {c}" }, itemStyle: { borderColor: "#0b1220", borderWidth: 2 }, data: data.map(function (f, i) { return { name: f.stage, value: f.value, itemStyle: { color: PALETTE[i] } }; })}]
    });
  }

  /* ---------------- Tab 切换 ---------------- */
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    var panel = $("panel-" + name);
    if (panel) panel.classList.add("active");
    if (!renderedTabs[name]) {
      renderedTabs[name] = true;
      var fn = RENDERERS[name];
      if (fn) fn(SNAPSHOT);
      resizeCharts();
    }
  }
  function resizeCharts() {
    Object.keys(chartInstances).forEach(function (k) { chartInstances[k].resize(); });
  }
  window.addEventListener("resize", function () {
    Object.keys(chartInstances).forEach(function (k) { chartInstances[k].resize(); });
  });

  /* ============================================================
   * 明细下钻
   * ============================================================ */
  var DETAILS = {
    cabinets: { title: "换电柜明细", cols: [["id", "柜号"], ["city", "城市"], ["site", "点位"], ["slot", "规格"], ["status", "状态"], ["online", "在线"], ["daily_orders", "日订单"], ["month_revenue", "月收入(元)"], ["use_years", "使用年限"], ["payback", "回本状态"]] },
    batteries: { title: "电池明细", cols: [["id", "电池ID"], ["model", "型号"], ["city", "城市"], ["status", "状态"], ["soc", "SOC%"], ["voltage", "电压V"], ["temperature", "温度℃"], ["cycles", "循环次数"], ["soh", "SOH%"], ["use_months", "使用月数"]] },
    cells: { title: "电芯明细", cols: [["id", "电芯ID"], ["battery", "所属电池"], ["status", "状态"], ["voltage", "电压V"], ["temperature", "温度℃"], ["use_hours", "使用时长(h)"]] },
    alarms: { title: "告警明细", cols: [["id", "告警ID"], ["time", "时间"], ["device", "设备"], ["type", "类型"], ["level", "等级"], ["status", "状态"], ["handler", "处理人"]] },
    users: { title: "用户明细", cols: [["id", "用户ID"], ["phone_tail", "手机尾号"], ["city", "城市"], ["package", "套餐"], ["status", "状态"], ["activate_date", "激活日期"], ["month_exchanges", "月换电"], ["arpu", "ARPU"], ["renewed", "已续费"]] },
    sites: { title: "网点明细", cols: [["id", "网点ID"], ["name", "名称"], ["city", "城市"], ["type", "类型"], ["mode", "合作模式"], ["share_ratio", "分成%"], ["elec_price", "电费(元/度)"], ["cabinets", "柜数"], ["month_orders", "月订单"], ["month_revenue", "月收入(元)"], ["profit", "盈亏"], ["expire", "协议到期"]] },
    orders: { title: "订单明细", cols: [["id", "订单ID"], ["time", "时间"], ["user", "用户"], ["city", "城市"], ["site", "网点"], ["cabinet", "柜号"], ["battery", "电池"], ["type", "类型"], ["amount", "金额"], ["status", "状态"]] },
    packages: { title: "套餐明细", cols: [["name", "套餐"], ["price", "价格(元)"], ["term", "租期"], ["power", "权益"], ["users", "用户数"], ["revenue", "收入(元)"], ["renew", "续费%"], ["upgrade", "升级%"], ["downgrade", "降级%"], ["churn", "流失%"], ["arpu", "ARPU"], ["exchanges", "月换电"]] },
    procurement: { title: "采购批次明细", cols: [["batch", "批次"], ["type", "设备类型"], ["model", "型号"], ["qty", "数量"], ["price", "单价(元)"], ["amount", "金额(元)"], ["supplier", "供应商"], ["date", "采购日期"], ["status", "状态"], ["warranty_to", "质保到期"]] },
    expense_items: { title: "支出明细", cols: [["month", "月份"], ["item", "成本项"], ["amount", "金额(元)"], ["ratio", "占比%"], ["note", "说明"]] },
    revenue_items: { title: "收入明细", cols: [["month", "月份"], ["item", "收入项"], ["amount", "金额(元)"], ["ratio", "占比%"]] },
    iot_batteries: { title: "物联网电池实时参数", cols: [["sn", "SN"], ["model", "型号"], ["status", "状态"], ["soc", "SOC%"], ["voltage", "电压V"], ["temperature", "温度℃"], ["cycles", "循环"], ["soh", "SOH%"], ["cabinet_no", "所在柜"], ["comm", "通讯"]] },
    iot_cells: { title: "电芯状态明细", cols: [["cell_id", "电芯ID"], ["battery_sn", "电池SN"], ["status", "状态"], ["voltage", "电压V"], ["temperature", "温度℃"], ["internal_resistance", "内阻mΩ"], ["use_hours", "使用时长(h)"]] },
    iot_alarms: { title: "告警明细", cols: [["id", "告警ID"], ["time", "时间"], ["device", "设备"], ["type", "类型"], ["level", "等级"], ["status", "状态"], ["handler", "处理人"]] },
    revenue_shares: { title: "分成账单明细", cols: [["bill_id", "账单ID"], ["fee_name", "费用名称"], ["fee_id", "费用编号"], ["month", "月份"], ["site_name", "网点"], ["city", "城市"], ["agent", "代理商"], ["creator_phone", "创建人"], ["income_phone", "收款方"], ["out_phone", "付款方"], ["amount", "金额(元)"], ["ratio", "分成%"], ["status", "状态"], ["settle_time", "结算时间"]] },
    agreements: { title: "协议及押金明细", cols: [["id", "协议ID"], ["type", "类型"], ["object", "标的物"], ["party", "合作方"], ["amount", "金额(元)"], ["deposit", "押金(元)"], ["status", "状态"], ["sign_date", "签订日期"], ["expire_date", "到期日期"], ["agent", "代理商"], ["merchant", "商户"]] },
    coupon_agent_stats: { title: "代理商发券统计", cols: [["agent", "代理商"], ["period", "统计周期"], ["coupon_count", "发券数"], ["total_amount", "券面总额(元)"], ["redeemed_count", "已核销"], ["redeem_rate", "核销率%"]] },
    coupon_codes: { title: "优惠券兑换码", cols: [["code", "兑换码"], ["coupon_id", "券ID"], ["name", "券名称"], ["face_value", "面值(元)"], ["type", "券类型"], ["status", "状态"], ["issuer", "发放人"], ["redeemer", "核销人"], ["redeem_time", "核销时间"], ["valid_from", "生效日期"], ["valid_to", "失效日期"]] },
    user_coupons: { title: "用户优惠券", cols: [["id", "券ID"], ["code", "兑换码"], ["coupon_id", "券模板"], ["name", "券名称"], ["face_value", "面值(元)"], ["user_id", "用户ID"], ["user_phone", "手机号"], ["source", "来源"], ["status", "状态"], ["used_time", "使用时间"], ["redeemer", "核销人"], ["valid_to", "失效日期"]] },
    people: { title: "人员详情", cols: [["id", "人员ID"], ["phone", "手机号"], ["name", "姓名"], ["role", "角色"], ["city", "城市"], ["org", "所属单位"], ["status", "状态"], ["register_date", "注册日期"], ["orders", "订单数"], ["revenue", "业绩(元)"]] },
    fee_names: { title: "费用名称明细", cols: [["fee_id", "费用编号"], ["name", "费用名称"], ["category", "收支类别"], ["biz_type", "业务类型"], ["status", "状态"], ["note", "说明"]] },
    electricity_bills: { title: "电费统计结算明细", cols: [["bill_id", "账单ID"], ["month", "月份"], ["agent", "代理商"], ["merchant_id", "商户ID"], ["merchant_name", "商户名称"], ["merchant_phone", "商户电话"], ["site_name", "网点"], ["city", "城市"], ["degree", "用电量(度)"], ["unit_price", "单价(元)"], ["amount", "金额(元)"], ["settle_time", "结算时间"], ["settle_status", "结算状态"]] },
    transactions: { title: "交易流水明细", cols: [["txn_id", "流水号"], ["time", "时间"], ["type", "类型"], ["item", "项目"], ["amount", "金额(元)"], ["income_unit", "收入方"], ["out_unit", "支出方"], ["channel", "渠道"], ["related_order", "关联订单"], ["pay_no", "支付单号"], ["status", "状态"]] },
    payments: { title: "支付及转账记录", cols: [["pay_id", "支付ID"], ["time", "时间"], ["type", "类型"], ["amount", "金额(元)"], ["method", "方式"], ["pay_no", "支付单号"], ["payer", "付款方"], ["payee", "收款方"], ["status", "状态"], ["refund_time", "退款时间"]] },
    battery_cycles: { title: "电池健康度循环明细", cols: [["battery_id", "电池ID"], ["sn", "SN"], ["model", "型号"], ["cycles", "循环次数"], ["soh", "SOH%"], ["health_level", "健康等级"], ["voltage", "电压V"], ["temperature", "温度℃"], ["use_months", "使用月数"], ["cabinet", "所在柜"], ["city", "城市"], ["status", "状态"]] },
    bike_rides: { title: "车辆行驶里程明细", cols: [["id", "记录ID"], ["bike_id", "车辆ID"], ["user_id", "用户ID"], ["begin_time", "开始时间"], ["end_time", "结束时间"], ["distance_km", "里程(km)"], ["use_time", "用时(s)"], ["use_power", "耗电"], ["ride_speed", "均速"], ["partition_date", "分区日期"]] }
  };

  /* 明细筛选维度配置：[字段, 标签, 类型]  type: text=模糊输入 / select=下拉精确 */
  var FILTER_PRESETS = {
    cabinets: [["id", "柜号", "text"], ["city", "城市", "text"], ["status", "状态", "select"]],
    batteries: [["id", "电池ID", "text"], ["model", "型号", "text"], ["city", "城市", "text"], ["status", "状态", "select"]],
    cells: [["battery", "所属电池", "text"], ["status", "状态", "select"]],
    alarms: [["type", "类型", "text"], ["level", "等级", "select"], ["status", "状态", "select"]],
    users: [["phone_tail", "手机尾号", "text"], ["city", "城市", "text"], ["status", "状态", "select"]],
    sites: [["name", "名称", "text"], ["city", "城市", "text"], ["type", "类型", "select"], ["mode", "合作模式", "select"]],
    orders: [["time", "时间", "text"], ["city", "城市", "text"], ["site", "网点", "text"], ["status", "状态", "select"]],
    packages: [["name", "套餐", "text"]],
    procurement: [["type", "设备类型", "select"], ["supplier", "供应商", "text"], ["status", "状态", "select"]],
    expense_items: [["month", "月份", "text"], ["item", "成本项", "text"]],
    revenue_items: [["month", "月份", "text"], ["item", "收入项", "text"]],
    iot_batteries: [["sn", "SN", "text"], ["model", "型号", "text"], ["status", "状态", "select"]],
    iot_cells: [["battery_sn", "电池SN", "text"], ["status", "状态", "select"]],
    iot_alarms: [["type", "类型", "text"], ["level", "等级", "select"], ["status", "状态", "select"]],
    revenue_shares: [["agent", "代理商", "text"], ["city", "城市", "text"], ["month", "月份", "text"], ["status", "状态", "select"]],
    agreements: [["type", "类型", "select"], ["party", "合作方", "text"], ["agent", "代理商", "text"], ["status", "状态", "select"]],
    coupon_agent_stats: [["agent", "代理商", "text"]],
    coupon_codes: [["code", "兑换码", "text"], ["type", "券类型", "select"], ["status", "状态", "select"]],
    user_coupons: [["user_phone", "手机号", "text"], ["code", "兑换码", "text"], ["status", "状态", "select"]],
    people: [["name", "姓名", "text"], ["phone", "手机号", "text"], ["role", "角色", "select"], ["city", "城市", "text"]],
    fee_names: [["name", "费用名称", "text"], ["category", "收支类别", "select"]],
    electricity_bills: [["agent", "代理商", "text"], ["city", "城市", "text"], ["merchant_name", "商户名称", "text"], ["settle_status", "结算状态", "select"]],
    transactions: [["txn_id", "流水号", "text"], ["type", "类型", "select"], ["status", "状态", "select"]],
    payments: [["pay_no", "支付单号", "text"], ["type", "类型", "select"], ["method", "方式", "select"], ["status", "状态", "select"]],
    battery_cycles: [["battery_id", "电池ID", "text"], ["sn", "SN", "text"], ["model", "型号", "text"], ["health_level", "健康等级", "select"], ["city", "城市", "text"]],
    bike_rides: [["bike_id", "车辆ID", "text"], ["begin_time", "开始时间", "text"], ["city", "城市", "text"], ["site", "网点", "text"]]
  };

  var _dt = { key: "", data: [] };

  function openDetail(key) {
    var cfg = DETAILS[key];
    if (!cfg || !SNAPSHOT || !SNAPSHOT.details) return;
    var data = SNAPSHOT.details[key];
    if (key === "iot_batteries") data = SNAPSHOT.iot && SNAPSHOT.iot.battery_params;
    if (key === "iot_cells") data = SNAPSHOT.iot && SNAPSHOT.iot.cell_status && SNAPSHOT.iot.cell_status.cell_list;
    if (key === "iot_alarms") data = SNAPSHOT.iot && SNAPSHOT.iot.alarm_list;
    if (!data || !data.length) {
      _dt.key = key;
      _dt.data = [];
      $("modalTitle").textContent = cfg.title;
      var fb = $("modalFilters");
      if (fb) fb.innerHTML = "";
      $("modalTable").innerHTML = '<tr><td style="text-align:center;padding:30px;color:var(--text-dim);border:none;">该明细暂无数据</td></tr>';
      $("detailModal").classList.add("show");
      return;
    }
    _dt.key = key;
    _dt.data = data;
    $("modalTitle").textContent = cfg.title;
    renderFilters();
    renderDetailTable(data);
    $("detailModal").classList.add("show");
  }

  function renderDetailTable(data) {
    var cfg = DETAILS[_dt.key];
    if (!cfg) return;
    var head = "<tr>" + cfg.cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr>";
    var rows = data.map(function (r) {
      return "<tr>" + cfg.cols.map(function (c) {
        var v = r[c[0]];
        if (v === null || v === undefined) v = "--";
        return "<td>" + v + "</td>";
      }).join("") + "</tr>";
    }).join("");
    $("modalTable").innerHTML = head + rows;
  }

  function renderFilters() {
    var presets = FILTER_PRESETS[_dt.key] || [];
    var box = $("modalFilters");
    if (!box) return;
    if (!presets.length) { box.innerHTML = ""; return; }
    var html = presets.map(function (f) {
      var field = f[0], label = f[1], type = f[2];
      if (type === "select") {
        var seen = {}, opts = ['<option value="">全部</option>'];
        _dt.data.forEach(function (r) {
          var v = r[field];
          if (v === null || v === undefined || v === "") return;
          v = String(v);
          if (!seen[v]) { seen[v] = 1; opts.push('<option value="' + v + '">' + v + "</option>"); }
        });
        return '<div class="mf-item"><span class="mf-label">' + label + '</span><select class="mf-input" data-f="' + field + '" data-t="select">' + opts.join("") + "</select></div>";
      }
      return '<div class="mf-item"><span class="mf-label">' + label + '</span><input type="text" class="mf-input" data-f="' + field + '" data-t="text" placeholder="输入' + label + '筛选"></div>';
    }).join("");
    html += '<div class="mf-item"><button class="mf-reset" id="mfReset">重置</button></div>';
    html += '<span class="mf-count" id="mfCount">共 ' + _dt.data.length + " 条</span>";
    box.innerHTML = html;
    box.querySelectorAll("[data-f]").forEach(function (el) {
      el.addEventListener("input", applyFilters);
      el.addEventListener("change", applyFilters);
    });
    var reset = $("mfReset");
    if (reset) reset.addEventListener("click", function () {
      renderFilters();
      renderDetailTable(_dt.data);
    });
  }

  function applyFilters() {
    var conds = [];
    var box = $("modalFilters");
    if (box) box.querySelectorAll("[data-f]").forEach(function (el) {
      var v = el.value;
      if (v !== null && v !== undefined && String(v).trim() !== "") conds.push({ f: el.getAttribute("data-f"), v: String(v).trim() });
    });
    var out = _dt.data.filter(function (r) {
      return conds.every(function (c) {
        var val = r[c.f];
        if (val === null || val === undefined) val = "";
        return String(val).toLowerCase().indexOf(c.v.toLowerCase()) >= 0;
      });
    });
    renderDetailTable(out);
    var cnt = $("mfCount");
    if (cnt) cnt.textContent = "共 " + out.length + " / " + _dt.data.length + " 条";
  }
  function closeDetail() { $("detailModal").classList.remove("show"); }

  /* ============================================================
   * 图表渲染（按 Tab 分组）
   * ============================================================ */
  var RENDERERS = {};

  /* ---------- 总览 ---------- */
  RENDERERS.overview = function (d) {
    var ov = (d && d.overview) || {};
    var k = ov.kpis || {};
    renderKpis("ovKpis", [
      { label: "柜体总数", value: fmtNum(k.total_cabinets), hint: "含仓库闲置" + (k.warehouse_ratio != null ? k.warehouse_ratio + "%" : ""), detail: "cabinets" },
      { label: "在线柜体", value: fmtNum(k.cabinets_online), hint: "在线率 " + (k.online_rate != null ? k.online_rate + "%" : "--") },
      { label: "电池总数", value: fmtNum(k.total_batteries), hint: "单柜配置 " + (k.battery_per_cabinet != null ? k.battery_per_cabinet + "块" : "--"), detail: "batteries" },
      { label: "用户总数", value: fmtNum(k.total_users), hint: "月活 " + (k.active_users != null ? fmtNum(k.active_users) : "--"), detail: "users" },
      { label: "月收入", value: "¥" + fmtMoney(k.month_revenue), unit: "元", cls: "up", detail: "revenue_items" },
      { label: "月成本", value: "¥" + fmtMoney(k.month_cost), unit: "元", detail: "expense_items" },
      { label: "月净利润", value: "¥" + fmtMoney(k.month_profit), unit: "元", cls: "up" },
      { label: "毛利率", value: k.gross_margin != null ? k.gross_margin + "%" : "--", cls: "up" },
      { label: "月度订单", value: fmtNum(k.month_orders), hint: "单柜日均 " + (k.daily_orders_per_cabinet != null ? k.daily_orders_per_cabinet + "单" : "--"), detail: "orders" },
      { label: "车辆行驶里程", value: k.vehicle_mileage != null ? fmtNum(k.vehicle_mileage) : "--", unit: "km", hint: "本月 " + (k.vehicle_mileage_month != null ? fmtNum(k.vehicle_mileage_month) + " km" : "--") + " / 车辆 " + fmtNum(k.vehicle_count != null ? k.vehicle_count : 0), cls: "up", detail: "bike_rides" },
      { label: "ARPU", value: k.arpu != null ? "¥" + k.arpu : "--", hint: "LTV ¥" + (k.ltv != null ? k.ltv : "--") },
      { label: "盈亏平衡达成", value: k.breakeven_ratio != null ? k.breakeven_ratio + "%" : "--", hint: "盈利网点占比" },
      { label: "预收款池", value: k.advance_balance != null ? "¥" + fmtMoney(k.advance_balance) : "--", hint: "资金蓄水池" }
    ]);

    if (isEmpty(ov.revenue_trend)) { emptyChart("ovRevenueTrend"); } else {
      setOption("ovRevenueTrend", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ov.revenue_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtMoney(v); } } }, BASE_AXIS),
        series: [
          { name: "收入", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ov.revenue_trend.map(function (r) { return r.revenue; }), lineStyle: { width: 2.5, color: "#38bdf8" }, itemStyle: { color: "#38bdf8" }, areaStyle: { opacity: .12 } },
          { name: "成本", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ov.revenue_trend.map(function (r) { return r.cost; }), lineStyle: { width: 2, color: "#f87171" }, itemStyle: { color: "#f87171" } },
          { name: "净利", type: "bar", data: ov.revenue_trend.map(function (r) { return (r.revenue || 0) - (r.cost || 0); }), itemStyle: { color: "rgba(52,211,153,.55)", borderRadius: [3, 3, 0, 0] }, barWidth: 12 }
        ]
      });
    }
    if (isEmpty(ov.order_trend)) { emptyChart("ovOrderTrend"); } else {
      setOption("ovOrderTrend", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ov.order_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS),
        series: [{ name: "订单", type: "line", smooth: true, symbol: "none", data: ov.order_trend.map(function (r) { return r.orders; }), lineStyle: { width: 2.5, color: "#22d3ee" }, itemStyle: { color: "#22d3ee" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(34,211,238,.35)" }, { offset: 1, color: "rgba(34,211,238,0)" }] } } }]
      });
    }
    pie("ovCityDist", ov.city_distribution);
    pie("ovDeviceType", ov.device_type_ratio);
    if (isEmpty(ov.user_city_ratio)) { emptyChart("ovUserCity"); } else {
      setOption("ovUserCity", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS),
        yAxis: Object.assign({ type: "category", data: ov.user_city_ratio.map(function (r) { return r.name; }).reverse() }, BASE_AXIS),
        series: [{ name: "用户数", type: "bar", data: ov.user_city_ratio.map(function (r) { return r.value; }).reverse(), itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#818cf8" }, { offset: 1, color: "#38bdf8" }] }, borderRadius: [0, 6, 6, 0] }, barWidth: 16, label: { show: true, position: "right", color: "#cbd5e1", fontSize: 10 } }]
      });
    }
    if (isEmpty(ov.kpis)) { emptyChart("ovHealth"); } else {
      var health = [
        { name: "资产上线率", max: 100, val: ov.kpis.cabinets_online != null ? Math.round(ov.kpis.cabinets_online / ov.kpis.total_cabinets * 100) : 90 },
        { name: "设备在线率", max: 100, val: ov.kpis.online_rate || 90 },
        { name: "用户活跃率", max: 100, val: ov.kpis.active_users && ov.kpis.total_users ? Math.round(ov.kpis.active_users / ov.kpis.total_users * 100) : 60 },
        { name: "毛利率", max: 100, val: ov.kpis.gross_margin || 25 },
        { name: "盈亏平衡", max: 100, val: ov.kpis.breakeven_ratio || 60 },
        { name: "收入质量", max: 100, val: 100 - (ov.kpis.refund_rate || 2) - (ov.kpis.bad_debt_rate || 1) }
      ];
      setOption("ovHealth", {
        tooltip: baseTooltip({}),
        radar: {
          indicator: health.map(function (h) { return { name: h.name, max: h.max }; }),
          radius: "65%", splitArea: { areaStyle: { color: ["rgba(56,130,246,.04)", "rgba(56,130,246,.08)"] } },
          axisLine: { lineStyle: { color: "rgba(56,130,246,.25)" } }, splitLine: { lineStyle: { color: "rgba(56,130,246,.18)" } },
          axisName: { color: "#94a3b8", fontSize: 11 }
        },
        series: [{ type: "radar", data: [{ value: health.map(function (h) { return h.val; }), name: "健康度", areaStyle: { color: "rgba(56,189,248,.25)" }, lineStyle: { color: "#38bdf8", width: 2 }, itemStyle: { color: "#38bdf8" } }] }]
      });
    }
  };

  /* ---------- 设备资产（含采购交付/品牌价格/融资/生命周期） ---------- */
  RENDERERS.assets = function (d) {
    var a = (d && d.assets) || {};
    var ax = (d && d.assets_ext) || {};
    var ledger = ax.asset_ledger || {};
    var k = a.battery_ratio || {};
    renderKpis("asKpis", [
      { label: "柜体总数", value: fmtNum(d.overview && d.overview.kpis ? d.overview.kpis.total_cabinets : ledger.total_cabinets), cls: "accent", detail: "cabinets" },
      { label: "仓库闲置柜体", value: fmtNum(ledger.warehouse_cabinets), hint: "占比 " + (ledger.warehouse_ratio != null ? ledger.warehouse_ratio + "%" : "--"), cls: "warn", detail: "cabinets" },
      { label: "电池/柜比", value: k.battery_per_cabinet != null ? k.battery_per_cabinet : "--", unit: "块", detail: "cells" },
      { label: "累计采购柜体", value: fmtNum(ax.procurement_status ? ax.procurement_status.procured : "--"), detail: "procurement" },
      { label: "已上线柜体", value: fmtNum(ax.procurement_status ? ax.procurement_status.online : "--"), hint: "上线率 " + (ax.procurement_status ? ax.procurement_status.online_conv + "%" : "--") },
      { label: "平均使用年限", value: k.avg_age_years != null ? k.avg_age_years : "--", unit: "年", hint: "设计寿命 " + (k.design_life_years != null ? k.design_life_years + "年" : "") },
      { label: "采购总金额", value: ax.purchase ? "¥" + fmtMoney(ax.purchase.total_purchase_amount) : "--", hint: "已支付 " + (ax.purchase ? fmtMoney(ax.purchase.paid_amount) : "--") },
      { label: "融资租赁设备", value: fmtNum(ax.financing ? ax.financing.restricted_devices : "--"), hint: "占比 " + (ax.financing ? ax.financing.restricted_ratio + "%" : "--") },
      { label: "平均回本周期", value: ax.lifecycle && ax.lifecycle.payback_ext ? ax.lifecycle.payback_ext.avg_months : "--", unit: "月", hint: "已回本占比 " + (ax.lifecycle && ax.lifecycle.payback_ext ? ax.lifecycle.payback_ext.repaid_ratio + "%" : "--") }
    ]);

    bar("asCabinetSlot", a.cabinet_slot_ratio, "name", "value", { label: true });
    pie("asBatteryType", a.device_type_ratio && a.device_type_ratio.filter(function (x) { return /电池/.test(x.name); }));
    if (isEmpty(a.delivery_funnel)) { emptyChart("asFunnel"); } else {
      setOption("asFunnel", {
        tooltip: baseTooltip({ trigger: "item", formatter: "{b}: {c} 台" }),
        series: [{ type: "funnel", left: "12%", right: "12%", top: 20, bottom: 10, minSize: "28%", maxSize: "100%", sort: "descending", gap: 3, label: { color: "#e2e8f0", fontSize: 11, formatter: "{b}  {c}" }, itemStyle: { borderColor: "#0b1220", borderWidth: 2 }, data: (a.delivery_funnel || []).map(function (f, i) { return { name: f.stage, value: f.value, itemStyle: { color: PALETTE[i] } }; })}]
      });
    }
    if (isEmpty(a.online_rate_trend)) { emptyChart("asOnlineTrend"); } else {
      setOption("asOnlineTrend", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: a.online_rate_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "在线率%", min: 90, max: 100, nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "在线数", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS)
        ],
        series: [
          { name: "在线率", type: "line", smooth: true, data: a.online_rate_trend.map(function (r) { return r.online_rate; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } },
          { name: "在线柜体", type: "bar", yAxisIndex: 1, data: a.online_rate_trend.map(function (r) { return r.online_cabinets; }), itemStyle: { color: "rgba(56,189,248,.45)", borderRadius: [3, 3, 0, 0] }, barWidth: 14 }
        ]
      });
    }
    if (isEmpty(ax.procurement_status)) { emptyChart("asProcStatus"); } else {
      setOption("asProcStatus", {
        tooltip: baseTooltip({}),
        series: [{
          type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 100, radius: "85%", center: ["50%", "55%"],
          axisLine: { lineStyle: { width: 14, color: [[0.6, "#fbbf24"], [0.85, "#34d399"], [1, "#38bdf8"]] } },
          pointer: { itemStyle: { color: "#e2e8f0" }, length: "60%", width: 4 },
          axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
          detail: { formatter: "{value}%", color: "#e2e8f0", fontSize: 20, offsetCenter: [0, "55%"] },
          title: { show: false },
          data: [{ value: ax.procurement_status.online_conv || 0 }]
        }],
        graphic: [{ type: "text", left: "center", top: "62%", style: { text: "采购→运营转化率（上线/采购）", fill: "#8ea0bd", fontSize: 11 } }]
      });
    }
    pie("asBrandExt", ax.brand_ratio_ext, { formatter: "{b}: {c} ({d}%)" });
    pie("asFire", ax.fire_route, { formatter: "{b}: {c} ({d}%)" });
    line("asSupplier", ax.supplier && ax.supplier.supplier_trend, "month", "value", "#a78bfa", { name: "Top3供应商占比%", fmt: "{value}%" });
    bar("asCabPrice", ax.purchase && ax.purchase.cabinet_price_by_slot, "name", "value", { label: true, color0: "#fbbf24", color1: "#f87171" });
    if (isEmpty(a.purchase_price_trend)) { emptyChart("asPrice"); } else {
      setOption("asPrice", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: a.purchase_price_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [
          { name: "单柜均价", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: a.purchase_price_trend.map(function (r) { return r.cabinet; }), lineStyle: { width: 2.5, color: "#38bdf8" }, itemStyle: { color: "#38bdf8" }, areaStyle: { opacity: .1 } },
          { name: "单块电池均价", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: a.purchase_price_trend.map(function (r) { return r.battery; }), lineStyle: { width: 2, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    pie("asFinancing", ax.financing && ax.financing.finance_methods, { formatter: "{b}: {c}%" });
    bar("asBatch", ax.lifecycle && ax.lifecycle.batch_deploy, "batch", "value", { label: true, color0: "#818cf8", color1: "#22d3ee" });
    pie("asAge", a.age_structure);
    pie("asSoh", a.soh_distribution);
    bar("asCycle", a.cycle_distribution, "name", "value", { label: true });
    line("asAging", ax.lifecycle && ax.lifecycle.aging_speed, "month", "value", "#f87171", { name: "老化速度%" });
    bar("asPayback", a.payback_period, "city", "value", { label: true, color0: "#fbbf24", color1: "#f87171" });
    line("asPaybackTrend", ax.lifecycle && ax.lifecycle.payback_ext && ax.lifecycle.payback_ext.payback_trend, "month", "value", "#fbbf24", { name: "回本周期(月)" });
  };

  /* ---------- 用户与套餐 ---------- */
  RENDERERS.users = function (d) {
    var u = (d && d.users) || {};
    var k = u.kpis || {};
    renderKpis("usKpis", [
      { label: "用户总数", value: fmtNum(k.total_users), cls: "accent", detail: "users" },
      { label: "月活跃用户", value: fmtNum(k.month_active_rate != null && k.total_users ? Math.round(k.total_users * k.month_active_rate / 100) : k.active_users), hint: "活跃率 " + (k.month_active_rate != null ? k.month_active_rate + "%" : "--"), detail: "users" },
      { label: "月度新增", value: fmtNum(k.month_new), cls: "up", detail: "users" },
      { label: "续费率", value: k.renew_rate != null ? k.renew_rate + "%" : "--", cls: "up", detail: "user_coupons" },
      { label: "流失率", value: k.churn_rate != null ? k.churn_rate + "%" : "--", cls: "warn" },
      { label: "LTV", value: k.ltv != null ? "¥" + k.ltv : "--" },
      { label: "CAC", value: k.cac != null ? "¥" + k.cac : "--", hint: "CAC/LTV " + (k.cac_ltv != null ? k.cac_ltv : "--"), detail: "coupon_agent_stats" },
      { label: "长租用户占比", value: k.long_term_ratio != null ? k.long_term_ratio + "%" : "--", hint: "3年及以上", detail: "packages" },
      { label: "人均月换电", value: k.avg_monthly_exchanges != null ? k.avg_monthly_exchanges : "--", unit: "次" },
      { label: "付费转化率", value: k.paid_conversion != null ? k.paid_conversion + "%" : "--", detail: "coupon_codes" }
    ]);

    if (isEmpty(u.user_trend)) { emptyChart("usUserTrend"); } else {
      setOption("usUserTrend", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: u.user_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS),
        series: [{ name: "用户总数", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: u.user_trend.map(function (r) { return r.total; }), lineStyle: { width: 2.5, color: "#818cf8" }, itemStyle: { color: "#818cf8" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(129,140,248,.35)" }, { offset: 1, color: "rgba(129,140,248,0)" }] } } }]
      });
    }
    if (isEmpty(u.new_user_trend)) { emptyChart("usNewChurn"); } else {
      setOption("usNewChurn", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: u.new_user_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [
          { name: "新增", type: "bar", stack: "u", data: u.new_user_trend.map(function (r) { return r.new; }), itemStyle: { color: "rgba(52,211,153,.75)", borderRadius: [3, 3, 0, 0] }, barWidth: 16 },
          { name: "流失", type: "bar", stack: "u", data: u.new_user_trend.map(function (r) { return -r.churn; }), itemStyle: { color: "rgba(248,113,113,.6)", borderRadius: [3, 3, 0, 0] }, barWidth: 16 }
        ]
      });
    }
    pie("usPackage", u.package_structure);
    pie("usPackageRev", u.package_revenue);
    if (isEmpty(u.lifecycle_funnel)) { emptyChart("usFunnel"); } else {
      setOption("usFunnel", {
        tooltip: baseTooltip({ trigger: "item", formatter: "{b}: {c} 人" }),
        series: [{ type: "funnel", left: "12%", right: "12%", top: 20, bottom: 10, minSize: "28%", maxSize: "100%", sort: "descending", gap: 3, label: { color: "#e2e8f0", fontSize: 11, formatter: "{b}  {c}" }, itemStyle: { borderColor: "#0b1220", borderWidth: 2 }, data: (u.lifecycle_funnel || []).map(function (f, i) { return { name: f.stage, value: f.value, itemStyle: { color: PALETTE[i] } }; })}]
      });
    }
    if (isEmpty(u.usage_intensity)) { emptyChart("usIntensity"); } else {
      setOption("usIntensity", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: u.usage_intensity.map(function (p) { return p.name; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "次/月", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [
          { name: "实际月均换电", type: "bar", data: u.usage_intensity.map(function (p) { return p.monthly_exchanges; }), itemStyle: { color: "#38bdf8", borderRadius: [4, 4, 0, 0] }, barWidth: 16 },
          { name: "套餐设计次数", type: "bar", data: u.usage_intensity.map(function (p) { return p.designed_exchanges; }), itemStyle: { color: "rgba(129,140,248,.55)", borderRadius: [4, 4, 0, 0] }, barWidth: 16 }
        ]
      });
    }
    pie("usFreqTier", u.frequency_tier);
    if (isEmpty(u.first_exchange_hours)) { emptyChart("usFirst"); } else {
      setOption("usFirst", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: u.first_exchange_hours.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "%", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "用户占比", type: "bar", data: u.first_exchange_hours.map(function (r) { return r.value; }), itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#22d3ee" }, { offset: 1, color: "#818cf8" }] }, borderRadius: [4, 4, 0, 0] }, barWidth: 22, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 10, formatter: "{c}%" } }]
      });
    }
    var table = $("usPkgTable");
    if (table && !isEmpty(u.package_detail)) {
      var head = "<tr><th>套餐</th><th>用户数</th><th>价格(元)</th><th>收入占比%</th><th>续费率%</th><th>流失率%</th><th>月均换电</th><th>设计次数</th><th>超用判定</th></tr>";
      var rows = u.package_detail.map(function (p) {
        var over = p.monthly_exchanges > p.designed_exchanges ? '<span style="color:#f87171">超用</span>' : '<span style="color:#34d399">正常</span>';
        return "<tr><td>" + p.name + "</td><td>" + fmtNum(p.users) + "</td><td>" + p.price + "</td><td>" + p.revenue_ratio + "</td><td>" + p.renew_rate + "</td><td>" + p.churn_rate + "</td><td>" + p.monthly_exchanges + "</td><td>" + p.designed_exchanges + "</td><td>" + over + "</td></tr>";
      }).join("");
      table.innerHTML = head + rows;
    }
  };

  /* ---------- 运营数据 ---------- */
  RENDERERS.operations = function (d) {
    var o = (d && d.operations) || {};
    var k = o.kpis || {};
    renderKpis("opKpis", [
      { label: "月度订单", value: fmtNum(k.month_orders), cls: "accent", detail: "orders" },
      { label: "日均订单", value: fmtNum(k.daily_orders), hint: "全网络", detail: "orders" },
      { label: "单柜日均订单", value: k.daily_orders_per_cabinet != null ? k.daily_orders_per_cabinet : "--", unit: "单", cls: "up" },
      { label: "换电失败率", value: k.exchange_fail_rate != null ? k.exchange_fail_rate + "%" : "--", hint: "高峰 " + (k.peak_fail_rate != null ? k.peak_fail_rate + "%" : "--"), cls: "warn" },
      { label: "平均等待", value: k.avg_wait_min != null ? k.avg_wait_min : "--", unit: "分钟" },
      { label: "柜体故障率", value: k.cabinet_fault_rate != null ? k.cabinet_fault_rate : "--", unit: "次/柜/月", cls: "warn", detail: "alarms" },
      { label: "电池故障率", value: k.battery_fault_rate != null ? k.battery_fault_rate : "--", unit: "次/百块/月", cls: "warn", detail: "battery_cycles" },
      { label: "停机率", value: k.downtime_rate != null ? k.downtime_rate + "%" : "--" },
      { label: "MTTR", value: k.mttr_hours != null ? k.mttr_hours : "--", unit: "小时", cls: "up" },
      { label: "低效设备占比", value: k.low_efficiency_ratio != null ? k.low_efficiency_ratio + "%" : "--", cls: "warn" },
      { label: "僵尸设备占比", value: k.zombie_ratio != null ? k.zombie_ratio + "%" : "--", cls: "danger" },
      { label: "长期离线占比", value: k.long_offline_ratio != null ? k.long_offline_ratio + "%" : "--", cls: "warn" }
    ]);

    if (isEmpty(o.order_month_trend)) { emptyChart("opOrderMonth"); } else {
      setOption("opOrderMonth", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: o.order_month_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS),
        series: [{ name: "订单", type: "line", smooth: true, symbol: "none", data: o.order_month_trend.map(function (r) { return r.orders; }), lineStyle: { width: 2.5, color: "#22d3ee" }, itemStyle: { color: "#22d3ee" }, areaStyle: { opacity: .12 } }]
      });
    }
    if (isEmpty(o.daily_order_trend)) { emptyChart("opOrderDaily"); } else {
      setOption("opOrderDaily", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: o.daily_order_trend.map(function (r) { return String(r.date).padStart(2, "0"); }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "订单", type: "bar", data: o.daily_order_trend.map(function (r) { return r.orders; }), itemStyle: { color: "rgba(56,189,248,.6)", borderRadius: [2, 2, 0, 0] }, barWidth: "60%" }]
      });
    }
    bar("opPerCabinet", o.per_cabinet_dist, "name", "value", { label: true });
    if (isEmpty(o.hourly_distribution)) { emptyChart("opHourly"); } else {
      setOption("opHourly", {
        tooltip: baseTooltip({ trigger: "axis", formatter: function (p) { return p[0].axisValue + "时: " + p[0].value + "%"; } }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: o.hourly_distribution.map(function (r) { return r.hour + "时"; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "%", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "换电占比", type: "bar", data: o.hourly_distribution.map(function (r) { return r.ratio; }), itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#38bdf8" }, { offset: 1, color: "#818cf8" }] } }, barWidth: "70%" }]
      });
    }
    pie("opCycle", o.exchange_cycle);
    bar("opFault", o.fault_types, "name", "value", { label: true, color0: "#f87171", color1: "#fbbf24" });
    if (isEmpty(o.online_rate_month)) { emptyChart("opOnline"); } else {
      setOption("opOnline", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: o.online_rate_month.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", min: 90, max: 100, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "在线率%", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: o.online_rate_month.map(function (r) { return r.value; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" }, areaStyle: { opacity: .1 } }]
      });
    }
    if (isEmpty(o.kpis)) { emptyChart("opIneff"); } else {
      setOption("opIneff", {
        tooltip: baseTooltip({}),
        series: [{ type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 30, radius: "85%", center: ["50%", "55%"], axisLine: { lineStyle: { width: 14, color: [[0.3, "#34d399"], [0.7, "#fbbf24"], [1, "#f87171"]] } }, pointer: { itemStyle: { color: "#e2e8f0" }, length: "60%", width: 4 }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { formatter: "{value}%", color: "#e2e8f0", fontSize: 20, offsetCenter: [0, "55%"] }, title: { show: false }, data: [{ value: (k.low_efficiency_ratio || 0) + (k.zombie_ratio || 0) + (k.long_offline_ratio || 0) }] }],
        graphic: [{ type: "text", left: "center", top: "62%", style: { text: "低效+僵尸+离线合计占比", fill: "#8ea0bd", fontSize: 11 } }]
      });
    }
  };

  /* ---------- 场景点位 ---------- */
  RENDERERS.sites = function (d) {
    var s = (d && d.sites) || {};
    var total = s.city_sites ? s.city_sites.reduce(function (a, c) { return a + c.sites; }, 0) : 0;
    var devices = s.city_sites ? s.city_sites.reduce(function (a, c) { return a + c.devices; }, 0) : 0;
    renderKpis("stKpis", [
      { label: "点位数", value: fmtNum(total), cls: "accent", detail: "sites" },
      { label: "点位设备数", value: fmtNum(devices), detail: "cabinets" },
      { label: "单点位平均设备", value: total ? (devices / total).toFixed(1) : "--", unit: "台" },
      { label: "平均分成占比", value: s.avg_rent_ratio != null ? s.avg_rent_ratio + "%" : "--", hint: "场地方分成", detail: "revenue_shares" },
      { label: "免费场地点位", value: s.free_site_ratio != null ? s.free_site_ratio + "%" : "--", cls: "up" },
      { label: "平均剩余合作期", value: s.avg_remaining_term != null ? s.avg_remaining_term : "--", unit: "年" }
    ]);

    pie("stSceneDist", s.scene_distribution);
    if (isEmpty(s.scene_detail)) { emptyChart("stSceneEff"); } else {
      setOption("stSceneEff", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: s.scene_detail.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "单柜日均订单", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "盈亏达成%", min: 0, max: 100, nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "单柜日均订单", type: "bar", data: s.scene_detail.map(function (r) { return r.daily_orders; }), itemStyle: { color: "#38bdf8", borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
          { name: "盈亏平衡达成率", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 6, data: s.scene_detail.map(function (r) { return r.breakeven; }), lineStyle: { width: 2.5, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" } }
        ]
      });
    }
    if (isEmpty(s.city_sites)) { emptyChart("stCity"); } else {
      setOption("stCity", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: s.city_sites.map(function (r) { return r.city; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "点位数", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "设备数", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "点位数", type: "bar", data: s.city_sites.map(function (r) { return r.sites; }), itemStyle: { color: "rgba(56,189,248,.65)", borderRadius: [4, 4, 0, 0] }, barWidth: 16 },
          { name: "设备数", type: "line", yAxisIndex: 1, smooth: true, data: s.city_sites.map(function (r) { return r.devices; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    pie("stTerms", s.cooperation_terms);
    if (isEmpty(s.expiry_schedule)) { emptyChart("stExpiry"); } else {
      setOption("stExpiry", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: s.expiry_schedule.map(function (r) { return r.quarter; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "到期点位数", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "到期点位", type: "bar", data: s.expiry_schedule.map(function (r) { return r.value; }), itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#fbbf24" }, { offset: 1, color: "#f87171" }] }, borderRadius: [4, 4, 0, 0] }, barWidth: 26, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 10 } }]
      });
    }
    pie("stShare", s.share_models);
    if (isEmpty(s.site_tiers)) { emptyChart("stTier"); } else {
      setOption("stTier", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: s.site_tiers.map(function (r) { return r.name + "(" + r.ratio + "%)"; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "月收入(元)", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "毛利率%", min: 0, max: 100, nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "单点位月收入", type: "bar", data: s.site_tiers.map(function (r) { return r.month_revenue; }), itemStyle: { color: "#818cf8", borderRadius: [4, 4, 0, 0] }, barWidth: 30 },
          { name: "毛利率", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 7, data: s.site_tiers.map(function (r) { return r.gross_margin; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    if (isEmpty(s.scene_detail)) { emptyChart("stQuality"); } else {
      var qData = s.scene_detail.slice(0, 6).map(function (r) { return { name: r.name, revenue: r.revenue_ratio, order: r.daily_orders }; });
      setOption("stQuality", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: qData.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "收入占比%", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "单柜日均订单", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "收入占比", type: "bar", data: qData.map(function (r) { return r.revenue; }), itemStyle: { color: "rgba(56,189,248,.6)", borderRadius: [4, 4, 0, 0] }, barWidth: 18 },
          { name: "单柜日均订单", type: "line", yAxisIndex: 1, smooth: true, data: qData.map(function (r) { return r.order; }), lineStyle: { width: 2.5, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" } }
        ]
      });
    }
  };

  /* ---------- 经营财务（收入专项 + 支出专项） ---------- */
  RENDERERS.finance = function (d) {
    var f = (d && d.finance) || {};
    var rv = (d && d.revenue) || {};
    var ex = (d && d.expense) || {};
    var q = f.quality_kpis || {};
    var pc = f.per_cabinet || {};
    var rk = rv.kpis || {};
    var ek = ex.kpis || {};
    renderKpis("fnKpis", [
      { label: "月收入", value: "¥" + fmtMoney(f.monthly_pnl && f.monthly_pnl.length ? f.monthly_pnl[f.monthly_pnl.length - 1].revenue : null), cls: "up", detail: "revenue_items" },
      { label: "月净利", value: "¥" + fmtMoney(f.monthly_pnl && f.monthly_pnl.length ? f.monthly_pnl[f.monthly_pnl.length - 1].profit : null), cls: "up" },
      { label: "毛利率", value: f.monthly_pnl && f.monthly_pnl.length ? f.monthly_pnl[f.monthly_pnl.length - 1].gross_margin + "%" : "--", cls: "up" },
      { label: "退款率", value: q.refund_rate != null ? q.refund_rate + "%" : "--", cls: "warn", detail: "payments" },
      { label: "坏账率", value: q.bad_debt_rate != null ? q.bad_debt_rate + "%" : "--", cls: "warn", detail: "transactions" },
      { label: "预收款池", value: q.advance_balance != null ? "¥" + fmtMoney(q.advance_balance) : "--", hint: "预收/月收入 " + (q.advance_revenue_ratio != null ? q.advance_revenue_ratio : "--"), detail: "agreements" },
      { label: "单柜月收入", value: pc.month_revenue != null ? "¥" + fmtMoney(pc.month_revenue) : "--", hint: "目标达成 " + (rv.per_cabinet_ext ? rv.per_cabinet_ext.target_ratio + "%" : "--") },
      { label: "电费占收入", value: pc.electric_ratio != null ? pc.electric_ratio + "%" : "--", hint: "峰谷套利节省 " + (pc.valley_saving != null ? pc.valley_saving + "%" : "--"), detail: "electricity_bills" },
      { label: "获客成本 CAC", value: rk.cac != null ? "¥" + rk.cac : "--", hint: "CAC/LTV " + (rk.cac_ltv != null ? rk.cac_ltv : "--") },
      { label: "月支出", value: "¥" + fmtMoney(ek.month_cost), detail: "expense_items" },
      { label: "成本收入比", value: ek.cost_income_ratio != null ? ek.cost_income_ratio + "%" : "--", detail: "fee_names" },
      { label: "电池回收率", value: q.battery_recycle_rate != null ? q.battery_recycle_rate + "%" : "--" }
    ]);

    if (isEmpty(f.monthly_pnl)) { emptyChart("fnPnl"); } else {
      setOption("fnPnl", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: f.monthly_pnl.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtMoney(v); } } }, BASE_AXIS),
        series: [
          { name: "收入", type: "bar", data: f.monthly_pnl.map(function (r) { return r.revenue; }), itemStyle: { color: "rgba(56,189,248,.65)", borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
          { name: "成本", type: "bar", data: f.monthly_pnl.map(function (r) { return r.cost; }), itemStyle: { color: "rgba(248,113,113,.5)", borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
          { name: "净利润", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: f.monthly_pnl.map(function (r) { return r.profit; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    pie("fnRevMix", f.revenue_mix);
    pie("fnCost", f.cost_structure);
    if (isEmpty(f.breakeven_by_city)) { emptyChart("fnBreakeven"); } else {
      setOption("fnBreakeven", {
        tooltip: baseTooltip({ trigger: "axis", formatter: function (p) { return p[0].name + ": " + p[0].value + "%"; } }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: f.breakeven_by_city.map(function (r) { return r.city; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", min: 0, max: 100, axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: "{value}%" } }, BASE_AXIS),
        series: [{ type: "bar", data: f.breakeven_by_city.map(function (r) { return r.ratio; }), barWidth: 30, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 10, formatter: "{c}%" }, itemStyle: { borderRadius: [4, 4, 0, 0], color: function (p) { var v = p.value; return v >= 70 ? "rgba(52,211,153,.8)" : v >= 50 ? "rgba(251,191,36,.8)" : "rgba(248,113,113,.8)"; } } }]
      });
    }
    if (isEmpty(pc)) { emptyChart("fnPerCabinet"); } else {
      var items = [
        { name: "单柜月收入", value: pc.month_revenue || 0 },
        { name: "电费", value: pc.month_electric_cost || 0 },
        { name: "分成/场租", value: Math.round((pc.month_revenue || 0) * 0.148) },
        { name: "折旧摊销", value: Math.round((pc.month_revenue || 0) * 0.186) },
        { name: "运维", value: Math.round((pc.month_revenue || 0) * 0.122) },
        { name: "获客摊销", value: Math.round((pc.month_revenue || 0) * 0.084) },
        { name: "其他", value: Math.round((pc.month_revenue || 0) * 0.1) }
      ];
      setOption("fnPerCabinet", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: items.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "元/柜/月", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "金额", type: "bar", data: items.map(function (r) { return r.value; }), barWidth: 28, itemStyle: { color: function (p) { return p.dataIndex === 0 ? "#34d399" : "#38bdf8"; }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 9 } }]
      });
    }
    if (isEmpty(f.cac_ltv)) { emptyChart("fnCacLtv"); } else {
      var c = f.cac_ltv;
      setOption("fnCacLtv", {
        tooltip: baseTooltip({}),
        series: [
          { type: "pie", radius: ["55%", "78%"], center: ["30%", "50%"], label: { color: "#cbd5e1", fontSize: 11 }, itemStyle: { borderColor: "#0b1220", borderWidth: 2 }, data: [{ name: "CAC", value: c.cac || 0, itemStyle: { color: "#f87171" } }, { name: "LTV", value: c.ltv || 0, itemStyle: { color: "#34d399" } }] },
          { type: "gauge", radius: "80%", center: ["72%", "55%"], startAngle: 210, endAngle: -30, min: 0, max: 0.1, splitNumber: 5, axisLine: { lineStyle: { width: 10, color: [[0.05, "#34d399"], [0.1, "#fbbf24"]] } }, pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { formatter: function (v) { return (v * 100).toFixed(1) + "%"; }, color: "#e2e8f0", fontSize: 18, offsetCenter: [0, "65%"] }, title: { show: false }, data: [{ value: c.ratio || 0 }] }
        ],
        graphic: [
          { type: "text", left: "16%", top: "76%", style: { text: "CAC vs LTV (元)", fill: "#8ea0bd", fontSize: 11 } },
          { type: "text", left: "62%", top: "78%", style: { text: "CAC/LTV 比值（<5%为优）", fill: "#8ea0bd", fontSize: 11 } }
        ]
      });
    }
    /* --- 收入专项 --- */
    pie("fnPkgRev", rv.revenue_mix_ext, { formatter: "{b}: {c}%" });
    if (isEmpty(rv.package_users)) { emptyChart("fnPkgArpu"); } else {
      setOption("fnPkgArpu", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: rv.package_users.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "ARPU(元)", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "换电次/月", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "ARPU", type: "bar", data: rv.package_users.map(function (r) { return r.arpu; }), itemStyle: { color: "#38bdf8", borderRadius: [4, 4, 0, 0] }, barWidth: 22 },
          { name: "月换电", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 6, data: rv.package_users.map(function (r) { return r.exchanges; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    line("fnPrepay", rv.quality && rv.quality.prepay_leverage, "month", "value", "#a78bfa", { name: "预收杠杆(月收入倍数)" });
    pie("fnRefund", rv.quality && rv.quality.refund_reason);
    pie("fnCapex", ex.capex ? [
      { name: "柜体CAPEX", value: ex.capex.cabinet_capex || 0 },
      { name: "电池CAPEX", value: ex.capex.battery_capex || 0 },
      { name: "安装运输", value: ex.capex.install_transport || 0 }
    ] : null, { formatter: "{b}: ¥{c}" });
    bar("fnLife", ex.capex && ex.capex.life_real_vs_theory, "name", "value", { label: true, color0: "#f87171", color1: "#38bdf8" });
    if (isEmpty(ex.electricity)) { emptyChart("fnElec"); } else {
      setOption("fnElec", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ex.electricity.trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "元", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "电费", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ex.electricity.trend.map(function (r) { return r.value; }), lineStyle: { width: 2.5, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" }, areaStyle: { opacity: .1 } }]
      });
    }
    pie("fnShare", ex.share_cost && ex.share_cost.mode, { formatter: "{b}: {c}%" });
    pie("fnAcq", ex.acquisition && ex.acquisition.channels, { formatter: "{b}: {c}%" });
    if (isEmpty(ex.opex) || isEmpty(ex.platform_cost)) { emptyChart("fnOpPlat"); } else {
      setOption("fnOpPlat", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ex.opex.cost_trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "元", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [
          { name: "运维成本", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ex.opex.cost_trend.map(function (r) { return r.value; }), lineStyle: { width: 2.5, color: "#f87171" }, itemStyle: { color: "#f87171" } },
          { name: "平台软件", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ex.platform_cost.trend.map(function (r) { return r.value; }), lineStyle: { width: 2, color: "#818cf8" }, itemStyle: { color: "#818cf8" } }
        ]
      });
    }
    if (isEmpty(ex.incentive) || isEmpty(ex.store_incentive)) { emptyChart("fnIncen"); } else {
      setOption("fnIncen", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ex.incentive.trend.map(function (r) { return r.month; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "元", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [
          { name: "员工激励", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ex.incentive.trend.map(function (r) { return r.value; }), lineStyle: { width: 2.5, color: "#22d3ee" }, itemStyle: { color: "#22d3ee" } },
          { name: "门店返佣", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: ex.store_incentive.trend ? ex.store_incentive.trend.map(function (r) { return r.value; }) : [], lineStyle: { width: 2, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" } }
        ]
      });
    }
    if (isEmpty(ex.package_cost)) { emptyChart("fnPkgCost"); } else {
      setOption("fnPkgCost", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: ex.package_cost.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "成本(元)", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "%", min: 0, max: 100, nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "套餐成本", type: "bar", data: ex.package_cost.map(function (r) { return r.cost; }), itemStyle: { color: "#f87171", borderRadius: [4, 4, 0, 0] }, barWidth: 24 },
          { name: "毛利率", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 6, data: ex.package_cost.map(function (r) { return r.margin; }), lineStyle: { width: 2.5, color: "#34d399" }, itemStyle: { color: "#34d399" } }
        ]
      });
    }
    pie("fnOther", ex.other_cost && ex.other_cost.structure, { formatter: "{b}: {c}%" });
    bar("fnPricing", rv.pricing_benchmark, "name", "value", { label: true, color0: "#38bdf8", color1: "#818cf8" });
  };

  /* ---------- 运营效率（板块十一） ---------- */
  RENDERERS.efficiency = function (d) {
    var e = (d && d.efficiency) || {};
    var sl = e.site_layer || {};
    var bt = e.battery_turnover || {};
    var uf = e.user_freq || {};
    var ub = e.user_behavior || {};
    renderKpis("efKpis", [
      { label: "网点总数", value: fmtNum(sl.site_count), cls: "accent", detail: "sites" },
      { label: "单网点平均柜数", value: sl.avg_cabinet_per_site != null ? sl.avg_cabinet_per_site : "--", unit: "台" },
      { label: "电池周转率", value: bt.turnover_ratio != null ? bt.turnover_ratio : "--", unit: "次/日", hint: "全网络日均换电 " + fmtNum(bt.daily_exchanges) },
      { label: "换电失败率", value: bt.fail_ratio != null ? bt.fail_ratio + "%" : "--", cls: "warn" },
      { label: "平均等待", value: bt.avg_wait_min != null ? bt.avg_wait_min : "--", unit: "分钟" },
      { label: "调度成本占比", value: bt.dispatch_cost_income != null ? bt.dispatch_cost_income + "%" : "--" },
      { label: "人均日换电", value: uf.daily_per_user != null ? uf.daily_per_user : "--", unit: "次" },
      { label: "人均月换电", value: uf.monthly_per_user != null ? uf.monthly_per_user : "--", unit: "次" },
      { label: "月留存(12月)", value: ub.retention && ub.retention.length ? ub.retention[ub.retention.length - 1].value + "%" : "--" },
      { label: "用户数下滑占比", value: uf.decline_users_ratio != null ? uf.decline_users_ratio + "%" : "--", cls: "warn" }
    ]);

    line("efExpand", sl.expand_speed, "month", "value", "#34d399", { name: "网点数" });
    bar("efSiteExch", sl.daily_exchanges, "name", "value", { label: true, color0: "#38bdf8", color1: "#22d3ee" });
    pie("efFull", sl.full_rate, { formatter: "{b}: {c}%" });
    pie("efTier", sl.tier, { formatter: "{b}: {c}%" });
    if (isEmpty(sl.tier_metrics)) { emptyChart("efTierMetric"); } else {
      setOption("efTierMetric", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: sl.tier_metrics.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "月收入(元)", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
          Object.assign({ type: "value", name: "毛利率%", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "月收入", type: "bar", data: sl.tier_metrics.map(function (r) { return r.revenue; }), itemStyle: { color: "#818cf8", borderRadius: [4, 4, 0, 0] }, barWidth: 34 },
          { name: "毛利率", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 7, data: sl.tier_metrics.map(function (r) { return r.margin; }), lineStyle: { width: 2.5, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" } }
        ]
      });
    }
    pie("efBatteryStatus", bt.status, { formatter: "{b}: {c}%" });
    line("efFailTrend", bt.fail_trend, "month", "value", "#f87171", { name: "换电失败率%", fmt: "{value}%" });
    line("efFreqTrend", uf.trend, "month", "value", "#38bdf8", { name: "月均换电/人", fmt: "{value}次" });
    pie("efFreqTier", uf.tier, { formatter: "{b}: {c}%" });
    if (isEmpty(uf.hour_dist)) { emptyChart("efHour"); } else {
      setOption("efHour", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: uf.hour_dist.map(function (r) { return r.hour; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "%", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "换电占比", type: "bar", data: uf.hour_dist.map(function (r) { return r.value; }), itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#38bdf8" }, { offset: 1, color: "#818cf8" }] } }, barWidth: "70%" }]
      });
    }
    bar("efFirst", uf.first_exchange_hours, "name", "value", { label: true, color0: "#22d3ee", color1: "#818cf8" });
    line("efRetention", ub.retention, "month", "value", "#34d399", { name: "留存率%", fmt: "{value}%" });
    pie("efLocPref", ub.location_pref, { formatter: "{b}: {c}%" });
    pie("efChurn", ub.churn_reason, { formatter: "{b}: {c}%" });
  };

  /* ---------- 数字化与运维 ---------- */
  RENDERERS.digital = function (d) {
    var g = (d && d.digital) || {};
    var iot = g.iot_kpis || {};
    var om = g.om_kpis || {};
    var ov = (d && d.overview) || {};
    var k = ov.kpis || {};
    renderKpis("dgKpis", [
      { label: "设备在线率", value: iot.device_online_rate != null ? iot.device_online_rate + "%" : "--", cls: "up" },
      { label: "通信失败率", value: iot.comm_fail_rate != null ? iot.comm_fail_rate + "%" : "--", cls: "warn" },
      { label: "日数据量", value: iot.daily_data_rows != null ? fmtNum(iot.daily_data_rows) : "--", unit: "行" },
      { label: "人均管理柜数", value: om.cabinets_per_staff != null ? om.cabinets_per_staff : "--", unit: "台", detail: "people" },
      { label: "平均响应", value: om.avg_response_hours != null ? om.avg_response_hours : "--", unit: "小时" },
      { label: "MTTR", value: om.mttr_hours != null ? om.mttr_hours : "--", unit: "小时", cls: "up" },
      { label: "一次修复率", value: om.first_fix_rate != null ? om.first_fix_rate + "%" : "--", cls: "up" },
      { label: "巡检覆盖率", value: om.inspection_coverage != null ? om.inspection_coverage + "%" : "--" },
      { label: "备用点位", value: om.backup_sites != null ? om.backup_sites : "--", unit: "个", hint: "覆盖率 " + (om.backup_ratio != null ? om.backup_ratio + "%" : "--") },
      { label: "车辆行驶里程", value: k.vehicle_mileage != null ? fmtNum(k.vehicle_mileage) : "--", unit: "km", hint: "本月 " + (k.vehicle_mileage_month != null ? fmtNum(k.vehicle_mileage_month) + " km" : "--"), cls: "up", detail: "bike_rides" }
    ]);

    if (isEmpty(g.capability_scores)) { emptyChart("dgCap"); } else {
      setOption("dgCap", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: g.capability_scores.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", min: 80, max: 100, axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: "{value}%" } }, BASE_AXIS),
        series: [{ name: "评分", type: "bar", data: g.capability_scores.map(function (r) { return r.value; }), barWidth: 24, itemStyle: { color: function (p) { return p.value >= 95 ? "#34d399" : p.value >= 90 ? "#38bdf8" : "#fbbf24"; }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 9, formatter: "{c}%" } }]
      });
    }
    if (isEmpty(iot)) { emptyChart("dgIot"); } else {
      var iotItems = [
        { name: "设备在线率", value: iot.device_online_rate || 0 },
        { name: "通信成功率", value: 100 - (iot.comm_fail_rate || 0) },
        { name: "告警→工单自动化", value: 100 - Math.min(100, (iot.alarm_to_workorder_min || 0) * 4) },
        { name: "数据完整性", value: 97 }
      ];
      setOption("dgIot", {
        tooltip: baseTooltip({}),
        radar: { indicator: iotItems.map(function (h) { return { name: h.name, max: 100 }; }), radius: "62%", splitArea: { areaStyle: { color: ["rgba(56,130,246,.04)", "rgba(56,130,246,.08)"] } }, axisLine: { lineStyle: { color: "rgba(56,130,246,.25)" } }, splitLine: { lineStyle: { color: "rgba(56,130,246,.18)" } }, axisName: { color: "#94a3b8", fontSize: 11 } },
        series: [{ type: "radar", data: [{ value: iotItems.map(function (h) { return h.value; }), areaStyle: { color: "rgba(34,211,238,.25)" }, lineStyle: { color: "#22d3ee", width: 2 }, itemStyle: { color: "#22d3ee" } }] }]
      });
    }
    if (isEmpty(om)) { emptyChart("dgOm"); } else {
      var omItems = [
        { name: "一次修复率", value: om.first_fix_rate || 0 },
        { name: "工单闭环率", value: om.workorder_close_rate || 0 },
        { name: "巡检覆盖率", value: om.inspection_coverage || 0 },
        { name: "自营占比", value: om.self_operate_ratio || 0 },
        { name: "备件周转效率", value: Math.max(0, 100 - (om.spare_turnover_days || 30) * 2.5) },
        { name: "备用点位覆盖率", value: om.backup_ratio || 0 }
      ];
      setOption("dgOm", {
        tooltip: baseTooltip({}),
        radar: { indicator: omItems.map(function (h) { return { name: h.name, max: 100 }; }), radius: "62%", splitArea: { areaStyle: { color: ["rgba(56,130,246,.04)", "rgba(56,130,246,.08)"] } }, axisLine: { lineStyle: { color: "rgba(56,130,246,.25)" } }, splitLine: { lineStyle: { color: "rgba(56,130,246,.18)" } }, axisName: { color: "#94a3b8", fontSize: 11 } },
        series: [{ type: "radar", data: [{ value: omItems.map(function (h) { return h.value; }), areaStyle: { color: "rgba(129,140,248,.25)" }, lineStyle: { color: "#818cf8", width: 2 }, itemStyle: { color: "#818cf8" } }] }]
      });
    }
    pie("dgMode", g.om_mode, { formatter: "{b}: {c}%" });
    if (isEmpty(g.alarm_to_workorder)) { emptyChart("dgAlarm"); } else {
      line("dgAlarm", g.alarm_to_workorder, "month", "value", "#fbbf24", { name: "分钟" });
    }
    if (isEmpty(om)) { emptyChart("dgWorkflow"); } else {
      var flow = [
        { stage: "物联网告警", value: 1000 },
        { stage: "生成工单", value: 968 },
        { stage: "派单到场", value: 915 },
        { stage: "完成维修", value: 886 },
        { stage: "工单闭环", value: 964 }
      ];
      funnel("dgWorkflow", flow);
    }
  };

  /* ---------- 物联网平台（图片指标） ---------- */
  RENDERERS.iot = function (d) {
    var io = (d && d.iot) || {};
    var po = io.platform_overview || {};
    var cs = io.cell_status || {};
    var bm = io.battery_manage || {};
    renderKpis("ioKpis", [
      { label: "电站总数", value: fmtNum(po.total_stations), cls: "accent" },
      { label: "电站在线", value: fmtNum(po.online_stations), hint: "在线率 " + (po.station_online_rate != null ? po.station_online_rate + "%" : "--") },
      { label: "电站离线", value: fmtNum(po.offline_stations), cls: "warn" },
      { label: "设备在线", value: fmtNum(po.devices_online), hint: "总设备 " + fmtNum(po.total_devices) },
      { label: "今日告警", value: fmtNum(po.today_alarms), cls: "warn", detail: "iot_alarms" },
      { label: "待处理告警", value: fmtNum(po.pending_alarms), cls: "danger", detail: "iot_alarms" },
      { label: "今日工单", value: fmtNum(po.today_workorders) },
      { label: "监测电池", value: fmtNum(po.battery_monitored), hint: "在柜 " + fmtNum(po.battery_in_cabinet) + " / 离柜 " + fmtNum(po.battery_out_cabinet), detail: "iot_batteries" },
      { label: "电芯故障率", value: cs.fault != null ? cs.fault + "%" : "--", cls: "danger", detail: "iot_cells" },
      { label: "电芯预警率", value: cs.warning != null ? cs.warning + "%" : "--", cls: "warn", detail: "iot_cells" }
    ]);

    pie("ioProvince", po.province_dist, { formatter: "{b}: {c}%" });
    pie("ioCellStatus", po.cell_status, { formatter: "{b}: {c}%" });
    pie("ioVoltage", po.voltage_dist, { formatter: "{b}: {c}%" });
    pie("ioSoc", po.soc_dist, { formatter: "{b}: {c}%" });
    line("ioAlarmTrend", po.alarm_trend, "month", "value", "#f87171", { name: "告警数" });
    if (isEmpty(bm)) { emptyChart("ioManage"); } else {
      var manageData = [
        { name: "ADR正常", value: bm.adr_status && bm.adr_status.length ? bm.adr_status[0].value : 98 },
        { name: "通讯正常", value: bm.comm_status && bm.comm_status.length ? bm.comm_status[0].value : 96 },
        { name: "电压正常", value: bm.voltage_ok || 97 },
        { name: "SOC正常", value: bm.soc_ok || 97 },
        { name: "温度正常", value: bm.temp_ok || 98 }
      ];
      setOption("ioManage", {
        tooltip: baseTooltip({}),
        radar: { indicator: manageData.map(function (h) { return { name: h.name, max: 100 }; }), radius: "62%", splitArea: { areaStyle: { color: ["rgba(56,130,246,.04)", "rgba(56,130,246,.08)"] } }, axisLine: { lineStyle: { color: "rgba(56,130,246,.25)" } }, splitLine: { lineStyle: { color: "rgba(56,130,246,.18)" } }, axisName: { color: "#94a3b8", fontSize: 11 } },
        series: [{ type: "radar", data: [{ value: manageData.map(function (h) { return h.value; }), areaStyle: { color: "rgba(52,211,153,.25)" }, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" } }] }]
      });
    }
    var batTable = $("ioBatTable");
    if (batTable && !isEmpty(io.battery_params)) {
      var bh = "<tr><th>SN</th><th>型号</th><th>状态</th><th>SOC%</th><th>电压V</th><th>温度℃</th><th>循环</th><th>SOH%</th><th>所在柜</th><th>通讯</th></tr>";
      batTable.innerHTML = bh + io.battery_params.slice(0, 30).map(function (b) {
        return "<tr><td class='mono'>" + b.sn + "</td><td>" + b.model + "</td><td>" + (b.status === "在线" ? '<span style="color:#34d399">' + b.status + "</span>" : '<span style="color:#f87171">' + b.status + "</span>") + "</td><td>" + b.soc + "</td><td>" + b.voltage + "</td><td>" + b.temperature + "</td><td>" + b.cycles + "</td><td>" + b.soh + "</td><td>" + b.cabinet_no + "</td><td>" + b.comm + "</td></tr>";
      }).join("");
    }
    var cellTable = $("ioCellTable");
    if (cellTable && !isEmpty(cs.cell_list)) {
      var ch = "<tr><th>电芯ID</th><th>电池SN</th><th>状态</th><th>电压V</th><th>温度℃</th><th>内阻mΩ</th><th>使用时长(h)</th></tr>";
      cellTable.innerHTML = ch + cs.cell_list.slice(0, 40).map(function (c) {
        var color = c.status === "正常" ? "#34d399" : c.status === "预警" ? "#fbbf24" : "#f87171";
        return "<tr><td class='mono'>" + c.cell_id + "</td><td class='mono'>" + c.battery_sn + "</td><td><span style='color:" + color + "'>" + c.status + "</span></td><td>" + c.voltage + "</td><td>" + c.temperature + "</td><td>" + c.internal_resistance + "</td><td>" + c.use_hours + "</td></tr>";
      }).join("");
    }
    var alarmTable = $("ioAlarmTable");
    if (alarmTable && !isEmpty(io.alarm_list)) {
      var ah = "<tr><th>告警ID</th><th>时间</th><th>设备</th><th>类型</th><th>等级</th><th>状态</th><th>处理人</th></tr>";
      alarmTable.innerHTML = ah + io.alarm_list.slice(0, 25).map(function (a) {
        var lc = a.level === "紧急" ? "#f87171" : a.level === "重要" ? "#fbbf24" : "#8ea0bd";
        return "<tr><td class='mono'>" + a.id + "</td><td>" + a.time + "</td><td>" + a.device + "</td><td>" + a.type + "</td><td><span style='color:" + lc + "'>" + a.level + "</span></td><td>" + a.status + "</td><td>" + a.handler + "</td></tr>";
      }).join("");
    }
  };

  /* ---------- 三大地图 ---------- */
  function renderMap(id, points, title, detailKey) {
    var el = $(id);
    if (!el || isEmpty(points)) { emptyChart(id, "暂无地图数据"); return; }
    var geoName = "china";
    function draw() {
      if (!echarts.getMap(geoName)) { emptyChart(id, "地图底图加载失败"); return; }
      var maxVal = Math.max.apply(null, points.map(function (p) { return p.value || p.cabinets || p.users || p.sites; }));
      setOption(id, {
        tooltip: baseTooltip({ trigger: "item", formatter: function (p) {
          if (p.seriesType === "effectScatter") {
            var d = p.data;
            var lines = [p.name];
            if (d.cabinets != null) lines.push("换电柜: " + fmtNum(d.cabinets));
            if (d.batteries != null) lines.push("电池: " + fmtNum(d.batteries));
            if (d.users != null) lines.push("用户: " + fmtNum(d.users));
            if (d.vehicles != null) lines.push("车辆: " + fmtNum(d.vehicles));
            if (d.sites != null) lines.push("网点: " + fmtNum(d.sites));
            if (d.revenue) lines.push("月收入: ¥" + fmtMoney(d.revenue));
            return lines.join("<br/>");
          }
          return p.name + ": " + p.value;
        } }),
        geo: {
          map: geoName, roam: true, zoom: 1.15, top: 40, left: "center", width: "96%", height: "82%",
          itemStyle: { areaColor: "#0d1b33", borderColor: "#1e3a5f", borderWidth: 1 },
          emphasis: { label: { color: "#e2e8f0" }, itemStyle: { areaColor: "#16324f" } },
          label: { show: false }
        },
        series: [{
          name: title, type: "effectScatter", coordinateSystem: "geo",
          data: points.map(function (p) {
            return { name: p.name, value: [p.lng, p.lat, p.value || p.cabinets || p.users || p.sites], cabinets: p.cabinets, batteries: p.batteries, users: p.users, vehicles: p.vehicles, sites: p.sites, revenue: p.revenue, online_rate: p.online_rate, avg_cabinet: p.avg_cabinet, daily_exchanges: p.daily_exchanges };
          }),
          symbolSize: function (v) { return Math.max(8, Math.min(42, Math.sqrt(v[2] / maxVal) * 42)); },
          showEffectOn: "render", rippleEffect: { brushType: "stroke", scale: 3.2 },
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(56,189,248,.6)", color: "#38bdf8" },
          emphasis: { scale: 1.3 }
        }],
        visualMap: { min: 0, max: maxVal, left: 12, bottom: 12, calculable: false, dimension: 2, inRange: { color: ["#1d4ed8", "#22d3ee", "#34d399", "#fbbf24"] }, textStyle: { color: "#8ea0bd", fontSize: 10 } }
      });
      var inst = chartInstances[id];
      if (inst) {
        inst.off("click");
        inst.on("click", function (p) {
          if (p.seriesType === "effectScatter" && p.data && p.data.name && SNAPSHOT.details && SNAPSHOT.details[detailKey]) {
            openDetail(detailKey);
          }
        });
      }
    }
    if (GEO_LOADED[geoName]) { draw(); return; }
    fetch("static/js/geo/china.json").then(function (r) { return r.json(); }).then(function (geo) {
      echarts.registerMap(geoName, geo);
      GEO_LOADED[geoName] = true;
      draw();
    }).catch(function () { emptyChart(id, "地图底图加载失败"); });
  }
  RENDERERS.maps = function (d) {
    var m = (d && d.maps) || {};
    renderMap("mpDevice", m.device, "设备密集（柜+电池）", "cabinets");
    renderMap("mpUser", m.user_vehicle, "用户车辆密集", "users");
    renderMap("mpSite", m.site, "网点密集", "sites");
  };

  /* ---------- 行业趋势 ---------- */
  RENDERERS.industry = function (d) {
    var g = (d && d.industry) || {};
    if (isEmpty(g.market_size)) { emptyChart("inMarket"); } else {
      setOption("inMarket", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: g.market_size.map(function (r) { return r.year; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", name: "亿元", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS),
        series: [{ name: "市场规模", type: "bar", data: g.market_size.map(function (r) { return r.value; }), barWidth: 30, itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#38bdf8" }, { offset: 1, color: "#818cf8" }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", color: "#cbd5e1", fontSize: 10 } }]
      });
    }
    if (isEmpty(g.penetration)) { emptyChart("inPenetration"); } else {
      setOption("inPenetration", {
        tooltip: baseTooltip({ trigger: "axis" }),
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: g.penetration.map(function (r) { return r.year; }) }, BASE_AXIS),
        yAxis: Object.assign({ type: "value", axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: "{value}%" } }, BASE_AXIS),
        series: [{ name: "渗透率", type: "line", smooth: true, symbol: "circle", symbolSize: 7, data: g.penetration.map(function (r) { return r.value; }), lineStyle: { width: 3, color: "#34d399" }, itemStyle: { color: "#34d399" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(52,211,153,.3)" }, { offset: 1, color: "rgba(52,211,153,0)" }] } } }]
      });
    }
    var tl = $("inPolicy");
    if (tl) {
      tl.innerHTML = isEmpty(g.policy_milestones) ? '<div class="empty-tip">暂无数据</div>' : g.policy_milestones.map(function (m) {
        return '<div class="tl-item"><div class="tl-time">' + m.time + "</div><div class=\"tl-event\">" + m.event + "</div></div>";
      }).join("");
    }
    if (isEmpty(g.competition)) { emptyChart("inCompetition"); } else {
      setOption("inCompetition", {
        tooltip: baseTooltip({ trigger: "axis" }),
        legend: { top: 0, right: 8, textStyle: { color: "#8ea0bd", fontSize: 11 } },
        grid: GRID,
        xAxis: Object.assign({ type: "category", data: g.competition.map(function (r) { return r.name; }) }, BASE_AXIS),
        yAxis: [
          Object.assign({ type: "value", name: "柜体规模", nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10, formatter: function (v) { return fmtNum(v); } } }, BASE_AXIS),
          Object.assign({ type: "value", name: "份额%", min: 0, max: 80, nameTextStyle: { color: "#8ea0bd" }, axisLabel: { color: "#8ea0bd", fontSize: 10 } }, BASE_AXIS)
        ],
        series: [
          { name: "柜体规模", type: "bar", data: g.competition.map(function (r) { return r.cabinets; }), itemStyle: { color: "rgba(56,189,248,.6)", borderRadius: [4, 4, 0, 0] }, barWidth: 18 },
          { name: "市场份额", type: "line", yAxisIndex: 1, smooth: true, data: g.competition.map(function (r) { return r.share; }), lineStyle: { width: 2.5, color: "#fbbf24" }, itemStyle: { color: "#fbbf24" } }
        ]
      });
    }
    pie("inTech", g.tech_route, { formatter: "{b}: {c}%" });
    var ins = $("inInsights");
    if (ins) {
      ins.innerHTML = isEmpty(g.industry_insights) ? '<div class="empty-tip">暂无数据</div>' : g.industry_insights.map(function (t) { return '<div class="insight">' + t + "</div>"; }).join("");
    }
  };

  /* ---------- 数据说明 ---------- */
  RENDERERS.about = function (d) {
    var meta = (d && d.meta) || {};
    var metaHtml = '<div class="kv"><span class="k">快照时间</span><span>' + (meta.snapshot_time || "--") + "</span></div>" +
      '<div class="kv"><span class="k">数据来源</span><span>' + (meta.source || "--") + (meta.db_connected ? ' <span style="color:#34d399">· 已连接数据库</span>' : ' <span style="color:#fbbf24">· 离线快照</span>') + "</span></div>" +
      '<div class="kv"><span class="k">数据库主机</span><span class="mono">' + (meta.db_host || "--") + "</span></div>" +
      '<div class="kv"><span class="k">采集备注</span><span>' + (meta.note || meta.collect_time || "--") + "</span></div>";
    $("abMeta").innerHTML = metaHtml;
    fetch("data/archives.json").then(function (r) { return r.json(); }).then(function (list) {
      var html = list.length ? list.map(function (a) {
        return '<div class="arch-item"><span class="mono">' + a.file + "</span><span>" + a.time + "</span><span>" + (a.db_connected ? "实时库" : a.source) + "</span></div>";
      }).join("") : '<div class="empty-tip">暂无归档</div>';
      $("abArchives").innerHTML = html;
    }).catch(function () { $("abArchives").innerHTML = '<div class="empty-tip">加载失败</div>'; });
    $("abGuide").innerHTML =
      '<div class="kv"><span class="k">离线机制</span><span>看板仅依赖本地 <span class="mono">snapshots/latest.json</span> 快照，<b>不直连数据库</b>。连接数据库采集后自动刷新快照，断网后打开仍显示最后一次采集数据。</span></div>' +
      '<div class="kv"><span class="k">在线采集</span><span>内网环境下运行 <span class="mono">python collect.py</span>（先运行 <span class="mono">python collect.py --probe</span> 校准表名），采集完成自动更新快照。</span></div>' +
      '<div class="kv"><span class="k">演示数据</span><span>当前快照如为 <span class="mono">mock-demo-full</span>，表示使用示例数据，仅用于离线预览看板效果。</span></div>' +
      '<div class="kv"><span class="k">启动方式</span><span><span class="mono">python app.py</span> → 打开 <span class="mono">http://127.0.0.1:8097/</span></span></div>' +
      '<div class="kv"><span class="k">历史归档</span><span>每次采集保留时间戳归档（最多30份），可通过归档列表追溯历史数据。</span></div>' +
      '<div class="kv"><span class="k">明细下钻</span><span>点击任何带边框高亮的 KPI 数字或地图上的城市点，即可查看对应明细表。</span></div>' +
      '<div class="kv"><span class="k">三大地图</span><span>设备密集（换电柜+电池）、用户车辆密集、网点密集；地图底图本地化（GeoJSON），离线可用。</span></div>';
    $("abCaliper").innerHTML =
      "<b>1. 资产底数</b>：柜体/电池总数、仓库闲置率（未投放资产）、电池/柜比、平均使用年限、SOH分布（&lt;70%为低健康度）、循环次数、单柜回本周期；采购交付漏斗、品牌型号、消防路线、供应商集中度、融资结构。<br>" +
      "<b>2. 用户与套餐</b>：注册→激活→首换→活跃→续费漏斗；套餐按租期档位（月/季/半年/1年/3年+）拆分，监控ARPU、LTV、CAC、续费率、流失率、超用比例、长租占比。<br>" +
      "<b>3. 运营</b>：订单量、单柜日均订单、换电频次分层（高&gt;4次/日、中2-4次、低&lt;2次）、24小时时段分布、故障率、MTTR、低效/僵尸设备。<br>" +
      "<b>4. 场景点位</b>：场景类型（社区/车行/园区/学校/商场/写字楼/枢纽）、点位数与密度、合作期限与到期分布、分成模式（15%-30%分成/场租/电费+分成/免费）、点位分级（高/普通/低效）。<br>" +
      "<b>5. 经营财务</b>：月度收入/成本/净利、收入构成（月租/季租/半年/1年/3年+/其他）、成本结构（电费/分成/折旧/运维/获客/平台/激励/保险）、盈亏平衡达成率、预收款池、退款/坏账、CAPEX、融资租赁、CAC/LTV、套餐成本毛利。<br>" +
      "<b>6. 运营效率</b>：网点扩张、满仓率、电池周转、换电失败率、换电时段、留存曲线、流失原因、激活到首换时长。<br>" +
      "<b>7. 数字化与运维</b>：数据覆盖率、告警准确率、工单闭环率、远程覆盖率；人均管理柜数、响应/MTTR、一次修复率、巡检覆盖率、备用点位。<br>" +
      "<b>8. 物联网平台</b>：电站（柜）总数/在线/离线、监测电池数、电芯状态（正常/预警/故障）、电压/SOC分布、告警明细、电池实时参数（SN/SOC/电压/温度/循环/SOH）。<br>" +
      "<b>9. 行业趋势</b>：市场规模、渗透率、政策里程碑、竞争格局、技术路线（磷酸铁锂/三元/钠电试点）。";
  };

  /* ============================================================
   * 初始化
   * ============================================================ */
  function init() {
    document.querySelectorAll(".tab").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.dataset.tab); });
    });
    $("modalClose").addEventListener("click", closeDetail);
    $("detailModal").addEventListener("click", function (e) { if (e.target === $("detailModal")) closeDetail(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDetail(); });
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-detail]");
      if (t) openDetail(t.getAttribute("data-detail"));
    });

    fetch("data/snapshot.json").then(function (r) { return r.json(); }).then(function (data) {
      SNAPSHOT = data;
      var meta = (data && data.meta) || {};
      var dot = $("snapDot"), txt = $("snapText");
      if (meta.snapshot_time) {
        dot.className = "dot " + (meta.db_connected ? "live" : "offline");
        txt.textContent = "快照 " + meta.snapshot_time + (meta.db_connected ? " · 已连接数据库" : " · 离线快照");
      } else {
        dot.className = "dot offline";
        txt.textContent = "暂无快照";
      }
      switchTab("overview");
    }).catch(function () {
      var dot = $("snapDot"), txt = $("snapText");
      dot.className = "dot offline";
      txt.textContent = "快照加载失败";
      switchTab("about");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
