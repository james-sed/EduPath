# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Frontend: plain HTML5, CSS3, and vanilla JavaScript (fetch-based async calls), per the project paper. Backend (not in current scope): Python FastAPI, MySQL, scikit-learn, NumPy. Current work is frontend-only; backend files are empty stubs.

## Users

- **Primary:** JRU College of Computer Studies and Engineering (CSE) students, specifically 3rd- and 4th-year students in BSIT, BSCpE, BSEcE, and BSEMC, who are unsure what entry-level IT employers actually expect and which roles fit their current skills.
- **Secondary:** recent CSE graduates (past two academic years) preparing to enter or re-enter the job market.
- Students and graduates are the only users in scope. The project paper also describes an admin panel for academic administrators to manage role benchmarks; that is **not** being built now.

## Product Purpose

EduPath is an IT career recommender and skill-gap diagnostic. A student rates their own competencies, the system predicts the entry-level IT roles that suit them, measures exactly where they fall short of each role's benchmark, and maps every gap to a JRU CSE subject or a CHED-recognized microcredential.

It exists because grades and rubrics record course performance, not job-ready skills, so graduates face skills mismatch. Success means a student leaves with: a predicted role, a match percentage, an itemized gap report, and a concrete learning pathway, and can come back after closing gaps to see the numbers move.

## Positioning

An explainable diagnostic, not a black box and not a job board. Roles come from supervised Decision Tree / Random Forest classifiers (with feature importance showing *why*). Fit is measured with Cosine Similarity, and gaps are isolated per skill with Euclidean deficit, `max(0, benchmark_i − student_i)`. Remediation draws from the student's own institution's subjects and CHED microcredentials, not generic online courses. Industry benchmarks are the target; the JRU curriculum is the remedy, not the yardstick.

## Operating Context

Flow (from the project paper's process model):

1. **Acquire:** multi-step intake: academic program, career interests/preferred track, existing credentials, and self-rated competencies on a 0–5 Likert scale across core programming, databases, tools, and soft skills.
2. **Preprocess:** handle missing values and normalize into skill vectors (backend).
3. **Classify:** predict the most suitable entry-level role.
4. **Diagnose:** match percentage via Cosine Similarity; per-skill deficits via Euclidean subtraction.
5. **Remediate:** map each gap to JRU CSE subjects and CHED microcredentials, excluding credentials the student already holds.
6. **Feedback loop:** the student updates their profile after completing subjects or credentials, and the system recalculates.

Pages in the repo: `index.html` (landing, built), `login.html`, `assessment.html`, `results.html` (empty), and `register.html` (linked but missing).

## Capabilities and Constraints

- Role domains in the project paper: Frontend Developer, Backend Developer, Mobile App Developer, Database Administrator, QA/Software Tester, Network/Systems Engineer.
- Not a job board, live job-fair directory, applicant tracking system, or resume portal.
- No employment guarantees: matches, percentages, and roadmaps are advisory guidance and must be framed that way.
- Data handling must respect the Philippine Data Privacy Act (RA 10173); store only what's needed.
- Evaluated against ISO/IEC 25010 for functional suitability, usability, and reliability, so results must be easy for students to interpret.
- Demo mode: until the FastAPI backend exists, the frontend runs on a mock data layer (`frontend/js/app.js`) that stores accounts and results in the browser's localStorage. It includes a demo account with clearly labelled sample results. The demo account is for the TypeShift team only: never advertise it or show its login on any public page. (In demo mode its details sit in client-side code; move it server-side when the backend exists.) Switching `MODE` to `live` sends the same calls to the API (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/me`, `/api/results/latest`). Pages must show the Demo Mode notice while it is active.
- Registration collects: full name, any email address (no @jru.edu.ph requirement, so graduates can sign up), password (8+ characters), program, year level (3rd year, 4th year, recent graduate), and Data Privacy Act consent. After sign-up, users go to the assessment; returning users go to results if they have them, otherwise the assessment. There is no password reset yet; users are told to email edupath@typeshift.org.
- Undecided: the project paper's "Pathway and Opportunity Generator" mentions JRU-associated internships and employment opportunities; whether these appear in the UI is not decided, and it must not become a job board.

## Brand Commitments

- Name: **EduPath**. Paper title: "EduPath: IT Career Recommender System Using Machine Learning Techniques."
- EduPath is a **student project** built for two courses (including ITC C311, JRU, AY 2026–2027) by team TypeShift: Trisha Nicole Aguilar, Gabriel Resultay, and Jharell James Sederia. It is not yet a thesis, and it is **not** an official or adopted JRU/CSE service. The UI must not imply university endorsement or speak as the college.
- Public wording: call it a "student project" or "student-built". Do **not** mention that it is coursework or name the courses on the site. Do not call it a thesis.
- Team name: **TypeShift** (the student team that builds EduPath). Copyright line: "© 2026 TypeShift".
- Team contact: **edupath@typeshift.org**; postal address: JRU College of Computer Studies and Engineering, 80 Shaw Boulevard, Mandaluyong City (user-approved). Never use an official JRU/CCSE email as EduPath's contact.
- Existing landing page (`frontend/index.html`) has an established look (navy/aqua/mint, Manrope + Source Serif 4 italics, logo mark). It is the incumbent visual reference, not a confirmed binding commitment.

## Evidence on Hand

- Project paper, Chapters 1–3 (problem, framework, objectives, scope, methodology); written in thesis format but not a thesis. Citable context: PSA 2025 (digital economy ₱2.25T, 8.5% of GDP), Melchor 2022 (39% overeducated / 25%+ undereducated), Tutor et al. 2021 (fewer than half of graduates get jobs aligned with their degree).
- **No real data yet:** no role benchmarks, no course/elective catalog, no microcredential list, no trained model, no user results. Any sample scorecard, role percentage, deficit, or course name must be clearly labeled as a sample/illustration, never presented as a real result or a real JRU course.
- No testimonials, user counts, accuracy figures, or evaluation results exist. Do not fabricate them. The "~5 min" self-assessment time is an estimate and is labelled as one on the landing page.

## Product Principles

1. **Show the math.** Every score should be traceable to a skill, a benchmark, and a deficit; explainability is the product.
2. **Every gap ends in a next step.** A diagnosis without a subject or microcredential attached is incomplete.
3. **Advisory, never a promise.** Frame results as guidance; never imply hiring, placement, or endorsement.
4. **Honest about what's real.** Samples are labeled as samples; nothing is invented while data doesn't exist.
5. **Built to be revisited.** The profile is meant to be updated as skills grow; progress over time matters.

## Accessibility & Inclusion

Usability is a formal ISO/IEC 25010 evaluation criterion, so results must be understandable to students without an ML background. The project paper frames equitable access to career guidance (regardless of personal professional networks) as a goal. No specific WCAG level has been set.
