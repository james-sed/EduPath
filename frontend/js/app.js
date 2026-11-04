/* EduPath data layer.
 *
 * Every page talks to EduPath.api. In "demo" mode it stores accounts and results in this
 * browser's localStorage, so the frontend is fully usable before the FastAPI backend exists.
 * When the backend is ready, set MODE to "live" and API_BASE to its URL; the same calls are
 * then sent as HTTP requests (see the endpoint noted on each method) and no page code changes.
 *
 * Demo mode is not secure: passwords are hashed before storing, but anything in localStorage
 * can be read by anyone using this browser. It exists for development and presentations.
 *
 * EduPath.model holds the assessment model: skills, sample role benchmarks, a sample learning
 * catalog, and the scoring from the project paper (Cosine Similarity for the match, Euclidean
 * deficit max(0, benchmark - rating) per skill). All benchmark values and course names are
 * SAMPLE data until real benchmarks and the JRU catalog are available.
 */
(function () {
  'use strict';

  var MODE = 'demo';                       // 'demo' | 'live'
  var API_BASE = 'http://127.0.0.1:8000';  // used only in live mode

  var KEYS = { users: 'edupath.users', session: 'edupath.session', results: 'edupath.results', draft: 'edupath.draft' };
  var PROGRAMS = { BSIT: 'Information Technology', BSCpE: 'Computer Engineering', BSECE: 'Electronics Engineering', BSEMC: 'Entertainment & Multimedia Computing' };
  var YEAR_LEVELS = { '3': '3rd year', '4': '4th year', grad: 'Recent graduate' };

  var DEMO_ACCOUNT = { email: 'demo@edupath.test', password: 'edupath-demo' };

  /* ======================= Assessment model ======================= */

  // Rating scale (0 to 5 Likert, as in the project paper)
  var LEVELS = [
    { v: 0, label: 'None', hint: "I haven't used it" },
    { v: 1, label: 'Aware', hint: 'I know what it is' },
    { v: 2, label: 'Beginner', hint: "I've tried it in class" },
    { v: 3, label: 'Comfortable', hint: 'I can use it with some help' },
    { v: 4, label: 'Strong', hint: 'I use it on my own' },
    { v: 5, label: 'Job-ready', hint: 'I could use it at work today' }
  ];

  var SKILLS = [
    { id: 'prog',    group: 'programming', name: 'Programming fundamentals', desc: 'Java, Python, or C#: variables, loops, functions, OOP' },
    { id: 'web',     group: 'programming', name: 'Web frontend',             desc: 'HTML, CSS, and JavaScript for web pages' },
    { id: 'backend', group: 'programming', name: 'Backend and REST APIs',    desc: 'Server-side code and the APIs apps talk to' },
    { id: 'mobile',  group: 'programming', name: 'Mobile development',       desc: 'Android or iOS apps, or cross-platform tools' },
    { id: 'db',      group: 'data',        name: 'Databases and SQL',        desc: 'Designing tables and writing SQL queries' },
    { id: 'testing', group: 'data',        name: 'Software testing',         desc: 'Test cases, bug reports, and automated tests' },
    { id: 'net',     group: 'systems',     name: 'Networking and Linux',     desc: 'Networks, IP addressing, and the Linux command line' },
    { id: 'git',     group: 'systems',     name: 'Git and version control',  desc: 'Commits, branches, and pull requests' },
    { id: 'devops',  group: 'systems',     name: 'Docker, CI/CD, and cloud', desc: 'Containers, deployment pipelines, cloud basics' }
  ];

  // Soft skills: four competencies, three self-ratings each. Kept separate from SKILLS so the
  // technical vector and the soft-skill vector can be used independently.
  var SOFT = [
    { id: 'communication', name: 'Communication', items: [
      { id: 'communication-1', name: 'Explaining technical ideas clearly in writing', desc: 'Docs, emails, and written updates another person can follow.' },
      { id: 'communication-2', name: 'Presenting or speaking to a group', desc: 'Walking a class or team through your work out loud.' },
      { id: 'communication-3', name: 'Listening and asking clarifying questions', desc: 'Checking what someone means before you start.' }
    ] },
    { id: 'teamwork', name: 'Teamwork', items: [
      { id: 'teamwork-1', name: 'Contributing reliably to group projects', desc: 'Doing your share and meeting the commitments you make.' },
      { id: 'teamwork-2', name: 'Giving and accepting feedback', desc: 'Offering useful comments and taking suggestions without defensiveness.' },
      { id: 'teamwork-3', name: 'Resolving disagreements respectfully', desc: 'Working toward a decision without making it personal.' }
    ] },
    { id: 'problemSolving', name: 'Problem Solving', items: [
      { id: 'problemSolving-1', name: 'Breaking a problem into smaller parts', desc: 'Turning a vague task into steps you can actually start.' },
      { id: 'problemSolving-2', name: 'Debugging or troubleshooting systematically', desc: 'Testing one cause at a time instead of guessing.' },
      { id: 'problemSolving-3', name: 'Evaluating options before deciding', desc: 'Comparing trade-offs before committing to an approach.' }
    ] },
    { id: 'adaptability', name: 'Adaptability', items: [
      { id: 'adaptability-1', name: 'Learning new tools or languages quickly', desc: "Getting productive with unfamiliar software or syntax." },
      { id: 'adaptability-2', name: 'Staying effective when requirements change', desc: 'Adjusting your plan without losing the goal.' },
      { id: 'adaptability-3', name: 'Recovering from setbacks or failed attempts', desc: 'Trying a different approach after something breaks.' }
    ] }
  ];

  var SOFT_ITEMS = [];
  SOFT.forEach(function (g) {
    g.items.forEach(function (it, i) { it.group = g.id; it.groupName = g.name; it.index = i; SOFT_ITEMS.push(it); });
  });

  var GROUPS = [
    { id: 'programming', name: 'Programming', role: 'frontend', blurb: 'The languages and frameworks you build with.' },
    { id: 'data',        name: 'Data and quality', role: 'database', blurb: 'How you store data and make sure software works.' },
    { id: 'systems',     name: 'Systems and tools', role: 'network', blurb: 'The tools and infrastructure that ship software.' }
  ];

  var ROLES = [
    { id: 'frontend', name: 'Frontend Developer', art: 'assets/roles/frontend.svg', icon: 'ph-browser',
      desc: 'Builds the screens people tap and click, turning designs into fast, accessible web pages.' },
    { id: 'backend', name: 'Backend Developer', art: 'assets/roles/backend.svg', icon: 'ph-brackets-curly',
      desc: 'Builds the servers, APIs, and data logic that make an app work behind the scenes.' },
    { id: 'mobile', name: 'Mobile App Developer', art: 'assets/roles/mobile.svg', icon: 'ph-device-mobile',
      desc: 'Builds apps for Android and iOS, from the layout to the features people use every day.' },
    { id: 'database', name: 'Database Administrator', art: 'assets/roles/database.svg', icon: 'ph-database',
      desc: "Keeps an organization's data organized, secure, backed up, and quick to reach." },
    { id: 'qa', name: 'QA / Software Tester', art: 'assets/roles/qa.svg', icon: 'ph-bug',
      desc: 'Finds bugs before users do, testing every release so it works the way it should.' },
    { id: 'network', name: 'Network / Systems Engineer', art: 'assets/roles/network.svg', icon: 'ph-network',
      desc: 'Sets up and maintains the networks and servers a company runs on.' }
  ];

  // SAMPLE benchmarks (0 to 5) per role, in SKILLS order:
  //            prog web backend mobile db testing net git devops
  var BENCH = {
    frontend: [4, 5, 2, 1, 2, 3, 1, 4, 2],
    backend:  [4, 2, 5, 1, 4, 3, 2, 4, 3],
    mobile:   [4, 3, 2, 5, 2, 3, 1, 4, 2],
    database: [3, 1, 3, 1, 5, 2, 3, 3, 2],
    qa:       [3, 3, 2, 2, 3, 5, 1, 3, 2],
    network:  [2, 1, 2, 1, 2, 2, 5, 3, 4]
  };

  // SAMPLE soft-skill benchmarks (0 to 5) per role, in SOFT order:
  //            communication teamwork problemSolving adaptability
  var SOFT_BENCH = {
    frontend: [4, 4, 4, 4],
    backend:  [4, 4, 5, 4],
    mobile:   [3, 4, 4, 4],
    database: [4, 3, 4, 3],
    qa:       [4, 4, 5, 4],
    network:  [4, 4, 4, 4]
  };

  // SAMPLE learning catalog: one JRU subject and one microcredential per skill. Names are placeholders.
  var CATALOG = {
    prog:    [{ type: 'JRU subject', title: 'Computer Programming 2' }, { type: 'Microcredential', title: 'Python Essentials' }],
    web:     [{ type: 'JRU subject', title: 'Web Systems and Technologies' }, { type: 'Microcredential', title: 'Responsive Web Design' }],
    backend: [{ type: 'JRU subject', title: 'Integrative Programming' }, { type: 'Microcredential', title: 'REST API Fundamentals' }],
    mobile:  [{ type: 'JRU subject', title: 'Mobile Application Development' }, { type: 'Microcredential', title: 'Android Development Basics' }],
    db:      [{ type: 'JRU subject', title: 'Advanced Database Systems' }, { type: 'Microcredential', title: 'SQL for Data Management' }],
    testing: [{ type: 'JRU subject', title: 'Software Quality Assurance' }, { type: 'Microcredential', title: 'Software Testing Foundations' }],
    net:     [{ type: 'JRU subject', title: 'Networking 2' }, { type: 'Microcredential', title: 'Linux Administration Basics' }],
    git:     [{ type: 'JRU subject', title: 'Software Engineering 1' }, { type: 'Microcredential', title: 'Git and GitHub Essentials' }],
    devops:  [{ type: 'JRU subject', title: 'Cloud and Container Basics' }, { type: 'Microcredential', title: 'DevOps Fundamentals' }]
  };

  // SAMPLE next steps for soft-skill gaps: suggested activities, not real course names.
  var SOFT_CATALOG = {
    communication: [{ type: 'Suggested activity', title: 'Present a class project and collect one round of feedback' }],
    teamwork:      [{ type: 'Suggested activity', title: 'Take a shared role in a group project and run a peer review' }],
    problemSolving: [{ type: 'Suggested activity', title: 'Work through one debugging or troubleshooting exercise each week' }],
    adaptability:  [{ type: 'Suggested activity', title: 'Rebuild a small project with a tool or language that is new to you' }]
  };

  // Microcredentials a student may already hold (excluded from their pathway).
  var CREDENTIALS = [];
  Object.keys(CATALOG).forEach(function (k) {
    CATALOG[k].forEach(function (c) { if (c.type === 'Microcredential') CREDENTIALS.push(c.title); });
  });

  function round1(n) { return Math.round(n * 10) / 10; }
  function average(values) { return values.length ? values.reduce(function (s, v) { return s + v; }, 0) / values.length : 0; }

  // Per-competency average (0 to 5) from its three item ratings.
  function softAverages(soft) {
    soft = soft || {};
    var out = {};
    SOFT.forEach(function (g) {
      var vals = g.items.map(function (it, i) {
        var v = soft[g.id] ? soft[g.id][i] : null;
        return v == null || isNaN(v) ? 0 : Number(v);
      });
      out[g.id] = round1(average(vals));
    });
    return out;
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  /* Score a completed assessment.
     ratings: { skillId: 0..5 }, held: [microcredential titles], interests: [roleIds],
     soft: { competencyId: [0..5, 0..5, 0..5] } */
  function score(ratings, held, interests, soft) {
    held = held || []; interests = interests || []; soft = soft || {};
    var you = SKILLS.map(function (s) { return Number(ratings[s.id] || 0); });
    var matches = ROLES.map(function (r) {
      var b = BENCH[r.id];
      return { role: r.id, match: Math.round(cosine(you, b) * 100) };
    }).sort(function (a, b) { return b.match - a.match; });

    var top = matches[0].role, b = BENCH[top];
    var norm = Math.sqrt(you.reduce(function (s, v) { return s + v * v; }, 0)) * Math.sqrt(b.reduce(function (s, v) { return s + v * v; }, 0)) || 1;
    var skills = SKILLS.map(function (s, i) {
      return { id: s.id, name: s.name, you: you[i], role: b[i], gap: Math.max(0, b[i] - you[i]), weight: (you[i] * b[i]) / norm };
    });
    var gaps = skills.filter(function (s) { return s.gap > 0; }).sort(function (x, y) { return y.gap - x.gap || y.role - x.role; });
    var raised = skills.filter(function (s) { return s.gap === 0 && s.role >= 3; }).sort(function (x, y) { return y.weight - x.weight; }).slice(0, 3);
    var heldBack = gaps.slice(0, 3);

    var pathway = [], skipped = [];
    gaps.forEach(function (g) {
      CATALOG[g.id].forEach(function (c) {
        var item = { skill: g.id, skillName: g.name, type: c.type, title: c.title, gap: g.gap };
        if (held.indexOf(c.title) >= 0) skipped.push(item); else pathway.push(item);
      });
    });

    // Soft skills are reported separately: per-competency average against the top role's sample
    // benchmark, with the same max(0, benchmark - student) deficit rule. They do not affect matches.
    var softAvg = softAverages(soft), softBench = {};
    SOFT.forEach(function (g, i) { softBench[g.id] = SOFT_BENCH[top][i]; });
    var softGaps = SOFT.map(function (g) {
      var roleLevel = softBench[g.id], avg = softAvg[g.id];
      return {
        id: g.id, name: g.name, you: avg, role: roleLevel,
        gap: round1(Math.max(0, roleLevel - avg)),
        items: (soft[g.id] || []).slice(), next: SOFT_CATALOG[g.id], sample: true
      };
    });

    return {
      version: 4, sample: true, completedAt: new Date().toISOString(),
      ratings: ratings, held: held, interests: interests,
      softSkills: soft, softAverages: softAvg, softBench: softBench, softGaps: softGaps,
      matches: matches, topRole: top, skills: skills, gaps: gaps,
      raised: raised, heldBack: heldBack, pathway: pathway, skipped: skipped,
      method: 'Demo scoring: roles ranked by Cosine Similarity against sample benchmarks until the trained Decision Tree and Random Forest models are connected. Soft skills are reported separately.'
    };
  }

  function roleById(id) { return ROLES.filter(function (r) { return r.id === id; })[0]; }

  /* ======================= Storage and API ======================= */

  // localStorage can throw in private windows or when storage is blocked.
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function remove(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function normEmail(email) { return String(email || '').trim().toLowerCase(); }

  async function hash(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('edupath:' + text));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    // Fallback for contexts without SubtleCrypto. Not secure; demo only.
    var h = 0; for (var i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
    return 'weak-' + (h >>> 0).toString(16);
  }

  function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email, program: u.program, yearLevel: u.yearLevel, isDemo: !!u.isDemo };
  }

  // Error with a field name so forms can show it next to the right input.
  function ApiError(message, field, code) {
    var e = new Error(message); e.field = field || null; e.code = code || 'error'; return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Sample answers for the team-only demo account, scored with the same model.
  var DEMO_RATINGS = { prog: 4, web: 3, backend: 4, mobile: 1, db: 4, testing: 2, net: 2, git: 3, devops: 1 };
  var DEMO_SOFT = {
    communication: [4, 4, 3],
    teamwork: [4, 4, 4],
    problemSolving: [3, 4, 3],
    adaptability: [3, 4, 4]
  };

  async function ensureDemoAccount() {
    var users = read(KEYS.users, []);
    if (!users.some(function (u) { return u.email === DEMO_ACCOUNT.email; })) {
      users.push({
        id: 'demo', isDemo: true, name: 'Demo Student', email: DEMO_ACCOUNT.email,
        program: 'BSIT', yearLevel: '4', consent: true, createdAt: new Date().toISOString(),
        passwordHash: await hash(DEMO_ACCOUNT.password)
      });
      write(KEYS.users, users);
    }
    var results = read(KEYS.results, {});
    if (!results.demo || results.demo.version !== 4) {
      results.demo = score(DEMO_RATINGS, ['Git and GitHub Essentials'], ['backend'], DEMO_SOFT);
      write(KEYS.results, results);
    }
  }

  async function live(path, body) {
    var res;
    try {
      res = await fetch(API_BASE + path, {
        method: body ? 'POST' : 'GET', credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw ApiError("Can't reach the EduPath server right now. Nothing was saved. Try again in a moment.", null, 'network');
    }
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw ApiError(data.detail || 'Something went wrong. Try again.', data.field, data.code);
    return data;
  }

  function sessionUserId() { var s = read(KEYS.session, null); return s ? s.userId : null; }

  var api = {
    mode: MODE,
    programs: PROGRAMS,
    yearLevels: YEAR_LEVELS,
    demoAccount: MODE === 'demo' ? DEMO_ACCOUNT : null,

    // POST /api/auth/register
    register: async function (input) {
      if (MODE === 'live') return live('/api/auth/register', input);
      await ensureDemoAccount();
      await wait(350);
      var email = normEmail(input.email);
      var users = read(KEYS.users, []);
      if (users.some(function (u) { return u.email === email; })) {
        throw ApiError('An account with this email already exists.', 'email', 'email_taken');
      }
      var user = {
        id: 'u' + Date.now().toString(36), name: String(input.name).trim(), email: email,
        program: input.program, yearLevel: input.yearLevel, consent: !!input.consent,
        createdAt: new Date().toISOString(), passwordHash: await hash(input.password)
      };
      users.push(user);
      if (!write(KEYS.users, users)) {
        throw ApiError("This browser isn't allowing EduPath to save data (private window or blocked storage). Nothing was saved.", null, 'storage');
      }
      write(KEYS.session, { userId: user.id });
      return { user: publicUser(user), hasResults: false };
    },

    // POST /api/auth/login
    login: async function (input) {
      if (MODE === 'live') return live('/api/auth/login', input);
      await ensureDemoAccount();
      await wait(350);
      var email = normEmail(input.email);
      var users = read(KEYS.users, []);
      var user = users.find(function (u) { return u.email === email; });
      if (!user || user.passwordHash !== await hash(input.password)) {
        throw ApiError("That email and password don't match an account. Check them and try again.", null, 'bad_credentials');
      }
      write(KEYS.session, { userId: user.id });
      var results = read(KEYS.results, {});
      return { user: publicUser(user), hasResults: !!(results[user.id] && results[user.id].version === 4) };
    },

    // POST /api/auth/logout
    logout: async function () {
      if (MODE === 'live') return live('/api/auth/logout', {});
      remove(KEYS.session);
    },

    // GET /api/me
    currentUser: async function () {
      if (MODE === 'live') return live('/api/me').catch(function () { return null; });
      await ensureDemoAccount();
      var id = sessionUserId();
      if (!id) return null;
      var user = read(KEYS.users, []).find(function (u) { return u.id === id; });
      return user ? publicUser(user) : null;
    },

    // GET /api/results/latest
    latestResults: async function () {
      if (MODE === 'live') return live('/api/results/latest').catch(function () { return null; });
      await ensureDemoAccount();
      var id = sessionUserId();
      var r = id ? (read(KEYS.results, {})[id] || null) : null;
      return r && r.version === 4 ? r : null;   // version 4: technical plus separately stored soft skills
    },

    // POST /api/assessments  (demo: scored in the browser with the sample model)
    submitAssessment: async function (answers) {
      if (MODE === 'live') return live('/api/assessments', answers);
      await wait(900);
      var id = sessionUserId();
      if (!id) throw ApiError('Your session ended. Sign in again to save your results.', null, 'no_session');
      var result = score(answers.ratings, answers.held, answers.interests, answers.softSkills);
      var all = read(KEYS.results, {});
      all[id] = result;
      if (!write(KEYS.results, all)) throw ApiError("This browser isn't allowing EduPath to save data. Your results weren't saved.", null, 'storage');
      remove(KEYS.draft + '.' + id);
      return result;
    },

    // Unsaved answers survive a page refresh (demo only).
    saveDraft: function (draft) { var id = sessionUserId(); if (id) write(KEYS.draft + '.' + id, draft); },
    loadDraft: function () { var id = sessionUserId(); return id ? read(KEYS.draft + '.' + id, null) : null; }
  };

  // Where to send someone right after they sign in or sign up.
  api.nextPageFor = function (session) { return session.hasResults ? 'results.html' : 'assessment.html'; };

  // Pages that need an account call this first; it redirects to sign in when there is no session.
  api.requireUser = async function () {
    var user = await api.currentUser();
    if (!user) { window.location.replace('login.html'); return null; }
    return user;
  };

  window.EduPath = {
    api: api,
    model: {
      LEVELS: LEVELS, SKILLS: SKILLS, SOFT: SOFT, SOFT_ITEMS: SOFT_ITEMS, GROUPS: GROUPS,
      ROLES: ROLES, BENCH: BENCH, SOFT_BENCH: SOFT_BENCH, CATALOG: CATALOG, SOFT_CATALOG: SOFT_CATALOG,
      CREDENTIALS: CREDENTIALS, score: score, roleById: roleById, softAverages: softAverages
    }
  };
})();
