# EduPath admin dashboard — notes & integration handoff

## Scope

This is the **admin scope only**. Four new files, nothing else touched:

- `frontend/admin.html` — sign-in gate + tabbed dashboard (noindex, not linked from public pages)
- `frontend/js/admin.js` — all admin logic (demo auth, data layer, three screens)
- `frontend/css/admin.css` — admin-specific styles, scoped under `.admin`
- `docs/admin.md` — this file

The student app (`frontend/js/app.js`, `frontend/css/styles.css`, assessment/results/pathway/landing pages) is **read-only** for this work. `admin.html` only **loads** `app.js` and `styles.css` to reuse `EduPath.model` and the design tokens.

## How to reach it

Open `frontend/admin.html` directly (or serve the `frontend/` folder). It is intentionally **not linked from any public page** and carries `<meta name="robots" content="noindex">`.

## Demo-mode admin auth (inside admin.js only)

- A team-only demo account is defined in `frontend/js/admin.js` (email/password in client-side code).
- **Demo-mode admin auth is NOT secure.** Credentials are never rendered on any page. Replace with `POST /api/admin/login` when the backend exists.
- The admin session lives in `sessionStorage` under `edupath.admin.session` (7-day TTL). Sign Out clears it.
- `admin.html` gates everything behind sign-in: gate → dashboard (Role benchmarks / Learning catalog / Skill-gap summary).

## Data contract (owned by this panel)

Admin edits are saved to `localStorage` under **new keys only**. The student model does not read them yet (that wiring touches `app.js` and is the groupmate's task — see the integration snippet below).

### `edupath.admin.bench`

```json
{
  "version": 3,
  "skillIds": ["prog","web","backend","mobile","db","testing","net","git","devops"],
  "roles": {
    "frontend": [4, 5, 2, 1, 2, 3, 1, 4, 2],
    "backend":  [4, 2, 5, 1, 4, 3, 2, 4, 3],
    "mobile":   [4, 3, 2, 5, 2, 3, 1, 4, 2],
    "database": [3, 1, 3, 1, 5, 2, 3, 3, 2],
    "qa":       [3, 3, 2, 2, 3, 5, 1, 3, 2],
    "network":  [2, 1, 2, 1, 2, 2, 5, 3, 4]
  },
  "savedAt": "2026-11-04T14:32:00.000Z"
}
```

- `version`: increments on every save (start at 1).
- `skillIds`: the skill ID order the values were saved in (always the current `SKILLS` order on save).
- `roles`: `{ roleId: [0..5, …] }`, one array per role in `skillIds` order. Values are integers 0–5 (gap = benchmark − rating).
- Never written by this panel: `edupath.users`, `edupath.session`, `edupath.results`, `edupath.draft`.

### `edupath.admin.catalog`

```json
{
  "version": 2,
  "skills": {
    "prog": [
      { "type": "JRU subject", "title": "Computer Programming 2", "provider": "", "link": "" },
      { "type": "CHED microcredential", "title": "Python Essentials", "provider": "", "link": "" }
    ],
    "web": [
      { "type": "JRU subject", "title": "Web Systems and Technologies", "provider": "", "link": "" }
    ]
  },
  "savedAt": "2026-11-04T14:32:00.000Z"
}
```

- `version`: increments on every save.
- `skills`: `{ skillId: [{ type, title, provider?, link? }] }`, one entry per current skill. `title` is required; `provider` and `link` are optional. Blank-title rows are dropped on save.
- Catalog types: the three paper types are always offered (`JRU subject`, `CHED microcredential`, `Professional-skills credential`), and any other type string already present in the model samples or saved data is shown as-is (e.g. `Microcredential`, `Suggested activity`).

## Robustness to the groupmate's changes

`admin.js` never hardcodes skills, roles, or catalog types. Everything is read at runtime from `window.EduPath.model`:

- `SKILLS`, `ROLES`, `BENCH`, `CATALOG`, `SOFT_CATALOG`.
- Skills are grouped by `kind` (`technical` / `soft`) when present, otherwise by `group`.
- BENCH rows are arrays in `SKILLS` order; cells are validated as whole numbers 0–5 with clamping.
- `model.score()` is **never called**. Preview (Cosine Similarity match %, top role, gaps) and summary aggregates are recomputed inside `admin.js`.
- If saved admin data doesn't match the current `SKILLS` (skill count or order changed), a clear notice is shown and "Reset to current sample data" is offered instead of crashing. Reset re-seeds from the model's built-in samples and saves a new version.

## Screens

1. **Role benchmarks** — roles × skills grid (columns grouped Technical / Soft when `kind` exists), integer 0–5 inputs with inline validation, live preview (sample profile → each role's match %, top role, that role's gaps), Save (new version, "Version N · saved <time>"), Discard changes, Reset to sample data, plus a note that benchmarks should be validated by IT practitioners and CSE faculty before real use.
2. **Learning catalog** — per skill: list, add, edit, remove resources (type, title, optional provider/link). Warns on skills with no resources. Same Save / Discard / Reset cycle.
3. **Skill-gap summary** — aggregates only: assessment count, predicted-role distribution (roles with < 5 students hidden), average gap per skill. Reads `edupath.results` tolerantly (`result.ratings` or `result.profile.ratings`, skips unreadable), recomputes gaps with the current benchmarks. Filters: program, year level. Never shows names, emails, or individual results. Demo-mode note: only results stored in this browser are visible.

## Future endpoints (named in admin.js, not implemented)

- `GET/PUT /api/admin/benchmarks` → `edupath.admin.bench`
- `GET/PUT /api/admin/catalog` → `edupath.admin.catalog`
- `GET /api/admin/gap-summary` → aggregate recompute from `edupath.results` (admin.js already does this locally)

## Integration handoff for app.js (groupmate, not part of this PR)

When the student side is ready to consume admin data, add helpers to `frontend/js/app.js` that prefer admin data and fall back to the built-in samples, matching by `skillIds`:

```js
// In EduPath.api (demo layer), read-only wrappers around localStorage:
var ADMIN_KEYS = { bench: 'edupath.admin.bench', catalog: 'edupath.admin.catalog' };

function adminBenchmarks() {
  var saved = read(ADMIN_KEYS.bench, null);
  var currentIds = model.SKILLS.map(function (s) { return s.id; });
  if (saved && saved.skillIds &&
      saved.skillIds.length === currentIds.length &&
      saved.skillIds.every(function (id, i) { return id === currentIds[i]; })) {
    return saved.roles;   // { roleId: [0..5, ..] } in current SKILLS order
  }
  return model.BENCH;     // fall back to built-in samples
}

function adminCatalog() {
  var saved = read(ADMIN_KEYS.catalog, null);
  var currentIds = model.SKILLS.map(function (s) { return s.id; });
  if (saved && saved.skills &&
      Object.keys(saved.skills).length === currentIds.length &&
      Object.keys(saved.skills).every(function (id, i) { return id === currentIds[i]; })) {
    return saved.skills;  // { skillId: [{ type, title, provider?, link? }] }
  }
  return model.CATALOG;   // fall back to built-in samples
}
```

Then `score()` (and the pathway/catalog rendering) can use `adminBenchmarks()` / `adminCatalog()` instead of `model.BENCH` / `model.CATALOG`, falling back to samples when admin data is missing or shaped for an older skill list. The admin panel writes new localStorage keys only, so merging this branch cannot break the student app: deleting `frontend/admin.html`, `frontend/js/admin.js`, `frontend/css/admin.css`, and `docs/admin.md` leaves the student app working exactly as before.

## Brand / conduct reminders

- All sample data (benchmarks, course names, match figures) is labeled SAMPLE — never fabricate real data or accuracy figures.
- Never imply JRU endorsement; EduPath is a student-built project by team TypeShift.
- Contact: `edupath@typeshift.org`; © 2026 TypeShift.
