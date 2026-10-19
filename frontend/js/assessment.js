/* Skill assessment: interests, four skill groups rated 0 to 5, credentials already held,
   then a review and submit. Answers autosave so a refresh never loses progress. */
(async function () {
  'use strict';
  var api = window.EduPath.api, M = window.EduPath.model;
  var user = await api.requireUser();
  if (!user) return;

  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var $ = function (s) { return document.querySelector(s); };

  document.querySelector('[data-who]').textContent = user.name;
  document.querySelector('[data-signout]').addEventListener('click', async function () { await api.logout(); location.href = 'index.html'; });

  // ---------- Steps ----------
  var STEPS = [{ id: 'interests', label: 'Interests', role: 'frontend', side: 'Curious about a role?', text: 'Picking one is optional. EduPath still compares you with all six.' }]
    .concat(M.GROUPS.map(function (g) { return { id: g.id, label: g.name, role: g.role, group: g, side: g.name, text: g.blurb }; }))
    .concat([
      { id: 'held', label: 'Credentials', role: 'backend', side: 'Already certified?', text: "Anything you already hold won't be recommended again." },
      { id: 'review', label: 'Review', role: 'qa', side: 'Almost there', text: 'Check your answers, then see your matches.' }
    ]);

  var draft = api.loadDraft() || { step: 0, ratings: {}, interests: [], held: [] };
  var current = Math.min(draft.step || 0, STEPS.length - 1);

  // ---------- Road ----------
  var road = $('[data-road]'), fill = $('[data-road-fill]');
  STEPS.forEach(function (s) { var li = el('li'); li.append(el('i'), document.createTextNode(s.label)); road.appendChild(li); });

  // ---------- Panels ----------
  var panels = $('[data-panels]');
  STEPS.forEach(function (s, idx) {
    var p = el('section', 'panel'); p.dataset.step = s.id;
    p.setAttribute('aria-labelledby', 'h-' + s.id);
    var h = el('h1', null); h.id = 'h-' + s.id; p.appendChild(h);

    if (s.id === 'interests') {
      h.textContent = 'Hi ' + user.name.split(' ')[0] + ', which roles interest you?';
      p.appendChild(el('p', 'lead', 'Pick up to two, or skip this step. Your results will still rank all six roles.'));
      var pick = el('div', 'pick'); pick.setAttribute('role', 'group'); pick.setAttribute('aria-label', 'Roles that interest you');
      M.ROLES.forEach(function (r) {
        var lab = el('label'), inp = el('input'); inp.type = 'checkbox'; inp.name = 'interest'; inp.value = r.id;
        inp.checked = draft.interests.indexOf(r.id) >= 0;
        var sp = el('span'); var ic = el('i', 'ph-light ' + r.icon); ic.setAttribute('aria-hidden', 'true'); sp.append(ic, document.createTextNode(r.name));
        lab.append(inp, sp); pick.appendChild(lab);
      });
      p.appendChild(pick);
    } else if (s.group) {
      h.textContent = s.group.name;
      p.appendChild(el('p', 'lead', 'Rate yourself honestly from 0 to 5. There are no wrong answers: this is about where you are today.'));
      M.SKILLS.filter(function (k) { return k.group === s.group.id; }).forEach(function (k) {
        var row = el('div', 'skill');
        var head = el('div', 'skill-head'); head.append(el('b', null, k.name), el('span', null, ''));
        head.lastChild.dataset.levelFor = k.id;
        row.append(head, el('p', 'skill-desc', k.desc));
        var fs = el('fieldset', 'scale'); fs.dataset.skill = k.id;
        var lg = el('legend', 'sr-only', 'Your level in ' + k.name); fs.appendChild(lg);
        M.LEVELS.forEach(function (L) {
          var lab = el('label'), inp = el('input'); inp.type = 'radio'; inp.name = 'r-' + k.id; inp.value = String(L.v);
          inp.checked = draft.ratings[k.id] === L.v;
          var sp = el('span'); sp.append(el('b', null, String(L.v)), el('small', null, L.label));
          lab.title = L.hint; lab.append(inp, sp); fs.appendChild(lab);
        });
        row.appendChild(fs); p.appendChild(row);
      });
    } else if (s.id === 'held') {
      h.textContent = 'Do you already hold any of these?';
      p.appendChild(el('p', 'lead', 'Optional. Tick any microcredential you have finished so your pathway skips it. Sample list: names are placeholders.'));
      var pk = el('div', 'pick'); pk.setAttribute('role', 'group'); pk.setAttribute('aria-label', 'Microcredentials you hold');
      M.CREDENTIALS.forEach(function (c) {
        var lab = el('label'), inp = el('input'); inp.type = 'checkbox'; inp.name = 'held'; inp.value = c; inp.checked = draft.held.indexOf(c) >= 0;
        var sp = el('span'); var ic = el('i', 'ph-light ph-seal-check'); ic.setAttribute('aria-hidden', 'true'); sp.append(ic, document.createTextNode(c));
        lab.append(inp, sp); pk.appendChild(lab);
      });
      p.appendChild(pk);
    } else if (s.id === 'review') {
      h.textContent = 'Review your answers';
      p.appendChild(el('p', 'lead', 'Go back to change anything. When it looks right, see your matches.'));
      p.appendChild(el('div', 'review'));
    }
    panels.appendChild(p);
  });

  // ---------- State ----------
  var form = $('[data-assess]'), alertBox = $('[data-alert]'), announce = $('[data-announce]');
  var back = $('[data-back]'), next = $('[data-next]');
  var cast = document.querySelector('[data-cast]');

  function levelLabel(v) { return M.LEVELS[v] ? M.LEVELS[v].label : ''; }
  function syncLabels() {
    document.querySelectorAll('[data-level-for]').forEach(function (n) {
      var v = draft.ratings[n.dataset.levelFor]; n.textContent = v == null ? 'Not rated' : v + ', ' + levelLabel(v);
    });
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name && t.name.indexOf('r-') === 0) {
      draft.ratings[t.name.slice(2)] = Number(t.value);
      var fs = t.closest('.scale'); if (fs) fs.classList.remove('is-missing');
    } else if (t.name === 'interest') {
      var chosen = Array.prototype.slice.call(form.querySelectorAll('input[name="interest"]:checked')).map(function (i) { return i.value; });
      if (chosen.length > 2) { t.checked = false; showAlert('Pick up to two roles.'); return; }
      draft.interests = chosen;
    } else if (t.name === 'held') {
      draft.held = Array.prototype.slice.call(form.querySelectorAll('input[name="held"]:checked')).map(function (i) { return i.value; });
    }
    showAlert('');
    syncLabels();
    api.saveDraft(Object.assign({}, draft, { step: current }));
  });

  function showAlert(msg) { alertBox.textContent = msg; alertBox.className = 'form-alert' + (msg ? ' is-error' : ''); }

  function buildReview() {
    var box = form.querySelector('.review'); box.innerHTML = '';
    M.GROUPS.forEach(function (g) {
      var sec = el('div', 'review-group'); sec.appendChild(el('h3', null, g.name));
      M.SKILLS.filter(function (k) { return k.group === g.id; }).forEach(function (k) {
        var row = el('div', 'review-row'); var v = draft.ratings[k.id];
        row.append(el('span', null, k.name), el('b', null, v + ' · ' + levelLabel(v)));
        sec.appendChild(row);
      });
      box.appendChild(sec);
    });
    var extra = el('div', 'review-group'); extra.appendChild(el('h3', null, 'Interests and credentials'));
    var ir = el('div', 'review-row'); ir.append(el('span', null, 'Roles you picked'), el('b', null, draft.interests.length ? draft.interests.map(function (id) { return M.roleById(id).name; }).join(', ') : 'None'));
    var hr = el('div', 'review-row'); hr.append(el('span', null, 'Microcredentials held'), el('b', null, draft.held.length ? String(draft.held.length) : 'None'));
    extra.append(ir, hr); box.appendChild(extra);
  }

  function go(n, focus) {
    current = n;
    var s = STEPS[n];
    form.querySelectorAll('.panel').forEach(function (p, k) { p.classList.toggle('is-on', k === n); });
    road.querySelectorAll('li').forEach(function (li, k) {
      li.classList.toggle('done', k < n); li.classList.toggle('now', k === n);
      if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    fill.style.transform = 'scaleX(' + (n / (STEPS.length - 1)) + ')';
    back.style.visibility = n === 0 ? 'hidden' : 'visible';
    next.firstChild.nodeValue = n === STEPS.length - 1 ? 'See My Matches ' : (s.id === 'interests' && !draft.interests.length ? 'Skip for Now ' : 'Continue ');
    if (cast && cast.show) cast.show(s.role);
    $('[data-side-title]').textContent = s.side;
    $('[data-side-text]').textContent = s.text;
    if (s.id === 'review') buildReview();
    announce.textContent = 'Step ' + (n + 1) + ' of ' + STEPS.length + ': ' + s.label;
    showAlert('');
    api.saveDraft(Object.assign({}, draft, { step: n }));
    if (focus) { var h = form.querySelector('.panel.is-on h1'); h.tabIndex = -1; h.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function missingIn(step) {
    if (!step.group) return [];
    return M.SKILLS.filter(function (k) { return k.group === step.group.id && draft.ratings[k.id] == null; });
  }

  next.addEventListener('click', async function () {
    var s = STEPS[current];
    var miss = missingIn(s);
    if (miss.length) {
      miss.forEach(function (k) { form.querySelector('.scale[data-skill="' + k.id + '"]').classList.add('is-missing'); });
      showAlert('Rate every skill on this step to continue (' + miss.length + ' left).');
      form.querySelector('.scale.is-missing input').focus();
      return;
    }
    if (current < STEPS.length - 1) { go(current + 1, true); return; }

    // Submit
    var allMissing = M.SKILLS.filter(function (k) { return draft.ratings[k.id] == null; });
    if (allMissing.length) { showAlert('Some skills are still unrated. Go back and rate them first.'); return; }
    next.disabled = true; back.disabled = true; next.setAttribute('aria-busy', 'true');
    var on = form.querySelector('.panel.is-on');
    on.innerHTML = '';
    var sc = el('div', 'scoring'); var dots = el('div', 'dots'); dots.append(el('i'), el('i'), el('i'));
    sc.append(dots, el('h1', null, 'Matching you to six roles'), el('p', 'lead', 'Comparing your ratings with each role\'s benchmark.'));
    on.appendChild(sc);
    announce.textContent = 'Scoring your assessment';
    try {
      await api.submitAssessment({ ratings: draft.ratings, interests: draft.interests, held: draft.held });
      location.href = 'results.html';
    } catch (err) {
      next.disabled = false; back.disabled = false; next.removeAttribute('aria-busy');
      go(STEPS.length - 1); showAlert(err.message);
    }
  });
  back.addEventListener('click', function () { if (current > 0) go(current - 1, true); });

  syncLabels();
  go(current);
})();
