---
name: EduPath
description: Explainable IT career diagnostics for computing students; every score shows its working.
colors:
  midnight-ink: "#161d6f"
  midnight-ink-deep: "#0e1350"
  ink: "#0f1450"
  ink-soft: "#3a4073"
  muted: "#666c93"
  line: "rgba(22,29,111,.13)"
  canvas: "#f6f6f6"
  paper: "#ffffff"
  sea-glass: "#98ded9"
  sea-glass-wash: "#d3eeec"
  fresh-mint: "#c7ffd8"
  mint-wash: "#e4f7ee"
  met-teal: "#0b6560"
  met-wash: "#d9ffe6"
  gap-wash: "#e4e6f8"
typography:
  display:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(38px, 5vw, 72px)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(30px, 3.7vw, 50px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "60px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  lead:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  accent:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "1.08em"
    fontWeight: 500
    letterSpacing: "-0.01em"
rounded:
  field: "14px"
  tile: "18px"
  card: "24px"
  panel: "28px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "24px"
  lg: "32px"
  xl: "48px"
  gutter: "28px"
  gutter-mobile: "20px"
  section: "112px"
  section-compact: "80px"
components:
  button-primary:
    backgroundColor: "{colors.midnight-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.midnight-ink-deep}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "14px 12px"
  chip:
    backgroundColor: "{colors.mint-wash}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
  pill-met:
    backgroundColor: "{colors.met-wash}"
    textColor: "{colors.met-teal}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  pill-gap:
    backgroundColor: "{colors.gap-wash}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "32px"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "36px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  input-focus:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  progress-bar:
    backgroundColor: "{colors.mint-wash}"
    rounded: "{rounded.pill}"
    height: "8px"
---

# Design System: EduPath

## Overview

**Creative North Star: "The Annotated Scorecard"**

EduPath looks like a well-marked paper: a clean white sheet where every number shows its working. Big confident numerals give the verdict, and around them the reasoning is spelled out in plain sight: which skills are met, which fall short, by how much, and what to take next. The interface should feel like a tutor's annotations rather than a machine's output. It is precise and legible, with a human hand in the margins.

The tone is friendly-rigorous. Heavy, tightly tracked Manrope carries authority. A single italic serif phrase per heading, set over a Fresh Mint highlighter stroke, adds the annotator's voice. Colour stays cool and quiet (deep navy ink on near-white, with sea-glass and mint washes), so the data and the highlights carry the emphasis. Surfaces are generously rounded and softly lifted, and density stays comfortable: sections breathe at 112px and cards hold 32–48px of padding.

Rejected outright: the generic SaaS template (purple gradients, glassy startup hero), the old university portal (grey, cramped, form-heavy), and gamified edtech (badges, confetti, cartoon mascots).

**Key Characteristics:**
- Numerals as the hero of any data surface: big, heavy, tightly tracked, in Midnight Ink.
- One italic serif "annotation" on the whole page, in the hero headline, highlighted in Fresh Mint.
- The road: How It Works is a single route connecting four stops, echoing the EduPath name.
- Met skills read teal on mint; gaps read navy on lavender-grey. Gaps are never alarm-red.
- Pill-shaped controls, 24–28px card corners, and navy-tinted soft shadows.
- Sample data is always labelled as a sample (see PRODUCT.md).

## Colors

A cool, low-saturation ink-and-paper palette with two fresh accents (sea glass and mint) used as washes and highlights, never as large saturated fields.

### Primary
- **Midnight Ink** (`midnight-ink`): The brand's voice. Used for primary buttons, the logo tile, big numerals, the "gap" pill text, focus rings, and progress-bar ends. Darkens to **Midnight Ink Deep** (`midnight-ink-deep`) on primary-button hover.

### Secondary
- **Sea Glass** (`sea-glass`): The atmosphere colour. Appears in the fixed radial glows behind the page and as the light end of the progress-bar gradient (Sea Glass → Midnight Ink). **Sea Glass Wash** (`sea-glass-wash`) tints the featured step card and the contact panel's left column.

### Tertiary
- **Fresh Mint** (`fresh-mint`): The highlighter. Used only as the underline stroke beneath italic accent phrases (lower 36% of the line), the background glow, and the logo's dot. **Met Wash** (`met-wash`) and **Met Teal** (`met-teal`) form the "skill met" pair.

### Neutral
- **Ink** (`ink`): Headings and primary body text.
- **Ink Soft** (`ink-soft`): Secondary text, lead paragraphs, and nav links.
- **Muted** (`muted`): Captions, small meta text, and footer headings.
- **Line** (`line`): A navy-tinted hairline (13% alpha) for every border and divider.
- **Canvas** (`canvas`): Page background, and the resting fill for inputs and inset tiles.
- **Paper** (`paper`): Cards, panels, and the focused input fill.
- **Mint Wash** (`mint-wash`): Chips, progress-bar tracks, and the full-bleed Features band. *In the code this token is named `--sand`, which is misleading; it is a pale mint.*
- **Gap Wash** (`gap-wash`): Background of gap pills and deficit badges.

### Named Rules
**The Gap Is Not a Failure Rule.** Skill gaps are styled in Midnight Ink on Gap Wash, never red, orange, or a warning palette. A gap is the start of a pathway, not a mark against the student.

**The Highlighter Budget Rule.** One Fresh Mint highlight per page, in the hero headline. If two things are highlighted, neither is.

**The Wash, Not Fill Rule.** Sea Glass and Mint appear as pale washes or thin strokes. No full-strength aqua or mint backgrounds behind text.

## Typography

**Display Font:** Manrope (with Public Sans, system-ui, Segoe UI)
**Accent Font:** Source Serif 4, italic only (with Georgia)

**Character:** A heavy, geometric grotesque that tracks tight for authority, interrupted by a warm italic serif that sounds like a handwritten margin note. The serif never sets a full sentence.

### Hierarchy
- **Display** (800, clamp 38→72px, 1.06, −0.045em): The hero headline only, one per page.
- **Headline** (800, clamp 30→50px, 1.1, −0.04em): Section headings. They stand alone, with no label above them.
- **Title** (700, 20px, 1.25, −0.025em): Card and step titles. Feature cards step up to 800 / 25px.
- **Numeral** (800, 60px, 1, −0.05em): Match percentages and step numbers (52px), always in Midnight Ink. Superscript units drop to ~26px.
- **Lead** (400, 18px, 1.65): Hero and section intro paragraphs, max ~560px.
- **Body** (400, 16px, 1.65): Running text. Card copy runs at 15px in Ink Soft.
- **Label** (700, 11–12px, +0.10–0.12em, UPPERCASE): Tags, field captions inside components, and footer column headings. Never placed above a page or section heading.
- **Accent** (Source Serif 4 italic 500, 1.08em): The single annotated phrase in the hero headline, set on the Fresh Mint highlighter stroke. Section headings are plain Manrope.

### Named Rules
**The Margin Note Rule.** The serif italic appears once per page, as the highlighted phrase in the hero headline. Never in section headings, body text, buttons, or as a standalone heading.

**The Tight Big, Open Small Rule.** Negative tracking scales with size (−0.05em on numerals, −0.025em on titles). Uppercase labels go positive (+0.10–0.14em). Body text is never tracked.

## Layout

A 1200px max-width container with 28px side gutters (20px under 720px). Content sits on a 12-column CSS grid with 24–32px gaps. Section heads split 7/5: the heading on the left, and an explanatory paragraph on the right aligned to the heading's baseline. Card groups deliberately use uneven spans (7/5, then a full-width row) so grids read as a composed spread rather than a uniform row. Prefer open layouts over cards when elevation does not signal hierarchy: How It Works is a route, not a card grid.

Vertical rhythm: sections at 112px (80px under 1020px), and 64px between a section head and its content. Breakpoints are 1020px (columns collapse to full width, nav links hide, and the scorecard un-tilts) and 720px (single-column forms, tiles, and footer; secondary header buttons hide). The page never scrolls horizontally.

## Elevation & Depth

A soft-lift system. Surfaces separate primarily by Paper-on-Canvas contrast plus a navy hairline. Shadows are always tinted Midnight Ink (never black), diffuse, and pulled up with a negative spread so they pool beneath the element rather than haloing it. Hover adds lift: cards rise 4px and their shadow deepens.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(22,29,111,.04)`): Default for resting cards; barely there.
- **Hover Lift** (`box-shadow: 0 22px 40px -24px rgba(22,29,111,.3)`, plus `translateY(-4px)`): Interactive cards on hover.
- **Hero Lift** (`box-shadow: 0 30px 60px -30px rgba(22,29,111,.28), 0 2px 6px rgba(22,29,111,.05)`): The scorecard, the one object that floats.
- **Panel** (`box-shadow: 0 20px 50px -30px rgba(22,29,111,.3)`): Large composite panels such as contact.
- **Button** (`box-shadow: 0 8px 20px -8px rgba(22,29,111,.55)`): Primary buttons only.

### Named Rules
**The Navy Shadow Rule.** Every shadow is tinted `rgba(22,29,111,…)`. Neutral black shadows break the ink-on-paper illusion.

**The One Floating Object Rule.** Each screen gets one Hero Lift element, the scorecard or the main result. It may be tilted (1.2deg) on wide screens and is always straightened below 1020px.

## Shapes

Generously rounded and friendly. Corners scale with the size of the surface: fields 14px, inset tiles 18px, cards 24px, panels and the scorecard 28px. Every interactive control and tag is a full pill (999px). Borders are always the 1px navy Line hairline. Bars and pills share the pill radius, so data marks feel like the same family as buttons. The logo is a 10px-radius navy tile holding a rising polyline that ends in a mint dot, which is the brand's one icon motif.

## Components

### Buttons
Friendly and confident: pills with a gentle lift.
- **Shape:** Full pill (999px), Manrope 600, 14px, 14px × 24px padding (small variant 11px × 18px at 13px).
- **Primary:** Midnight Ink fill, white text, Button shadow. On hover it darkens to Midnight Ink Deep and rises 1px.
- **Outline:** 1px Ink border, transparent fill. On hover it inverts to an Ink fill with white text.
- **Ghost:** Ink Soft text with no border, turning Midnight Ink on hover. Used for low-priority nav actions such as Sign In.
- **Focus:** No visible focus style is implemented yet. New work must add a `:focus-visible` ring that matches the input focus (4px, Midnight Ink at 12%), with a darker 2px outline for contrast.

### Chips
- **Style:** Mint Wash pill, Ink Soft text, 12px / 600. Inside tinted cards it becomes a translucent white (70%).
- **Use:** Static descriptors (method names, categories). Chips are not interactive in the current system.

### Status Pills (signature)
- **Met:** Met Wash fill, Met Teal text, with a 6px dot in the text colour.
- **Gap:** Gap Wash fill, Midnight Ink text, with the same dot.
- **Deficit Badge:** a Gap Wash pill at 700 weight showing a signed value (for example "−3.0 pts").

### Cards / Containers
- **Corner Style:** 24px (cards), 28px (feature cards and panels), 18px (inset tiles).
- **Background:** Paper by default. Highlighted variants use Sea Glass Wash or Met Wash. Inset tiles inside cards use Canvas.
- **Shadow Strategy:** Rest at default and Hover Lift on interaction (see Elevation & Depth).
- **Border:** 1px Line.
- **Internal Padding:** 32px for cards, 36px for feature cards, 48px for panels (24–28px on mobile).

### Inputs / Fields
- **Style:** Canvas fill, 1px Line border, 14px radius, 14px × 16px padding, Manrope 15px. Labels sit above at 13px / 600 in Ink Soft.
- **Focus:** Border shifts to Midnight Ink, fill brightens to Paper, plus a 4px Midnight Ink ring at 12% alpha.
- **App forms (register, sign in):** Paper fill with a stronger hairline (`rgba(22,29,111,.22)`) so fields read on the Canvas page; labels 13px / 600 above; hints 13px Muted below; Show/Hide is a text button inside password fields; selects carry a drawn chevron; single-choice options are radio pills that fill Midnight Ink when chosen; checkboxes are 20px, 6px radius, Midnight Ink when checked.
- **Error:** Form validation uses its own Error Crimson (`#a3263f` on `#fbe9ed`), separate from skill gaps: the border turns crimson and a 13px / 600 message appears under the field, plus one summary line above the form. Skill gaps still follow The Gap Is Not a Failure Rule.

### Navigation
- **Style:** Sticky 72px header (64px on mobile), translucent and blurred (14px backdrop blur), with a bottom Line hairline. Links are 14px / 500 in Ink Soft, gaining a 1px Midnight Ink underline that grows from the left on hover (.25s).
- **Mobile:** Links hide under 1020px. Under 720px only the primary CTA remains. No mobile menu exists yet.
- **Inconsistency to resolve:** the header uses a warm cream translucency (`rgba(250,247,242,.82)`) that doesn't match the cool Canvas. Prefer a Canvas-based translucency.

### Scorecard (signature)
The product in miniature: a Paper panel (28px, Hero Lift, 1.2deg tilt) with a tag and context line, the target role as a Title, a Numeral percentage beside an 8px progress bar (Mint Wash track, Sea Glass→Midnight Ink fill), a row of Met/Gap pills, and secondary matches as 5px muted bars. Results screens should grow out of this component.

### Route (signature)
How It Works is an ordered list drawn as a road: an 8px Midnight Ink band with a white dashed center line runs through four 44px numbered stop markers (Paper fill, 2px Midnight Ink ring). The last stop, the destination, is filled Fresh Mint. On desktop the road runs horizontally and ends at the last marker; below 1020px it turns vertical, with one road segment between each pair of stops. The road motif can return elsewhere (the logo, progress through the assessment) but appears once per page.

### "Why This Role?" Panel (signature)
The explainability view: a Canvas inset listing the skills that decided a match. Each row has the skill name, an influence tag (Met Wash "Raised match" or Gap Wash "Held it back"), and five rating pips: Midnight Ink filled pips are the student's rating, dashed pips are the gap up to the role's benchmark, with a "You 4 · Role 4" caption. It replaces repeating match bars, which already live in the scorecard.

### Auth Layout
Sign in and register share one layout (`css/styles.css`, `js/cast.js`): the floating island nav (logo plus one switch link), then a large rounded colour field (40px radius, the same drifting aqua, mint and lavender glows as the landing hero). On desktop the white form plate sits on the left and the right side holds a short promise and the role characters, which rotate every 4.2s with the role name as a caption. Below 960px the promise and character stack above the form. The demo account is never shown or offered; only a quiet "Demo mode: accounts are saved only in this browser" note remains.
Program choice is a 2x2 grid of tiles (code in 800 Midnight Ink plus the full name), filled Midnight Ink when chosen; year level uses radio pills.

### App Pages (assessment, results, pathway)
- **Assessment:** the whole step sits on a rounded colour field (40px, drifting glows). The progress is the road: six stops on a dashed line (interests, three technical skill groups, credentials, review; no soft skills), done stops navy with a check, the current stop Fresh Mint. The white step plate sits on the left; on the field to its right (no plate) the character for that skill group, a one-line note, and a live "2 of 4 rated" pill with dots (hidden below 960px). **Each rating is a level road:** six numbered stops (0 to 5) on a dashed line; choosing a level fills the line in navy up to it, earlier stops turn navy, and the chosen stop grows and turns mint. Level names show under the stops on desktop and in the row header everywhere ("4, Strong"). Interests and credentials are pill chips that fill navy when chosen. Review is a two-column list with small level pips.
- **Results, the story:** the first visit for a result plays a short story inside a one-screen colour field, one idea per screen, like a year-in-review: (1) "your results are in" with all six characters, (2) your best fit with its character, (3) the match numeral counting up, labelled "Sample benchmarks", (4) the next-best roles with bars, (5) what carried you, (6) where you can grow. Segmented progress at the top, Skip to Summary, Back and Next below; click the left third to go back and anywhere else to go forward, swipe on touch, arrow keys and Escape. Each screen shifts the field's glow colours. Content rises in with a short blur-to-sharp stagger. Every screen must fit above the controls, including on 1366x657.
- **Results, the summary:** shown after the story, and directly on later visits (with Replay My Results). A colour-field hero (best fit, match, character, Open My Learning Pathway), then two full-width plates stacked, never side by side (the skill list varies from 1 to 9 rows, so pairing it with the fixed ranking left blank space): "How you rank" is a numbered list with the best fit as a tinted tile on the left spanning the five runner-up rows on the right (same shape for every result), carrying a "Best fit" pill and the largest percentage, roles the student picked carry "You picked this", bars run on a visible 0–100 track, and each runner-up says "N points below your best fit". "What decided it" opens with a key (your level, still to go, the level the role expects), then "Strengths that raised your match" and "N skills to grow"; each skill is one row (on desktop a single line: name, meter, comparison, tag) with a five-step meter (navy up to your rating, an empty navy-outlined segment up to the role's level, a teal notch at the role's level) and a plain sentence: "You: Strong (4) · Role expects: Job-ready (5)". Gaps are counted in levels ("1 level to go"), never points. A colour-field call to action leads to the pathway page. The pathway itself is not on this page.
- **Learning pathway page (`pathway.html`):** a colour-field head ("Your learning pathway to <role>.", Sample catalog tag, character), then a vertical road with one numbered stop per gap, biggest first: the skill name, "N pts to close", rating pips, and the JRU subject and microcredential as two white tiles. The road ends at a mint stop: retake the assessment to see the match move. Credentials already held are listed as left out.
- **Empty and error states:** results or pathway without an assessment show one sentence and the assessment CTA. Pages that need an account redirect to sign in.

### Motion
One authored moment per page: on load, the scorecard's match number counts up and its bars fill (transform scaleX, 1.1s, `cubic-bezier(.16,1,.3,1)`, 120ms stagger). The finished state is the no-JS default, and `prefers-reduced-motion` skips the animation entirely.

### Landing Page Revision (role theater)
The landing page (`frontend/index.html`, `css/landing.css`, `js/landing.js`) follows these rules, which supersede earlier lines in this file where they conflict:
- **World:** a soft colour field. Light silver ground (`#fbfbfd`, `#f2f3f7`); hero and closing panels are large rounded fields (40px radius) lit by three slowly drifting gradient glows in aqua `#bfeee9`, mint `#d6fbe2` and lavender `#dfdffb`. Glows are radial gradients, never blur filters.
- **Signature, the role theater:** the hero promise and single CTA stay fixed; below them six role characters rotate every 5.6s. Each role brings its name, a one-line description, and three skill chips. Role tabs carry a fill-up timer; hovering or focusing the tabs pauses, a pause button stops it, reduced motion disables auto-advance.
- **Character art:** EduPath's own illustrations (`frontend/assets/roles/*.svg`): one shared half-body character rig behind a navy desk, varied skin tones and hair, brand palette only. Each loops a small job animation (page assembling, server LEDs and packets, phone feed and notification, database rows lighting, bug caught then checked, router waves and packets), plus blinking and breathing. All animation is CSS inside the SVG and stops under reduced motion. The six-roles section uses icons, not illustrations.
- **Scroll:** smooth momentum scrolling (Lenis 1.1.13, lerp 0.085) for wheel and trackpad, with an elastic stretch at the top and bottom of the page that springs back; touch keeps native scrolling, reduced motion keeps the browser default. The frame loop runs only while scrolling. Reveals rise with a slight overshoot (`cubic-bezier(.34,1.42,.48,1)`).
- **How it works:** four stops on the road (assessment, role matches, skill gap analysis, learning pathway); 2x2 on tablets, vertical road on phones.
- **Hero fit:** the hero is always exactly one screen tall (`100svh` minus the nav, max 880px). Desktop: the promise on the left (headline balanced over two lines), the role theater on the right with the character centred, skills floating asymmetrically around it (top-left at 17%, middle-right, lower-left), role text below and the tabs at the bottom with generous bottom padding. Phones and tablets: a compact stack whose sizes scale with screen height; the skills sit in a row and the pause button shares the tab row.
- **Cursor drift:** skill chips and the character sit at different depths and spring toward the pointer, then settle back; on touch devices they only bob gently.
- **Type:** Manrope only, self-hosted. Hero headline max ~58px, section headings max ~46px.
- **Containers:** no card grids. Role tiles are borderless until hover; FAQ answers glide open (height and opacity, spring curve) on a white panel.
- **Footer:** a rounded Midnight Ink panel with a faint oversized "EduPath" wordmark, and three columns.
- **Section personality (round 2):** each How It Works stop has a small animated vignette (rating dots, match bars, a gap pip, a path to a flag) that plays when the road reveals.
- **Six roles, the roster:** no tiles, chips or cards. Left: the heading and a sticky character stage (rounded colour field whose glow shifts per role). Right: six role names set large (24 to 38px, 800) on hairlines, muted until active. Hovering (after a 110ms pause, so a quick sweep doesn't flick through characters), focusing or tapping a name opens it in place (description, then its three skills as plain text with dot separators) and puts its character on the stage. Every open row is the same height (descriptions reserve two lines), so the list never changes size and the sticky stage never shifts; names and the stage scale with screen height so both columns fit one screen. Characters crossfade in place with a 6px lift at most. Below 900px the stage hides and the open row shows its character inline. The evidence figures sit in a colour-field band and count up once. The closing panel lines up all six characters, bobbing gently, above "Which role will you grow into?".
- **Motion budget:** cursor drift is slow and heavily damped (one soft overshoot, settles in about 1.2s) so fast mouse movement never looks wiggly.
- **One CTA:** "Analyze My Skills". The demo account is never shown publicly.

## Do's and Don'ts

### Do:
- **Do** make the numeral the loudest thing on any data surface: Manrope 800, −0.05em, Midnight Ink.
- **Do** pair every score with its reasoning (met/gap pills, deficits, the next step), in keeping with "The Annotated Scorecard".
- **Do** tint every shadow and border with Midnight Ink (`rgba(22,29,111,…)`).
- **Do** use full-pill shapes for buttons, chips, pills, and bars, and 24–28px corners for cards.
- **Do** label sample or illustrative data visibly (the "Sample scorecard" tag pattern).
- **Do** add `:focus-visible` rings to every interactive element and honour `prefers-reduced-motion` (already zeroed globally).

### Don't:
- **Don't** drift toward the generic SaaS template: no purple/blue gradient heroes, glassmorphism cards, or gradient text.
- **Don't** drift toward the old university portal: no grey, cramped, form-heavy screens or dense tables without breathing room.
- **Don't** add gamified edtech tropes: no badges, streaks, confetti, trophies, or cartoon mascots.
- **Don't** colour gaps red or orange; use Gap Wash with Midnight Ink.
- **Don't** set body copy, buttons, or whole headings in the serif italic.
- **Don't** put a small uppercase label (eyebrow or kicker) above a heading; the heading carries its own weight.
- **Don't** use the Fresh Mint highlight or the serif italic outside the hero headline.
- **Don't** use black or grey shadows, or sharp (under 14px) corners on cards.
