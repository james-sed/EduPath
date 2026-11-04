/* EduPath admin dashboard.
 *
 * Admin scope only. Maintains the role benchmarks (edupath.admin.bench) and the
 * learning catalog (edupath.admin.catalog) in this browser's localStorage (demo
 * mode). Never touches the student keys (edupath.users, edupath.session,
 * edupath.results, edupath.draft).
 *
 * Data contract (owned by this panel; the student model does not read these keys yet):
 *   edupath.admin.bench   = { version, skillIds: [..], roles: { roleId: [0..5, ..] } }
 *   edupath.admin.catalog = { version, skills: { skillId: [{type, title, provider?, link?}] } }
 * Each save bumps version. skillIds records the order the values were saved in.
 *
 * Future endpoints (named here, not implemented):
 *   GET/PUT /api/admin/benchmarks   -> edupath.admin.bench
 *   GET/PUT /api/admin/catalog      -> edupath.admin.catalog
 *   GET /api/admin/gap-summary      -> recompute from edupath.results (this panel, aggregates only)
 *
 * Demo admin auth (NOT secure): the account lives inside this file, credentials are
 * never rendered on any page, and the session is kept in sessionStorage under
 * edupath.admin.session. Replace with POST /api/admin/login when the backend exists.
 *
 * Reads window.EduPath.model at runtime: skills, roles, and the model's built-in
 * BENCH / CATALOG samples. Nothing is hardcoded here except demo auth and the three
 * paper catalog types (other existing type strings are shown as-is).
 */
(function () {
  'use strict';

  var EP = window.EduPath;
  var M = EP && EP.model ? EP.model : null;
  if (!M || !Array.isArray(M.SKILLS) || !Array.isArray(M.ROLES)) {
    return; // app.js / the EduPath model did not load; nothing to do
  }

  var SKILLS = M.SKILLS;
  var ROLES = M.ROLES;
  var BENCH_MODEL = M.BENCH || {};
  var CATALOG_MODEL = M.CATALOG || {};
  var SOFT_CATALOG_MODEL = M.SOFT_CATALOG || {};

  var CURRENT_SKILL_IDS = SKILLS.map(function (s) { return s.id; });

  // Demo-mode admin account (team only). Demo auth is NOT secure: these credentials
  // live in client-side code and are never sent anywhere or shown on any page.
  var ADMIN = { email: 'admin@edupath.test', password: 'edupath-admin-demo' };

  var KEYS = {
    bench: 'edupath.admin.bench',
    catalog: 'edupath.admin.catalog',
    session: 'edupath.admin.session',
    results: 'edupath.results' // read only; never written by this panel
  };

  var CATALOG_TYPES = ['JRU subject', 'CHED microcredential', 'Professional-skills credential'];
  var SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

  /* ---------------- small helpers (same style as app.js / results.js) ---------------- */

  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function capitalize(t) {
    t = String(t);
    return t.slice(0, 1).toUpperCase() + t.slice(1);
  }

  function skillGroup(s) {
    return s.kind ? capitalize(s.kind) : (s.group ? capitalize(s.group) : 'General');
  }

  function readLocal(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }
  function readSession() {
    try {
      var v = sessionStorage.getItem(KEYS.session);
      if (!v) return null;
      var s = JSON.parse(v);
      if (s && s.email && Date.now() - s.at < SESSION_TTL) return s;
    } catch (e) {}
    return null;
  }
  function writeSession(s) {
    try {
      sessionStorage.setItem(KEYS.session, JSON.stringify({ email: String(s.email), at: Date.now() }));
      return true;
    } catch (e) { return false; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(KEYS.session); } catch (e) {}
  }
  function formatTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
  }

  /* ---------------- model-derived layout ---------------- */

  function groupSkills() {
    var map = {};
    SKILLS.forEach(function (s) {
      var g = s.kind || s.group || 'general';
      if (!map[g]) map[g] = { key: g, label: skillGroup(s), skills: [] };
      map[g].skills.push(s);
    });
    var out = Object.keys(map).map(function (k) { return map[k]; });
    out.sort(function (a, b) {
      var order = { technical: 0, soft: 1 };
      var oa = order[a.key] != null ? order[a.key] : 100;
      var ob = order[b.key] != null ? order[b.key] : 100;
      return oa - ob || a.label.localeCompare(b.label);
    });
    return out;
  }

  function roleById(id) {
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === id) return ROLES[i];
    return { id: id, name: String(id) };
  }

  /* ---------------- benchmark draft (editable copy) ---------------- */

  function cloneBenchRoles(roles) {
    var out = {};
    Object.keys(roles).forEach(function (id) {
      var row = roles[id];
      out[id] = Array.isArray(row) ? row.slice() : [];
    });
    return out;
  }

  function emptyBenchDraft() {
    var roles = {};
    ROLES.forEach(function (r) { roles[r.id] = CURRENT_SKILL_IDS.map(function () { return ''; }); });
    return { skillIds: CURRENT_SKILL_IDS.slice(), roles: roles };
  }

  function modelBenchDraft() {
    // The model's built-in BENCH sample, normalized to the current skill order.
    var roles = {};
    ROLES.forEach(function (r) {
      var src = BENCH_MODEL[r.id] || [];
      roles[r.id] = CURRENT_SKILL_IDS.map(function (_, i) {
        return i < src.length ? String(src[i]) : '';
      });
    });
    return { skillIds: CURRENT_SKILL_IDS.slice(), roles: roles };
  }

  function normalizeBenchRoles(roles) {
    var out = {};
    ROLES.forEach(function (r) {
      var row = roles[r.id];
      out[r.id] = CURRENT_SKILL_IDS.map(function (_, i) {
        var v = row == null ? '' : row[i];
        return v == null ? '' : String(v);
      });
    });
    return out;
  }

  function benchMatchesCurrent(saved) {
    if (!saved || !Array.isArray(saved.skillIds) || !saved.roles || typeof saved.roles !== 'object') return false;
    if (saved.skillIds.length !== CURRENT_SKILL_IDS.length) return false;
    for (var i = 0; i < CURRENT_SKILL_IDS.length; i++) {
      if (saved.skillIds[i] !== CURRENT_SKILL_IDS[i]) return false;
    }
    var ids = CURRENT_SKILL_IDS;
    for (var id in saved.roles) {
      var row = saved.roles[id];
      if (!Array.isArray(row) || row.length !== ids.length) return false;
    }
    return true;
  }

  // Parse a cell's text into {v: 0..5, ok: boolean}. Empty counts as 0 and is valid.
  function benchCell(text) {
    if (text === '' || text == null) return { v: 0, ok: true };
    var n = Number(text);
    if (!Number.isFinite(n) || Math.floor(n) !== n || n < 0 || n > 5) return { v: 0, ok: false };
    return { v: n, ok: true };
  }

  /* ---------------- catalog draft (editable copy) ---------------- */

  function cloneCatalogSkills(skills) {
    var out = {};
    Object.keys(skills).forEach(function (k) {
      var arr = skills[k];
      out[k] = Array.isArray(arr) ? arr.map(function (c) {
        return { type: c.type || '', title: c.title || '', provider: c.provider || '', link: c.link || '' };
      }) : [];
    });
    return out;
  }

  function emptyCatalogDraft() {
    var skills = {};
    SKILLS.forEach(function (s) { skills[s.id] = []; });
    return { skills: skills };
  }

  function modelCatalogDraft() {
    // Model's built-in samples (technical + soft), normalized to the current skills.
    var skills = {};
    SKILLS.forEach(function (s) {
      var src = (CATALOG_MODEL[s.id] && CATALOG_MODEL[s.id].slice()) ||
                (SOFT_CATALOG_MODEL[s.id] && SOFT_CATALOG_MODEL[s.id].slice()) || [];
      skills[s.id] = src.map(function (c) {
        return { type: c.type || '', title: c.title || '', provider: c.provider || '', link: c.link || '' };
      });
    });
    return { skills: skills };
  }

  function normalizeCatalog(skills) {
    var out = {};
    SKILLS.forEach(function (s) {
      var arr = skills[s.id];
      out[s.id] = Array.isArray(arr) ? arr.map(function (c) {
        return { type: c.type || '', title: c.title || '', provider: c.provider || '', link: c.link || '' };
      }) : [];
    });
    return out;
  }

  function catalogMatchesCurrent(saved) {
    if (!saved || !saved.skills || typeof saved.skills !== 'object') return false;
    var keys = Object.keys(saved.skills);
    if (keys.length !== CURRENT_SKILL_IDS.length) return false;
    for (var i = 0; i < keys.length; i++) if (keys[i] !== CURRENT_SKILL_IDS[i]) return false;
    return true;
  }

  function catalogTypeOptions() {
    var seen = {};
    CATALOG_TYPES.forEach(function (t) { seen[t] = true; });
    [CATALOG_MODEL, SOFT_CATALOG_MODEL].forEach(function (cat) {
      if (!cat) return;
      Object.keys(cat).forEach(function (k) {
        (cat[k] || []).forEach(function (c) { if (c.type) seen[c.type] = true; });
      });
    });
    var saved = readLocal(KEYS.catalog, null);
    if (saved && saved.skills) {
      Object.keys(saved.skills).forEach(function (k) {
        (saved.skills[k] || []).forEach(function (c) { if (c.type) seen[c.type] = true; });
      });
    }
    return Object.keys(seen);
  }

  /* ---------------- state ---------------- */

  var state = {
    signedIn: false,
    activeTab: 'bench',
    bench: null,
    benchSaved: null,
    benchDirty: false,
    benchMismatch: false,
    catalog: null,
    catalogSaved: null,
    catalogDirty: false,
    catalogMismatch: false,
    previewProfile: 'steady'
  };

  function loadBench() {
    var saved = readLocal(KEYS.bench, null);
    var mismatch = !benchMatchesCurrent(saved);
    state.bench = mismatch ? modelBenchDraft() : normalizeBenchRoles(saved.roles);
    state.bench.skillIds = CURRENT_SKILL_IDS.slice();
    state.benchSaved = (!mismatch && saved) ? { version: saved.version, savedAt: saved.savedAt } : null;
    state.benchDirty = false;
    state.benchMismatch = mismatch;
  }

  function saveBench() {
    var payload = {
      version: ((state.benchSaved && state.benchSaved.version) || 0) + 1,
      skillIds: CURRENT_SKILL_IDS.slice(),
      roles: cloneBenchRoles(state.bench.roles),
      savedAt: new Date().toISOString()
    };
    if (!writeLocal(KEYS.bench, payload)) return false;
    state.benchSaved = { version: payload.version, savedAt: payload.savedAt };
    state.benchDirty = false;
    state.benchMismatch = false;
    return true;
  }

  function resetBench() {
    var base = modelBenchDraft();
    state.bench = base;
    state.bench.skillIds = CURRENT_SKILL_IDS.slice();
    var payload = {
      version: ((state.benchSaved && state.benchSaved.version) || 0) + 1,
      skillIds: CURRENT_SKILL_IDS.slice(),
      roles: cloneBenchRoles(base.roles),
      savedAt: new Date().toISOString()
    };
    writeLocal(KEYS.bench, payload);
    state.benchSaved = { version: payload.version, savedAt: payload.savedAt };
    state.benchDirty = false;
    state.benchMismatch = false;
  }

  function loadCatalog() {
    var saved = readLocal(KEYS.catalog, null);
    var mismatch = !catalogMatchesCurrent(saved);
    state.catalog = mismatch ? modelCatalogDraft() : normalizeCatalog(saved.skills);
    state.catalogSaved = (!mismatch && saved) ? { version: saved.version, savedAt: saved.savedAt } : null;
    state.catalogDirty = false;
    state.catalogMismatch = mismatch;
  }

  function saveCatalog() {
    var skills = {};
    SKILLS.forEach(function (s) {
      skills[s.id] = (state.catalog.skills[s.id] || []).filter(function (c) {
        return String(c.title).trim() !== '';
      });
    });
    var payload = {
      version: ((state.catalogSaved && state.catalogSaved.version) || 0) + 1,
      skills: skills,
      savedAt: new Date().toISOString()
    };
    if (!writeLocal(KEYS.catalog, payload)) return false;
    state.catalogSaved = { version: payload.version, savedAt: payload.savedAt };
    state.catalogDirty = false;
    state.catalogMismatch = false;
    return true;
  }

  function resetCatalog() {
    var base = modelCatalogDraft();
    state.catalog = base;
    var payload = {
      version: ((state.catalogSaved && state.catalogSaved.version) || 0) + 1,
      skills: cloneCatalogSkills(base.skills),
      savedAt: new Date().toISOString()
    };
    writeLocal(KEYS.catalog, payload);
    state.catalogSaved = { version: payload.version, savedAt: payload.savedAt };
    state.catalogDirty = false;
    state.catalogMismatch = false;
  }

  function catalogAddRow(skillId) {
    var types = catalogTypeOptions();
    (state.catalog.skills[skillId] || []).push({ type: types[0] || '', title: '', provider: '', link: '' });
    state.catalogDirty = true;
  }
  function catalogRemoveRow(skillId, index) {
    var arr = state.catalog.skills[skillId];
    if (arr) arr.splice(index, 1);
    state.catalogDirty = true;
  }
  function catalogSetField(skillId, index, field, value) {
    var row = (state.catalog.skills[skillId] || [])[index];
    if (!row) return;
    row[field] = value == null ? '' : String(value);
    state.catalogDirty = true;
  }

  /* ---------------- preview: cosine math recomputed here (never calls model.score) ---------------- */

  var SAMPLE_PROFILES = [
    { key: 'steady', label: 'Steady — 3 across all skills' },
    { key: 'rising', label: 'Rising — 1, 2, 3, 4, 5 …' },
    { key: 'mixed', label: 'Mixed — strengths and gaps' }
  ];

  function sampleValue(key, i) {
    if (key === 'steady') return 3;
    if (key === 'rising') return Math.min(5, i + 1);
    if (key === 'mixed') return i % 3 === 0 ? 5 : i % 3 === 1 ? 1 : 3;
    return 3;
  }

  function sampleRatings(key) {
    var out = {};
    SKILLS.forEach(function (s, i) { out[s.id] = sampleValue(key, i); });
    return out;
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  function computePreview() {
    var key = state.previewProfile || 'steady';
    var ratings = sampleRatings(key);
    var you = SKILLS.map(function (s) { return ratings[s.id] || 0; });
    var roles = state.bench.roles;
    var matches = ROLES.map(function (r) {
      var b = roles[r.id] || [];
      var nums = CURRENT_SKILL_IDS.map(function (_, i) {
        var c = benchCell(b[i]);
        return c.ok ? c.v : 0;
      });
      var gaps = SKILLS.map(function (s, i) {
        return { id: s.id, name: s.name, you: you[i], role: nums[i], gap: Math.max(0, nums[i] - you[i]) };
      });
      return { id: r.id, name: r.name, match: Math.round(cosine(you, nums) * 100), gaps: gaps };
    });
    matches.sort(function (a, b) { return b.match - a.match || a.name.localeCompare(b.name); });
    return { ratings: ratings, matches: matches, top: matches[0] || null };
  }

  /* ---------------- gate / auth ---------------- */

  function signIn(email, password) {
    return String(email).trim().toLowerCase() === ADMIN.email && password === ADMIN.password;
  }

  function renderGate(container) {
    container.innerHTML = '';
    var panel = el('section', 'admin-panel admin-gate');
    var h2 = el('h2', 'admin-panel-title', 'EduPath Admin');
    var lead = el('p', 'admin-panel-lead', 'Program chairs and Career Center staff sign in here to maintain role benchmarks and the learning catalog.');
    panel.appendChild(h2);
    panel.appendChild(lead);

    var form = el('form', null, '');
    form.id = 'admin-signin-form';
    form.setAttribute('novalidate', '');

    var alert = el('p', 'form-alert is-error', '');
    alert.id = 'admin-signin-error';
    alert.setAttribute('role', 'alert');
    form.appendChild(alert);

    var emailGroup = el('div', 'field-group');
    emailGroup.appendChild(el('label', null, 'Email'));
    var emailInput = el('input', 'input', '');
    emailInput.id = 'admin-email';
    emailInput.name = 'email';
    emailInput.type = 'email';
    emailInput.autocomplete = 'email';
    emailInput.placeholder = 'you@example.com';
    emailGroup.appendChild(emailInput);
    form.appendChild(emailGroup);

    var passGroup = el('div', 'field-group');
    passGroup.appendChild(el('label', null, 'Password'));
    var passInput = el('input', 'input', '');
    passInput.id = 'admin-password';
    passInput.name = 'password';
    passInput.type = 'password';
    passInput.autocomplete = 'current-password';
    passGroup.appendChild(passInput);
    form.appendChild(passGroup);

    var btn = el('button', 'btn btn-primary btn-block', 'Sign in');
    btn.type = 'submit';
    form.appendChild(btn);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert.textContent = '';
      if (signIn(emailInput.value, passInput.value)) {
        writeSession({ email: emailInput.value });
        state.signedIn = true;
        render();
      } else {
        alert.textContent = 'That email and password don\'t match an admin account.';
        emailInput.focus();
      }
    });

    panel.appendChild(form);
    var note = el('p', 'demo-note', 'Demo mode: admin accounts are stored only in this browser. Demo-mode admin auth is not secure (future POST /api/admin/login).');
    panel.appendChild(note);
    var back = el('p', null, '');
    var link = el('a', 'text-link', '← Return to EduPath');
    link.href = 'index.html';
    back.appendChild(link);
    panel.appendChild(back);

    container.appendChild(panel);
  }

  /* ---------------- screens ---------------- */

  function refreshBenchControls(ctrls) {
    ctrls.version.textContent = state.benchSaved
      ? 'Version ' + state.benchSaved.version + ' · saved ' + formatTime(state.benchSaved.savedAt)
      : 'Not saved yet — starting from sample data';
    ctrls.save.disabled = !state.benchDirty;
    ctrls.discard.disabled = !state.benchDirty;
  }

  function controlBar(container, versionText, onSave, onDiscard, onReset, dirty) {
    var bar = el('div', 'admin-controls');
    var version = el('span', 'admin-version', versionText);
    bar.appendChild(version);
    var save = el('button', 'btn btn-primary', 'Save');
    save.type = 'button';
    save.disabled = !dirty;
    var discard = el('button', 'btn btn-ghost', 'Discard changes');
    discard.type = 'button';
    discard.disabled = !dirty;
    var reset = el('button', 'btn btn-ghost', 'Reset to sample data');
    reset.type = 'button';
    save.addEventListener('click', onSave);
    discard.addEventListener('click', onDiscard);
    reset.addEventListener('click', onReset);
    bar.appendChild(save);
    bar.appendChild(discard);
    bar.appendChild(reset);
    container.appendChild(bar);
    return { version: version, save: save, discard: discard };
  }

  function renderBench() {
    var container = document.getElementById('tab-bench');
    container.innerHTML = '';
    var panel = el('section', 'admin-panel');

    var h2 = el('h2', 'admin-panel-title', 'Role benchmarks');
    var lead = el('p', 'admin-panel-lead', 'Each row is an entry-level IT role and each column is a skill. Cells are whole numbers 0–5; gap = benchmark − rating. Sample data — validate benchmarks with IT practitioners and CSE faculty before real use.');
    panel.appendChild(h2);
    panel.appendChild(lead);
    panel.appendChild(el('span', 'admin-sample', 'SAMPLE'));

    if (state.benchMismatch) {
      var notice = el('div', 'admin-notice admin-notice--warn');
      notice.textContent = 'Saved benchmarks were built for a different skill set and won\'t line up with the current model. ';
      var btn = el('button', 'btn btn-primary', 'Reset to current sample data');
      btn.type = 'button';
      btn.addEventListener('click', function () { resetBench(); render(); });
      notice.appendChild(btn);
      panel.appendChild(notice);
    }

    var ctrls = controlBar(
      panel,
      state.benchSaved ? ('Version ' + state.benchSaved.version + ' · saved ' + formatTime(state.benchSaved.savedAt)) : 'Not saved yet — starting from sample data',
      function () {
        var benchAlert = document.getElementById('bench-alert');
        benchAlert.textContent = '';
        var ok = true;
        table.querySelectorAll('input.admin-cell-input').forEach(function (input) {
          if (!benchCell(input.value).ok) { ok = false; input.setAttribute('aria-invalid', 'true'); }
        });
        if (!ok) { benchAlert.textContent = 'Fix the cells marked above (whole numbers 0–5) before saving.'; return; }
        if (saveBench()) { render(); }
        else { benchAlert.textContent = "Couldn't save — this browser isn't allowing EduPath to write to storage (private window or blocked storage)."; }
      },
      function () { loadBench(); render(); },
      function () {
        if (!confirm('Replace all benchmarks with the current sample data and save a new version?')) return;
        resetBench(); render();
      },
      state.benchDirty
    );
    var benchAlert = el('p', 'form-alert is-error', '');
    benchAlert.id = 'bench-alert';
    benchAlert.setAttribute('role', 'alert');
    panel.appendChild(benchAlert);

    // Sample profile picker (preview only)
    var pickerWrap = el('div');
    var label = el('label', null, 'Sample profile');
    var select = el('select', 'admin-select');
    SAMPLE_PROFILES.forEach(function (p) {
      var o = el('option', null, p.label);
      o.value = p.key;
      if (p.key === state.previewProfile) o.selected = true;
      select.appendChild(o);
    });
    var hint = el('p');
    hint.textContent = 'Preview only — these ratings are sample data and are not saved.';
    pickerWrap.appendChild(label);
    pickerWrap.appendChild(select);
    pickerWrap.appendChild(hint);
    panel.appendChild(pickerWrap);

    // Grid: roles x skills, skills grouped under Technical / Soft when `kind` exists
    var wrap = el('div', 'admin-table-wrap');
    var table = el('table', 'admin-table');
    var groups = groupSkills();

    var thead = el('thead');
    var groupRow = el('tr');
    var thRole = el('th', 'role-head', 'Role');
    thRole.setAttribute('rowspan', '2');
    groupRow.appendChild(thRole);
    groups.forEach(function (g) {
      var th = el('th', null, g.label);
      th.setAttribute('colspan', g.skills.length);
      groupRow.appendChild(th);
    });
    thead.appendChild(groupRow);

    var skillRow = el('tr');
    skillRow.appendChild(el('th', 'role-head', 'Role'));
    groups.forEach(function (g) {
      g.skills.forEach(function (s) {
        var th = el('th', null, s.name);
        if (s.desc) th.setAttribute('title', s.desc);
        skillRow.appendChild(th);
      });
    });
    thead.appendChild(skillRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    ROLES.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('th', 'role-head', r.name));
      var row = state.bench.roles[r.id] || [];
      SKILLS.forEach(function (s, i) {
        var td = el('td');
        var input = el('input', 'admin-cell-input');
        input.type = 'text';
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('data-role', r.id);
        input.setAttribute('data-skill', i);
        input.value = row[i] || '';
        input.setAttribute('aria-label', 'Benchmark for ' + escapeHtml(s.name) + ' in role ' + escapeHtml(r.name) + ', 0 to 5');
        if (!benchCell(input.value).ok) input.setAttribute('aria-invalid', 'true');
        td.appendChild(input);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    panel.appendChild(wrap);

    // Live preview panel (recomputed as values change)
    var previewContainer = el('div', 'admin-preview-container');
    panel.appendChild(previewContainer);
    renderPreview(previewContainer);

    function benchInputHandler(e) {
      var input = e.target.closest('input.admin-cell-input');
      if (!input) return;
      var roleId = input.getAttribute('data-role');
      var i = Number(input.getAttribute('data-skill'));
      state.bench.roles[roleId][i] = input.value;
      if (benchCell(input.value).ok) input.removeAttribute('aria-invalid');
      else input.setAttribute('aria-invalid', 'true');
      state.benchDirty = true;
      refreshBenchControls(ctrls);
      renderPreview(previewContainer);
    }
    table.addEventListener('input', benchInputHandler);
    table.addEventListener('change', benchInputHandler);
    select.addEventListener('change', function () {
      state.previewProfile = select.value;
      renderPreview(previewContainer);
    });

    container.appendChild(panel);
  }

  function renderPreview(container) {
    container.innerHTML = '';
    var box = el('div', 'admin-preview');
    var h3 = el('h3', 'admin-panel-title', 'Live preview (sample data)');
    var note = el('p', 'admin-panel-lead', 'Computed from the draft benchmarks and the selected sample profile. Preview only — not saved.');
    box.appendChild(h3);
    box.appendChild(note);

    var data = computePreview();
    var list = el('div', 'admin-match-list');
    data.matches.forEach(function (m) {
      var item = el('div', 'admin-match' + (m.id === data.top.id ? ' is-top' : ''));
      item.appendChild(el('span', 'admin-match-name', m.name));
      item.appendChild(el('span', 'admin-match-value', m.match + '%'));
      if (m.id === data.top.id) {
        item.appendChild(el('span', 'admin-match-top', 'Top match'));
      }
      list.appendChild(item);
    });
    box.appendChild(list);

    var gaps = el('div', 'admin-gaps');
    var topLine = el('p');
    var strong = el('b');
    strong.textContent = 'Top role: ' + data.top.name + ' · ' + data.top.match + '% match';
    topLine.appendChild(strong);
    gaps.appendChild(topLine);

    var g = data.top.gaps.filter(function (x) { return x.gap > 0; });
    if (g.length) {
      g.forEach(function (x) {
        var row = el('div', 'admin-gap');
        var left = el('span');
        left.textContent = escapeHtml(x.name) + ' — you ' + x.you + ' · expects ' + x.role;
        row.appendChild(left);
        row.appendChild(el('span', 'admin-gap-value', 'gap ' + x.gap));
        gaps.appendChild(row);
      });
    } else {
      var p = el('p');
      p.textContent = 'No gaps: the sample meets this role\'s benchmark on every skill.';
      gaps.appendChild(p);
    }
    box.appendChild(gaps);
    container.appendChild(box);
  }

  function renderCatalog() {
    var container = document.getElementById('tab-catalog');
    container.innerHTML = '';
    var panel = el('section', 'admin-panel');

    var h2 = el('h2', 'admin-panel-title', 'Learning catalog');
    var lead = el('p', 'admin-panel-lead', 'Resources mapped to each skill: type, title, and optional provider and link. Keep at least one resource per skill so every gap has a next step. Sample catalog data.');
    panel.appendChild(h2);
    panel.appendChild(lead);
    panel.appendChild(el('span', 'admin-sample', 'SAMPLE'));

    if (state.catalogMismatch) {
      var notice = el('div', 'admin-notice admin-notice--warn');
      notice.textContent = 'Saved catalog was built for a different skill set and won\'t line up with the current model. ';
      var btn = el('button', 'btn btn-primary', 'Reset to current sample data');
      btn.type = 'button';
      btn.addEventListener('click', function () { resetCatalog(); render(); });
      notice.appendChild(btn);
      panel.appendChild(notice);
    }

    var emptySkills = SKILLS.filter(function (s) { return (state.catalog.skills[s.id] || []).length === 0; });
    if (emptySkills.length) {
      var notice = el('div', 'admin-notice admin-notice--warn');
      notice.textContent = emptySkills.length + ' of ' + SKILLS.length + ' skills have no resources yet — add at least one per skill.';
      panel.appendChild(notice);
    }

    var ctrls = controlBar(
      panel,
      state.catalogSaved ? ('Version ' + state.catalogSaved.version + ' · saved ' + formatTime(state.catalogSaved.savedAt)) : 'Not saved yet — starting from sample data',
      function () {
        var catalogAlert = document.getElementById('catalog-alert');
        catalogAlert.textContent = '';
        if (saveCatalog()) { render(); }
        else { catalogAlert.textContent = "Couldn't save — this browser isn't allowing EduPath to write to storage (private window or blocked storage)."; }
      },
      function () { loadCatalog(); render(); },
      function () {
        if (!confirm('Replace the catalog with the current sample data and save a new version?')) return;
        resetCatalog(); render();
      },
      state.catalogDirty
    );
    var catalogAlert = el('p', 'form-alert is-error', '');
    catalogAlert.id = 'catalog-alert';
    catalogAlert.setAttribute('role', 'alert');
    panel.appendChild(catalogAlert);

    var list = el('div');
    SKILLS.forEach(function (s) {
      var card = el('section', 'admin-skill-card');
      var head = el('div', 'admin-skill-head');
      head.appendChild(el('h3', null, s.name));
      head.appendChild(el('span', 'admin-chip', skillGroup(s)));
      card.appendChild(head);

      var rows = state.catalog.skills[s.id] || [];
      if (rows.length === 0) {
        card.appendChild(el('p', 'admin-empty-note', 'No resources yet — add at least one so gaps for this skill have a next step.'));
      }
      rows.forEach(function (c, i) {
        card.appendChild(renderResourceRow(s.id, i, c));
      });

      var add = el('button', 'btn btn-ghost admin-add-resource', 'Add resource');
      add.type = 'button';
      add.setAttribute('data-skill', s.id);
      card.appendChild(add);
      list.appendChild(card);
    });
    panel.appendChild(list);

    // Delegate on a fresh wrapper so listeners never accumulate across re-renders.
    var deck = el('div', 'admin-catalog-deck');
    deck.appendChild(panel);
    container.appendChild(deck);

    function catalogInputHandler(e) {
      var input = e.target.closest('.admin-input--sm, .admin-select');
      if (!input) return;
      catalogSetField(
        input.getAttribute('data-skill'),
        Number(input.getAttribute('data-index')),
        input.getAttribute('data-field'),
        input.value
      );
      ctrls.save.disabled = !state.catalogDirty;
      ctrls.discard.disabled = !state.catalogDirty;
    }
    deck.addEventListener('input', catalogInputHandler);
    deck.addEventListener('change', catalogInputHandler);
    deck.addEventListener('click', function (e) {
      var btn = e.target.closest('.admin-btn--sm, .admin-add-resource');
      if (!btn) return;
      if (btn.classList.contains('admin-add-resource')) {
        catalogAddRow(btn.getAttribute('data-skill'));
        renderCatalog();
        return;
      }
      if (btn.classList.contains('admin-remove-resource')) {
        catalogRemoveRow(btn.getAttribute('data-skill'), Number(btn.getAttribute('data-index')));
        renderCatalog();
        return;
      }
    });
  }

  function renderResourceRow(skillId, index, c) {
    var types = catalogTypeOptions();
    var row = el('div', 'admin-resource-row');

    var sel = el('select', 'admin-select');
    sel.setAttribute('data-skill', skillId);
    sel.setAttribute('data-index', index);
    sel.setAttribute('data-field', 'type');
    types.forEach(function (t) {
      var o = el('option', null, t);
      o.value = t;
      if (t === c.type) o.selected = true;
      sel.appendChild(o);
    });

    var title = el('input', 'admin-input--sm');
    title.placeholder = 'Title';
    title.setAttribute('data-skill', skillId);
    title.setAttribute('data-index', index);
    title.setAttribute('data-field', 'title');
    title.value = c.title;

    var provider = el('input', 'admin-input--sm');
    provider.placeholder = 'Provider (optional)';
    provider.setAttribute('data-skill', skillId);
    provider.setAttribute('data-index', index);
    provider.setAttribute('data-field', 'provider');
    provider.value = c.provider;

    var link = el('input', 'admin-input--sm');
    link.placeholder = 'Link (optional)';
    link.setAttribute('data-skill', skillId);
    link.setAttribute('data-index', index);
    link.setAttribute('data-field', 'link');
    link.value = c.link;

    var rm = el('button', 'admin-btn--sm admin-remove-resource', 'Remove');
    rm.type = 'button';
    rm.setAttribute('data-skill', skillId);
    rm.setAttribute('data-index', index);

    row.appendChild(sel);
    row.appendChild(title);
    row.appendChild(provider);
    row.appendChild(link);
    row.appendChild(rm);
    return row;
  }

  /* ---------------- skill-gap summary (aggregates only) ---------------- */

  function readResults() {
    var raw = readLocal(KEYS.results, null);
    var out = [];
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (uid) {
      var r = raw[uid];
      if (!r || typeof r !== 'object') return;
      // Tolerate old/new shapes: ratings may be at top level or under profile.
      var ratings = r.ratings || (r.profile && r.profile.ratings) || null;
      if (!ratings || typeof ratings !== 'object') return; // skip unreadable
      var program = r.program || (r.profile && r.profile.program) || '';
      var year = r.yearLevel || (r.profile && r.profile.yearLevel) || '';
      out.push({ ratings: ratings, program: String(program), year: String(year) });
    });
    return out;
  }

  function uniqueOrdered(values) {
    var seen = {};
    var out = [];
    values.forEach(function (v) {
      if (v === '' || seen[v]) return;
      seen[v] = true;
      out.push(v);
    });
    return out;
  }

  // Current benchmarks: saved admin data if present, otherwise the model's samples.
  function benchNumbers() {
    var roles = {};
    ROLES.forEach(function (r) {
      var src = (state.benchSaved && state.bench.roles[r.id]) || BENCH_MODEL[r.id] || [];
      roles[r.id] = CURRENT_SKILL_IDS.map(function (_, i) {
        var c = benchCell(i < src.length ? String(src[i]) : '');
        return c.ok ? c.v : 0;
      });
    });
    return roles;
  }

  function computeSummary(results, programFilter, yearFilter) {
    var filtered = results.filter(function (r) {
      return (programFilter === undefined || programFilter === '' || r.program === programFilter) &&
             (yearFilter === undefined || yearFilter === '' || r.year === yearFilter);
    });
    var roles = benchNumbers();
    var roleCounts = {};
    ROLES.forEach(function (r) { roleCounts[r.id] = 0; });
    var gapSums = {};
    SKILLS.forEach(function (s) { gapSums[s.id] = 0; });

    filtered.forEach(function (res) {
      var you = SKILLS.map(function (s) {
        var c = benchCell(res.ratings[s.id]);
        return c.ok ? c.v : 0;
      });
      var bestId = null;
      var bestM = -1;
      ROLES.forEach(function (r) {
        var m = cosine(you, roles[r.id] || []);
        if (m > bestM) { bestM = m; bestId = r.id; }
      });
      if (bestId == null && ROLES.length) bestId = ROLES[0].id;
      roleCounts[bestId] = (roleCounts[bestId] || 0) + 1;

      var b = roles[bestId] || [];
      SKILLS.forEach(function (s, i) {
        gapSums[s.id] += Math.max(0, (b[i] || 0) - you[i]);
      });
    });

    return {
      count: filtered.length,
      roleCounts: roleCounts,
      skillAvg: SKILLS.map(function (s) {
        return { id: s.id, name: s.name, group: skillGroup(s), avg: gapSums[s.id] / filtered.length };
      })
    };
  }

  function renderSummary() {
    var container = document.getElementById('tab-summary');
    container.innerHTML = '';
    var panel = el('section', 'admin-panel');

    var h2 = el('h2', 'admin-panel-title', 'Skill-gap summary');
    var lead = el('p', 'admin-panel-lead', 'Aggregate view only: number of assessments, distribution of predicted roles, and average gap per skill. Names, emails, and individual results are never shown. Demo mode: only assessments stored in this browser are visible.');
    panel.appendChild(h2);
    panel.appendChild(lead);

    var results = readResults();
    var filters = el('div', 'admin-filters');

    var programLabel = el('label', null, 'Program');
    var programSel = el('select');
    var allProg = el('option', null, 'All programs');
    allProg.value = '';
    programSel.appendChild(allProg);
    uniqueOrdered(results.map(function (r) { return r.program; })).forEach(function (p) {
      var o = el('option', null, p);
      o.value = p;
      programSel.appendChild(o);
    });

    var yearLabel = el('label', null, 'Year level');
    var yearSel = el('select');
    var allYear = el('option', null, 'All years');
    allYear.value = '';
    yearSel.appendChild(allYear);
    uniqueOrdered(results.map(function (r) { return r.year; })).forEach(function (y) {
      var o = el('option', null, y);
      o.value = y;
      yearSel.appendChild(o);
    });

    filters.appendChild(programLabel);
    filters.appendChild(programSel);
    filters.appendChild(yearLabel);
    filters.appendChild(yearSel);
    panel.appendChild(filters);

    var stat = el('div', 'admin-stat');
    var item = el('div', 'admin-stat-item');
    item.appendChild(el('div', 'admin-stat-value', String(results.length)));
    item.appendChild(el('div', 'admin-stat-label', 'Assessments in this browser'));
    stat.appendChild(item);
    panel.appendChild(stat);

    if (results.length === 0) {
      var empty = el('div', 'admin-empty');
      empty.appendChild(el('h2', null, 'No assessments yet'));
      empty.appendChild(el('p', 'admin-panel-lead', 'Students take the assessment on the student side; results land in edupath.results in this browser. Summary appears here once there are results to aggregate.'));
      panel.appendChild(empty);
      container.appendChild(panel);
      return;
    }

    function redraw() {
      var summary = computeSummary(results, programSel.value, yearSel.value);
      if (summary.count === 0) {
        var old = panel.querySelector('.admin-summary-blocks');
        if (old) panel.removeChild(old);
        var empty = el('div', 'admin-empty');
        empty.appendChild(el('h2', null, 'No assessments match these filters'));
        panel.appendChild(empty);
        return;
      }

      var hidden = ROLES.filter(function (r) {
        var c = summary.roleCounts[r.id] || 0;
        return c > 0 && c < 5;
      });
      if (hidden.length) {
        var notice = el('div', 'admin-notice admin-notice--warn');
        notice.textContent = 'Roles with fewer than 5 students are hidden: ' +
          hidden.map(function (r) { return roleById(r.id).name; }).join(', ') + '.';
        panel.appendChild(notice);
      }

      // Predicted role distribution
      var distWrap = el('div');
      distWrap.appendChild(el('h3', null, 'Predicted role distribution'));
      var dist = el('table', 'admin-table');
      var thead = el('thead');
      var tr = el('tr');
      tr.appendChild(el('th', null, 'Role'));
      tr.appendChild(el('th', null, 'Students'));
      tr.appendChild(el('th', null, 'Share'));
      thead.appendChild(tr);
      dist.appendChild(thead);
      var tbody = el('tbody');
      var listed = ROLES.filter(function (r) {
        var c = summary.roleCounts[r.id] || 0;
        return c > 0 && c >= 5;
      });
      listed.sort(function (a, b) { return (summary.roleCounts[b.id] || 0) - (summary.roleCounts[a.id] || 0); });
      if (listed.length === 0) {
        var row = el('tr');
        var cell = el('td', null, 'No role reaches the 5-student minimum with these filters.');
        cell.setAttribute('colspan', '3');
        row.appendChild(cell);
        tbody.appendChild(row);
      } else {
        listed.forEach(function (r) {
          var c = summary.roleCounts[r.id] || 0;
          var row = el('tr');
          row.appendChild(el('td', null, roleById(r.id).name));
          row.appendChild(el('td', null, String(c)));
          row.appendChild(el('td', null, Math.round(c / summary.count * 100) + '%'));
          tbody.appendChild(row);
        });
      }
      dist.appendChild(tbody);
      distWrap.appendChild(dist);

      // Average gap per skill
      var gapWrap = el('div');
      gapWrap.appendChild(el('h3', null, 'Average gap per skill'));
      var gapTable = el('table', 'admin-table');
      var gthead = el('thead');
      var gtr = el('tr');
      gtr.appendChild(el('th', null, 'Skill'));
      gtr.appendChild(el('th', null, 'Group'));
      gtr.appendChild(el('th', null, 'Avg gap'));
      gthead.appendChild(gtr);
      gapTable.appendChild(gthead);
      var gtbody = el('tbody');
      var skillsAvg = summary.skillAvg.slice().sort(function (a, b) { return b.avg - a.avg; });
      skillsAvg.forEach(function (s) {
        var row = el('tr');
        row.appendChild(el('td', null, s.name));
        row.appendChild(el('td', null, s.group));
        row.appendChild(el('td', null, (s.avg || 0).toFixed(1)));
        gtbody.appendChild(row);
      });
      gapTable.appendChild(gtbody);
      gapWrap.appendChild(gapTable);

      var old = panel.querySelector('.admin-summary-blocks');
      if (old) panel.removeChild(old);
      var blocks = el('div', 'admin-summary-blocks');
      blocks.appendChild(distWrap);
      blocks.appendChild(gapWrap);
      panel.appendChild(blocks);
    }

    redraw();

    programSel.addEventListener('change', redraw);
    yearSel.addEventListener('change', redraw);

    container.appendChild(panel);
  }

  /* ---------------- shell ---------------- */

  function renderDashboard() {
    var dashboard = document.getElementById('admin-dashboard');
    var tabs = dashboard.querySelector('[role="tablist"]');
    var panels = dashboard.querySelector('.admin-tabpanels');

    if (!tabs.dataset.tabBound) {
      tabs.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (!tab) return;
        state.activeTab = tab.getAttribute('data-tab');
        renderDashboard();
      });
      tabs.dataset.tabBound = '1';
    }

    Array.from(tabs.querySelectorAll('[role="tab"]')).forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === state.activeTab;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.className = active ? 'btn btn-ghost' : '';
    });
    Array.from(panels.querySelectorAll('[role="tabpanel"]')).forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-tabpanel') !== state.activeTab;
    });

    if (state.activeTab === 'bench') renderBench();
    else if (state.activeTab === 'catalog') renderCatalog();
    else if (state.activeTab === 'summary') renderSummary();
  }

  function render() {
    var gate = document.getElementById('admin-gate');
    var dashboard = document.getElementById('admin-dashboard');
    var signout = document.querySelector('[data-admin-signout]');

    if (!state.signedIn) {
      gate.hidden = false;
      dashboard.hidden = true;
      if (signout) signout.hidden = true;
      renderGate(gate);
      return;
    }

    gate.hidden = true;
    dashboard.hidden = false;
    if (signout) {
      signout.hidden = false;
      signout.textContent = 'Sign Out';
    }
    renderDashboard();
  }

  /* ---------------- bindings & boot ---------------- */

  function bindSignOut() {
    var signout = document.querySelector('[data-admin-signout]');
    if (signout) {
      signout.addEventListener('click', function () {
        clearSession();
        state.signedIn = false;
        render();
      });
    }
  }

  function boot() {
    state.signedIn = !!readSession();
    loadBench();
    loadCatalog();
    render();
    bindSignOut();
  }

  boot();
})();
