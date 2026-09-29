# Not to Scale — project handover

The single source of truth for this project: what it is, how it works, what's been built, what went
wrong and why, and what could come next. If a Claude session loses its context, read this file first,
then `BUILDLOG.md` (detailed history) and `FACTS.md` (every on-screen fact and its source).

Last updated: 2026-09-30, round 4 (catalysts, Maxwell–Boltzmann, links to pages, self-test).

---

## 1. What it is

An interactive, animated picture book that explains IB Chemistry. Each page is one scene: a simple
flat illustration that moves gently, a short caption, and things you can tap. Tapping peels back the
textbook cartoon to show what's really going on. The running voice is honesty about simplification:
small, slightly cheeky footnotes like "not to scale, of course" and "protons aren't really red".

- **Audience:** IB Chemistry students (16–18) and anyone curious. For understanding, not revision —
  no quizzes, no scores.
- **Builder:** an IB Chemistry student, new to coding. Built with Claude Code across several sessions.
- **Origin:** `chemistry-storybook-spec.md` (the original brief) and `sketch.png` (the builder's mock-up).
- **Status:** 19 pages: the spec's 17, plus Maxwell–Boltzmann and catalysts. All six spec phases are
  done, three rounds of the builder's feedback applied, plus links to single pages and an automated
  self-test (PASS: 19 pages, 87 transitions). Not yet deployed.

---

## 2. Running, testing, deploying

**Run it:** double-click `index.html`. No install and no server. It needs internet the first time
for the Google Fonts and GSAP (from cdnjs).

**Test it the way Claude has been testing it:**
```bash
python -m http.server 8400 --bind 127.0.0.1
```
Then open `http://127.0.0.1:8400/index.html`. Use a **new port for each clean test**: the browser
pane caches JS/CSS hard across reloads on the same port. Stop the server afterwards.

**Automated self-test:** open `index.html?test` (works by double-click too, or on the server:
`http://127.0.0.1:8400/index.html?test`). It opens the book and walks every page and every reachable
state at 20× speed, then shows PASS or a list of problems in a panel. The full result is also in
`window.__selftest` for reading from a script. See §5 for what it checks. Run it after every change.

**Links to a page:** `index.html#<page id>` (ids are in §7). The URL follows page turns, and the browser's
Back/Forward buttons turn pages.

**Syntax-check every file:**
```bash
for f in js/*.js pages/*.js; do node --check "$f" || echo "FAIL $f"; done
```

**Deploy:** manual GitHub Pages steps are in `README.md` ("Publishing it on GitHub Pages"). It needs
the builder's own GitHub account. There is no `gh` CLI in the build environment. The git branch is
`master` locally; the README tells you to rename it to `main` when pushing.

---

## 3. Hard constraints (from the spec — don't break these)

- Works by **double-clicking `index.html`**: no build tools, no ES modules, no `fetch()` of local
  files, plain `<script>` tags in order.
- Drawings are **inline SVG drawn in code** on a **1000 × 480 viewBox**.
- Animation is **GSAP 3.12.5** from cdnjs. Sound is **synthesised with the Web Audio API** (no audio files).
- **One idea per page. Captions are one or two sentences.** Start with the simple picture, then peel it back.
- **Every fact is checked** and logged in `FACTS.md`. Flag anything uncertain rather than guess.
- **Tap-gold (`--tap`, #F5A524) means "you can tap this" and nothing else.**
- **Colour is never the only differentiator:** things also differ by size, outline or label.
- **`prefers-reduced-motion` is respected:** no idle motion, transitions run 12× faster, hint rings
  become a still outline.
- Sound is soft (master gain 0.15), never the only signal, and the attention chime plays at most once
  per page state.
- Out of scope unless the builder says otherwise: quizzes/scores, accounts, narration, 3D, a mobile app.

---

## 4. File map

```
index.html              page shell: frame, cover, topbar, About panel, scene <svg>, nav, contents, sound lab.
                        Loads GSAP, then js/*, then pages/* in book order, then Book.boot().
css/styles.css          palette tokens, layout, shared SVG classes (.orbit .proton .electron .tap-ring .hit ...)
js/sound.js             Sound: zwoop, tindin, pop, page (+ unlock, mute, params for the lab)
js/lab.js               the "sound lab" tuning panel (sliders, copyable numbers)
js/camera.js            Camera.zoomTo and Camera.crossZoom (hydrogen page's 4000× zoom out to the park)
js/hint.js              Hint.ring(selector, "x y") — the pulsing gold "tap me" outline (works on any shape)
js/particles.js         ParticleBox(box).step(particles, dtSeconds, onCollide?) — bouncing particles
js/engine.js            Book: register, plan, boot, debug; page loading, states, transitions, captions,
                        hotspots, attention chime, contents page, About panel, keyboard, #page links
js/selftest.js          the automated test; inert unless the URL has ?test (loaded right after GSAP so it
                        catches errors thrown while the page files register)
pages/00-planned.js     Book.plan([...]) — the contents page's topic grouping
pages/01..17-*.js       one page each (see §7); 14a-maxwell.js and 14b-catalysts.js sit between collision
                        theory and equilibrium (file numbers are just for tidiness)
pages/_template.js      copy this to start a new page (NOT loaded by index.html)
README.md               beginner-facing how-to + GitHub Pages instructions
BUILDLOG.md             chronological log of every phase, page, bug and fix
FACTS.md                table of every on-screen claim and its source
chemistry-storybook-spec.md, sketch.png   the original brief and mock-up
PROJECT.md              this file
```

---

## 5. How the engine works

A page is a plain object passed to `Book.register({...})`:

| Field | Meaning |
|---|---|
| `id` | unique string |
| `topic`, `title` | must match a line in `00-planned.js` to appear under the right heading on the contents page |
| `description` | read by screen readers (goes into the SVG `<desc>`) |
| `svg` | markup string injected into `#pageRoot` |
| `legend` | optional HTML shown bottom-left |
| `start` | name of the first state |
| `states` | `{ name: { caption, footnote?, legend?, final?, onEnter?, next?, back?, tap?, replay? } }` |
| `hotspots` | `[{ id, selector, label, hint }]` — `selector` points at an invisible `.hit` shape |
| `setup(ctx)` | once, when the page loads (build DOM, start tickers) |
| `intro(ctx)` | returns a timeline that reveals the page (default: fade everything with `class="fade"`) |
| `idle(ctx)` | starts looping ambient motion; **skipped automatically under reduced motion** |
| `teardown(ctx)` | once, when leaving the page (remove tickers) |

A **transition** (`next` / `back` / `tap` / `replay`) is
`{ to, hotspot?, sound, play(ctx) → timeline, before?(ctx), captionOut?, captionAt? }`.
`to` can be a function of `ctx`. `tap` can be one transition or a list (one per hotspot).
`sound` is one of `"zwoop" | "zwoop-rev" | "pop" | "page" | "tindin"`.

**Engine behaviour worth knowing:**
- A state with no `back` → Back turns to the previous page. `final: true` → Next turns to the next page.
- Captions live in two stacked layers that crossfade; `captionAt` is when the new one fades in.
- Hotspots only take clicks/focus when the current state has a tap for them, and never while busy.
- The attention chime fires after 8 s idle, once per page state: it plays `tindin` and pulses the hint
  strongly (or makes Next glow gold if there's nothing to tap).
- `unloadPage` kills tracked timelines and every tween on scene elements. `idle()` runs again after
  every transition finishes.
- `ctx` = `{ svg, $, $$, gsap, Sound, Camera, reduceMotion, data, hotspotEls, track() }`. Put page
  state in `ctx.data`.
- Under reduced motion every transition timeline gets `timeScale(12)`, so pages don't need their own
  reduced-motion branches for transitions. Tickers (particles) check `ctx.reduceMotion` themselves.

**Links (`#id`):** `boot()` opens the page named by `location.hash` (unknown or empty = page 1).
`turnPage` writes the new page's id into the hash, which adds a browser history entry; a `hashchange`
listener turns to whatever page the URL names (browser Back/Forward, or a pasted link). If a transition
is running, it retries every 150 ms. It uses `location.hash`, not `history.pushState`, because pushState
throws on `file://`. Only the page is in the URL, not the state within it.

**`Book.debug`** (for the self-test): `turnPage(i)`, `index()`, `stateName()`, `busy()`, `started()`, `ctx()`.

**Self-test (`js/selftest.js`):** after opening the book it visits every page. On each, it keeps
taking a transition it hasn't tried yet (taps, then next, replay, back), stepping to a neighbouring
state when the current one has nothing left, until nothing is left. Hotspots are clicked with real
click events and buttons with `.click()`, so hidden buttons and switched-off hotspots get reported.
After every step it checks: the landing state matches the transition's `to`; the right caption shows
and the old one has faded; final states offer Next; `.tap-ring` and text lie inside 0–1000 × 0–480
(text measured after its groups' translation, camera-scaled text skipped); `ctx.data.particles` stay
inside the page's `rect.fade[fill="none"]` box; nothing is logged via console.error/warn or thrown.
Then it sets `#ionic`, checks it opens, calls `history.back()` and checks it returns. It pumps
`gsap.ticker.tick()` every 16 ms so it runs even while the tab isn't painting. What it doesn't check:
how things look, sound, keyboard-only use, reduced motion, phone layout.

**Adding a page:** copy `pages/_template.js`, give it a unique `id`, match `title`/`topic` to a line in
`00-planned.js` (or add one), add its `<script>` tag to `index.html`, refresh. Then add its facts to
`FACTS.md` and an entry to `BUILDLOG.md`.

---

## 6. Design system

**Palette (CSS custom properties on `:root`):**

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFDF8` | page background |
| `--ink` | `#1B1A22` | text, lines, axes |
| `--proton` | `#FF3131` | protons, nuclei, positive ions, neon-20 |
| `--electron` | `#0B44A8` | electrons, negative ions, reactants, neon-22 |
| `--frame` | `#8B5CF6` | purple page frame, focus outlines, contents headings |
| `--tap` | `#F5A524` | **reserved:** "you can tap this" |
| `--ion` | `#4C6E9E` | generic particles |
| `--heat` | `#E05A2B` | heat, exothermic, product (equilibrium) |
| `--product` | `#2E9E63` | product (collision theory) |

**Type:** Fredoka (titles, labels, symbols inside atoms) and Nunito (body, captions, italic footnotes).

**Recurring motifs:** purple frame, centred title, rule with square end-caps drawing outward, caption
above the illustration, legend bottom-left, pill-shaped buttons.

**Tap hints:** a gold outline that gently pulses. Use a **rounded rect ("squircle") fitted to the
tappable things**, not a big circle. Big circles went off the canvas on several pages and the builder
prefers the squircle. `Hint.ring` works on a `<rect class="tap-ring" rx="…">` unchanged.

**Sound defaults (`js/sound.js`):** master 0.15; zwoop sine 300→900 Hz over 1 s; tin-din triangle
1570 Hz then 1175 Hz, 0.15 s gap, 0.65 s decay; pop 600→300 Hz in 0.09 s; page-turn band-passed
noise sweeping 800→2600 Hz in 0.35 s.

---

## 7. Page catalogue

Book order is the order of `<script>` tags in `index.html`. The # column is the file number; the page
counter in the book differs from 15 onwards (Maxwell–Boltzmann is page 15, catalysts 16, equilibrium 17,
acids 18, redox 19). Page ids for `#` links, in book order: hydrogen, isotopes, shells, ionic, massspec,
emission, mole, gases, covalent, metallic, periodic, functional, energy, collision, maxwell, catalysts,
equilibrium, acids, redox.

| # | File | IB | Shows | Interaction |
|---|---|---|---|---|
| 1 | `01-hydrogen.js` | S1.2 | Proton + orbiting electron | Tap → zoom 5× into the proton (marble / half a kilometre). Back → zoom out; the electron smears into a 420-dot cloud (r² e^(−2r/a)) with "it could be here… or here" arrows. Next → camera pulls back 4000× to a (bald) person in a park: "it's really small". |
| 2 | `02-isotopes.js` | S1.2 | H-1, deuterium, tritium side by side | Tap any atom → zoom into its nucleus to count neutrons. Several hotspots in one state. |
| 3 | `03-shells.js` | S1.3 | Atom built up from H to Na | Each tap adds a proton and an electron; shells fill 2, 8, then 1. Ends dissolving the rings into clouds. |
| 4 | `04-ionic.js` | S2.1 | Na and Cl with shells | Tap → Na's outer electron transfers to Cl (Na⁺ / Cl⁻). Tap → ions pull together. Back reverses each step. Squircle hint. |
| 5 | `05-massspec.js` | S1.2 AHL | Ion source → magnetic field → detector on the left, bar graph on the right | Tap → two neon ions curve (lighter bends more) leaving dotted trails, then 24 more fire automatically, each bumping its bar 5 px until the graph settles at 100:20. Faint dot grid = field out of the page. |
| 6 | `06-emission.js` | S1.3 | H atom + dark spectrum strip + "size of the jump" bars | Four taps: the electron jumps out and falls back to the 2nd shell (Balmer), a coloured line appears and a bar grows with the jump size. After the 4th, dots fly from each bar to its line. Back removes one. |
| 7 | `07-mole.js` | S1.4 | Jar of specks | Tap → number flickers up to 6.02 × 10²³, "particles in one mole". |
| 8 | `08-gases.js` | S1.5 | 16 particles in a box | Tap → heat: particles speed up, hit the walls more often and harder. |
| 9 | `09-covalent.js` | S2.2 | Two H atoms | Tap → they meet; electrons form a shared pair; "H₂". |
| 10 | `10-metallic.js` | S2.3 | Ion lattice in an electron sea | Tap → bottom rows slide like a hammer blow; the sea still holds them (malleability). |
| 11 | `11-periodic.js` | S3.1 | Na → Ar in a row | Tap → atoms shrink left to right. Relative sizes only. |
| 12 | `12-functional.js` | S3.2 | Carbon chain + end-group pill | Taps cycle –OH, –COOH, –Cl, –NH₂ with family names. The pill is sized per label. |
| 13 | `13-energy.js` | R1.1 (+ R2.2 Ea) | Energy profile with activation-energy bracket | Tap → ball rolls over the hump to lower products (exo). Tap → endo, higher products. The curve provably peaks at `HUMP_Y`. |
| 14 | `14-collision.js` | R2.2 | Red A + blue B particles in a box | Only hard enough collisions react (turn green). Tap → heat: faster, more successful collisions. |
| 14a | `14a-maxwell.js` | R2.2 | Kinetic-energy histogram with an activation-energy line and an "enough energy to react" count | Tap → 200 particles drop one by one into exact 3D Maxwell–Boltzmann bar heights (erf-based CDF, largest-remainder rounding, shuffled arrival), then the smooth curve fades in: 6 past Ea. Tap → heat (T × 1.6): the old curve becomes a dashed ghost, the bars re-measure, and the new curve is lower and wider: 25 past Ea. Back walks both steps back. Labels "cooler"/"hotter" on the curves. |
| 14b | `14b-catalysts.js` | R2.2 | Exothermic profile, tall hump, "Ea without catalyst" bracket | Tap → a dashed green, lower hump fades in with its own "Ea with catalyst" bracket and dashed guides from each peak to the axis; the ball rolls the lower route (`getPointAtLength`). Back → removed. Same peak maths as page 13. |
| 15 | `15-equilibrium.js` | R2.3 | 20 particles flipping reactant ⇄ product | Tap → equal rates (≈10:10). Tap → rates favour product (≈3:17, large K). Tap → favour reactant (≈14:6, small K). The rates are re-aimed live, not reset. Back walks the scenarios back. |
| 16 | `16-acids.js` | R3.1 | HCl, NH₃, H⁺ | Tap → proton hops across; Cl⁻ and NH₄⁺ (Brønsted–Lowry). |
| 17 | `17-redox.js` | R3.2 | Two electrodes, wire, solution | Tap → electrons loop anode → cathode; oxidation / reduction labelled (OIL RIG). |

---

## 8. Hard-won lessons (read before touching animation code)

1. **Don't CSS-scale an SVG element whose position something else also drives.** GSAP
   `scale` + `svgOrigin`/`transformOrigin` writes a CSS transform that can persist as a stray
   translate (functional-groups badge), anchor to the wrong point once the element has moved (energy
   ball "swaying"), or fight a physics ticker writing `cx`/`cy` (collision particles leaving the box).
   **Pulse the attribute you already own instead** (`attr: { r }`, or `x/y/width/height` for rects).
2. **Don't mix a manual `setAttribute("transform")` with GSAP `x`/`y` on the same element.** Use
   `gsap.set` for the start position, or do the whole thing by hand like `camera.js`.
3. **CSS class rules beat SVG presentation attributes.** `<circle class="particle" fill="red">`
   renders in `.particle`'s colour. Use `style="fill:…"` (or no class) when colour must differ.
4. **A quadratic Bézier peaks at a 25/50/25 blend of its three points**, not at its control point.
   To pass through a peak Y with symmetric x: `controlY = 2·peakY − ½(startY + endY)`.
5. **The intro fades by selector.** If you change an element's tag (circle → rect), check `intro()`'s
   selector list or it stays at `opacity: 0` forever.
6. **Keep every hint and label inside 0–1000 × 0–480.** Several hint circles had `cy − r < 0`.
7. **GSAP ticker `dt` is in milliseconds.** `ParticleBox.step` wants seconds: `Math.min(dt, 50) / 1000`.
8. **Nesting moves compound.** Covalent-bond electrons were children of the sliding atoms and double-moved.
9. **When a radius grows mid-flight, reclamp** the position to the walls straight away.
10. **Base `.dot` has no size.** Legend swatches need explicit `width`/`height`.
11. **Browser-pane testing quirks:** the GSAP ticker only advances on repaints, so interleave `wait`
    with `screenshot`. Never call `gsap.ticker.lagSmoothing(0)` while testing (it starves the catch-up
    and looks like a frozen page). Restart the server on a fresh port for a clean test. The pane
    sometimes misses the first click on the cover; `find` + click by ref is reliable.
12. **A GSAP timeline with a `delay` hasn't placed anything yet.** A `tl.set(x, y)` inside a delayed
    timeline leaves the element at (0, 0) until the delay ends (redox electrons in the top-left corner).
    `gsap.set` it before building the timeline.
13. **GSAP 3 has no `gsap.ticker.useRAF`.** To keep animations advancing in a tab that isn't painting,
    call `gsap.ticker.tick()` from a `setInterval`.
14. **Links: `location.hash`, not `history.pushState`**, because pushState throws a SecurityError on `file://`.
15. **Changing only the `#` part of the URL doesn't reload the page.** When scripting tests, a "fresh"
    navigation to `index.html#x` from `index.html#y` keeps the old, already-open book.
16. **Chemistry checks that mattered:** emission falls end on shell 2 (Balmer, visible), not shell 1
    (Lyman, UV); the "glass of water vs oceans" claim was Fermi-checked; no overly precise noble-gas
    radii; the equilibrium K is flagged in `FACTS.md` as simplified for a one-step A ⇌ B model.

---

## 9. Known issues and risks (not yet fixed)

- **Remaining scale-pulse risks (lesson 1).** Still using `scale` with `svgOrigin`/`transformOrigin`
  on elements that also move or get re-tweened: `06-emission.js` idle on `#e` (its `cx` is also
  tweened on each fall), `09-covalent.js` idle on the electrons, `16-acids.js` idle on `#proton` (which
  also hops across), `11-periodic.js` idle on atoms that also shrink, `04-ionic.js` nucleus pulses
  (the groups also slide). None reported broken yet, but it's the same bug class as three real bugs.
  The fix each time: pulse `r` instead.
- **Contents numbering isn't in syllabus order.** Numbers follow `index.html` script order, so under
  Structure 1 the list reads 1, 2, **5**, 3, 6, 7, 8. Fix: reorder the script tags to match
  `00-planned.js` (Mass spec moves to #3, Ionic to #8, and so on). Reactivity 2 is already in order.
- **The strong hint pulse scales the outline up to 1.3×**, so on wide pages (periodic trends: an
  836 px squircle) it briefly spills past the canvas edge while pulsing. It's clipped, so harmless.
- **The "sound lab" link is still visible** at the bottom of every page. BUILDLOG says to hide it
  before sharing.
- **Emission page:** the "hydrogen's emission spectrum" label sits only 24 px under the strip.
  Tight but legible.
- **The About page's attribution is a placeholder** ("Made by an IB Chemistry student…"). The builder
  may want their name.
- **Not deployed yet.** GitHub Pages steps are in README.
- **Needs internet the first time** (GSAP and fonts from CDNs).
- **Reduced motion wasn't verified end-to-end live.** The pane can't emulate that media query; the
  logic was reviewed and spot-checked in code.

---

## 10. Session history (short version; details in BUILDLOG.md)

1. **Phases 1–3:** hydrogen page, flat style chosen, title "Not to Scale", sounds synthesised and
   tuned by ear, the tap-to-zoom, the cloud reveal, the 4000× zoom out to the park.
2. **Phase 4:** pages became data, the engine, contents page, Replay, several hotspots per state.
3. **Phase 5:** isotopes, shells, then ionic plus the whole backlog (pages 4–17), each tested in the browser.
4. **Phase 6:** a book-wide reduced-motion fix (idle skipped centrally in the engine), colour-only
   fixes, phone test at 375×812, About page, GitHub Pages instructions.
5. **Feedback round 1** (commit `56d1225`): mass spec rework (curves, trails, field dots, swarm, layout;
   fixed the class-overrides-fill bug), ionic squircle hint, emission jump-size bars + comparison
   sweep, mole text moved clear of the jar.
6. **Feedback round 2** (commit `cfb8532`): functional-group labels (residual-transform bug + pill
   badge), energy curve maths + activation-energy bracket + ball sway fix, collision squircle +
   containment fix, equilibrium squircle + three K scenarios.

7. **Round 4:** Maxwell–Boltzmann and catalysts pages, `#page` links with browser Back, and the
   `?test` self-test. On its first run the test found 7 more off-canvas circular hints (now fitted
   squircles on every page) and the redox electrons parked at (0, 0). It now passes: 19 pages, 87
   transitions. This round was run on Opus 5.5 as a trial.

**How the builder gives feedback:** screenshots plus a numbered list, one item per page. They
appreciate root causes being found, not just symptoms patched.

---

## 11. Testing checklist (run after any change)

- [ ] `node --check` every JS file.
- [ ] `index.html?test` → PASS (catches most logic and layout slips; it's blind to looks).
- [ ] Fresh-port server, open the book, click "Open the book".
- [ ] For each changed page: go to it from Contents, tap through every state, press Back through
      every state, and check that Next appears on the final state.
- [ ] `read_console_messages` with only errors → none.
- [ ] Everything, including the hint outline, stays inside the canvas at 1100×750 and at 375×812.
- [ ] Particle pages: nothing crosses the box walls (a JS scan of `cx ± r` against the box).
- [ ] New facts added to `FACTS.md`; entry added to `BUILDLOG.md`; commit.

---

## 12. Idea backlog

### New pages (syllabus coverage, reusing what already exists)
- ~~Catalysts (R2.2)~~ — done, round 4.
- ~~Maxwell–Boltzmann distribution (R2.2)~~ — done, round 4. Possible follow-up: a third tap that adds
  a catalyst, sliding the Ea line left over the same curve to tie the two pages together.
- **Le Chatelier (R2.3):** extend the equilibrium box by tapping to "add more reactant" (drop in
  particles) and watch it shift.
- **VSEPR shapes (S2.2):** electron domains pushing apart. Tap to turn a bond into a lone pair:
  tetrahedral → trigonal pyramidal → bent (CH₄ → NH₃ → H₂O), angles shrinking 109.5 → 107 → 104.5.
- **Intermolecular forces (S2.2):** water molecules clinging by hydrogen bonds vs methane drifting
  apart; heat both and see which boils first.
- **Giant covalent (S2.2):** diamond vs graphite, with layers sliding in graphite. Pairs well with
  the metallic page.
- **Orbitals s and p (S1.3 AHL):** extend the cloud idea into dumbbell-shaped p clouds.
- **Ionisation energy (S1.3 AHL):** pull electrons off one by one; the jump at a new shell is huge.
- **pH is a log scale (R3.1):** a zoom-out in the style of the hydrogen page, each step ten times fewer H⁺.
- **Strong vs weak acids (R3.1):** the same box, but only a few HA molecules let go of their proton.
- **Electrolysis (R3.2):** the redox cell run backwards, with a battery pushing electrons.
- **Curly arrows / nucleophilic substitution (R3.4):** an arrow drawing itself from lone pair to carbon.
- **Hess's law (R1.2):** two routes on an energy map with the same total drop.
- **Entropy (R1.4):** particles spreading out when a divider lifts; they never all go back.
- **Addition polymers (S2.4):** monomers snapping into a growing chain.

### Features
- **Pause button for all motion.** Looping idle motion longer than 5 s needs a pause control under
  WCAG 2.2.2, even for people without reduced motion set. Probably the most important fix left.
- ~~Deep links~~ — done, round 4 (`#ionic`, browser Back/Forward).
- **"Continue where you left off":** remember the last page in `localStorage` and offer to resume on the cover.
- **Glossary taps:** dotted-underlined terms in captions (ion, orbital, isotope) open a one-line definition.
- **"See also" links between pages:** emission → shells, ionic ⇄ covalent ⇄ metallic, collision → catalysts.
- **Chapter title cards** before each IB topic group, in the picture-book style.
- **Offline / installable:** bundle GSAP and the fonts locally, add a tiny service worker, and it
  works anywhere, including on a plane.
- **Storyboard / print view:** every state of every page as a static strip, for revision notes or a PDF.
- **Projector mode for teachers:** bigger text, no idle chime, arrow keys only.
- **Periodic-trends sonification:** each atom plays a note as it shrinks (a playful use of the existing sound engine).
- **Dark "night reading" theme.**

### Engineering
- ~~Automated smoke test~~ — done, round 4, as the built-in `?test` rather than Playwright, so it
  needs no install and runs by double-click. Possible extensions: a keyboard-only pass (Tab/Enter
  instead of clicks), a 375 px-wide pass, and screenshots of each final state for eyeballing.
- **Replace the remaining scale pulses** (§9) with a shared `Pulse.radius(el, factor)` helper.
- **Reorder the script tags** so contents numbering matches the syllabus.
- **Hide the sound lab** behind a URL flag (`?lab`) before sharing.
