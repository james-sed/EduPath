/* Learning pathway: the route from today's skills to the best-fit role's benchmark.
   One stop per gap, biggest first; each stop names the JRU subject and microcredential that close it. */
(async function () {
  'use strict';
  var EP = window.EduPath, api = EP.api, M = EP.model;
  var user = await api.requireUser();
  if (!user) return;

  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var icon = function (name) { var i = el('i', 'ph-light ' + name); i.setAttribute('aria-hidden', 'true'); return i; };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  document.querySelector('[data-who]').textContent = user.name;
  document.querySelector('[data-signout]').addEventListener('click', async function () { await api.logout(); location.href = 'index.html'; });

  var root = document.querySelector('[data-pathway]');
  var res = await api.latestResults();
  root.innerHTML = '';

  function btn(tag, cls, label, iconName) {
    var b = el(tag, 'btn ' + cls, label + ' ');
    if (iconName) { var isle = el('span', 'isle'); isle.appendChild(icon(iconName)); b.appendChild(isle); }
    return b;
  }

  if (!res) {
    var empty = el('section', 'plate empty rise');
    var a = btn('a', 'btn-primary has-isle', 'Start the Assessment', 'ph-arrow-right'); a.href = 'assessment.html';
    empty.append(el('h1', null, 'No pathway yet'), el('p', null, 'Your pathway is built from your assessment. Take it first, then come back here.'), a);
    root.appendChild(empty);
    return;
  }

  var top = M.roleById(res.topRole);

  // ---------- Head ----------
  var back = el('a', 'back'); back.href = 'results.html#summary'; back.append(icon('ph-arrow-left'), document.createTextNode('Back to your results'));
  root.appendChild(back);
  var head = el('section', 'field path-head-field rise');
  ['o1', 'o2', 'o3'].forEach(function (o) { var s = el('span', 'orb ' + o); s.setAttribute('aria-hidden', 'true'); head.appendChild(s); });
  var txt = el('div');
  var tag = el('span', 'sample-tag'); tag.append(icon('ph-flask'), document.createTextNode('Sample catalog'));
  txt.append(tag, el('h1', null, 'Your learning pathway to ' + top.name + '.'),
    el('p', null, res.gaps.length
      ? (res.gaps.length === 1 ? 'One gap to close.' : 'Close these ' + res.gaps.length + ' gaps in order, biggest first.') + ' Subject and microcredential names are placeholders until the real catalog is connected.'
      : 'You meet every skill the ' + top.name + ' benchmark asks for, so there is nothing to close right now.'));
  var cast = el('div', 'cast'); var art = new Image(); art.src = top.art; art.alt = ''; art.className = 'is-on'; cast.appendChild(art);
  head.append(txt, cast);
  root.appendChild(head);

  // ---------- The route ----------
  var bySkill = {}, order = [];
  res.pathway.forEach(function (p) {
    if (!bySkill[p.skill]) { bySkill[p.skill] = { name: p.skillName, gap: p.gap, items: [] }; order.push(p.skill); }
    bySkill[p.skill].items.push(p);
  });
  // Gaps whose every item is already held still show, so the route matches the gap report
  res.gaps.forEach(function (g) { if (!bySkill[g.id]) { bySkill[g.id] = { name: g.name, gap: g.gap, items: [] }; order.push(g.id); } });
  var skillById = {}; res.skills.forEach(function (s) { skillById[s.id] = s; });

  var route = el('ol', 'route');
  order.forEach(function (id, i) {
    var g = bySkill[id], s = skillById[id], li = el('li', 'reveal');
    var stop = el('span', 'stop', String(i + 1)); stop.setAttribute('aria-hidden', 'true');
    var line = el('div', 'gapline');
    line.appendChild(el('span', 'tag', plural(g.gap, 'level', 'levels') + ' to close'));
    if (s) {
      var pp = el('div', 'pips'); pp.setAttribute('aria-hidden', 'true');
      for (var k = 1; k <= 5; k++) { var p = el('i'); if (k <= s.you) p.className = 'on'; else if (k <= s.role) p.className = 'need'; pp.appendChild(p); }
      pp.appendChild(el('span', null, 'You ' + s.you + ', role ' + s.role));
      line.appendChild(pp);
    }
    li.append(stop, el('h2', null, g.name), line);
    if (g.items.length) {
      var takes = el('div', 'takes');
      g.items.forEach(function (it) {
        var t = el('div', 'take'), sm = el('small');
        sm.append(icon(/micro/i.test(it.type) ? 'ph-seal-check' : 'ph-graduation-cap'), document.createTextNode(it.type));
        t.append(sm, el('b', null, it.title)); takes.appendChild(t);
      });
      li.appendChild(takes);
    } else {
      li.appendChild(el('p', null, 'You already hold the recommended credential for this skill.'));
    }
    route.appendChild(li);
  });

  var end = el('li', 'end reveal');
  var flag = el('span', 'stop'); flag.setAttribute('aria-hidden', 'true'); flag.appendChild(icon('ph-flag-pennant'));
  var retake = btn('a', 'btn-primary has-isle', 'Retake the Assessment', 'ph-arrow-right'); retake.href = 'assessment.html';
  end.append(flag, el('h2', null, order.length ? 'Then, retake the assessment' : 'Keep growing'),
    el('p', null, order.length
      ? 'After you finish a subject or microcredential, update your ratings to see your match move.'
      : 'Your next-best roles may still have gaps worth closing. Retake the assessment as your skills change.'),
    retake);
  route.appendChild(end);
  root.appendChild(route);

  if (res.skipped && res.skipped.length) {
    root.appendChild(el('p', 'skipped reveal', 'Left out because you already hold them: ' + res.skipped.map(function (s) { return s.title; }).join(', ') + '.'));
  }
  root.appendChild(el('p', 'note reveal', 'This pathway is guidance for planning your studies, not a placement guarantee. Course and microcredential names come from a sample catalog.'));

  if (EP.reveal) EP.reveal(root.querySelectorAll('.reveal')); else root.querySelectorAll('.reveal').forEach(function (n) { n.classList.add('in'); });
})();
