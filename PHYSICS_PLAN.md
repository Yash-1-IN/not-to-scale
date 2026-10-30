# Not to Scale: Physics — build plan

**What this is:** the plan for adding IB Physics (HL) to *Not to Scale* as a second subject in the same
book. It covers all 17 topics on the school's G12 half-yearly list (`G12 HY Syllabus Focus 2027.pdf`,
Physics row). It is written for Claude Code and split into small batches, so each session stays cheap.

**Decisions already made by the builder (don't re-ask):**
- **One book, two subjects.** Same site, engine and Kit. The cover offers Chemistry and Physics. Each
  subject has its own contents, page counter, questions, glossary terms and data booklet.
- **HL.** Cover SL plus the HL-only content, and mark HL lines like the chemistry plan does.
- **All 17 topics.** Every topic gets at least one page. The visual topics get the showpiece animations (★).
- **3–4 pages per batch,** one batch per Claude Code session.

---

## 0. Rules for every session (read this first; it saves usage)

1. **Do one batch per session, then stop.** At the end, tick the batch's boxes in §6, run the checks,
   commit, and tell the builder to run `/clear` before the next batch.
2. **Read only what the batch needs.** Read this file (§0–§5 and *your* batch in §6), then `PROJECT.md`
   §3, §5, §6 and §8. **Don't** read `BUILDLOG.md` in full, `FACTS.md` in full, `js/bundle.*.js`, or
   chemistry pages you aren't copying from. Use `grep` to find things instead of opening whole files.
3. **Copy one reference page, don't study ten.** For a stepped page, copy `pages/s1-11-ideal-gas-law.js`
   (Kit with particles and a ticker). For a slider page, copy the slider step in `pages/14a-maxwell.js`.
   For dragging, copy the pointer handling in `pages/s2-04b-build-molecule.js`.
4. **Test cheaply.** While building, open `dev.html` (no build step). Run the full `?test` self-test
   **once** at the end of the batch, not after every edit. Use screenshots only for pages you changed.
5. **Keep docs short.** One short `BUILDLOG.md` entry per batch (5–10 lines). Facts go in `PHYSICS_FACTS.md`
   (see §4), one row per on-screen number.
6. **Model:** showpiece pages with real simulations (★) are worth the stronger model. Plain stepped pages
   (no ★) are fine on a lighter model if the builder wants to save usage.
7. **Ask the builder when you're unsure** of a physics fact, rather than guessing, and flag it in
   `PHYSICS_FACTS.md`.

The hard constraints in `PROJECT.md` §3 apply to physics unchanged. These include double-click to open,
inline SVG on 1000 × 480, GSAP 3.12.5, synthesised sound, one idea per page, gold for taps only, colour
never the only signal, and reduced motion respected.

---

## 1. How physics fits into the book (Batch 0 builds this)

- **Plan:** a new `pages/00-physics-planned.js` with the same shape as `00-planned.js`. Every topic object
  gets `subject: "physics"`, and every chemistry topic gets `subject: "chemistry"` (missing means
  chemistry, so old pages keep working). `Book.plan()` must **append** topics. Today it replaces them
  (`setPlan` in `js/engine.js`).
- **Page ids** for physics start with `p-` (for example `p-orbits`), so `#links` never collide with
  chemistry ids such as `gases`.
- **Subject of a page:** worked out from its `topic` through the plan, so `Kit.page` needs no new field.
- **Cover:** "A picture book of IB Chemistry and Physics. Simple on purpose." Two buttons, *Open Chemistry*
  and *Open Physics*. The first tap still unlocks audio.
- **Contents:** two tabs, Chemistry and Physics, with search, progress marks and "coming soon" working per
  subject. Opening a `#p-…` link shows the Physics contents.
- **Counter and Next:** "Page 7 of 48 · Physics". Next on the last page of a subject goes to that subject's
  contents. It never rolls over into the other subject. Back on a subject's first page does nothing.
- **Study tools (`js/study.js`):** quiz entries, glossary terms and booklet sections get a `subject`. Add
  `js/data-quiz-physics.js`, `js/data-glossary-physics.js` and `js/data-booklet-physics.js`, so the
  chemistry files stay as they are. A `§N` note opens the booklet for the page's own subject.
- **About panel:** mention both subjects. "Made by an IB student, built together with Claude Code."
- **Self-test:** walks both subjects. It also checks that Next never crosses subjects, that every physics
  page has a question, and that `#p-orbits` opens on Physics.
- **Easter egg:** leave it as it is (it's chemistry-flavoured, and that's fine).

**Physics palette additions** (add to `:root` and `Kit.C`, and keep gold for taps only):

| Token | Value | Use |
|---|---|---|
| `--velocity` | `#22B6A5` (Kit `cyan`) | velocity arrows, labelled **v** |
| `--force` | `#1B1A22` (ink), thick | force arrows, labelled **F** with a subscript (F_g, F_N, F_f…) |
| `--field` | `#6A2BD9` (Kit `violet`) | field lines, equipotentials dashed |
| `--energy-k` / `--energy-p` / `--energy-th` | `#2E6FE0` / `#2E9E63` / `#E05A2B` | KE, potential, thermal energy bars, always labelled |

Positive charge = `--proton` red and negative = `--electron` blue, the same as in chemistry. Every arrow
carries a letter label, because colour is never the only signal.

**Physics voice:** the same cheeky honesty as chemistry, for example "Not to scale: the Moon is much
further away", "Ignoring air resistance (for now)", "Real springs aren't this well-behaved", or "Electrons
actually drift slower than a snail".

---

## 2. Reuse what chemistry already has

| Physics page | Reuse | Link with "see also" |
|---|---|---|
| Gas pressure, kinetic model | `js/particles.js`, ideal-gas page | Chem "PV = nRT…", "Gases: particles bouncing in a box" |
| Internal energy, temperature | Kelvin page drawing | Chem "Kelvin: a temperature scale…" |
| Entropy (HL) | divider-lifting particles | Chem "Entropy and spontaneity" |
| Charged particle in a B field | mass-spec curve and trail code | Chem "Mass spectrometry…" |
| Black bodies, EM spectrum | `Camera.zoomTo` scale zooms | Chem "Emission spectra…" |
| Newton's cannon, Kepler | `Camera.crossZoom` (the hydrogen page's 4000× zoom) | — |
| Every slider page | `Kit.sliderMarkup` / `Kit.slider` | — |

A small "See also" link under the caption is enough. A Batch 0 helper can make it once:
`seeAlso: ["ideal-gas-law"]` on a step.

---

## 3. The physics contents (the plan file Batch 0 writes)

Order follows the IB themes A–D. **★ = showpiece** (simulation, slider or drag), and the rest are
Kit-stepped pages. Codes are topic-level, because the physics guide doesn't number its understandings
the way chemistry does. **HL** marks additional higher-level content. If the IB Physics guide (first
assessment 2025) is available, confirm the HL marks against it. Otherwise flag any you're unsure of.

### A — Space, time and motion
| # | id | Title | Code | What happens |
|---|---|---|---|---|
| 1 | p-motion-graphs | ★ Motion graphs: a car journey in three graphs | A.1 | A car drives, stops and reverses. Displacement, velocity and acceleration graphs draw live underneath it. A tap shades the area under v–t to show the displacement, then shows a gradient triangle. |
| 2 | p-suvat | SUVAT: four equations, one motion | A.1 | A ball rolls down a ramp, and each tap reveals one of u, v, a, t, s with its equation. |
| 3 | p-projectiles | ★ Projectiles: two motions at once | A.1 | A cannon with angle and speed sliders. The horizontal shadow moves steadily and the vertical one accelerates. A toggle adds a dashed "with air resistance" ghost that falls short. |
| 4 | p-newton-laws | Free-body diagrams and Newton's laws | A.2 | A book on a table, then a lift accelerating up and down. The arrows grow and shrink (F_N vs F_g), with the scale reading shown. |
| 5 | p-terminal | ★ Drag and terminal speed | A.2 | A ball bearing falls through glycerin in a tall tube. The drag arrow grows (Stokes: F = 6πηrv) until it matches the weight minus the upthrust, and the speed–time graph flattens. A slider sets the viscosity. |
| 6 | p-momentum | ★ Collisions: momentum is always conserved | A.2 | Air-track carts in elastic, sticky and explosion modes. The momentum bars always total the same. The kinetic-energy bars don't in sticky mode, where the missing energy turns into "thermal" squiggles. |
| 7 | p-impulse | Impulse: the area under a force–time graph | A.2 | An egg dropped on a hard floor vs a cushion. Both F–t areas are equal, but the cushion's is longer and lower, so the egg survives. |
| 8 | p-circular | ★ Circular motion: always turning inward | A.2 | A ball on a string with the v arrow tangent and the F arrow pointing inward. A tap cuts the string and the ball flies off along the tangent. A speed slider shows a = v²/r. |
| 9 | p-energy-coaster | ★ Roller coaster: kinetic, potential, thermal | A.3 | A cart on a track with live KE, GPE and thermal bars, total fixed. A friction toggle makes the thermal bar grow, so the cart can't reach the last hill. The first caption explains work = force × distance. |
| 10 | p-power-efficiency | Power, efficiency and Sankey diagrams | A.3 | A motor lifts a load. A Sankey arrow splits into useful and wasted output, and a closing step mentions energy density. |
| 11 | p-torque | Torque: why handles are far from hinges | A.4 HL | Push a door at different distances, with the torque bar shown. Then a balanced seesaw for rotational equilibrium. |
| 12 | p-rolling-race | ★ The rolling race: hoop vs disc vs sphere | A.4 HL | Three objects of equal mass race down a ramp. The sphere wins and the hoop comes last, and a tap reveals I = kMR² and the split of energy into spinning. |
| 13 | p-skater | ★ The spinning skater | A.4 HL | Pulling the arms in makes the skater spin faster: L = Iω stays constant. A slider sets the arm radius, and Newton's second law for rotation (τ = Iα) is the last step. |

### B — The particulate nature of matter
| # | id | Title | Code | What happens |
|---|---|---|---|---|
| 14 | p-heating-curve | ★ Heating ice: why the line goes flat | B.1 | Particles in a box (reuse) next to a temperature–time graph from ice to steam. On the flat parts the energy breaks bonds instead of speeding particles up. The captions cover Q = mcΔT and Q = mL. |
| 15 | p-heat-transfer | Conduction, convection, radiation | B.1 | A pan on a hob: vibrating particles pass energy along, a convection loop in the water, and wavy arrows from the hot plate. |
| 16 | p-black-body | ★ Black bodies: why hot stars are blue | B.1 | A temperature slider (3000–12000 K) moves the spectrum peak (Wien: λmax T = 2.9 × 10⁻³ m K) and changes the star's colour. Luminosity grows as T⁴ (Stefan–Boltzmann). A last step covers apparent brightness, b = L ÷ 4πd². |
| 17 | p-kinetic-model | Gas pressure: particles hitting walls | B.3 | Reuse particles.js. Each wall hit flashes and the pressure meter counts them. Average KE = 3/2 k_B T. See also the chemistry gas pages. |
| 18 | p-gas-laws | ★ pV = NkT: three dials, one gas | B.3 | V, T and N sliders on a piston (reuse the ideal-gas page) with the p reading live. The captions cover the physicist's form with k_B and N, and the mole form with R and n. |
| 19 | p-first-law | First law: Q = ΔU + W | B.4 HL | Heat a gas in a piston: part raises U (faster particles) and part does work pushing the piston. |
| 20 | p-heat-engine | ★ A heat engine on a p–V diagram | B.4 HL | The piston runs a cycle while a dot traces the loop on a p–V graph. The enclosed area fills in as "work out". A last step covers Carnot efficiency, η = 1 − T_c ÷ T_h. |
| 21 | p-entropy | Entropy: why heat flows hot to cold | B.4 HL | A hot block and a cold block share energy and never un-share it. Second law. See also chemistry entropy. |
| 22 | p-drift | Current: drifting electrons | B.5 | Electrons jiggle and drift slowly while the "signal" lamp lights instantly. I = nAvq, with a cheeky snail comparison (check the number). |
| 23 | p-iv-graphs | Resistance, resistivity and I–V graphs | B.5 | Wire length and area change R (R = ρL ÷ A). I–V curves for a resistor and a filament lamp, where the lamp's curve bends as it heats. |
| 24 | p-series-parallel | ★ Build a circuit: series and parallel | B.5 | Tap to add resistors in series or in parallel. The current arrows split and rejoin, with live ammeter and voltmeter readings at each junction. |
| 25 | p-internal-resistance | EMF and internal resistance | B.5 | A battery drawn with a little resistor inside. Drawing more current makes the terminal pd drop and the battery warm up (ε = I(R + r)). |
| 26 | p-potential-divider | ★ Potential divider: a night-light | B.5 | A light-level slider changes the LDR's resistance, the output pd changes, and the lamp turns on in the dark. |

### C — Wave behaviour
| # | id | Title | Code | What happens |
|---|---|---|---|---|
| 27 | p-shm-spring | ★ Simple harmonic motion: mass on a spring | C.1 | A bobbing mass with x, v and a graphs drawing live and the a arrow always pointing to the centre (a = −ω²x). An amplitude slider shows that the period doesn't change. |
| 28 | p-shm-circle | ★ SHM is the shadow of a circle | C.1 HL | A dot goes round a circle while its shadow does SHM, so x = x₀ sin(ωt + φ) can be read straight off. A phase slider shifts a second oscillator. Live KE and PE bars swap back and forth. |
| 29 | p-pendulum | The pendulum: period ignores mass | C.1 | Two pendulums with different masses swing in step, and a longer one swings slower: T = 2π√(l ÷ g). |
| 30 | p-wave-model | ★ Waves carry energy, not stuff | C.2 | A rope (transverse) and a slinky (longitudinal) with one marked particle that only oscillates while the wave travels. Wavelength and amplitude are labelled, with v = fλ. |
| 31 | p-em-spectrum | The electromagnetic spectrum, zoomed | C.2 | A scale zoom in the style of the hydrogen page, from radio (building-sized) down to gamma (smaller than a nucleus). All travel at c. |
| 32 | p-refraction | ★ Refraction and total internal reflection | C.3 | Drag a laser's angle at a glass block. The ray bends (n₁ sin θ₁ = n₂ sin θ₂), the critical angle appears, and then it reflects totally. A last step shows light trapped in an optical fibre. |
| 33 | p-double-slit | ★ Two slits: ripples that cancel | C.3 | Two sources make expanding SVG ripples, with bright and dark lines on a screen. Sliders for slit spacing d and wavelength λ show s = λD ÷ d. |
| 34 | p-diffraction | Single slits and gratings | C.3 HL | The wide central maximum from a single slit (θ ≈ λ ÷ b). A grating sharpens the bright lines (n λ = d sin θ). |
| 35 | p-standing-string | ★ Standing waves on a string | C.4 | Taps step through harmonics 1–4. Two travelling waves add up to fixed nodes and antinodes, with the frequency ratios labelled. |
| 36 | p-pipes | Pipes: open, closed and missing harmonics | C.4 | Air columns in open–open and open–closed pipes. The closed pipe only has odd harmonics. |
| 37 | p-resonance | ★ Resonance and damping | C.4 | A driven mass on a spring with a driving-frequency slider. The amplitude response curve builds point by point and peaks at the natural frequency. A damping slider moves it through light, heavy and critical damping. (Ties to the builder's EE on damped oscillations, so ask whether to mirror the glycerin-tube setup.) |
| 38 | p-doppler | ★ The Doppler effect: squashed and stretched | C.5 (equations HL) | A moving siren emits wavefronts as circles. A listener in front hears them bunched (higher) and one behind hears them stretched (lower), with a speed slider and the HL equation. Bonus: at the speed of sound the circles pile into a cone (a sonic boom). |
| 39 | p-redshift | ★ Redshift: galaxies running away | C.5 | Absorption lines in a galaxy's spectrum slide toward red as a speed slider increases: Δλ ÷ λ ≈ v ÷ c. Footnote: "Not to scale: galaxies are big." |

### D — Fields
| # | id | Title | Code | What happens |
|---|---|---|---|---|
| 40 | p-newtons-cannon | ★ Newton's cannon: from falling to orbiting | D.1 (orbital speed HL) | It opens with an apple falling, and the camera pulls back to the whole Earth with a cannon on a mountain. A launch-speed slider: below orbital speed the ball falls, at about 7.9 km s⁻¹ it circles, faster than that it goes elliptical, and at about 11.2 km s⁻¹ it escapes. v_orbit = √(GM ÷ r) is HL. |
| 41 | p-gravity-field | Gravitational field strength: g = GM ÷ r² | D.1 | Field lines point into the Earth, and g weakens as the inverse square of distance. A step shows g at the surface vs at the Moon's distance. |
| 42 | p-kepler | ★ Kepler's third law: T² ∝ r³ | D.1 | Inner planets orbit with true period ratios (time compressed) and a T²–r³ graph plots a straight line as each planet lands on it. The first two laws appear in the captions, and the equal-areas sweep is shaded. |
| 43 | p-grav-potential | Gravitational potential and escape speed | D.1 HL | The potential well drawn as a curved surface in 2D profile, where a ball needs enough KE to climb out. v_esc = √(2GM ÷ r). A step covers the energy of an orbit. |
| 44 | p-coulomb | Charge and Coulomb's law | D.2 | Two charges: double one and the force doubles, double the distance and it drops to a quarter. Like charges repel and unlike attract. |
| 45 | p-field-lines | ★ Electric field lines: drag the charges | D.2 HL | Drag +/− charges and the field lines redraw live. A tap shows dashed equipotentials (HL: V = kQ ÷ r, with the field as the potential gradient). |
| 46 | p-magnetic-fields | Magnetic fields: wires, coils and magnets | D.2 | A bar magnet, a straight wire (right-hand grip) and a solenoid, with compass needles that turn to follow each field. |
| 47 | p-charges-in-fields | ★ Charged particles in fields | D.3 | A parabola in an E field, then a circle in a B field. Sliders for B and v show r = mv ÷ qB. See also mass spectrometry. |
| 48 | p-motor-effect | The motor effect: force on a wire | D.3 | A wire in a magnetic field kicks sideways, F = BIL sin θ. Two parallel wires attract or repel depending on the current directions. |
| 49 | p-induction | ★ Induction: push a magnet into a coil | D.4 HL | Drag a magnet in and out of a coil. The needle swings one way, then the other, and faster motion gives a bigger swing (Faraday). The induced current's field opposes the motion (Lenz). |
| 50 | p-generator | ★ The generator: a spinning coil | D.4 HL | A coil rotates in a field while the flux and emf graphs draw live (emf is greatest when the flux is changing fastest). A speed slider changes both the frequency and the peak. |

---

## 4. Facts and the physics data booklet

- New file `PHYSICS_FACTS.md`, in the same table format as `FACTS.md`, with one row per on-screen number
  and its source.
- **Data booklet:** ask the builder for the IB **Physics** data booklet (first assessment 2025) PDF. It's
  probably in Downloads, next to `DataBook2025.pdf` (the chemistry one). Extract it with `pypdf` as in
  PROJECT.md lesson 17. Keep the extraction script re-runnable from the PDF, because scratch files vanish
  between sessions. Notes under captions cite its sections the way chemistry does (for example
  `booklet: "Fundamental constants: G = 6.67 × 10⁻¹¹ N m² kg⁻²"`).
- Numbers that need a source on screen (check each against the booklet or a reliable reference before use):
  g, G, Earth's mass and radius, c, e, k_B, σ, Wien's constant, orbital and escape speeds at Earth's
  surface, glycerin's viscosity, electron drift speed in a typical wire, and the refractive index of glass.
- Physics checks that matter: the a–x graph for SHM has a negative gradient; in a closed pipe the
  closed end is a **displacement node**; the elastic-collision bars conserve **both** momentum and KE;
  the Doppler shift is not symmetric for a moving source vs a moving observer (HL); drawn orbits must
  keep Kepler ratios if the caption says they do.

---

## 5. Quiz, glossary, self-test (every batch)

Each new page needs **one** paper-1 style question in `js/data-quiz-physics.js` (the self-test fails
without it). Add 1–3 glossary terms per page where they help (displacement, impulse, node, flux…). The
end-of-batch self-test must PASS for **both** subjects.

---

## 6. Batches (one per Claude Code session)

Tick the boxes as you go. Each batch ends with: `node --check` on changed files → `python tools/build.py`
→ `index.html?test` PASS → short BUILDLOG entry → `PHYSICS_FACTS.md` rows → commit.

**Batch 0 — Two subjects (infrastructure only, no physics pages yet)**
- [x] Engine: `subject` on plan topics, appending `Book.plan`, per-subject contents, counter and Next/Back (§1)
- [x] Cover with two buttons, About text, `p-` id rule, physics palette tokens
- [x] `pages/00-physics-planned.js` with all 50 lines from §3 (they show as "coming soon")
- [x] Study tools split by subject, with the three empty physics data files
- [x] Self-test walks both subjects, and chemistry still PASSes exactly as before
- [x] Ask the builder for the physics data booklet PDF and extract it

**Batch 1 — Orbits (the pilot showpieces)**: #40 Newton's cannon ★, #41 Gravitational field strength, #42 Kepler ★
**Batch 2 — Gravity & charge**: #43 Gravitational potential, #44 Coulomb, #45 Field lines ★
**Batch 3 — Motion in fields**: #46 Magnetic fields, #47 Charged particles ★, #48 Motor effect
**Batch 4 — Induction + SHM start**: #49 Induction ★, #50 Generator ★, #27 SHM spring ★
**Batch 5 — Oscillations**: #28 SHM circle ★, #29 Pendulum, #37 Resonance & damping ★
**Batch 6 — Waves**: #30 Wave model ★, #31 EM spectrum, #35 Standing string ★
**Batch 7 — Wave phenomena**: #32 Refraction ★, #33 Double slit ★, #34 Diffraction, #36 Pipes
**Batch 8 — Doppler & stars**: #38 Doppler ★, #39 Redshift ★, #16 Black bodies ★
**Batch 9 — Kinematics**: #1 Motion graphs ★, #2 SUVAT, #3 Projectiles ★
**Batch 10 — Forces**: #4 Newton's laws, #5 Terminal speed ★, #6 Momentum ★, #7 Impulse
**Batch 11 — Circles & energy**: #8 Circular motion ★, #9 Roller coaster ★, #10 Power & efficiency
**Batch 12 — Rigid bodies (HL)**: #11 Torque, #12 Rolling race ★, #13 Skater ★
**Batch 13 — Thermal**: #14 Heating curve ★, #15 Heat transfer, #17 Kinetic model, #18 Gas laws ★
**Batch 14 — Thermodynamics (HL)**: #19 First law, #20 Heat engine ★, #21 Entropy
**Batch 15 — Circuits**: #22 Drift, #23 I–V graphs, #24 Series & parallel ★, #25 Internal resistance, #26 Potential divider ★ (5 pages, so split it in two if the session is getting long)
**Batch 16 — Polish**: "See also" links checked, a phone pass at 375 × 812, reduced-motion spot checks,
README and PROJECT.md updated (a new physics section, kept short), and the sound-lab link hidden behind `?lab`.

If the half-yearly exam is close, the builder may reorder batches to follow what's being revised. That's
fine, because Batch 0 is the only one the others depend on.

---

## 7. Paste-ready prompts

**Batch 0:**
> Read PHYSICS_PLAN.md §0–§5, then PROJECT.md §3, §5, §6 and §8. Do Batch 0 from §6 of the plan:
> make the book support two subjects (chemistry and physics) as described in §1. Don't add physics pages
> yet. Chemistry must look and behave exactly as before. Ask me for the physics data booklet PDF. Finish
> with the checks listed in §6, tick the boxes, commit, and stop.

**Any later batch (change N):**
> Read PHYSICS_PLAN.md §0–§5 and Batch N in §6, then PROJECT.md §3, §5 and §8. Build the pages in
> Batch N following the "What happens" column in §3. Check every number against the physics data
> booklet and log it in PHYSICS_FACTS.md. Add each page's quiz question and glossary terms. Finish
> with the checks in §6, tick the boxes, commit, and stop.

**After each batch:** look through the new pages, send feedback the usual way (screenshots plus a numbered
list, one item per page), then `/clear` before the next batch.
