/* App pages: the landing page's scroll feel. Smooth momentum (Lenis) for wheel and trackpad, an elastic
   stretch at the top and bottom of the page that springs back, and entry reveals for `.reveal` elements,
   including ones added later (EduPath.reveal). Touch keeps native scrolling; reduced motion keeps the
   browser default and shows everything at once. No scroll listeners: reveals use IntersectionObserver. */
(function () {
  'use strict';
  var EP = window.EduPath = window.EduPath || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Smooth scroll and the edge bounce ---------- */
  var lenis = null, kick = function () {};
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    // Run the frame loop only while a scroll is animating, so an idle page costs nothing.
    var looping = false;
    var loop = function (t) {
      lenis.raf(t);
      if (lenis.isScrolling) requestAnimationFrame(loop); else looping = false;
    };
    kick = function () { if (!looping) { looping = true; requestAnimationFrame(loop); } };
    window.addEventListener('wheel', kick, { passive: true });

    var page = document.querySelector('[data-page]');
    var over = 0, vel = 0, springing = 0;
    var spring = function () {
      vel = (vel + (0 - over) * 0.075) * 0.8;    // pull back with a small, soft overshoot
      over += vel;
      if (Math.abs(over) < 0.1 && Math.abs(vel) < 0.1) { over = 0; vel = 0; page.style.transform = ''; springing = 0; return; }
      page.style.transform = 'translate3d(0,' + over.toFixed(2) + 'px,0)';
      springing = requestAnimationFrame(spring);
    };
    if (page) window.addEventListener('wheel', function (e) {
      var atTop = lenis.scroll <= 0.5 && e.deltaY < 0;
      var atEnd = lenis.scroll >= lenis.limit - 0.5 && e.deltaY > 0;
      if (!atTop && !atEnd) return;
      over += -e.deltaY * 0.16 * (1 - Math.min(Math.abs(over), 90) / 90);   // more resistance the further it stretches
      if (!springing) springing = requestAnimationFrame(spring);
    }, { passive: true });
  }

  // Scroll to a position or element, gliding when smooth scroll is on.
  EP.scrollTo = function (target, opts) {
    opts = opts || {};
    if (lenis) { lenis.resize(); lenis.scrollTo(target, { offset: opts.offset || 0, duration: opts.duration || 1.1 }); kick(); return; }
    var y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------- Entry reveals ---------- */
  var io = ('IntersectionObserver' in window && !reduce) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }) : null;

  EP.reveal = function (nodes) {
    if (!nodes) nodes = document.querySelectorAll('.reveal:not(.in)');
    else if (nodes.nodeType) nodes = [nodes];
    Array.prototype.forEach.call(nodes, function (n) {
      n.classList.add('reveal');
      if (io) io.observe(n); else n.classList.add('in');
    });
    if (lenis) lenis.resize();
  };
  EP.reveal();
})();
