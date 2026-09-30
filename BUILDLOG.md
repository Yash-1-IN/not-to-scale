# Build log

## Phase 1 — The hydrogen page, alive
- Purple frame, title, rule with square end-caps, caption, proton, electron, dotted orbit, legend.
- Intro sequence; electron orbits (9 s/lap), proton breathes.
- Picked: Flat style (paper-cutout removed). Title: "Not to Scale".

## Between phases — Next button and zoom-out
- Next -> camera pulls back ~4000x from the atom into a park scene with a person; an arrow
  points at the hand: "it's really small". Back reverses the whole timeline.
- Legend moved to bottom-left to leave room for later topics.

## Phase 2 — Sound
- js/sound.js: zwoop, tin-din, pop, page-turn, all synthesised. Master gain 0.15.
- Cover page ("Open the book") unlocks audio. Mute button top-right (remembered per session).
- Attention chime: after ~8 s idle on page 1, once, Next glows gold.
- Sound lab (small "sound lab" link, bottom centre): play buttons + sliders + numbers to copy.
- Next: tune sounds by ear, copy numbers into sound.js defaults, hide the lab.

## Sound tuning (round 1, one listener)
- zwoop length 0.25 -> 1 s (now used as-is for the zoom); tin-din gap 0.15, decay 0.65. Others unchanged.
- The person in the park is bald, on purpose.
- Sound lab kept for the planned group vote; hide it before sharing.

## Phase 3 — The zoom
- Tap the atom (or Tab to it + Enter/Space): zwoop, camera zooms 5x into the proton, electron slides off screen.
- Scale caption ("marble / half a kilometre") + cheeky "protons aren't really red" footnote. Back zooms out.
- On the way out the electron doesn't return: 420 dots scatter from the orbit ring into a fuzzy cloud
  (radial density r^2 e^(-2r/a), random direction in 3D flattened to 2D). Orbit ring fades out.
- Honest-reveal caption + "orbital, more on that later" footnote.
- Gold tap-ring pulses on the atom until tapped; the 8 s idle chime now strengthens the ring (atom untapped)
  or glows Next (after the cloud). Next still works from either atom state and returns to it on Back.
- One-shot per visit: after the cloud appears the atom isn't re-tappable (reload to replay).

## Phase 3 additions
- Replay button (shown once the cloud appears): fades the cloud, brings the orbiting electron back.
- "It could be here... or here..." arrows: six arrows point at real dots in the cloud, one at a time and
  getting faster; a bright electron blinks at each spot. Skipped to the end when you press Next.

## Phase 4 — Turning it into a book
- Pages are data: one file each in pages/ (title, topic, drawing, states, hotspots, captions).
- js/engine.js reads them and handles page turns (with the page-turn sound), Back/Next/Replay, keyboard
  arrows, page counter, contents page, the attention chime, captions and tappable hotspots.
- js/camera.js holds the zoom helpers (zoomTo, crossZoom) so every page zooms the same way.
- Hydrogen page rebuilt in this format; behaves as before. The world scene is still part of it.
- Contents page groups pages by IB topic; unwritten pages from the spec show as "coming soon".
- Back on a state with no `back` of its own turns to the previous page.
- Checked with a temporary second page made from pages/_template.js (page turn, counter, contents), then removed.
- Next: builder adds a test page from the template; then Phase 5 (isotopes, electron shells, ionic bonding).

## Phase 5 — Page 2: Isotopes
- Three hydrogen atoms side by side (hydrogen-1, deuterium, tritium). Tap one: the others fade, the camera
  slides and zooms into its nucleus (p / n letters as well as colours). Back returns; after all three have been
  looked at, a summary caption appears (same protons = same element, different neutrons = isotopes).
- Engine: a state's `tap` can now be a list, so a page can have several tappable things.
- Camera: zoomTo now does its own maths with a fixed origin, so zooming to different points in turn is reliable
  (the old way put the camera in the wrong place on the second and third tap).
- Test page from the Phase 4 checkpoint removed. Builder confirmed adding a page from the template works
  (only snag: Windows hid the .txt/.js extension).
- Next: page 3, electron shells (hydrogen to sodium), after review.

## Fix: camera left shifted after zooming out
- Builder reported (screenshots) that after zooming back out, the proton / nuclei were off-screen on both the
  hydrogen page and the isotopes page. Reproduced: GSAP's own zoom-point handling left the camera at
  matrix(1,0,0,1,1504,768) instead of the identity after a zoom out.
- Camera.zoomTo now tweens plain numbers and writes the SVG transform itself ("translate(x y) scale(s)"),
  so any zoom can follow any other. Verified in a real-time run: tap, back, replay, tap again, back on the
  hydrogen page; all three isotope zooms and back. Camera is translate(0 0) scale(1) every time.
- Testing note: the browser preview throttles animation; set gsap.ticker.lagSmoothing(0) to test in real time.
- Builder's feedback on the isotopes page: keeps grey neutrons, p/n letters, "the common one".

## Phase 5 — Page 3: Electron shells
- Tap the atom to add a proton and an electron, hydrogen to sodium. Electrons fly in and the shell's electrons
  spread out evenly; the nucleus label and the electron arrangement (e.g. 2,8,1) update. Back removes the
  last electron (from hydrogen, Back turns to the previous page).
- Final tap: the neat rings dissolve into fuzzy clouds, with the caption that shells are a simplification.
- Electrons are drawn by a small per-frame loop (shells drift slowly; still under reduced motion).
- Engine: page turns are ignored until the book has opened (found by testing).
- Checked in a real-time run through hydrogen to sodium, the reveal, and Back twice: arrangements correct
  (2,2 for Be; 2,8 for Ne; 2,8,1 for Na), electron counts match, no console errors.

## Wrapped up for now
- Pages built: 1 hydrogen (tap zoom, cloud + "it could be here" arrows, replay, world scale), 2 isotopes, 3 electron shells.
- Sound settings tuned by builder (round 1, one listener); sound lab still in for a planned group vote.
- Next session: page 4 ionic bonding (reuses the shell drawing), then the rest of the backlog in the spec (section 9).
  Phase 6 (accessibility pass, phone test, about page, GitHub Pages) still to do.

## Phase 5 — Page 4: Ionic bonding
- Sodium and chlorine drawn with the same shell style as page 3. Tap 1: sodium's outer electron flies across
  to chlorine (chlorine was pre-laid-out on an 8-slot ring with the 8th slot hidden, so it doesn't need to
  re-arrange when the electron arrives); +/- charges fade in. Tap 2: the ions slide together, shells nearly
  touching. Back reverses each step; from "atoms", Back turns to the previous page.
- Bug caught while testing: the "bring together" distance was computed from a wrong constant (220 instead of
  the real 440px gap), so the ions barely moved. Fixed by computing FAR_APART from the actual atom positions.
- Verified in a real-time run: tap, tap, back, back, with screenshots at each step and no console errors.

## Phase 5 — Pages 5-8: mass spectrometry, emission spectra, the mole, gases
Switched to a leaner page pattern for the rest of the backlog (2-4 states, one clear tap-reveal each)
to get through the list faster, still chemistry-checked and animated, reusing the engine as-is.
- Added js/hint.js (the gold tap-ring, shared instead of copy-pasted per page) and js/particles.js
  (a small bouncing-particle-box helper for gases/collision-theory/equilibrium-style pages).
- 05 Mass spectrometry: neon-20/22 ions fire through a field, lighter ion curves more, lands on its
  own spot; a small bar graph (mass spectrum) grows to show relative abundance.
- 06 Emission spectra: hydrogen's electron falls back to the second shell from further and further
  out on each tap, releasing red/cyan/blue/violet light onto a spectrum strip (4 states, Back removes
  the last line).
- 07 The mole: a jar of specks too many to count; tap makes a number flicker and settle on Avogadro's
  constant, with the "more molecules in a glass than glasses in the ocean" comparison.
- 08 Gases: particles bouncing in a sealed box (pure wall-bounce, footnoted as a simplification); tap
  heats the gas, particles speed up.
- Found and fixed a real unit-mismatch bug before it shipped: gases.js first computed its own frame
  delta from the ticker's raw time (assumed seconds) instead of reusing its deltaTime argument in ms,
  which would have frozen the animation; matched it to the pattern already verified in shells.js.
- Testing note: the local http.server + browser pane cache CSS/JS aggressively across navigations in
  the same tab, occasionally leaving a tab in a stuck, pre-"Open the book" state after repeated
  same-tab reloads. Confirmed with curl that the served files were always current; a fresh tab (or a
  manual stylesheet reload) always showed the true state. Not an issue for the shipped file:// page.

## Phase 5 — Pages 9-12: covalent bonding, metallic bonding, periodic trends, functional groups
- 09 Covalent bonding: two hydrogen atoms slide together and their electrons meet as a shared pair,
  forming H2. Caught a real bug before shipping: the electrons were drawn nested inside the sliding
  nucleus groups, so their own movement would have compounded with the group's slide (landing far off
  centre). Fixed by drawing the electrons as un-nested, absolute-coordinate circles.
- 10 Metallic bonding: a lattice of ions with ~26 electrons drifting through it via the shared
  particle-box helper; tap "hammers" the metal, the bottom two rows slip sideways while the electron
  sea keeps drifting, showing why metals bend instead of shattering. Removed a leftover broken bit of
  markup-splitting code that would have duplicated element ids and doubled the top two rows.
- 11 Periodic trends: eight same-size atoms (Na to Ar) shrink into their real relative sizes on tap,
  aligned on one baseline. Sizes are relative only, not claiming real pm values (the noble-gas radius
  question is genuinely ambiguous, so we sidestepped it).
- 12 Functional groups: one carbon-chain drawing with a swappable end group; tapping cycles ethanol
  (-OH) -> ethanoic acid (-COOH) -> chloroethane (-Cl) -> ethylamine (-NH2) and loops back to ethanol.
- Diagnosed real testing-pane behaviour worth recording: GSAP's ticker (rAF-driven) does not advance at
  all while the pane sits idle, even across many real seconds of `wait`; only forcing a repaint (a
  screenshot) pumps it forward, and it then fast-forwards through the stalled gap (default lag
  smoothing). Don't call gsap.ticker.lagSmoothing(0) when testing here, and always interleave
  wait+screenshot rather than one long wait. Used a temporary console.log in engine.js's turnPage to
  confirm this against real state (busy/started/pageIndex) rather than guessing; removed it after.
- All 12 pages walked end to end in the browser with console-error checks; no errors found.

## Phase 5 — Pages 13-17: the rest of the backlog (all 17 book pages now built)
- 13 Exothermic vs endothermic: a ball rolls along an energy-profile curve, downhill (releasing heat)
  or uphill (absorbing it, like an instant cold pack). Fixed the ball's resting colour, which defaulted
  to the "heat" orange even after an endothermic (cold) run; it now settles to a neutral grey.
- 14 Collision theory: red/blue particles bounce in a box (shared particle-box helper); only a fast
  enough collision reacts, turning both particles green. Tap heats the mixture.
- 15 Equilibrium: 20 particles interconvert both ways at fixed rates (exponential waiting times); the
  live reactant:product count settles into a steady, K-like split even though particles keep switching.
- 16 Acids and bases: HCl hands an H+ across to NH3, forming Cl- and NH4+ (mirrors the ionic-bonding
  page's transfer choreography, but for a proton instead of an electron).
- 17 Redox and electrochemical cells: electrons loop continuously along the wire from anode to cathode
  once tapped. Caught a real bug before shipping: an electron's starting position was set with a raw
  DOM `setAttribute("transform", ...)`, then animated via GSAP's x/y — the same class of GSAP
  transform-cache mismatch fixed earlier in camera.js. Fixed by setting the start position with
  `gsap.set()` instead, so GSAP's own cache and the animation agree from frame one. Also found and
  fixed: gsap.to() can't resolve a `var(--tap)` string as a colour to tween, and reusing --tap here
  would have broken the "tap-gold means tap this, nothing else" rule anyway; removed that flash rather
  than reusing the wrong colour.
- Found and fixed a real bug in pages 14 and 15: their legends used `class="dot"` with only an inline
  `background`, but the base `.dot` CSS rule has no width/height (only the `.dot-p`/`.dot-e` subclasses
  do), so the swatches were invisible. Added explicit width/height to both.
- Polish: nudged the redox page's anode/cathode labels down; they were overlapping the solution rect's
  bottom edge, not the electrodes as first suspected.
- Testing note: confirmed the "stuck, can't navigate" symptom seen a few times this batch is pane
  flakiness (GSAP's ticker starved of animation frames in the backgrounded pane), not app bugs — the
  same page always worked on a clean retry with more wait+screenshot cycles, and DOM state checks
  (busy/started/pageIndex) matched a normal, still-in-progress transition each time it was inspected.
- All 17 pages now exist and are registered in index.html; contents page (00-planned.js) is fully
  "lit up", no "coming soon" entries left.

## Phase 6 — Accessibility pass
- Real, book-wide bug found and fixed: every page's `idle()` (the gentle breathing/bobbing/orbiting
  motion) started infinite GSAP loops unconditionally, never checking `prefers-reduced-motion` — this
  affected all 12 pages that define an idle(), including ones built in earlier sessions (hydrogen,
  isotopes, ionic bonding). Fixed centrally in js/engine.js instead of patching every page: both call
  sites now do `if (p.idle && !reduceMotion) p.idle(ctx)`, so idle motion is skipped everywhere when
  the OS/browser asks for reduced motion, matching §6/§10 of the spec. Confirmed idle motion still
  runs normally otherwise (checked the hydrogen page's electron move between two screenshots).
  (The ticker-driven pages — shells, gases, metallic, collision, equilibrium — already guarded their
  own per-frame render loops individually and needed no change.)
- Colour-only differentiation fixed on pages 14 (collision theory) and 15 (equilibrium): reactant,
  reactant-B and product were previously told apart by fill colour alone. Both pages' species now also
  differ in size (and product gets a white outline ring), and the legend swatches were resized and
  outlined to match, consistent with the book's own rule and the hydrogen page's proton/electron
  precedent. Also fixed a related bug this uncovered: the collision page's "heat" pulse animated the
  raw SVG `r` attribute to one shared value for every particle, which would have erased the new size
  differences after the first heat-up; changed it to a relative GSAP `scale` pulse instead, which
  preserves each particle's own base radius.
- Keyboard check (hydrogen page): Tab moves focus straight from Contents to the atom's hotspot with a
  visible dashed focus outline, and Enter activates it exactly like a tap. This path is shared by every
  page's hotspots through the engine, so it should hold everywhere.
- Not independently verified live: prefers-reduced-motion end-to-end in the browser (this pane has no
  way to emulate that media feature, only colour scheme), and text contrast/every page's colour-only
  check exhaustively — reviewed the rest of the pages by eye against the "not colour alone" rule and
  found no other cases (every other multi-entity page already differs by label, size, or shape:
  proton/electron, p/n, Na/Cl symbols, element letters, formula labels).

## Phase 6 — Phone test and About page
- Phone test (375x812 emulated): checked the cover, hydrogen page (open + tap-to-zoom), collision
  theory (a denser page with a 3-item legend), and the contents page. All read cleanly, no horizontal
  overflow, legend wraps sensibly, tap targets stayed reasonably sized. No changes needed.
- Added an About page: a link on the cover ("About this book") reachable before opening the book, and
  an "About" button in the topbar reachable from any page once it's open. Both open the same overlay
  (reusing the Contents panel's styling) with what the book is, that it simplifies on purpose, and who
  made it; Escape or Close returns focus to whichever link opened it. Wired centrally in js/engine.js
  (openAbout/closeAbout), not tied to the page system, since it isn't a chemistry page.
- Verified both entry points open/close correctly with no console errors; the placeholder attribution
  line ("Made by an IB Chemistry student, built together with Claude Code") in index.html can be
  changed any time by editing the #about section directly.

## Phase 6 — GitHub Pages instructions
- No `gh` CLI available in this environment, and pushing to a public GitHub repo needs the builder's
  own account, so this is manual rather than automated. Added a step-by-step "Publishing it on GitHub
  Pages" section to README.md: create a repo, push this folder to it, turn on Pages (branch main, root
  folder), and how to publish later updates (commit + push). Confirmed no .gitignore is excluding
  anything the deployed site needs (all of pages/, js/, css/ are tracked).
- Phase 6 checklist from the spec: accessibility pass (done), phone test (done), About page (done),
  GitHub Pages instructions (done, deploy itself is up to the builder).

## Round 2 — Feedback pass on four pages
- Mass spectrometry (05): full rework. The ion path from source to detector is now a real curve
  (straight to the field edge, a quadratic bezier through it, straight to the detector), drawn with
  native SVG `getPointAtLength` rather than a motion-path plugin, matching the technique already used
  for the hydrogen page's pointer arrow. Each ion leaves its own dotted trail (revealed by fading the
  dashed path in as the ion travels it). Added a faint dot grid inside the field box (the usual "field
  out of the page" symbol). After the first pair lands, 24 more ions fire automatically along the same
  two paths in a shuffled but seeded order, each nudging its bar up by a fixed 5px, so the bars settle
  on the same final heights as before — the same "sample repeatedly until it settles" idea as the
  hydrogen page's cloud dots. Rearranged the whole apparatus to the left half of the scene, graph on
  the right, so nothing overlaps. Fixed a real, pre-existing bug while doing this: the ion circles and
  bars had a `class` (`particle`, `mass-bar`) whose CSS `fill` rule silently overrode the inline `fill`
  attribute meant to distinguish neon-20 (red) from neon-22 (blue) — both ions and both bars were
  rendering in the same colour. Fixed by setting colour via an inline `style` attribute, which beats a
  class selector's specificity.
- Ionic bonding (04): the tap hint was a plain circle sized to fit the two atoms, which for the current
  atom radius already went off the top of the canvas (`cy - r` went negative). Replaced it with a
  rounded rect ("squircle") sized to the atoms' actual bounds, and switched from a duplicated inline
  copy of the ring-pulse logic to the shared `Hint.ring` helper (which turned out to be shape-agnostic
  already, so a `<rect class="tap-ring">` works with zero changes to hint.js).
- Emission spectra (06): added a small bar chart ("size of the jump") next to the atom. Each fall grows
  its own bar, height proportional to how far the electron jumped, in the fall's own colour. After the
  fourth fall, a dot flies from the top of each bar down to its matching line on the spectrum strip
  below, so the size of each jump and its position in the spectrum visibly line up (biggest jump lands
  closest to violet). Back on any fall shrinks that bar back down to match.
- The mole (07): the jar outline extended to y=430 while the "6.02 x 10^23" / "particles in one mole"
  text sat at y=400/432, so the text crossed the jar's bottom edge and rounded corners. Shortened the
  jar (bottom now at y=360) and tightened the dot scatter to match, opening clear space below the
  outline for both lines of text.
- Tested all four in the browser pane (fresh port each time, wait+screenshot cycles, never disabling
  GSAP lag smoothing): fired the mass spec beam and watched the swarm settle, stepped through all four
  ionic states forward and back, stepped through all four emission falls plus the comparison sweep, and
  revealed the mole's jar. No console errors in any of them.

## Round 3 — Organic/reactivity feedback pass
- Functional groups (12): found the real bug behind "the label text is hidden" — the badge was a
  fixed-radius circle repeatedly scaled with GSAP's `scale`+`svgOrigin`, the same class of bug as the
  ionic-page ring earlier, and here it left a permanent residual CSS transform (confirmed via
  `getComputedStyle().transform` showing a stray translate after the first tap) that silently pushed
  the coloured circle away from the white label sitting on top of it. Fixed properly this time: the
  badge is now a rounded-rect pill sized per label (a fixed circle was always going to be too small for
  "COOH"/"NH2" regardless of the transform bug) and animated purely via x/y/width/height attributes,
  never a CSS transform.
- Exothermic/endothermic (13): the "too flat" curve was a real bug, not just a style choice — a
  quadratic Bezier's rendered peak is a 25/50/25 blend of its three points, so using the intended peak
  height as the control point's height means the curve never actually reaches that height. Fixed by
  solving that blend backwards for the control height so the curve provably passes through the intended
  peak (confirmed XHUMP sits exactly midway between X0 and X1, so the peak's x is always correct too).
  Also added a bracket-and-label showing "activation energy" against the energy axis, and fixed the
  idle ball "sway": its breathing pulse used `scale`+`svgOrigin` anchored at the *reactant* position
  even while resting at the *product* position after a roll, so it visibly lurched toward reactants on
  every pulse. Switched to pulsing the ball's own radius attribute instead, sidestepping the whole
  transform-origin question. Same off-canvas tap-ring bug as the other pages, fixed the same way.
- Collision theory (14): squircle tap-ring (was another off-canvas circle). The heat-up pulse used
  `scale`+`transformOrigin:"center"` on every particle while the physics ticker was concurrently
  writing their cx/cy every frame — the two fighting over the same elements is what could let particles
  visually spill past the walls. Switched the pulse to animate each particle's own radius attribute
  (still relative to its own current size, so different species keep their sizes). Also added a direct
  reclamp right when a particle's radius grows on a successful reaction, in case the bigger circle no
  longer fits at its old position — belt and braces on top of the transform fix.
- Equilibrium (15): squircle tap-ring. Rebalanced and restructured: tapping now runs three scenarios in
  sequence on the same 20 particles — equal rates (settles close to 10:10), then rates favouring
  product, then rates favouring reactant — by re-aiming each particle's next flip at new rate constants
  rather than resetting the box, so the split visibly *shifts* live. Ties directly into the equilibrium
  constant K = [product]/[reactant], which the captions now name explicitly.
- Root-caused the "particles escaping the box" report to CSS `scale`/`transformOrigin` tweens running
  on elements whose position the physics ticker also owns — confirmed no escapes over a 4-second,
  ~170-frame automated position scan before AND after the collision-theory fix, with worst-case wall
  margin at exactly 0 (touching, correctly clamped) rather than negative (poking through).

## Round 4 — Catalysts, Maxwell–Boltzmann, links to pages, automated self-test
- **Maxwell–Boltzmann (`pages/14a-maxwell.js`):** 200 particles "measured" one at a time drop into
  a kinetic-energy histogram, the mass-spec "keep firing until it settles" idea. Bar heights are exact
  shares of the real 3D energy distribution (erf-based CDF, largest-remainder rounding), not random;
  only the arrival order is shuffled. Heating re-measures: the curve is lower and wider, the old curve
  stays as a dashed ghost, and the count past the activation-energy line goes 6 → 25. First version
  piled the tail beyond the chart edge into the last bar, which showed as a fake spike; that ~0.6%
  is now spread back over the bars by rescaling.
- **Catalysts (`pages/14b-catalysts.js`):** the energy-page curve maths reused, with a second, dashed
  green, lower hump between the same reactants and products; two activation-energy brackets by the axis
  with dashed guide lines from each peak; the ball rolls the catalysed route along the path.
- **Links to a page:** `index.html#ionic` opens that page (the cover still shows first), every page
  turn writes its id into the URL, and the browser's Back/Forward buttons turn pages. Uses plain
  `location.hash` assignment and `hashchange`, because `history.pushState` throws on `file://`.
- **Automated self-test (`js/selftest.js`, run with `index.html?test`):** walks every page and every
  reachable state (hotspots, Next, Replay, Back) at 20× speed, pumping `gsap.ticker.tick()` on a timer
  so it runs even when the tab isn't painting. It checks landing states, captions (and that the old one
  faded), enabled tap targets, Next on final states, text and tap outlines inside the canvas, particles
  inside their box, console errors and warnings, and the #link + browser-Back round trip. Result: 19
  pages, 87 transitions, PASS.
- **Bugs the self-test found on its first run:** seven more pages (gases, covalent, metallic, periodic,
  functional groups, acids, redox) had oversized circular tap hints going off the canvas; they now have
  squircles fitted to each page's measured drawing bounds. Redox electrons sat at (0, 0), peeking out of
  the top-left corner, during their staggered start delay; they're now placed and hidden up front.

## Round 5 — Energy page ball follows the curve
- The exo/endothermic ball used to tween in two straight lines (reactants → peak → products), cutting
  the corners of the curve. It now rolls along the drawn path itself (`getPointAtLength`, the same
  method as the catalysts page). Measured: the ball's centre stayed within 0.9 px of the line
  throughout a roll.
- Back rolls along the curve too, instead of sliding straight across the graph: exo → start rolls back
  down the exo curve; endo → exo rolls back to the reactants on the endo curve, swaps curves, then
  rolls forward along the exo curve. Self-test PASS (19 pages, 87 transitions).

## Round 6 — Le Châtelier, full syllabus plan, data booklet references
- **Le Châtelier (`pages/15b-lechatelier.js`, R2.3.4):** a box already at equilibrium (equal rates,
  K = 1). Tap pours in 10 reactant; tap removes all product. Each particle flips on its own random
  clock, so the shift is genuine: measured 11:9 → (add) 23:7 → settles ≈15:15; (remove product) 12:2
  → settles ≈7:7. Captions make the point that K doesn't change, only the position does.
- **Plan = the school's G12 half-yearly chemistry syllabus:** `00-planned.js` now lists 83 topics
  (20 built, 63 "coming soon"), each with its syllabus code (e.g. S1.2.2, R2.3.4, "HL" where marked).
  The engine accepts plan items as `"Title"` or `["Title", "code"]` and shows the code beside each line.
- **Book order now matches the syllabus** (script tags reordered), which fixes the long-standing
  contents-numbering bug: numbers now run in order under each heading. Emission spectra now comes
  before electron shells, as in the syllabus.
- **Data booklet references:** a state can carry `booklet: "…"`, rendered under the caption as a
  "Data booklet §N" note. Added to 14 pages with values checked against the 2025 booklet (text extracted
  with pypdf into the session scratchpad): §1 equations, §2 constants, §5 spectrum, §7 periodic table,
  §10 radii, §11 bond lengths, §12 bond enthalpies, §14 combustion, §16 lattice enthalpy, §19 E⦵,
  §20 IR. The About page explains the notes.
- **Fact fix found via the booklet:** the periodic-trends page claimed argon is the smallest atom in
  period 3; the booklet gives Cl 100 pm, Ar 101 pm. Radii are now drawn in proportion to the booklet
  values, and a footnote explains the noble-gas quirk.
- Self-test PASS: 20 pages, 91 transitions.

## Round 7 — the "coming soon" list built out (63 new pages, 83/83)
- **Request:** "build all that you can until the limit runs out" for the remaining syllabus topics. All 63
  are now pages: Structure 1 (11), Structure 2 (15), Structure 3 (10), Reactivity 1 (9), Reactivity 2 (2),
  Reactivity 3 (16), plus earlier pages re-slotted. Committed and pushed in batches per syllabus theme.
- **`js/kit.js`:** a declarative page toolkit (`Kit.page`) so a page is an SVG string plus steps. Back is an
  exact undo from recorded pre-values, which removed the per-page reverse code. Physics-heavy pages
  (states of matter, ideal gas) still use the shared particle sim through `K.spawn/bounce/tick`.
- **Engine:** `sortByPlan()` orders pages by the plan instead of script order; index.html loads any
  `pages/*.js` files it doesn't already list.
- **Self-test got stricter:** it now flags visible text labels that overlap by more than 6 px in both
  directions, which caught ~15 real layout problems (calorimetry, entropy, Born–Haber, formal charge,
  kw seesaw, …), all fixed. Final run: PASS, 83 pages, no console errors/warnings, deep-link round trip OK.
- **Lessons:** (1) `class="fade"` plus an `opacity="0.x"` attribute fights the intro; use fill-opacity /
  stroke-opacity. (2) A Kit page with no `.fade` elements made the default intro call GSAP with an empty
  target (warning); the intro now returns an empty timeline. (3) A step 0 `to` is ignored: hide initially
  hidden things in the SVG. (4) Curves (titration, Maxwell–Boltzmann, energy profile) are computed from the
  real formulas rather than drawn by hand. (5) Values not in the data booklet (e.g. Ka of ethanoic acid
  1.8 × 10⁻⁵) are flagged in FACTS.md.
- **Not yet done:** most new pages were verified by the automated test rather than by eye; orbitals p-lobe dot
  density could be higher; a visual pass on every new page is worth doing.

## Round 8 — feedback fixes (8 points) and Le Châtelier pressure/temperature
- **Liquid (states of matter):** the liquid now fills the whole width of the container's bottom (a pale
  fill shows its level) instead of clumping in a small box. Particles are bigger, can't overlap, and gently
  push each other apart so they spread out; clamped to the walls so pushes never move them outside.
- **Formal charge:** rewritten around "sticks and stones": FC = valence − sticks − stones. Lone-pair
  electrons are drawn as dots on every oxygen. A tap zooms in on sulfur (highlight ring, panel with numbered
  sticks, 6 − 4 − 0 = +2), then on an oxygen (1 stick, 6 stones, −1), then the expanded-octet structure
  with the new sums. The top/bottom oxygens lose their outward lone pair when they become double-bonded.
- **Sigma/pi bond:** the "overlap head-on" caption now fades out when the pi lobes appear.
- **Bonding triangle:** redrawn like the booklet's §17 diagram: axes with ticks, region labels (ionic,
  metallic, covalent, polar covalent), the % covalent / % ionic scale, and a last step that reads NaCl (≈73 %
  ionic) and HCl (≈22 %) off it. Marks follow Pauling's formula (flagged in FACTS.md).
- **IR notes** on the functional groups page also give the frequency and energy per photon.
- **Rate factors:** surface-area card no longer overlaps its title (exposed surface outlined in orange), the
  Ea label no longer touches the card border.
- **New page 84: "Le Châtelier: pressure and temperature"** (`pages/r2-03-lechatelier-pt.js`, Kit + tick
  simulation): N₂O₄ ⇌ 2NO₂ in a syringe. Forward events per particle at rate kf, reverse per NO₂ pair at
  kr·(V₀/V), so squeezing really shifts the equilibrium. Time-averaged counts from the running sim
  (N₂O₄/NO₂): start 11/21, squeezed 13/17, expanded 10/24, hot 6/33, cold 13/18. Gas tint follows [NO₂].
- **Bond lines under atoms:** the C–O bond in the nucleophilic-substitution product started at the old OH
  position (through its label) and the C–Br bonds in the electrophilic addition were drawn after the atoms.
- **Testing lesson:** the plain `python -m http.server` let Chrome cache old JS on reload; use a server
  that sends `Cache-Control: no-store` when iterating. Long JS snippets in the browser tool time out at 45 s.
