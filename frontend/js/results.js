/* Results: best-fit role, match, ranking, why, skill gaps, and the learning pathway. */
(async function () {
  'use strict';
  var api = window.EduPath.api, M = window.EduPath.model;
  var user = await api.requireUser();
  if (!user) return;

  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var icon = function (name) { var i = el('i', 'ph-light ' + name); i.setAttribute('aria-hidden', 'true'); return i; };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelector('[data-who]').textContent = user.name;
  document.querySelector('[data-signout]').addEventListener('click', async function () { await api.logout(); location.href = 'index.html'; });

  var root = document.querySelector('[data-results]');
  var res = await api.latestResults();
  root.innerHTML = '';

  // ---------- Empty state ----------
  if (!res) {
    var empty = el('section', 'plate empty rise');
    var c = el('div', 'cast'); c.style.margin = '0 auto 10px'; c.style.width = 'min(70%,320px)';
    var img = new Image(); img.src = 'assets/roles/frontend.svg'; img.alt = ''; img.className = 'is-on'; c.appendChild(img);
    var a = el('a', 'btn btn-primary has-isle', 'Start the Assessment '); a.href = 'assessment.html';
    var isle = el('span', 'isle'); isle.appendChild(icon('ph-arrow-right')); a.appendChild(isle);
    empty.append(c, el('h1', null, 'No results yet'), el('p', null, 'Take the five-minute skill assessment to see which roles fit you and what to learn next.'), a);
    root.appendChild(empty);
    return;
  }

  var top = M.roleById(res.topRole);
  var topMatch = res.matches[0].match;
  var date = new Date(res.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  // ---------- Hero: best fit ----------
  var hero = el('section', 'field result-hero rise');
  ['o1', 'o2', 'o3'].forEach(function (o) { var s = el('span', 'orb ' + o); s.setAttribute('aria-hidden', 'true'); hero.appendChild(s); });
  var left = el('div');
  var tag = el('span', 'sample-tag'); tag.append(icon('ph-flask'), document.createTextNode('Sample benchmarks'));
  left.append(tag, el('p', 'k', 'Your best fit, ' + date), el('h1', null, top.name), el('p', null, top.desc));
  var m = el('div', 'match'); var num = el('span', null, String(topMatch)); m.append(num, el('sup', null, '%'));
  m.setAttribute('aria-label', topMatch + ' percent match');
  left.append(m, el('p', 'match-cap', 'Direction match with this role\'s benchmark (Cosine Similarity)'));
  var cast = el('div', 'cast'); var art = new Image(); art.src = top.art; art.alt = 'Illustration of a ' + top.name.toLowerCase(); art.className = 'is-on'; cast.appendChild(art);
  hero.append(left, cast);
  root.appendChild(hero);

  // Count the match up once
  if (!reduce) {
    var start = null;
    requestAnimationFrame(function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1300);
      num.textContent = String(Math.round(topMatch * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  // ---------- Ranking + why ----------
  var row1 = el('div', 'grid-2');
  var rank = el('section', 'plate card rise r2');
  rank.append(el('h2', null, 'All six roles'), el('p', 'sub', 'Ranked by how closely your skills match each benchmark.'));
  var ol = el('ol', 'rank');
  res.matches.forEach(function (mm) {
    var r = M.roleById(mm.role), li = el('li');
    var ic = el('span', 'ic'); ic.appendChild(icon(r.icon));
    var bar = el('span', 'bar'); bar.setAttribute('aria-hidden', 'true');
    li.append(ic, el('span', 'nm', r.name), el('span', 'pc', mm.match + '%'), bar);
    ol.appendChild(li);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.setProperty('--w', (mm.match / 100).toFixed(3)); }); });
  });
  rank.appendChild(ol);

  var why = el('section', 'plate card rise r3');
  why.append(el('h2', null, 'Why ' + top.name + '?'), el('p', 'sub', 'The skills that raised your match, and the ones holding it back.'));
  var ul = el('ul', 'why');
  function pips(s) {
    var d = el('div', 'pips'); d.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= 5; i++) { var p = el('i'); if (i <= s.you) p.className = 'on'; else if (i <= s.role) p.className = 'need'; d.appendChild(p); }
    d.appendChild(el('span', null, 'You ' + s.you + ', role ' + s.role));
    return d;
  }
  res.raised.forEach(function (s) { var li = el('li'); li.append(el('span', 'nm', s.name), el('span', 'tag up', 'Raised your match'), pips(s)); ul.appendChild(li); });
  res.heldBack.forEach(function (s) { var li = el('li'); li.append(el('span', 'nm', s.name), el('span', 'tag down', s.gap + (s.gap === 1 ? ' pt short' : ' pts short')), pips(s)); ul.appendChild(li); });
  if (!res.raised.length && !res.heldBack.length) ul.appendChild(el('li', null, 'Your ratings line up evenly with this role.'));
  why.appendChild(ul);
  row1.append(rank, why);
  root.appendChild(row1);

  // ---------- Gaps + pathway ----------
  var row2 = el('div', 'grid-2');
  var gaps = el('section', 'plate card rise r3');
  gaps.append(el('h2', null, 'Skill gap report'), el('p', 'sub', 'Every skill where you are below the ' + top.name + ' benchmark.'));
  if (res.gaps.length) {
    var gl = el('ul', 'why');
    res.gaps.forEach(function (s) { var li = el('li'); li.append(el('span', 'nm', s.name), el('span', 'tag down', s.gap + (s.gap === 1 ? ' pt short' : ' pts short')), pips(s)); gl.appendChild(li); });
    gaps.appendChild(gl);
  } else {
    gaps.appendChild(el('p', null, 'No gaps: you meet or exceed every skill this role\'s benchmark asks for.'));
  }

  var path = el('section', 'plate card rise r4');
  path.append(el('h2', null, 'Your learning pathway'), el('p', 'sub', 'What to take next, gap by gap. Sample catalog: course names are placeholders.'));
  if (res.pathway.length) {
    var bySkill = {};
    res.pathway.forEach(function (p) { (bySkill[p.skill] = bySkill[p.skill] || { name: p.skillName, gap: p.gap, items: [] }).items.push(p); });
    var pl = el('ol', 'path-list');
    Object.keys(bySkill).forEach(function (k) {
      var g = bySkill[k], li = el('li'); li.appendChild(el('i'));
      var head = el('p', 'path-head', g.name + ' '); head.appendChild(el('span', null, '(' + g.gap + (g.gap === 1 ? ' pt' : ' pts') + ' to close)'));
      var items = el('div', 'path-item');
      g.items.forEach(function (it) { var d = el('div'); d.append(el('small', null, it.type), el('b', null, it.title)); items.appendChild(d); });
      li.append(head, items); pl.appendChild(li);
    });
    path.appendChild(pl);
  } else {
    path.appendChild(el('p', null, res.gaps.length ? 'You already hold the recommended credentials for your gaps.' : 'Nothing to close for this role. Explore your next-best match above.'));
  }
  if (res.skipped && res.skipped.length) {
    path.appendChild(el('p', 'sub', 'Skipped because you already hold them: ' + res.skipped.map(function (s) { return s.title; }).join(', ') + '.'));
  }
  row2.append(gaps, path);
  root.appendChild(row2);

  // ---------- Note ----------
  root.appendChild(el('p', 'note', 'These results are guidance for planning your studies, not a job offer or placement guarantee. ' + res.method));
})();
