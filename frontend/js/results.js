/* Results. First visit for a result: a short story, one idea per screen (best fit, match, runners-up,
   strengths, gaps). Then the summary: the whole picture on one page with a call to the learning pathway,
   which lives on its own page (pathway.html). Returning visitors land on the summary and can replay. */
(async function () {
  'use strict';
  var EP = window.EduPath, api = EP.api, M = EP.model;
  var user = await api.requireUser();
  if (!user) return;

  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var icon = function (name) { var i = el('i', 'ph-light ' + name); i.setAttribute('aria-hidden', 'true'); return i; };
  var img = function (src, cls) { var i = new Image(); i.src = src; i.alt = ''; if (cls) i.className = cls; return i; };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  document.querySelector('[data-who]').textContent = user.name;
  document.querySelector('[data-signout]').addEventListener('click', async function () { await api.logout(); location.href = 'index.html'; });

  var root = document.querySelector('[data-results]');
  var res = await api.latestResults();
  root.innerHTML = '';

  function field(tag, cls) {
    var f = el(tag, 'field ' + cls);
    ['o1', 'o2', 'o3'].forEach(function (o) { var s = el('span', 'orb ' + o); s.setAttribute('aria-hidden', 'true'); f.appendChild(s); });
    return f;
  }
  function btn(tag, cls, label, iconName) {
    var b = el(tag, 'btn ' + cls, label + ' ');
    if (tag === 'button') b.type = 'button';
    if (iconName) { var isle = el('span', 'isle'); isle.appendChild(icon(iconName)); b.appendChild(isle); }
    return b;
  }
  function pips(s) {
    var d = el('div', 'pips'); d.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= 5; i++) { var p = el('i'); if (i <= s.you) p.className = 'on'; else if (i <= s.role) p.className = 'need'; d.appendChild(p); }
    d.appendChild(el('span', null, 'You ' + s.you + ', role ' + s.role));
    return d;
  }
  function countUp(node, to, ms) {
    if (reduce) { node.textContent = String(to); return; }
    var t0 = null;
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      node.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  // ---------- Empty state ----------
  if (!res) {
    var empty = el('section', 'plate empty rise');
    var c = el('div', 'cast'); c.style.margin = '0 auto 10px'; c.style.width = 'min(70%,320px)';
    c.appendChild(img('assets/roles/frontend.svg', 'is-on'));
    var a = btn('a', 'btn-primary has-isle', 'Start the Assessment', 'ph-arrow-right'); a.href = 'assessment.html';
    empty.append(c, el('h1', null, 'No results yet'), el('p', null, 'Take the five-minute skill assessment to see which roles fit you and what to learn next.'), a);
    root.appendChild(empty);
    return;
  }

  var top = M.roleById(res.topRole);
  var topMatch = res.matches[0].match;
  var first = user.name.split(' ')[0];
  var SEEN = 'edupath.storySeen';
  var seen = null;
  try { seen = localStorage.getItem(SEEN); } catch (e) { /* storage blocked: always tell the story */ }

  if (location.hash === '#summary' || seen === res.completedAt) summary(); else story();

  /* =================== The story =================== */
  function story() {
    root.innerHTML = '';
    var strengths = res.raised.length ? res.raised : res.skills.slice().sort(function (x, y) { return y.you - x.you; }).slice(0, 3);
    var runners = res.matches.slice(1, 4);
    var gapSkills = res.gaps;

    var slides = [
      function (s) {
        var line = el('div', 's-lineup s');
        M.ROLES.forEach(function (r) { line.appendChild(img(r.art)); });
        s.append(line, el('p', 's-say s s2', first + ', your results are in.'), el('h1', 's-big s s3', 'Six roles. One best fit.'),
          el('p', 's-text s s4', 'We compared your ' + res.skills.length + ' skill ratings with what each entry-level IT role asks for.'));
      },
      function (s) {
        s.append(el('p', 's-say s', 'Your best fit is'), img(top.art, 's-art s s2'), el('h2', 's-big s s3', top.name), el('p', 's-text s s4', top.desc));
      },
      function (s, on) {
        var n = el('div', 's-num s s2'), v = el('span', null, on ? '0' : String(topMatch)); n.append(v, el('sup', null, '%'));
        n.setAttribute('aria-label', topMatch + ' percent');
        var tag = el('span', 'sample-tag s s4'); tag.append(icon('ph-flask'), document.createTextNode('Sample benchmarks'));
        s.append(el('p', 's-say s', 'Your skills match the ' + top.name + ' benchmark by'), n,
          el('p', 's-text s s3', 'Cosine Similarity compares the shape of your skills with the role\'s. The closer the shapes, the higher the match.'), tag);
        s._enter = function () { countUp(v, topMatch, 1500); };
      },
      function (s) {
        var ul = el('ul', 's-list s s3');
        runners.forEach(function (m) {
          var r = M.roleById(m.role), li = el('li'), bar = el('span', 'bar');
          bar.style.setProperty('--w', (m.match / 100).toFixed(3));
          li.append(el('span', 'nm', r.name), el('span', 'vl', m.match + '%'), bar); ul.appendChild(li);
        });
        s.append(el('p', 's-say s', 'Close behind'), el('h2', 's-big s s2', 'Your next-best options.'), ul,
          el('p', 's-text s s4', 'Worth knowing if your interests change.'));
      },
      function (s) {
        var ul = el('ul', 's-list s s3');
        strengths.forEach(function (k) { var li = el('li'); li.append(el('span', 'nm', k.name), el('span', 'vl', k.you + ' of 5'), pips(k)); ul.appendChild(li); });
        s.append(el('p', 's-say s', 'What carried you'), el('h2', 's-big s s2', res.raised.length ? 'You already meet the bar here.' : 'Your strongest skills.'), ul);
      },
      function (s) {
        s.append(el('p', 's-say s', 'Where you can grow'),
          el('h2', 's-big s s2', gapSkills.length ? plural(gapSkills.length, 'skill', 'skills') + ' to close.' : 'Nothing left to close.'));
        if (gapSkills.length) {
          var ul = el('ul', 's-list s s3');
          gapSkills.slice(0, 3).forEach(function (k) { var li = el('li'); li.append(el('span', 'nm', k.name), el('span', 'vl', plural(k.gap, 'pt', 'pts') + ' short'), pips(k)); ul.appendChild(li); });
          s.append(ul, el('p', 's-text s s4', 'Each one comes with a subject or microcredential in your learning pathway.'));
        } else {
          s.append(el('p', 's-text s s3', 'You meet every skill the ' + top.name + ' benchmark asks for.'));
        }
      }
    ];

    var box = field('section', 'story');
    box.setAttribute('aria-roledescription', 'carousel'); box.setAttribute('aria-label', 'Your results, one at a time');
    var head = el('div', 'story-top'), segs = el('div', 'segs'); segs.setAttribute('aria-hidden', 'true');
    var skip = el('button', 'skip', 'Skip to Summary'); skip.type = 'button';
    head.append(segs, skip);
    var live = el('p', 'sr-only'); live.setAttribute('aria-live', 'polite');
    box.append(head, live);

    var nodes = slides.map(function (build, i) {
      segs.appendChild(el('i'));
      var s = el('div', 'slide'); s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      var inner = el('div', 'slide-in'); build(inner, true); s.appendChild(inner); s._inner = inner;
      box.appendChild(s); return s;
    });

    var nav = el('div', 'story-nav');
    var back = el('button', 'round'); back.type = 'button'; back.setAttribute('aria-label', 'Previous'); back.appendChild(icon('ph-arrow-left'));
    var next = btn('button', 'btn-primary has-isle', 'Next', 'ph-arrow-right');
    nav.append(back, next);
    var hint = el('p', 'tap-hint', 'Click or use the arrow keys');
    box.append(nav, hint);
    root.appendChild(box);

    var at = -1;
    function show(i) {
      if (i < 0) return;
      if (i >= nodes.length) { finish(); return; }
      at = i;
      nodes.forEach(function (n, k) { n.classList.toggle('is-on', k === i); n.setAttribute('aria-hidden', String(k !== i)); });
      segs.querySelectorAll('i').forEach(function (g, k) { g.classList.toggle('on', k <= i); });
      box.dataset.tone = String(i % 6);
      back.disabled = i === 0;
      next.firstChild.nodeValue = i === nodes.length - 1 ? 'See the Summary ' : 'Next ';
      if (nodes[i]._inner._enter) nodes[i]._inner._enter();
      live.textContent = nodes[i]._inner.innerText.replace(/\s+/g, ' ').slice(0, 220);
    }
    function finish() {
      try { localStorage.setItem(SEEN, res.completedAt); } catch (e) { /* fine */ }
      document.removeEventListener('keydown', onKey);
      history.replaceState(null, '', '#summary');
      summary(true);
    }
    function onKey(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      else if (e.key === 'Escape') finish();
    }
    next.addEventListener('click', function () { show(at + 1); });
    back.addEventListener('click', function () { show(at - 1); });
    skip.addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
    // Tap anywhere: the left third goes back, the rest goes forward. Swipes work the same way on touch.
    var downX = null;
    box.addEventListener('pointerdown', function (e) { downX = e.clientX; });
    box.addEventListener('pointerup', function (e) {
      if (downX === null || e.target.closest('button,a')) { downX = null; return; }
      var dx = e.clientX - downX; downX = null;
      if (Math.abs(dx) > 50) { show(at + (dx < 0 ? 1 : -1)); return; }
      var r = box.getBoundingClientRect();
      show(at + ((e.clientX - r.left) < r.width / 3 ? -1 : 1));
    });
    show(0);
  }

  /* =================== The summary =================== */
  function summary(fromStory) {
    root.innerHTML = '';
    window.scrollTo(0, 0);
    var date = new Date(res.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Hero: best fit
    var hero = field('section', 'result-hero rise');
    var left = el('div');
    var tag = el('span', 'sample-tag'); tag.append(icon('ph-flask'), document.createTextNode('Sample benchmarks'));
    var m = el('div', 'match'); var num = el('span', null, String(topMatch)); m.append(num, el('sup', null, '%'));
    m.setAttribute('aria-label', topMatch + ' percent match');
    var actions = el('div', 'hero-actions');
    var go = btn('a', 'btn-primary has-isle', 'Open My Learning Pathway', 'ph-arrow-right'); go.href = 'pathway.html';
    var replay = btn('button', 'btn-ghost', 'Replay My Results'); replay.prepend(icon('ph-play'));
    replay.addEventListener('click', function () { history.replaceState(null, '', location.pathname); story(); window.scrollTo(0, 0); });
    actions.append(go, replay);
    left.append(tag, el('p', 'k', 'Your best fit, ' + date), el('h1', null, top.name), el('p', null, top.desc), m,
      el('p', 'match-cap', 'Match with this role\'s benchmark (Cosine Similarity)'), actions);
    var cast = el('div', 'cast'); var art = img(top.art, 'is-on'); art.alt = 'Illustration of a ' + top.name.toLowerCase(); cast.appendChild(art);
    hero.append(left, cast);
    root.appendChild(hero);
    if (!fromStory) countUp(num, topMatch, 1300);

    // Ranking + what decided it
    var row = el('div', 'grid-2');
    var rank = el('section', 'plate card reveal');
    rank.append(el('h2', null, 'How you rank'), el('p', 'sub', 'All six roles, by how closely your skills match each benchmark.'));
    var ol = el('ol', 'rank');
    res.matches.forEach(function (mm) {
      var r = M.roleById(mm.role), li = el('li');
      var ic = el('span', 'ic'); ic.appendChild(icon(r.icon));
      var bar = el('span', 'bar'); bar.setAttribute('aria-hidden', 'true'); bar.style.setProperty('--w', (mm.match / 100).toFixed(3));
      li.append(ic, el('span', 'nm', r.name), el('span', 'pc', mm.match + '%'), bar);
      ol.appendChild(li);
    });
    rank.appendChild(ol);

    var why = el('section', 'plate card reveal d1');
    why.append(el('h2', null, 'What decided it'), el('p', 'sub', 'Your ratings next to the ' + top.name + ' benchmark.'));
    if (res.raised.length) {
      why.appendChild(el('h3', null, 'Raised your match'));
      var up = el('ul', 'why');
      res.raised.forEach(function (s) { var li = el('li'); li.append(el('span', 'nm', s.name), el('span', 'tag up', 'Meets the bar'), pips(s)); up.appendChild(li); });
      why.appendChild(up);
    }
    why.appendChild(el('h3', null, 'Below the benchmark'));
    if (res.gaps.length) {
      var down = el('ul', 'why');
      res.gaps.forEach(function (s) { var li = el('li'); li.append(el('span', 'nm', s.name), el('span', 'tag down', plural(s.gap, 'pt', 'pts') + ' short'), pips(s)); down.appendChild(li); });
      why.appendChild(down);
    } else {
      why.appendChild(el('p', null, 'Nothing: you meet every skill this benchmark asks for.'));
    }
    row.append(rank, why);
    root.appendChild(row);

    // The pathway, one click away
    var skills = {}; res.pathway.forEach(function (p) { skills[p.skill] = 1; });
    var nSkills = Object.keys(skills).length;
    var cta = field('section', 'path-cta reveal');
    var txt = el('div');
    txt.append(el('h2', null, 'Your learning pathway'),
      el('p', null, nSkills
        ? plural(nSkills, 'skill', 'skills') + ' to close for ' + top.name + ', with ' + plural(res.pathway.length, 'subject or microcredential', 'subjects and microcredentials') + ' to take, biggest gap first.'
        : 'No gaps to close for ' + top.name + '. See what the pathway looks like, and where to grow next.'));
    var trail = el('div', 'trail'); trail.setAttribute('aria-hidden', 'true');
    for (var i = 0; i <= Math.min(nSkills, 5); i++) trail.appendChild(el('i'));
    txt.appendChild(trail);
    var open = btn('a', 'btn-primary has-isle', 'Open My Learning Pathway', 'ph-arrow-right'); open.href = 'pathway.html';
    cta.append(txt, open);
    root.appendChild(cta);

    root.appendChild(el('p', 'note reveal', 'These results are guidance for planning your studies, not a job offer or placement guarantee. ' + res.method));
    if (EP.reveal) EP.reveal(root.querySelectorAll('.reveal')); else root.querySelectorAll('.reveal').forEach(function (n) { n.classList.add('in'); });
    if (fromStory) hero.querySelector('h1').setAttribute('tabindex', '-1'), hero.querySelector('h1').focus({ preventScroll: true });
  }
})();
