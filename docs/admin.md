# EduPath admin dashboard: Overview (notes for the team)

## Scope and files

Admin scope only. These files make up the module; nothing else in the repo was changed:

- `frontend/admin.html`: sign-in gate and the Overview dashboard (noindex, not linked from public pages)
- `frontend/js/admin.js`: demo sign-in, read-only data access, aggregates and charts
- `frontend/css/admin.css`: admin styles, scoped under `.admin`
- `docs/admin.md`: this file

`admin.html` loads `js/app.js` read-only (to use `EduPath.model`), Phosphor icons from unpkg (same as the
student pages) and Chart.js 4.4.1 from jsDelivr. It does **not** load `css/styles.css`, so admin styles can't
leak into student pages. Deleting the four files leaves the student app working.

## Running it

Serve the `frontend/` folder (e.g. `python -m http.server 8000` inside `frontend/`) and open
`http://localhost:8000/admin.html`. The demo admin account is defined in `admin.js` (team only, never shown on
a page). Demo auth is not secure and must move server-side (`POST /api/admin/login`).

## Layout

- Navy sidebar: logo, Overview, Role benchmarks, Learning catalog, signed-in email, Sign out. Sections are routed by
  the URL hash (`#overview`, `#benchmarks`, `#catalog`). Role benchmarks and Learning catalog show an empty state
  for now; the filters and "Last updated" line appear on the Overview only.
  Below 1020px it becomes a top bar; below 720px nav items are icon-only.
- Top bar: page title, Program and Year level filters, Sample data switch. "Last updated" line below.
- 12-column card grid. Every card has a title, a one-line subtitle, the chart, and a "Based on N students" footer.

## Cards (metric, definition, chart)

| Card | Definition | Chart |
|---|---|---|
| Students assessed | Unique students, latest result each; sparkline = assessments per week | KPI |
| Assessments, last 30 days | Assessments completed in the last 30 days, change vs the 30 days before | KPI |
| Average skill gap | Mean of max(0, benchmark - rating) over technical skills, for assessments in the last 30 days, vs prior 30 days | KPI |
| Meeting their benchmark | Share of students with no technical gap for their predicted role | KPI |
| Assessments over time | Assessments per week for 12 weeks; first assessments and retakes | Line |
| Predicted roles | Students per predicted role | Donut |
| Average gap by skill | Average gap per technical skill, largest first | Horizontal bar |
| Students by program | Students per program | Pie |
| Students by year level | Students per year level | Bar |
| Skill-gap heatmap | Average gap per skill, rows by program or year level | Heatmap table |
| Most common gaps | Top 5 skills by average gap, with % of students below benchmark | Ranked list |
| Average gap over time | Weekly average gap, technical vs soft skills | Line |
| Soft skills | Average soft-skill rating vs the level each student's role expects (advisory, not in the match) | Grouped bar |
| Self-rating distribution | Share of students at each level 0 to 5, per technical skill | 100% stacked bar |

Gaps use the saved admin benchmarks (`edupath.admin.bench`) when they match the current skills, otherwise
`EduPath.model.BENCH`. Soft skills use `EduPath.model.SOFT` and `SOFT_BENCH` and are never mixed into the
technical figures, matching the student side.

## Colours

- Roles keep one colour in every chart: Frontend navy `#161d6f`, Backend blue `#3b6fd8`, Mobile teal `#14a098`,
  Database violet `#7b5bc9`, QA amber `#d99a2b`, Network rose `#cc5a7e`.
- Heatmap: six stepped bins from mint (0, meets benchmark) through teal to navy (over 2.0 levels), number in
  every cell. No red, per DESIGN.md ("gaps are not failures").
- Rating levels 0 to 5: light to dark Midnight Ink.

## Data and privacy (RA 10173)

- Reads `edupath.users` and `edupath.results` only; never writes student data. Results are read tolerantly
  (`ratings` or `profile.ratings`; `predictedRole`, `topRole` or `matches[0].role`; `softAverages` or `softSkills`).
- Aggregates only. Groups under 5 students are folded into "Other" (donut, pie, bar), shown as "<5" (heatmap),
  or left blank (weekly averages). If fewer than 5 students match the filters, the board shows a message instead.
- Sample data: a deterministic generated cohort (132 students, about 22% with a retake) for demonstrations.
  It turns on automatically when fewer than 5 real results exist; the switch in the top bar changes it.

## Later (needs app.js, coordinate with the student-side owner)

- Role benchmarks and Learning catalog screens (an earlier version exists in commit `195a6a7`).
- Wiring the student model to read admin-saved benchmarks and catalog.
- Replacing localStorage with `GET /api/admin/overview` when the backend exists.
