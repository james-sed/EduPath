/* Rotating cast: any element with [data-cast] shows EduPath's role characters one at a time.
   data-cast="all" cycles every role; data-cast="frontend,backend" limits it. A [data-cast-caption]
   inside the same parent shows the current role name. Reduced motion shows the first one only. */
(function () {
  'use strict';
  var ROLES = [
    ['frontend', 'Frontend Developer'], ['backend', 'Backend Developer'], ['mobile', 'Mobile App Developer'],
    ['database', 'Database Administrator'], ['qa', 'QA / Software Tester'], ['network', 'Network / Systems Engineer']
  ];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-cast]').forEach(function (box) {
    var want = box.dataset.cast === 'all' ? null : box.dataset.cast.split(',');
    var list = ROLES.filter(function (r) { return !want || want.indexOf(r[0]) >= 0; });
    var caption = box.parentElement.querySelector('[data-cast-caption]');
    var imgs = list.map(function (r, i) {
      var img = new Image();
      img.src = 'assets/roles/' + r[0] + '.svg';
      img.alt = i === 0 ? 'Illustration of a ' + r[1].toLowerCase() : '';
      img.decoding = 'async';
      box.appendChild(img);
      return img;
    });
    var i = 0;
    function show(n) {
      imgs.forEach(function (img, k) { img.classList.toggle('is-on', k === n); });
      if (caption) caption.textContent = list[n][1];
    }
    box.show = function (id) {           // lets a page jump to a specific role
      var n = list.findIndex(function (r) { return r[0] === id; });
      if (n >= 0) { i = n; show(i); }
    };
    show(0);
    if (!reduce && list.length > 1 && box.dataset.castStatic === undefined) {
      setInterval(function () { if (!document.hidden) { i = (i + 1) % list.length; show(i); } }, 4200);
    }
  });
})();
