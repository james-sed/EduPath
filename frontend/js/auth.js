/* Register and sign-in forms: validation, password toggle, submit, and redirect. */
(function () {
  'use strict';
  var api = window.EduPath.api;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Field rules: return an error message, or '' when the value is fine.
  var RULES = {
    name: function (v) { return v.trim() ? '' : 'Enter your full name.'; },
    email: function (v) {
      if (!v.trim()) return 'Enter your email address.';
      return EMAIL_RE.test(v.trim()) ? '' : 'Enter an email address like name@example.com.';
    },
    password: function (v, form) {
      if (!v) return 'Enter your password.';
      if (form.dataset.form === 'register' && v.length < 8) return 'Use at least 8 characters.';
      return '';
    },
    program: function (v) { return v ? '' : 'Choose your degree program.'; },
    yearLevel: function (v) { return v ? '' : 'Choose your year level.'; },
    consent: function (v, form) { return form.elements.consent.checked ? '' : 'You need to agree before we can create your account.'; }
  };

  function valueOf(form, name) {
    var el = form.elements[name];
    if (!el) return '';
    return el.value !== undefined ? el.value : '';
  }

  // The element that carries aria-invalid for a field (a fieldset for radio groups).
  function targetOf(form, name) {
    var group = form.querySelector('[data-group="' + name + '"]');
    if (group) return group;
    var el = form.elements[name];
    return el && el.length && !el.tagName ? el[0] : el;
  }

  function setError(form, name, message) {
    var box = form.querySelector('#' + name + '-error');
    var target = targetOf(form, name);
    if (box) box.textContent = message;
    if (target) {
      if (message) target.setAttribute('aria-invalid', 'true');
      else target.removeAttribute('aria-invalid');
    }
  }

  function validate(form, names) {
    var firstBad = null;
    names.forEach(function (name) {
      var msg = RULES[name](valueOf(form, name), form);
      setError(form, name, msg);
      if (msg && !firstBad) firstBad = name;
    });
    return firstBad;
  }

  function focusField(form, name) {
    var el = form.elements[name];
    if (el && el.length && !el.tagName) el = el[0];
    if (el && el.focus) el.focus();
  }

  function alertBox(form, message, kind) {
    var box = form.querySelector('.form-alert');
    box.className = 'form-alert' + (message ? ' is-' + (kind || 'error') : '');
    box.innerHTML = '';
    if (message) box.append(message);
  }

  function busy(button, on, label) {
    if (on) { button.dataset.label = button.textContent; button.textContent = label; button.setAttribute('aria-busy', 'true'); button.disabled = true; }
    else { button.textContent = button.dataset.label; button.removeAttribute('aria-busy'); button.disabled = false; }
  }

  // Show/Hide password.
  document.querySelectorAll('.pw-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('aria-controls'));
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', String(show));
    });
  });

  var form = document.querySelector('form[data-form]');
  if (!form) return;
  var kind = form.dataset.form;
  var fields = kind === 'register' ? ['name', 'email', 'password', 'program', 'yearLevel', 'consent'] : ['email', 'password'];

  // Re-check a field once it has been flagged, so the error clears as soon as it's fixed.
  form.addEventListener('input', function (e) {
    var name = e.target.name;
    var target = name && targetOf(form, name);
    if (RULES[name] && target && target.getAttribute('aria-invalid') === 'true') {
      setError(form, name, RULES[name](valueOf(form, name), form));
    }
  });
  form.addEventListener('change', function (e) {
    var name = e.target.name;
    if ((name === 'yearLevel' || name === 'consent' || name === 'program') && RULES[name]) {
      var target = targetOf(form, name);
      if (target && target.getAttribute('aria-invalid') === 'true') setError(form, name, RULES[name](valueOf(form, name), form));
    }
  });

  async function submit(values, button) {
    alertBox(form, '');
    busy(button, true, kind === 'register' ? 'Creating account…' : 'Signing in…');
    try {
      var session = kind === 'register' ? await api.register(values) : await api.login(values);
      window.location.href = api.nextPageFor(session);
    } catch (err) {
      busy(button, false);
      if (err.code === 'email_taken') {
        setError(form, 'email', 'An account with this email already exists.');
        var p = document.createElement('span');
        p.append('An account with this email already exists. ');
        var a = document.createElement('a');
        a.href = 'login.html'; a.className = 'text-link'; a.textContent = 'Sign in instead';
        p.append(a, '.');
        alertBox(form, p);
        focusField(form, 'email');
      } else if (err.field && RULES[err.field]) {
        setError(form, err.field, err.message);
        focusField(form, err.field);
      } else {
        alertBox(form, err.message);
      }
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate(form, fields);
    if (bad) {
      alertBox(form, 'Check the highlighted fields and try again.');
      focusField(form, bad);
      return;
    }
    var values = {};
    fields.forEach(function (n) { values[n] = n === 'consent' ? form.elements.consent.checked : valueOf(form, n); });
    submit(values, form.querySelector('button[type="submit"]'));
  });

  // Demo account shortcut on the sign-in page.
  var demoBtn = document.querySelector('[data-demo-signin]');
  if (demoBtn && api.demoAccount) {
    demoBtn.addEventListener('click', function () {
      form.elements.email.value = api.demoAccount.email;
      form.elements.password.value = api.demoAccount.password;
      fields.forEach(function (n) { setError(form, n, ''); });
      submit({ email: api.demoAccount.email, password: api.demoAccount.password }, form.querySelector('button[type="submit"]'));
    });
  } else if (demoBtn) {
    demoBtn.closest('[data-demo]').hidden = true;
  }

  // Hide the demo-mode note once the backend is live.
  if (api.mode !== 'demo') document.querySelectorAll('[data-demo-note]').forEach(function (el) { el.hidden = true; });

  // Password hint confirms the length rule as soon as it is met.
  var pwHint = form.querySelector('[data-min]');
  if (pwHint) {
    var min = Number(pwHint.dataset.min), base = pwHint.textContent;
    form.elements.password.addEventListener('input', function () {
      var ok = form.elements.password.value.length >= min;
      pwHint.classList.toggle('is-ok', ok);
      pwHint.textContent = ok ? min + '+ characters. Good to go.' : base;
    });
  }

  // Live profile card (register): mirrors name, program, and year level as they are entered.
  var preview = document.querySelector('.profile-card');
  if (preview) {
    var slots = {
      name: { el: preview.querySelector('[data-preview="name"]'), empty: 'Your name', text: function (v) { return v.trim(); } },
      program: { el: preview.querySelector('[data-preview="program"]'), empty: 'Program', text: function (v) { return v ? v + ' ' + api.programs[v] : ''; } },
      yearLevel: { el: preview.querySelector('[data-preview="yearLevel"]'), empty: 'year level', text: function (v) { return v ? api.yearLevels[v].toLowerCase() : ''; } }
    };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var update = function (name, flash) {
      var slot = slots[name];
      if (!slot) return;
      var text = slot.text(valueOf(form, name));
      slot.el.textContent = text || slot.empty;
      slot.el.classList.toggle('is-empty', !text);
      if (flash && text && !reduce) { slot.el.classList.remove('pulse'); void slot.el.offsetWidth; slot.el.classList.add('pulse'); }
    };
    form.addEventListener('input', function (e) { if (e.target.name === 'name') update('name', false); });
    form.addEventListener('change', function (e) { update(e.target.name, true); });
    Object.keys(slots).forEach(function (n) { update(n, false); });
  }
})();
