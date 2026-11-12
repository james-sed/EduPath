/* EduPath admin dashboard: Overview (admin scope only).
 *
 * Read-only analytics over student assessments. Every aggregate is computed in this file from
 * localStorage (demo mode); nothing is written except the admin session. Future endpoints:
 *   POST /api/admin/login                      (replaces the demo sign-in below)
 *   GET  /api/admin/overview?program=&year=    (replaces loadStudents + aggregates)
 *   GET  /api/admin/benchmarks                 (edupath.admin.bench, used for gap maths)
 *
 * Demo admin auth lives in this file, not app.js. It is NOT secure: the credentials sit in
 * client-side code. They are never rendered on any page. Move it server-side with the backend.
 *
 * Skills, roles, levels and benchmarks are read at runtime from window.EduPath.model, so the
 * dashboard follows changes to the student model. Soft skills (model.SOFT / SOFT_BENCH) are
 * shown separately and never mixed into the technical gap figures, matching the student side.
 *
 * Privacy (RA 10173): aggregates only. Any group smaller than MIN_GROUP is suppressed or folded
 * into "Other". No names, emails or individual results are ever shown.
 */
(function () {
  'use strict';

  var EP = window.EduPath || {};
  var M = EP.model;
  var gate = document.getElementById('admin-gate');
  var app = document.getElementById('admin-app');
  if (!M || !Array.isArray(M.SKILLS) || !Array.isArray(M.ROLES)) {
    gate.hidden = false;
    gate.textContent = 'The EduPath model did not load. Check that js/app.js is available.';
    return;
  }

  /* ---------------- model ---------------- */
  var SKILLS = M.SKILLS;
  var SKILL_IDS = SKILLS.map(function (s) { return s.id; });
  var ROLES = M.ROLES;
  var LEVELS = M.LEVELS || [];
  var SOFT = Array.isArray(M.SOFT) ? M.SOFT : [];
  var SOFT_BENCH = M.SOFT_BENCH || {};
  var API = EP.api || {};
  var PROGRAMS = API.programs || { BSIT: 'Information Technology', BSCpE: 'Computer Engineering', BSECE: 'Electronics Engineering', BSEMC: 'Entertainment & Multimedia Computing' };
  var YEARS = API.yearLevels || { '3': '3rd year', '4': '4th year', grad: 'Recent graduate' };

  /* ---------------- settings ---------------- */
  var ADMIN = { email: 'admin@edupath.test', password: 'edupath-admin-demo' };   // demo only, never displayed
  var KEYS = { users: 'edupath.users', results: 'edupath.results', bench: 'edupath.admin.bench', session: 'edupath.admin.session' };
  var SESSION_TTL = 8 * 60 * 60 * 1000;
  var MIN_GROUP = 5;
  var WEEKS = 12;
  var DAY = 86400000;

  // One colour per role, used in every chart. Distinct hues anchored on Midnight Ink.
  var ROLE_COLORS = { frontend: '#161d6f', backend: '#3b6fd8', mobile: '#14a098', database: '#7b5bc9', qa: '#d99a2b', network: '#cc5a7e' };
  var PROGRAM_COLORS = { BSIT: '#161d6f', BSCpE: '#14a098', BSECE: '#7b5bc9', BSEMC: '#d99a2b' };
  var OTHER_COLOR = '#c3c7da';
  // Rating levels 0 to 5: light to dark Midnight Ink.
  var LEVEL_COLORS = ['#e6e9f6', '#c3c9ec', '#949fdc', '#6470c2', '#37439d', '#161d6f'];
  // Heatmap: stepped mint to teal to navy (no red: DESIGN.md "gaps are not failures").
  var HEAT = [
    { max: 0,        bg: '#e8faef', fg: '#0f1450', label: '0, meets benchmark' },
    { max: 0.5,      bg: '#c4efe9', fg: '#0f1450', label: 'Up to 0.5' },
    { max: 1,        bg: '#86d3c9', fg: '#0f1450', label: '0.5 to 1.0' },
    { max: 1.5,      bg: '#1f7f78', fg: '#ffffff', label: '1.0 to 1.5' },
    { max: 2,        bg: '#0b5b57', fg: '#ffffff', label: '1.5 to 2.0' },
    { max: Infinity, bg: '#161d6f', fg: '#ffffff', label: 'Over 2.0' }
  ];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- helpers ---------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) { var i = el('i', 'ph-light ' + name); i.setAttribute('aria-hidden', 'true'); return i; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function avg(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtPct(n) { return Math.round(n) + '%'; }
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function fmtLevels(n) { return fmt1(n) + ' levels'; }
  function shortDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function roleName(id) { var r = ROLES.filter(function (x) { return x.id === id; })[0]; return r ? r.name : 'Unknown role'; }
  function skillKind(s) { return s.kind || s.group || ''; }
  function plural(n, one, many) { return fmtInt(n) + ' ' + (n === 1 ? one : many); }

  function readLocal(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function readSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEYS.session) || 'null');
      return s && s.email && Date.now() - s.at < SESSION_TTL ? s : null;
    } catch (e) { return null; }
  }
  function writeSession(email) { try { sessionStorage.setItem(KEYS.session, JSON.stringify({ email: email, at: Date.now() })); } catch (e) {} }
  function clearSession() { try { sessionStorage.removeItem(KEYS.session); } catch (e) {} }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  /* ---------------- benchmarks ---------------- */
  // Saved admin benchmarks when they match the current skills, otherwise the model's samples.
  function benchRows() {
    var saved = readLocal(KEYS.bench, null);
    var ok = saved && Array.isArray(saved.skillIds) && saved.skillIds.join() === SKILL_IDS.join() && saved.roles;
    var out = {};
    ROLES.forEach(function (r) {
      var row = ok && Array.isArray(saved.roles[r.id]) ? saved.roles[r.id] : ((M.BENCH || {})[r.id] || []);
      out[r.id] = SKILL_IDS.map(function (_, i) { var n = Number(row[i]); return isFinite(n) ? clamp(n, 0, 5) : 0; });
    });
    return out;
  }
  function softBenchFor(role) {
    var row = SOFT_BENCH[role] || [];
    return SOFT.map(function (_, i) { return Number(row[i]) || 0; });
  }

  /* ---------------- students (read-only) ---------------- */
  function toRatings(obj) {
    return SKILL_IDS.map(function (id) { var v = Number(obj[id]); return isFinite(v) ? clamp(Math.round(v), 0, 5) : 0; });
  }
  function toSoft(r) {
    var a = r.softAverages || (r.softSkills && typeof M.softAverages === 'function' ? M.softAverages(r.softSkills) : null);
    if (!a || !SOFT.length) return null;
    var vals = SOFT.map(function (g) { var v = Number(a[g.id]); return isFinite(v) ? clamp(v, 0, 5) : null; });
    return vals.some(function (v) { return v == null; }) ? null : vals;
  }

  // Every readable assessment in this browser (demo account excluded).
  function realAssessments() {
    var users = readLocal(KEYS.users, []) || [];
    var results = readLocal(KEYS.results, {}) || {};
    var out = [];
    users.forEach(function (u) {
      if (!u || u.isDemo) return;
      var r = results[u.id];
      if (!r || typeof r !== 'object') return;
      var ratings = r.ratings || (r.profile && r.profile.ratings);
      if (!ratings || typeof ratings !== 'object') return;
      var d = new Date(r.completedAt || 0);
      out.push({
        key: u.id, program: String(u.program || ''), year: String(u.yearLevel || ''),
        ratings: toRatings(ratings), soft: toSoft(r),
        role: r.predictedRole || r.topRole || (r.matches && r.matches[0] && r.matches[0].role) || null,
        at: isNaN(d.getTime()) ? null : d, retake: false
      });
    });
    return out;
  }

  // Deterministic sample cohort for demonstrations. Programs have different strengths, year
  // level shifts ratings, assessments rise over the 12 weeks, and about one in five students
  // retakes later with smaller gaps. Roles are predicted the same way the student app does
  // (closest benchmark by cosine similarity), so gaps behave realistically.
  function sampleAssessments() {
    var seed = 20261104;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function noise(spread) { return (rand() + rand() - 1) * spread; }
    var BASE = {
      BSIT:  { prog: 4, web: 4, backend: 3, mobile: 2, db: 3, testing: 2, net: 2, git: 3, devops: 2 },
      BSCpE: { prog: 3, web: 2, backend: 3, mobile: 2, db: 2, testing: 2, net: 4, git: 2, devops: 3 },
      BSECE: { prog: 2, web: 1, backend: 2, mobile: 1, db: 2, testing: 2, net: 4, git: 1, devops: 2 },
      BSEMC: { prog: 3, web: 4, backend: 2, mobile: 3, db: 1, testing: 2, net: 1, git: 2, devops: 1 }
    };
    var YEAR_SHIFT = { '3': -0.5, '4': 0, grad: 0.5 };
    var progIds = Object.keys(PROGRAMS), yearIds = Object.keys(YEARS);
    var bench = benchRows();
    var now = Date.now();

    function predict(r) {
      var best = ROLES[0].id, top = -1;
      ROLES.forEach(function (role) { var c = cosine(r, bench[role.id]); if (c > top) { top = c; best = role.id; } });
      return best;
    }

    var out = [];
    for (var i = 0; i < 132; i++) {
      var prog = progIds[Math.floor(rand() * progIds.length)];
      var year = yearIds[Math.floor(rand() * yearIds.length)];
      var base = BASE[prog] || {};
      var ratings = SKILL_IDS.map(function (id) {
        var b = base[id] != null ? base[id] : 2.5;
        return clamp(Math.round(b + (YEAR_SHIFT[year] || 0) + noise(2.2)), 0, 5);
      });
      var soft = SOFT.length ? SOFT.map(function () { return Math.round(clamp(3.1 + (YEAR_SHIFT[year] || 0) * 0.6 + noise(1.8), 0, 5) * 10) / 10; }) : null;
      var weekAgo = Math.floor(WEEKS * (1 - Math.sqrt(rand())));              // more assessments recently
      var at = new Date(now - (weekAgo * 7 + Math.floor(rand() * 7)) * DAY - Math.floor(rand() * 9) * 3600000);
      var role = predict(ratings);
      out.push({ key: 's' + i, program: prog, year: year, ratings: ratings, soft: soft, role: role, at: at, retake: false });

      if (weekAgo >= 2 && rand() < 0.22) {                                   // retake: closer to the benchmark
        var row = bench[role];
        var better = ratings.map(function (v, k) { return clamp(Math.round(v + Math.max(0, row[k] - v) * 0.55 + noise(0.8)), 0, 5); });
        var betterSoft = soft ? soft.map(function (v) { return Math.round(clamp(v + 0.4 + noise(0.6), 0, 5) * 10) / 10; }) : null;
        var later = new Date(Math.min(now, at.getTime() + (7 + Math.floor(rand() * (weekAgo - 1) * 7)) * DAY));
        out.push({ key: 's' + i, program: prog, year: year, ratings: better, soft: betterSoft, role: predict(better), at: later, retake: true });
      }
    }
    return out;
  }

  /* ---------------- aggregates ---------------- */
  function enrich(list, bench) {
    list.forEach(function (a) {
      var row = bench[a.role] || bench[ROLES[0].id];
      a.gaps = a.ratings.map(function (v, i) { return Math.max(0, row[i] - v); });
      a.gap = avg(a.gaps);
      a.meets = a.gaps.every(function (g) { return g === 0; });
      if (a.soft) {
        var sb = softBenchFor(a.role);
        a.softGap = avg(a.soft.map(function (v, i) { return Math.max(0, sb[i] - v); }));
      }
    });
    return list;
  }

  // Latest assessment per student (a retake replaces the earlier result).
  function latestPerStudent(list) {
    var by = {};
    list.forEach(function (a) {
      var cur = by[a.key];
      if (!cur || (a.at && (!cur.at || a.at > cur.at))) by[a.key] = a;
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function weekBuckets(list) {
    var end = new Date(); end.setHours(23, 59, 59, 999);
    var buckets = [];
    for (var w = WEEKS - 1; w >= 0; w--) {
      var stop = new Date(end.getTime() - w * 7 * DAY), start = new Date(stop.getTime() - 7 * DAY);
      buckets.push({ start: start, stop: stop, label: shortDate(new Date(start.getTime() + DAY)), items: [] });
    }
    list.forEach(function (a) {
      if (!a.at) return;
      for (var i = 0; i < buckets.length; i++) if (a.at > buckets[i].start && a.at <= buckets[i].stop) { buckets[i].items.push(a); break; }
    });
    return buckets;
  }

  function inLastDays(list, from, to) {
    var now = Date.now();
    return list.filter(function (a) { return a.at && a.at.getTime() > now - to * DAY && a.at.getTime() <= now - from * DAY; });
  }

  // Count by key, folding any group under MIN_GROUP into "Other".
  function countsWithOther(items, keyFn, order) {
    var c = {};
    items.forEach(function (a) { var k = keyFn(a); c[k] = (c[k] || 0) + 1; });
    var rows = [], other = 0;
    order.forEach(function (k) {
      var n = c[k] || 0;
      if (n >= MIN_GROUP) rows.push({ key: k, n: n }); else other += n;
    });
    rows.sort(function (a, b) { return b.n - a.n; });
    if (other) rows.push({ key: '__other', n: other });
    return rows;
  }

  /* ---------------- state ---------------- */
  var state = { sample: null, program: '', year: '', heatRows: 'program' };
  var charts = [];

  function data() {
    var real = realAssessments();
    if (state.sample === null) state.sample = latestPerStudent(real).length < MIN_GROUP;
    var all = enrich(state.sample ? sampleAssessments() : real, benchRows());
    var filtered = all.filter(function (a) {
      return (!state.program || a.program === state.program) && (!state.year || a.year === state.year);
    });
    return { all: filtered, latest: latestPerStudent(filtered) };
  }

  /* ---------------- Chart.js setup ---------------- */
  var hasChart = typeof window.Chart === 'function';
  if (hasChart) {
    Chart.defaults.font.family = '"Manrope", system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#5d6289';
    Chart.defaults.borderColor = 'rgba(22,29,111,.08)';
    Chart.defaults.animation.duration = reduceMotion ? 0 : 700;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.plugins.legend.display = false;
    Object.assign(Chart.defaults.plugins.tooltip, {
      backgroundColor: '#0f1450', titleColor: '#ffffff', bodyColor: '#e9ebff', padding: 10, cornerRadius: 10,
      titleFont: { weight: '700' }, boxPadding: 4, usePointStyle: true
    });
  }
  function destroyCharts() { charts.forEach(function (c) { c.destroy(); }); charts = []; }

  function chartBox(card, cls, label) {
    var box = el('div', 'chart-box' + (cls ? ' ' + cls : ''));
    var canvas = el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    box.appendChild(canvas);
    card.body.appendChild(box);
    return canvas;
  }
  function makeChart(canvas, config) {
    if (!hasChart) return null;
    var c = new Chart(canvas, config);
    charts.push(c);
    return c;
  }

  // Screen-reader (and no-Chart.js fallback) table for a chart.
  function dataTable(card, caption, head, rows) {
    var t = el('table', hasChart ? 'sr-only' : 'fallback');
    t.appendChild(el('caption', null, caption));
    var tr = el('tr'); head.forEach(function (h) { tr.appendChild(el('th', null, h)); });
    var thead = el('thead'); thead.appendChild(tr); t.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r) { var row = el('tr'); r.forEach(function (v) { row.appendChild(el('td', null, String(v))); }); tb.appendChild(row); });
    t.appendChild(tb);
    card.body.appendChild(t);
  }

  /* ---------------- card shell ---------------- */
  function card(span, title, subtitle, foot) {
    var c = el('section', 'card ' + span);
    var head = el('header', 'card-head');
    var h = el('div');
    var id = 'c-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    var h2 = el('h2', null, title); h2.id = id;
    h.append(h2, el('p', null, subtitle));
    head.appendChild(h);
    c.setAttribute('aria-labelledby', id);
    var body = el('div', 'card-body');
    c.append(head, body);
    if (foot) c.appendChild(el('footer', 'card-foot', foot));
    return { el: c, head: head, body: body };
  }

  /* ---------------- KPI cards ---------------- */
  function spark(values, color) {
    var w = 96, h = 32, pad = 3;
    var max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([max]));
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      return [pad + i * (w - pad * 2) / Math.max(1, values.length - 1), h - pad - (v - min) / span * (h - pad * 2)];
    });
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('class', 'spark'); svg.setAttribute('aria-hidden', 'true');
    var line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', color); line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round'); line.setAttribute('stroke-linejoin', 'round');
    var last = pts[pts.length - 1], dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); dot.setAttribute('r', '3.2');
    dot.setAttribute('fill', '#c7ffd8'); dot.setAttribute('stroke', color); dot.setAttribute('stroke-width', '1.6');
    svg.append(line, dot);
    return svg;
  }

  function delta(now, before, lowerIsBetter, unit) {
    var span = el('span', 'delta');
    if (before == null || !isFinite(before)) { span.classList.add('flat'); span.textContent = 'New'; return span; }
    var d = now - before;
    var shown = unit === 'pct' ? (before ? Math.round(d / before * 100) + '%' : 'New') : fmt1(Math.abs(d));
    if (Math.abs(d) < 0.05) { span.classList.add('flat'); span.textContent = 'No change'; return span; }
    var better = lowerIsBetter ? d < 0 : d > 0;
    span.classList.add(better ? 'good' : 'bad');
    var ic = icon(d > 0 ? 'ph-arrow-up' : 'ph-arrow-down');
    span.append(ic, document.createTextNode(unit === 'pct' ? shown.replace('-', '') : shown));
    span.setAttribute('aria-label', (d > 0 ? 'Up ' : 'Down ') + (unit === 'pct' ? shown.replace('-', '') : shown) + (better ? ', an improvement' : ', worse'));
    return span;
  }

  function kpi(board, iconName, label, value, unit, context, deltaNode, sparkValues, sparkColor) {
    var c = el('section', 'card kpi');
    var l = el('p', 'kpi-label'); l.append(icon(iconName), document.createTextNode(label));
    var v = el('p', 'kpi-value', value); if (unit) v.appendChild(el('small', null, unit));
    var row = el('div', 'kpi-row');
    var ctx = el('p', 'kpi-context');
    if (deltaNode) ctx.appendChild(deltaNode);
    ctx.appendChild(document.createTextNode(context));
    row.appendChild(ctx);
    if (sparkValues && sparkValues.length > 1) row.appendChild(spark(sparkValues, sparkColor || '#161d6f'));
    c.append(l, v, row);
    board.appendChild(c);
  }

  /* ---------------- render ---------------- */
  var board = document.getElementById('admin-board');

  function render() {
    destroyCharts();
    board.innerHTML = '';
    var d = data(), all = d.all, latest = d.latest, n = latest.length;
    document.querySelector('[data-updated]').textContent =
      'Last updated ' + new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) +
      '. Showing ' + plural(n, 'student', 'students') + (state.sample ? ' from the sample dataset.' : '.');

    if (n < MIN_GROUP) {
      var e = el('div', 'empty');
      e.append(icon(n ? 'ph-shield-check' : 'ph-chart-bar'),
        el('h2', null, n ? 'Too few students to show' : 'No assessments yet'),
        el('p', null, n
          ? 'Fewer than ' + MIN_GROUP + ' students match these filters. Widen the filters to protect individual results.'
          : 'Results appear here once students complete the skill assessment. Turn on sample data to preview the dashboard.'));
      board.appendChild(e);
      return;
    }

    var weeks = weekBuckets(all);
    var foot = 'Based on ' + plural(n, 'student', 'students');

    /* --- KPIs --- */
    var last30 = inLastDays(all, 0, 30), prev30 = inLastDays(all, 30, 60);
    var gapNow = last30.length >= MIN_GROUP ? avg(last30.map(function (a) { return a.gap; })) : null;
    var gapBefore = prev30.length >= MIN_GROUP ? avg(prev30.map(function (a) { return a.gap; })) : null;
    var meets = latest.filter(function (a) { return a.meets; }).length;
    var avgGapAll = avg(latest.map(function (a) { return a.gap; }));
    var weeklyCounts = weeks.map(function (w) { return w.items.length; });
    var weeklyGap = weeks.map(function (w) { return w.items.length ? avg(w.items.map(function (a) { return a.gap; })) : null; });

    kpi(board, 'ph-users-three', 'Students assessed', fmtInt(n), null,
      'Unique students, latest result each', null, weeklyCounts, '#161d6f');
    kpi(board, 'ph-clipboard-text', 'Assessments, last 30 days', fmtInt(last30.length), null,
      'vs prior 30 days', delta(last30.length, prev30.length || null, false, 'pct'), null);
    kpi(board, 'ph-chart-line-down', 'Average skill gap', fmt1(gapNow != null ? gapNow : avgGapAll), 'levels',
      gapBefore != null ? 'vs prior 30 days' : 'Per technical skill, per student',
      gapBefore != null && gapNow != null ? delta(gapNow, gapBefore, true) : null,
      weeklyGap.filter(function (v) { return v != null; }), '#0b6560');
    kpi(board, 'ph-seal-check', 'Meeting their benchmark', fmtPct(meets / n * 100), null,
      plural(meets, 'student has', 'students have') + ' no technical gap', null, null);

    /* --- Assessments over time (line) --- */
    var c1 = card('span-8', 'Assessments over time', 'Completed assessments per week, last 12 weeks', 'Based on ' + plural(all.length, 'assessment', 'assessments'));
    var firsts = weeks.map(function (w) { return w.items.filter(function (a) { return !a.retake; }).length; });
    var retakes = weeks.map(function (w) { return w.items.filter(function (a) { return a.retake; }).length; });
    var hasRetakes = retakes.some(function (v) { return v > 0; });
    var legend1 = el('div', 'legend');
    legend1.append(keyItem('#161d6f', 'First assessments'));
    if (hasRetakes) legend1.append(keyItem('#14a098', 'Retakes', true));
    c1.head.appendChild(legend1);
    var cv1 = chartBox(c1, 'fill', 'Line chart of assessments per week over the last 12 weeks');
    board.appendChild(c1.el);
    makeChart(cv1, {
      type: 'line',
      data: {
        labels: weeks.map(function (w) { return w.label; }),
        datasets: [
          lineSet('First assessments', firsts, '#161d6f', true),
          hasRetakes ? Object.assign(lineSet('Retakes', retakes, '#14a098', false), { borderDash: [6, 5] }) : null
        ].filter(Boolean)
      },
      options: baseLine('Assessments', 'Week starting', true)
    });
    dataTable(c1, 'Assessments per week', ['Week starting', 'First assessments', 'Retakes'],
      weeks.map(function (w, i) { return [w.label, firsts[i], retakes[i]]; }));

    /* --- Predicted roles (donut) --- */
    var roleRows = countsWithOther(latest, function (a) { return a.role; }, ROLES.map(function (r) { return r.id; }));
    var c2 = card('span-4', 'Predicted roles', 'Share of students by best-fit role', foot);
    donut(c2, roleRows, function (k) { return k === '__other' ? 'Other (under 5 each)' : roleName(k); },
      function (k) { return k === '__other' ? OTHER_COLOR : ROLE_COLORS[k] || '#9aa1c4'; }, n, 'students', 'Donut chart of students by predicted role');
    board.appendChild(c2.el);

    /* --- Average gap by skill (horizontal bar) --- */
    var skillStats = SKILLS.map(function (s, i) {
      var gaps = latest.map(function (a) { return a.gaps[i]; });
      return { s: s, i: i, gap: avg(gaps), below: gaps.filter(function (g) { return g > 0; }).length / n * 100 };
    });
    var sorted = skillStats.slice().sort(function (a, b) { return b.gap - a.gap; });
    var c3 = card('span-6', 'Average gap by skill', 'Levels below each student’s predicted-role benchmark', foot);
    var cv3 = chartBox(c3, 'tall', 'Horizontal bar chart of average gap per technical skill');
    board.appendChild(c3.el);
    makeChart(cv3, {
      type: 'bar',
      data: { labels: sorted.map(function (x) { return x.s.name; }), datasets: [{
        label: 'Average gap', data: sorted.map(function (x) { return Math.round(x.gap * 100) / 100; }),
        backgroundColor: '#161d6f',
        borderRadius: 999, borderSkipped: false, barThickness: 14
      }] },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, suggestedMax: 2, title: { display: true, text: 'Average gap (levels)' }, ticks: { stepSize: 0.5 } },
          y: { grid: { display: false }, ticks: { color: '#0f1450', font: { weight: '600' }, callback: fitTick } }
        },
        plugins: { tooltip: { callbacks: {
          label: function (ctx) { return ' ' + fmtLevels(ctx.raw) + ' average gap'; },
          afterLabel: function (ctx) { return ' ' + fmtPct(sorted[ctx.dataIndex].below) + ' of students below benchmark'; }
        } } }
      }
    });
    dataTable(c3, 'Average gap by skill', ['Skill', 'Average gap (levels)', 'Below benchmark'],
      sorted.map(function (x) { return [x.s.name, fmt1(x.gap), fmtPct(x.below)]; }));

    /* --- Students by program (pie) --- */
    var progRows = countsWithOther(latest, function (a) { return a.program; }, Object.keys(PROGRAMS));
    var c4 = card('span-3', 'Students by program', 'Share of assessed students', foot);
    pie(c4, progRows, function (k) { return k === '__other' ? 'Other (under 5 each)' : k; },
      function (k) { return k === '__other' ? OTHER_COLOR : PROGRAM_COLORS[k] || '#9aa1c4'; }, n, 'Pie chart of students by program',
      function (k) { return PROGRAMS[k] || 'Programs with fewer than 5 students'; });
    board.appendChild(c4.el);

    /* --- Students by year level (bar) --- */
    var yearRows = countsWithOther(latest, function (a) { return a.year; }, Object.keys(YEARS));
    var yearOrder = Object.keys(YEARS).concat(['__other']).filter(function (k) { return yearRows.some(function (r) { return r.key === k; }); });
    var c5 = card('span-3', 'Students by year level', 'Assessed students per year level', foot);
    var cv5 = chartBox(c5, null, 'Bar chart of students by year level');
    board.appendChild(c5.el);
    makeChart(cv5, {
      type: 'bar',
      data: { labels: yearOrder.map(function (k) { return k === '__other' ? 'Other' : String(YEARS[k]).split(' '); }), datasets: [{
        label: 'Students', data: yearOrder.map(function (k) { return yearRows.filter(function (r) { return r.key === k; })[0].n; }),
        backgroundColor: ['#c3c9ec', '#6470c2', '#161d6f', OTHER_COLOR], borderRadius: 8, maxBarThickness: 44
      }] },
      options: {
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Students' } }, x: { grid: { display: false }, ticks: { maxRotation: 0 } } },
        plugins: { tooltip: { callbacks: { title: function (items) { return [].concat(items[0].label).join(' '); }, label: function (ctx) { return ' ' + plural(ctx.raw, 'student', 'students'); } } } }
      }
    });
    dataTable(c5, 'Students by year level', ['Year level', 'Students'],
      yearOrder.map(function (k) { return [k === '__other' ? 'Other' : YEARS[k], yearRows.filter(function (r) { return r.key === k; })[0].n]; }));

    /* --- Heatmap --- */
    renderHeatmap(latest, foot);

    /* --- Top gaps (ranked list) --- */
    var c7 = card('span-4', 'Most common gaps', 'Skills ranked by average gap', foot);
    var ol = el('ol', 'rank');
    var maxGap = Math.max(sorted[0] ? sorted[0].gap : 0, 0.01);
    sorted.slice(0, 5).forEach(function (x, k) {
      var li = el('li');
      var nm = el('span', 'nm', x.s.name); nm.appendChild(el('small', null, fmtPct(x.below) + ' of students below benchmark'));
      var bar = el('span', 'bar'); var b = el('b'); b.style.setProperty('--w', '0'); bar.appendChild(b);
      li.append(el('span', 'n', String(k + 1)), nm, el('span', 'vl', fmtLevels(x.gap)), bar);
      ol.appendChild(li);
      requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.setProperty('--w', (x.gap / maxGap).toFixed(3)); }); });
    });
    c7.body.appendChild(ol);
    board.appendChild(c7.el);

    /* --- Average gap over time (line) --- */
    var hasSoft = SOFT.length && latest.some(function (a) { return a.softGap != null; });
    var c8 = card('span-6', 'Average gap over time', 'Weekly average gap; lower is better', 'Weeks with fewer than 5 assessments are left blank');
    var legend8 = el('div', 'legend'); legend8.append(keyItem('#161d6f', 'Technical'));
    if (hasSoft) legend8.append(keyItem('#d99a2b', 'Soft skills'));
    c8.head.appendChild(legend8);
    var techWeekly = weeks.map(function (w) { return w.items.length >= MIN_GROUP ? Math.round(avg(w.items.map(function (a) { return a.gap; })) * 100) / 100 : null; });
    var softWeekly = weeks.map(function (w) {
      var s = w.items.filter(function (a) { return a.softGap != null; });
      return s.length >= MIN_GROUP ? Math.round(avg(s.map(function (a) { return a.softGap; })) * 100) / 100 : null;
    });
    var cv8 = chartBox(c8, null, 'Line chart of the weekly average skill gap');
    board.appendChild(c8.el);
    var opt8 = baseLine('Average gap (levels)', 'Week starting', false);
    opt8.scales.y.suggestedMax = 2; opt8.scales.y.ticks = { stepSize: 0.5 };
    opt8.plugins.tooltip.callbacks = { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtLevels(ctx.raw); } };
    makeChart(cv8, {
      type: 'line',
      data: { labels: weeks.map(function (w) { return w.label; }), datasets: [
        lineSet('Technical', techWeekly, '#161d6f', false),
        hasSoft ? lineSet('Soft skills', softWeekly, '#d99a2b', false) : null
      ].filter(Boolean) },
      options: opt8
    });
    dataTable(c8, 'Average gap per week', ['Week starting', 'Technical', 'Soft skills'],
      weeks.map(function (w, i) { return [w.label, techWeekly[i] == null ? 'Under 5' : fmt1(techWeekly[i]), softWeekly[i] == null ? 'Under 5' : fmt1(softWeekly[i])]; }));

    /* --- Soft skills vs benchmark (grouped bar) --- */
    if (hasSoft) {
      var softStudents = latest.filter(function (a) { return a.soft; });
      var softAvg = SOFT.map(function (_, i) { return avg(softStudents.map(function (a) { return a.soft[i]; })); });
      var softReq = SOFT.map(function (_, i) { return avg(softStudents.map(function (a) { return softBenchFor(a.role)[i]; })); });
      var c9 = card('span-6', 'Soft skills', 'Average rating vs the level their roles expect. Advisory only', 'Based on ' + plural(softStudents.length, 'student', 'students') + '. Soft skills do not affect the role match');
      var legend9 = el('div', 'legend'); legend9.append(keyItem('#d99a2b', 'Average rating'), keyItem('#e8d5ad', 'Role expects'));
      c9.head.appendChild(legend9);
      var cv9 = chartBox(c9, null, 'Grouped bar chart of soft-skill ratings against role expectations');
      board.appendChild(c9.el);
      makeChart(cv9, {
        type: 'bar',
        data: { labels: SOFT.map(function (g) { return g.name; }), datasets: [
          { label: 'Average rating', data: softAvg.map(function (v) { return Math.round(v * 100) / 100; }), backgroundColor: '#d99a2b', borderRadius: 6, maxBarThickness: 26 },
          { label: 'Role expects', data: softReq.map(function (v) { return Math.round(v * 100) / 100; }), backgroundColor: '#e8d5ad', borderRadius: 6, maxBarThickness: 26 }
        ] },
        options: {
          maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 }, title: { display: true, text: 'Rating (0 to 5)' } }, x: { grid: { display: false }, ticks: { color: '#0f1450', font: { weight: '600' } } } },
          plugins: { tooltip: { callbacks: { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmt1(ctx.raw); } } } }
        }
      });
      dataTable(c9, 'Soft skills', ['Competency', 'Average rating', 'Role expects'],
        SOFT.map(function (g, i) { return [g.name, fmt1(softAvg[i]), fmt1(softReq[i])]; }));
    }

    /* --- Rating distribution (100% stacked bars) --- */
    var c10 = card('span-12', 'Self-rating distribution', 'Share of students at each level, per technical skill', foot);
    var legend10 = el('div', 'legend');
    LEVELS.forEach(function (L, i) { legend10.appendChild(keyItem(LEVEL_COLORS[i], L.v + ' ' + L.label)); });
    c10.head.appendChild(legend10);
    var dist = SKILLS.map(function (s, i) {
      return LEVELS.map(function (L) { return latest.filter(function (a) { return a.ratings[i] === L.v; }).length / n * 100; });
    });
    var cv10 = chartBox(c10, null, 'Stacked bar chart of how students rate themselves on each skill');
    cv10.parentNode.style.height = Math.max(200, SKILLS.length * 28 + 44) + 'px';
    board.appendChild(c10.el);
    makeChart(cv10, {
      type: 'bar',
      data: { labels: SKILLS.map(function (s) { return s.name; }), datasets: LEVELS.map(function (L, li) {
        return { label: L.v + ' ' + L.label, data: dist.map(function (row) { return Math.round(row[li] * 10) / 10; }), backgroundColor: LEVEL_COLORS[li], barThickness: 18, borderWidth: 0 };
      }) },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        scales: {
          x: { stacked: true, min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; } }, title: { display: true, text: 'Share of students' } },
          y: { stacked: true, grid: { display: false }, ticks: { color: '#0f1450', font: { weight: '600' }, callback: fitTick } }
        },
        plugins: { tooltip: { mode: 'index', callbacks: { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtPct(ctx.raw); } } } }
      }
    });
    dataTable(c10, 'Self-rating distribution', ['Skill'].concat(LEVELS.map(function (L) { return L.v + ' ' + L.label; })),
      SKILLS.map(function (s, i) { return [s.name].concat(dist[i].map(fmtPct)); }));
  }

  /* ---------------- chart builders ---------------- */
  // Long category names on narrow horizontal bar charts: shorten the tick, keep the tooltip full.
  function fitTick(value) {
    var l = this.getLabelForValue(value);
    return this.chart.width < 520 && l.length > 16 ? l.slice(0, 15).trim() + '…' : l;
  }
  function keyItem(color, label, dashed) {
    var s = el('span'); var i = el('i');
    i.style.background = dashed ? 'repeating-linear-gradient(90deg,' + color + ' 0 4px,transparent 4px 7px)' : color;
    if (dashed) { i.style.height = '3px'; i.style.borderRadius = '2px'; }
    s.append(i, document.createTextNode(label));
    return s;
  }

  function lineSet(label, values, color, signature) {
    return {
      label: label, data: values, borderColor: color, backgroundColor: signature ? gradientFill(color) : 'transparent',
      fill: !!signature, tension: 0.35, borderWidth: 2.5, spanGaps: false,
      // The last point ends in the logo's mint dot.
      pointRadius: values.map(function (_, i) { return i === values.length - 1 ? 5 : 0; }),
      pointHoverRadius: 5, pointBackgroundColor: '#c7ffd8', pointBorderColor: color, pointBorderWidth: 2
    };
  }
  function gradientFill(color) {
    return function (ctx) {
      var area = ctx.chart.chartArea; if (!area) return 'transparent';
      var g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      g.addColorStop(0, 'rgba(22,29,111,.16)'); g.addColorStop(1, 'rgba(22,29,111,0)');
      return g;
    };
  }
  function baseLine(yTitle, xTitle, integers) {
    return {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: yTitle }, ticks: integers ? { precision: 0 } : {} },
        x: { grid: { display: false }, title: { display: true, text: xTitle }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }
      },
      plugins: { tooltip: { callbacks: {} } }
    };
  }

  function donut(c, rows, nameOf, colorOf, total, unit, label) {
    var wrap = el('div', 'donut-wrap');
    var box = el('div', 'chart-box short'); var cv = el('canvas');
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
    box.appendChild(cv); wrap.appendChild(box);
    var list = el('ul', 'keylist');
    rows.forEach(function (r) {
      var li = el('li'), i = el('i'); i.style.background = colorOf(r.key);
      li.append(i, el('span', null, nameOf(r.key)), el('span', 'c', fmtInt(r.n)), el('span', 'p', fmtPct(r.n / total * 100)));
      list.appendChild(li);
    });
    wrap.appendChild(list);
    c.body.appendChild(wrap);
    makeChart(cv, {
      type: 'doughnut',
      data: { labels: rows.map(function (r) { return nameOf(r.key); }), datasets: [{ data: rows.map(function (r) { return r.n; }), backgroundColor: rows.map(function (r) { return colorOf(r.key); }), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 6 }] },
      options: {
        maintainAspectRatio: false, cutout: '68%',
        plugins: { tooltip: { callbacks: { label: function (ctx) { return ' ' + plural(ctx.raw, 'student', 'students') + ', ' + fmtPct(ctx.raw / total * 100); } } } }
      },
      plugins: [centerText(fmtInt(total), unit)]
    });
    dataTable(c, label, ['Group', 'Students', 'Share'], rows.map(function (r) { return [nameOf(r.key), r.n, fmtPct(r.n / total * 100)]; }));
  }

  function pie(c, rows, nameOf, colorOf, total, label, fullName) {
    var wrap = el('div', 'donut-wrap');
    var box = el('div', 'chart-box short'); var cv = el('canvas');
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
    box.appendChild(cv); wrap.appendChild(box);
    var list = el('ul', 'keylist');
    rows.forEach(function (r) {
      var li = el('li'), i = el('i'); i.style.background = colorOf(r.key);
      var nm = el('span', null, nameOf(r.key)); nm.title = fullName(r.key);
      li.append(i, nm, el('span', 'c', fmtInt(r.n)), el('span', 'p', fmtPct(r.n / total * 100)));
      list.appendChild(li);
    });
    wrap.appendChild(list);
    c.body.appendChild(wrap);
    makeChart(cv, {
      type: 'pie',
      data: { labels: rows.map(function (r) { return nameOf(r.key); }), datasets: [{ data: rows.map(function (r) { return r.n; }), backgroundColor: rows.map(function (r) { return colorOf(r.key); }), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 6 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: {
          title: function (items) { return fullName(rows[items[0].dataIndex].key); },
          label: function (ctx) { return ' ' + plural(ctx.raw, 'student', 'students') + ', ' + fmtPct(ctx.raw / total * 100); }
        } } }
      }
    });
    dataTable(c, label, ['Program', 'Students', 'Share'], rows.map(function (r) { return [fullName(r.key), r.n, fmtPct(r.n / total * 100)]; }));
  }

  function centerText(big, small) {
    return {
      id: 'centerText',
      afterDraw: function (chart) {
        var a = chart.chartArea; if (!a) return;
        var x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2, ctx = chart.ctx;
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f1450'; ctx.font = '800 26px Manrope, system-ui, sans-serif'; ctx.fillText(big, x, y - 8);
        ctx.fillStyle = '#5d6289'; ctx.font = '600 12px Manrope, system-ui, sans-serif'; ctx.fillText(small, x, y + 14);
        ctx.restore();
      }
    };
  }

  /* ---------------- heatmap ---------------- */
  function heatColor(v) { for (var i = 0; i < HEAT.length; i++) if (v <= HEAT[i].max + 1e-9) return HEAT[i]; return HEAT[HEAT.length - 1]; }

  function renderHeatmap(latest, foot) {
    var byProgram = state.heatRows === 'program';
    var c = card('span-8', 'Skill-gap heatmap', 'Average gap per skill, by ' + (byProgram ? 'program' : 'year level'), foot + '. Hover or focus a cell for details');
    var seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Heatmap rows');
    [['program', 'Program'], ['year', 'Year level']].forEach(function (o) {
      var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(state.heatRows === o[0]));
      b.addEventListener('click', function () { if (state.heatRows !== o[0]) { state.heatRows = o[0]; render(); } });
      seg.appendChild(b);
    });
    c.head.appendChild(seg);

    var groups = byProgram ? Object.keys(PROGRAMS) : Object.keys(YEARS);
    var wrap = el('div', 'heat-wrap'); var t = el('table', 'heat');
    t.appendChild(el('caption', 'sr-only', 'Average skill gap in levels by ' + (byProgram ? 'program' : 'year level') + ' and skill'));
    var thead = el('thead'), htr = el('tr');
    htr.appendChild(el('th', null, byProgram ? 'Program' : 'Year level'));
    SKILLS.forEach(function (s) { var th = el('th', null, s.name); th.scope = 'col'; htr.appendChild(th); });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el('tbody');
    groups.forEach(function (g) {
      var members = latest.filter(function (a) { return byProgram ? a.program === g : a.year === g; });
      var tr = el('tr'), th = el('th', null, byProgram ? g : YEARS[g]); th.scope = 'row';
      th.appendChild(el('small', null, plural(members.length, 'student', 'students')));
      if (byProgram) th.title = PROGRAMS[g];
      tr.appendChild(th);
      SKILLS.forEach(function (s, i) {
        var td = el('td'); td.tabIndex = 0;
        if (members.length < MIN_GROUP) {
          td.className = 'supp'; td.textContent = '<5';
          td.title = (byProgram ? PROGRAMS[g] : YEARS[g]) + ', ' + s.name + ': fewer than 5 students, hidden for privacy';
        } else {
          var gaps = members.map(function (a) { return a.gaps[i]; });
          var v = avg(gaps), below = gaps.filter(function (x) { return x > 0; }).length;
          var col = heatColor(v);
          td.style.background = col.bg; td.style.color = col.fg; td.textContent = fmt1(v);
          td.title = (byProgram ? g : YEARS[g]) + ', ' + s.name + ': average gap ' + fmtLevels(v) + ', ' +
            fmtPct(below / members.length * 100) + ' of ' + members.length + ' students below benchmark';
        }
        td.setAttribute('aria-label', td.title);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); c.body.appendChild(wrap);
    var leg = el('div', 'legend');
    HEAT.forEach(function (h) { var s = el('span'), i = el('i'); i.style.background = h.bg; if (h.max === 0) i.style.boxShadow = 'inset 0 0 0 1px rgba(22,29,111,.15)'; s.append(i, document.createTextNode(h.label)); leg.appendChild(s); });
    var sp = el('span'), si = el('i', 'supp'); sp.append(si, document.createTextNode('Under 5 students, hidden')); leg.appendChild(sp);
    c.body.appendChild(leg);
    board.appendChild(c.el);
  }

  /* ---------------- shell, filters, sign-in ---------------- */
  // Admin sections, routed by the URL hash (#overview, #benchmarks, #catalog).
  var PAGES = {
    overview: { name: 'Overview', icon: 'ph-squares-four',
      sub: 'Aggregated, anonymised skill-gap data across assessed students.' },
    benchmarks: { name: 'Role benchmarks', icon: 'ph-sliders-horizontal',
      sub: 'The minimum rating each role expects for every skill.',
      emptyTitle: 'No role benchmarks to manage yet',
      emptyText: 'This section will list each role’s expected level per skill so admins can review and update them. Until then, gaps use the sample benchmarks in the student model.' },
    catalog: { name: 'Learning catalog', icon: 'ph-books',
      sub: 'JRU subjects and credentials recommended for each skill gap.',
      emptyTitle: 'No learning resources to manage yet',
      emptyText: 'This section will list the subjects, microcredentials and professional-skills credentials mapped to each skill. Until then, pathways use the sample catalog in the student model.' }
  };
  function currentPage() { var h = location.hash.replace('#', ''); return PAGES[h] ? h : 'overview'; }

  function renderNav() {
    var nav = document.querySelector('[data-nav]'); nav.innerHTML = '';
    var page = currentPage();
    Object.keys(PAGES).forEach(function (id) {
      var a = el('a', 'rail-link');
      a.href = '#' + id;
      a.append(icon(PAGES[id].icon), el('span', 'lbl', PAGES[id].name));
      a.setAttribute('aria-label', PAGES[id].name);
      if (id === page) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
  }

  function renderEmptyPage(p) {
    destroyCharts();
    board.innerHTML = '';
    var c = el('section', 'card span-12');
    var e = el('div', 'empty');
    e.append(icon(p.icon), el('h2', null, p.emptyTitle), el('p', null, p.emptyText));
    c.appendChild(e);
    board.appendChild(c);
  }

  function showPage() {
    var id = currentPage(), p = PAGES[id], overview = id === 'overview';
    document.title = p.name + ' | EduPath admin';
    document.querySelector('[data-page-title]').textContent = p.name;
    document.querySelector('[data-page-sub]').textContent = p.sub;
    document.querySelector('[data-filters]').hidden = !overview;
    document.querySelector('[data-updated]').hidden = !overview;
    renderNav();
    if (overview) render(); else renderEmptyPage(p);
  }

  function fillSelect(sel, allLabel, map, fmt) {
    sel.innerHTML = '';
    var o = el('option', null, allLabel); o.value = ''; sel.appendChild(o);
    Object.keys(map).forEach(function (k) { var op = el('option', null, fmt(k)); op.value = k; sel.appendChild(op); });
  }

  function startApp(session) {
    gate.hidden = true; app.hidden = false;
    document.querySelector('[data-who]').textContent = 'Signed in as ' + session.email;
    var p = document.querySelector('[data-filter="program"]'), y = document.querySelector('[data-filter="year"]');
    fillSelect(p, 'All programs', PROGRAMS, function (k) { return k + ', ' + PROGRAMS[k]; });
    fillSelect(y, 'All year levels', YEARS, function (k) { return YEARS[k]; });
    p.addEventListener('change', function () { state.program = p.value; render(); });
    y.addEventListener('change', function () { state.year = y.value; render(); });
    var sample = document.querySelector('[data-sample]');
    sample.addEventListener('change', function () { state.sample = sample.checked; render(); });
    document.querySelector('[data-filters]').addEventListener('submit', function (e) { e.preventDefault(); });
    document.querySelector('[data-signout]').addEventListener('click', function () { clearSession(); location.reload(); });
    window.addEventListener('hashchange', function () { showPage(); window.scrollTo(0, 0); });
    showPage();
    data();                                   // resolves the sample-data default even when opened on another page
    sample.checked = !!state.sample;
  }

  function renderGate() {
    gate.hidden = false; app.hidden = true; gate.innerHTML = '';
    var c = el('section', 'gate-card');
    var brand = el('div', 'gate-brand');
    brand.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#161d6f"/><path d="M8 22 L14 14 L18 18 L24 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="9" r="2.4" fill="#c7ffd8"/></svg>';
    brand.appendChild(document.createTextNode('EduPath Admin'));
    var f = el('form', 'gate-form'); f.noValidate = true;
    var em = el('input'); em.type = 'email'; em.name = 'email'; em.autocomplete = 'username'; em.required = true;
    var pw = el('input'); pw.type = 'password'; pw.name = 'password'; pw.autocomplete = 'current-password'; pw.required = true;
    var l1 = el('label', null, 'Email'); l1.appendChild(em);
    var l2 = el('label', null, 'Password'); l2.appendChild(pw);
    var err = el('p', 'gate-error'); err.hidden = true; err.setAttribute('role', 'alert');
    var btn = el('button', 'btn-primary', 'Sign in'); btn.type = 'submit';
    f.append(l1, l2, err, btn);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (em.value.trim().toLowerCase() === ADMIN.email && pw.value === ADMIN.password) {
        writeSession(ADMIN.email); startApp({ email: ADMIN.email });
      } else {
        err.textContent = 'That email and password don’t match an admin account.'; err.hidden = false; pw.select();
      }
    });
    c.append(brand, el('h1', null, 'Admin sign in'), el('p', null, 'For program chairs and Career Center staff.'), f);
    gate.appendChild(c);
    em.focus();
  }

  var s = readSession();
  if (s) startApp(s); else renderGate();
})();
