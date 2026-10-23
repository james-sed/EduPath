/* EduPath landing page behavior.
   Motion uses transform and opacity only. No scroll listeners: reveals use IntersectionObserver.
   Without JS the page still reads top to bottom; with reduced motion nothing auto-plays. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- The six roles: one source for the hero theater and the role tiles ----------
     Character art: EduPath's own animated SVGs in assets/roles/<file>.svg (animations live
     inside each file and stop under reduced motion). An icon placeholder shows if a file is missing. */
  var ROLES = [
    { id: 'frontend', tab: 'Frontend', name: 'Frontend Developer', icon: 'ph-browser',
      art: 'assets/roles/frontend.svg',
      desc: 'Builds the screens people tap and click, turning designs into fast, accessible web pages.',
      skills: ['HTML and CSS', 'JavaScript', 'UI frameworks'] },
    { id: 'backend', tab: 'Backend', name: 'Backend Developer', icon: 'ph-brackets-curly',
      art: 'assets/roles/backend.svg',
      desc: 'Builds the servers, APIs, and data logic that make an app work behind the scenes.',
      skills: ['REST APIs', 'SQL', 'Server languages'] },
    { id: 'mobile', tab: 'Mobile', name: 'Mobile App Developer', icon: 'ph-device-mobile',
      art: 'assets/roles/mobile.svg',
      desc: 'Builds apps for Android and iOS, from the layout to the features people use every day.',
      skills: ['Kotlin or Swift', 'Cross-platform', 'Mobile UI'] },
    { id: 'database', tab: 'Database', name: 'Database Administrator', icon: 'ph-database',
      art: 'assets/roles/database.svg',
      desc: "Keeps an organization's data organized, secure, backed up, and quick to reach.",
      skills: ['SQL', 'Data modeling', 'Backups'] },
    { id: 'qa', tab: 'QA', name: 'QA / Software Tester', icon: 'ph-bug',
      art: 'assets/roles/qa.svg',
      desc: 'Finds bugs before users do, testing every release so it works the way it should.',
      skills: ['Test design', 'Automation', 'Bug tracking'] },
    { id: 'network', tab: 'Network', name: 'Network / Systems Engineer', icon: 'ph-network',
      art: 'assets/roles/network.svg',
      desc: 'Sets up and maintains the networks and servers a company runs on.',
      skills: ['Networking', 'Linux', 'Cloud basics'] }
  ];
  var DURATION = 5600;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // Character art, with an icon placeholder if a file is missing.
  function artFor(role, small) {
    var wrap = el('div', small ? 'thumb-in' : 'art-in');
    var img = new Image();
    img.alt = small ? '' : 'Illustration of a ' + role.name.toLowerCase();
    img.decoding = 'async';
    img.onerror = function () {
      wrap.innerHTML = '';
      if (small) { var i = el('i', 'ph-light ' + role.icon); i.setAttribute('aria-hidden', 'true'); wrap.appendChild(i); return; }
      var ph = el('div', 'ph-art');
      var ic = el('i', 'ph-light ' + role.icon); ic.setAttribute('aria-hidden', 'true');
      ph.append(ic);
      wrap.appendChild(ph);
    };
    img.src = role.art;
    wrap.appendChild(img);
    return wrap;
  }

  /* ---------- Scroll: smooth momentum (Lenis) and an elastic stretch at the top and bottom ----------
     Mouse wheel and trackpad only. Touch keeps the device's native scrolling; reduced motion keeps
     the browser default. */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    // Run the frame loop only while a scroll is animating, so an idle page costs nothing.
    var looping = false;
    var loop = function (t) {
      lenis.raf(t);
      if (lenis.isScrolling) requestAnimationFrame(loop); else looping = false;
    };
    var kick = function () { if (!looping) { looping = true; requestAnimationFrame(loop); } };
    window.addEventListener('wheel', kick, { passive: true });
    // In-page links glide to their section, clear of the floating nav.
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id === '#top' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -96, duration: 1.2 });
        kick();
      });
    });
    var page = document.querySelector('[data-page]');
    var over = 0, vel = 0, springing = 0;
    var spring = function () {
      vel = (vel + (0 - over) * 0.075) * 0.8;    // pull back with a small, soft overshoot
      over += vel;
      if (Math.abs(over) < 0.1 && Math.abs(vel) < 0.1) { over = 0; vel = 0; page.style.transform = ''; springing = 0; return; }
      page.style.transform = 'translate3d(0,' + over.toFixed(2) + 'px,0)';
      springing = requestAnimationFrame(spring);
    };
    window.addEventListener('wheel', function (e) {
      if (document.body.style.overflow === 'hidden') return;
      var atTop = lenis.scroll <= 0.5 && e.deltaY < 0;
      var atEnd = lenis.scroll >= lenis.limit - 0.5 && e.deltaY > 0;
      if (!atTop && !atEnd) return;
      over += -e.deltaY * 0.16 * (1 - Math.min(Math.abs(over), 90) / 90);   // more resistance the further it stretches
      if (!springing) springing = requestAnimationFrame(spring);
    }, { passive: true });
  }

  /* ---------- Menu ---------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1021px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ---------- Hero role theater ---------- */
  var theater = document.querySelector('[data-theater]');
  if (theater) {
    var stage = theater.querySelector('[data-stage]');
    var copy = theater.querySelector('[data-copy]');
    var chipsBox = theater.querySelector('[data-chips]');
    var tabs = document.querySelector('[data-tabs]');
    var pauseBtn = document.querySelector('[data-pause]');
    var label = el('span', 'chip-label', 'Skills this role needs');
    chipsBox.appendChild(label);

    var arts = [], copies = [], sets = [], tabBtns = [];
    ROLES.forEach(function (r, i) {
      var a = el('div', 'art'); a.appendChild(artFor(r)); a.setAttribute('aria-hidden', 'true'); stage.appendChild(a); arts.push(a);

      var c = el('article');
      c.id = 'role-' + r.id;
      c.setAttribute('role', 'tabpanel');
      c.setAttribute('aria-roledescription', 'slide');
      c.setAttribute('aria-label', (i + 1) + ' of ' + ROLES.length);
      c.append(el('small', null, 'Role ' + (i + 1) + ' of ' + ROLES.length), el('h2', null, r.name), el('p', null, r.desc));
      copy.appendChild(c); copies.push(c);

      var s = el('div', 'chip-set');
      r.skills.forEach(function (sk, k) {
        var chip = el('div', 'chip');
        chip.dataset.depth = String([0.9, 1.6, 1.2][k]);
        var span = el('span'); span.append(el('i'), document.createTextNode(sk));
        chip.appendChild(span); s.appendChild(chip);
      });
      chipsBox.appendChild(s); sets.push(s);

      var t = el('button', 'tab');
      t.type = 'button';
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', c.id);
      t.append(document.createTextNode(r.tab), el('span', 'timer'));
      t.style.setProperty('--dur', DURATION + 'ms');
      t.addEventListener('click', function () { go(i, true); });
      tabs.appendChild(t); tabBtns.push(t);
    });

    var current = -1, paused = reduce, userPaused = false;
    if (reduce) theater.classList.add('is-static');

    function go(i, fromUser) {
      if (i === current) return;
      var prev = current;
      current = i;
      arts.forEach(function (a, k) {
        a.classList.toggle('is-on', k === i);
        a.classList.toggle('is-off', k === prev);
      });
      copies.forEach(function (c, k) { c.classList.toggle('is-on', k === i); c.hidden = false; });
      sets.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      tabBtns.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var timer = t.querySelector('.timer');
        timer.style.animation = 'none';            // restart the fill on the newly selected tab
        if (on) { timer.getBoundingClientRect(); timer.style.animation = ''; }
        timer.style.animationPlayState = paused ? 'paused' : 'running';
      });
      // Keep the selected tab visible inside the tab row only (never scroll the page or the hero panel).
      if (tabs.scrollWidth > tabs.clientWidth) {
        var b = tabBtns[i];
        tabs.scrollTo({ left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    // Advance when the active tab's timer finishes filling.
    tabs.addEventListener('animationend', function (e) {
      if (e.animationName !== 'fill' || paused) return;
      go((current + 1) % ROLES.length, true);
    });

    function setPaused(p) {
      paused = p || reduce;
      theater.classList.toggle('is-paused', paused);
      tabs.classList.toggle('is-paused', paused);
      document.querySelectorAll('.tab .timer').forEach(function (t) { t.style.animationPlayState = paused ? 'paused' : 'running'; });
    }
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      setPaused(userPaused);
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play role rotation' : 'Pause role rotation');
      pauseBtn.innerHTML = '<i class="ph-light ' + (userPaused ? 'ph-play' : 'ph-pause') + '" aria-hidden="true"></i>';
    });
    if (reduce) pauseBtn.hidden = true;
    // Pause while someone is choosing a role (hovering or focusing the tabs).
    [tabs].forEach(function (zone) {
      zone.addEventListener('mouseenter', function () { setPaused(true); });
      zone.addEventListener('mouseleave', function () { setPaused(userPaused); });
      zone.addEventListener('focusin', function () { setPaused(true); });
      zone.addEventListener('focusout', function () { setPaused(userPaused); });
    });
    // Arrow keys move between tabs.
    tabs.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (current + d + ROLES.length) % ROLES.length;
      go(n, true); tabBtns[n].focus({ preventScroll: true });
    });
    // Stop the clock when the hero is off screen.
    if (hasIO) {
      new IntersectionObserver(function (en) { if (!userPaused) setPaused(!en[0].isIntersecting); }, { threshold: 0.25 }).observe(theater);
    }
    go(0);
    setPaused(paused);

    /* Cursor drift: each chip eases toward the pointer by its depth, then springs back.
       One requestAnimationFrame loop that stops itself when everything has settled. */
    if (finePointer && !reduce) {
      var hero = document.querySelector('.hero .field');
      var tx = 0, ty = 0, raf = 0;
      var state = [];
      chipsBox.querySelectorAll('.chip').forEach(function (c) { state.push({ el: c, d: Number(c.dataset.depth), x: 0, y: 0, vx: 0, vy: 0 }); });
      var artLayer = stage;
      var art = { x: 0, y: 0, vx: 0, vy: 0 };
      function step() {
        var moving = false;
        state.forEach(function (s) {
          var gx = tx * 11 * s.d, gy = ty * 8 * s.d;
          s.vx = (s.vx + (gx - s.x) * 0.01) * 0.88;    // slow, heavy follow that settles with one soft rebound (~1.2s)
          s.vy = (s.vy + (gy - s.y) * 0.01) * 0.88;
          s.x += s.vx; s.y += s.vy;
          if (Math.abs(gx - s.x) > 0.05 || Math.abs(s.vx) > 0.02 || Math.abs(gy - s.y) > 0.05 || Math.abs(s.vy) > 0.02) moving = true;
          s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,' + s.y.toFixed(2) + 'px,0)';
        });
        var ax = tx * -5, ay = ty * -3;
        art.vx = (art.vx + (ax - art.x) * 0.008) * 0.88; art.vy = (art.vy + (ay - art.y) * 0.008) * 0.88;
        art.x += art.vx; art.y += art.vy;
        artLayer.style.transform = 'translate3d(' + art.x.toFixed(2) + 'px,' + art.y.toFixed(2) + 'px,0)';
        if (moving) raf = requestAnimationFrame(step); else raf = 0;
      }
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width * 2 - 1;
        ty = (e.clientY - r.top) / r.height * 2 - 1;
        if (!raf) raf = requestAnimationFrame(step);
      });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    }
  }

  /* ---------- Roles roster: one role open at a time; its character takes the stage ----------
     Own names (rStage, rArts) so this block never overwrites the hero theater's stage and arts.
     Mouse hover waits a beat before switching, so sweeping across the list doesn't flick through
     every character; click, tap and keyboard focus switch at once. */
  var roster = document.querySelector('[data-roster]');
  if (roster) {
    var rStage = document.querySelector('[data-roster-stage]'), stageName = document.querySelector('[data-stage-name]');
    var rows = [], rArts = [], openAt = -1, hoverTimer = 0;
    ROLES.forEach(function (r, i) {
      var img = new Image(); img.src = r.art; img.alt = ''; img.decoding = 'async';
      rStage.appendChild(img); rArts.push(img);
      var li = el('li'), btn = el('button', 'rr'); btn.type = 'button';
      btn.id = 'rr-' + r.id; btn.setAttribute('aria-controls', 'rr-more-' + r.id);
      var name = el('span', 'rr-name', r.name);
      var ar = el('i', 'ph-light ph-arrow-right'); ar.setAttribute('aria-hidden', 'true'); name.appendChild(ar);
      var more = el('span', 'rr-more'); more.id = 'rr-more-' + r.id;
      var inner = el('div');
      var sk = el('span', 'rr-skills');
      r.skills.forEach(function (x) { sk.appendChild(el('span', null, x)); });
      var small = new Image(); small.src = r.art; small.alt = ''; small.className = 'rr-art'; small.loading = 'lazy';
      inner.append(el('span', 'rr-desc', r.desc), sk, small);
      more.appendChild(inner);
      btn.append(name, more);
      li.appendChild(btn); roster.appendChild(li); rows.push(btn);
      btn.addEventListener('click', function () { openRole(i); });
      btn.addEventListener('focus', function () { openRole(i); });
      btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { openRole(i); }, 110);
      });
    });
    roster.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
    var openRole = function (i) {
      clearTimeout(hoverTimer);
      if (i === openAt) return;
      openAt = i;
      rows.forEach(function (b, k) { b.setAttribute('aria-expanded', String(k === i)); });
      rArts.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
      rStage.dataset.on = String(i);
      stageName.textContent = ROLES[i].name;
    };
    openRole(0);
  }

  /* ---------- Figures count up when they come into view ---------- */
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && hasIO && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target, to = Number(n.dataset.countTo), dec = Number(n.dataset.decimals || 0), t0 = null;
        n.textContent = (0).toFixed(dec);
        requestAnimationFrame(function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 4);
          n.textContent = (to * e).toFixed(dec);
          if (p < 1) requestAnimationFrame(step);
        });
        cio.unobserve(n);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (n) { cio.observe(n); });
  }

  /* ---------- Entry reveals (and the road drawing itself in) ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (n) { io.observe(n); });
  } else {
    reveals.forEach(function (n) { n.classList.add('in'); });
  }

  /* ---------- FAQ: answers glide open and closed ---------- */
  document.querySelectorAll('[data-faq] details').forEach(function (d) {
    var summary = d.querySelector('summary');
    var answer = d.querySelector('.answer');
    var anim = null;
    summary.addEventListener('click', function (e) {
      if (reduce || !answer.animate) return;           // native toggle
      e.preventDefault();
      if (anim) anim.cancel();
      var opening = !d.open;
      if (opening) d.open = true;
      var full = answer.scrollHeight;
      anim = answer.animate(
        opening ? [{ height: '0px', opacity: 0 }, { height: full + 'px', opacity: 1 }]
                : [{ height: full + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: opening ? 520 : 380, easing: 'cubic-bezier(.32,.72,0,1)' });
      anim.onfinish = function () { if (!opening) d.open = false; anim = null; };
    });
  });
})();
