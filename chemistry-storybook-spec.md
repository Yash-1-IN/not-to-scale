# Chemistry Storybook — Project Specification

A build brief for Claude Code. Put this file in an empty project folder, along with the sketch image saved as `sketch.png`, then start with: "Read `chemistry-storybook-spec.md` and start Phase 1."

---

## 0. Read this first (instructions to Claude Code)

- The person building this is **new to coding**. Before each phase, say in two or three plain sentences what you're about to build and how. Keep explanations short; they want to see the thing, not a lecture.
- **One phase at a time.** Each phase ends with a checkpoint. Stop there, tell them exactly how to open and try it, and wait. Don't start the next phase until they say so.
- **They don't yet know how it should look or feel.** That's expected, and the phases are built around it. When something is a matter of taste, show options rather than picking silently.
- **Ask before deciding anything this document leaves open.**
- **Chemistry must be correct.** Playful tone, but no wrong facts. When a scene simplifies something, it says so on screen (see §4).

---

## 1. What it is

An interactive, animated picture book that explains IB Chemistry topics. Each "page" is one scene: a simple, friendly illustration that moves gently, a short caption, and things you can tap. Tapping makes something happen — usually a zoom into the scene to show what's really going on underneath.

Think children's picture book, but the content is real IB Chemistry. The contrast is the point: serious ideas, told simply and warmly.

Small sound effects add life: a soft "zwoop" when the camera zooms, a gentle "tin-din" chime when the page wants your attention.

**Audience:** IB Chemistry students (16–18) who want a friendly, visual way into a topic, and anyone curious. It is not a revision tool with questions and scores. It's for understanding.

---

## 2. The starting sketch

`sketch.png` in the project folder is the builder's own mock-up of the first page. In words:

- White page, with a thin purple border framing the whole thing.
- Title at the top, centred, in a large rounded sans-serif: "Website stuff" (placeholder — the real title is decided in Phase 1).
- A thin black horizontal rule across the full width under the title, with small solid squares at each end.
- A caption, centred, well below the rule: "This is a hydrogen atom,  not to scale of course"
- Below the caption, the atom: a **red circle** (the proton) slightly left of centre, and a much smaller **blue dot** (the electron) to its right, both on the same horizontal line.

Treat this as the seed of the visual style. The red proton and blue electron are the builder's choices; keep them as the palette's anchors. The rule with square end-caps and the purple frame are nice details worth keeping as recurring motifs. Everything else can evolve.

The "not to scale of course" caption is the heart of the whole idea: friendly honesty about simplification. Make it a running device (§4).

---

## 3. Tech stack

Keep it as simple as possible. Fixed unless the builder agrees to change it.

| Layer | Choice | Why |
|---|---|---|
| Page | One `index.html`, plus a CSS file and plain JavaScript files | No build tools, nothing to install |
| Drawings | Inline SVG, drawn in code | Scales perfectly when zooming; no image files to manage |
| Animation | GSAP (free, loaded from cdnjs) | Timelines are easy to read and edit, and it handles smooth camera zooms well |
| Sound | Web Audio API, sounds **synthesised in code** | No audio files, no licensing questions, and each sound is tweakable by changing a few numbers |

**It must work by double-clicking `index.html`.** No local server, no ES modules, no `fetch()` of local files. Plain `<script>` tags in order. This keeps the "open it and look" loop instant for a beginner.

Later (Phase 6) it can go on GitHub Pages so it has a shareable link.

---

## 4. Storytelling rules

These apply to every scene.

1. **One idea per page.** If a page needs two ideas, it's two pages.
2. **Captions are short.** One or two sentences, conversational, the way you'd explain it to a younger sibling. No jargon without an immediate plain explanation.
3. **Start with the simple picture, then peel it back.** The first view of a scene is the textbook cartoon. Tapping or zooming reveals what's more accurate.
4. **The "not to scale" voice.** Whenever a picture simplifies or distorts reality, a small, slightly cheeky footnote says so — "not to scale, of course", "electrons don't actually look like this", "real atoms aren't red". This is the project's personality. It teaches that models are models, which is itself an IB idea.
5. **Every fact gets checked.** Keep a `FACTS.md` file listing each factual claim made on screen, with the source it was checked against. Flag anything uncertain to the builder rather than guessing.

---

## 5. Sound

Four sounds, all synthesised with the Web Audio API. Put them in one file, `sound.js`, with each sound as a small function whose numbers are easy to tweak. Starting recipes:

| Sound | When | Starting recipe |
|---|---|---|
| **zwoop** | Camera zooms in or out | Sine oscillator, frequency rising from ~300 Hz to ~900 Hz over 0.25 s (exponential ramp), soft fade in and out. Zooming *out* plays it in reverse (falling pitch). |
| **tin-din** | Page wants the user's attention | Two short soft chimes ~120 ms apart: a higher note (~1570 Hz, G6) then a lower one (~1175 Hz, D6). Sine or triangle wave, quick attack, ~0.4 s exponential decay each. |
| **pop** | Something appears or is tapped | Very short sine blip, ~600 Hz, falling quickly, under 0.1 s |
| **page turn** | Moving to the next or previous page | Short burst of filtered noise with a soft sweep, like paper |

Rules:

- **Soft.** Overall volume low (master gain around 0.15 to start). These are accents, never the main event.
- **Browsers block sound until the user interacts.** So the book opens on a cover page with an "Open the book" button; that first tap unlocks audio.
- **A mute button is always visible.** Remember the choice for the session.
- **The attention chime is rare.** It plays only if the user has been idle on a page for ~8 seconds and there's something tappable they haven't tapped. Once per page, never on a loop. A chime that repeats becomes annoying within a minute.
- **Sound is never the only signal.** Every sound is paired with something visual (the tappable thing glows or wiggles when the chime plays). Some users will have sound off, and some can't hear it.

In Phase 2, give the builder a small test panel with a button per sound and sliders for the key numbers, so they can tune the sounds by ear before committing.

---

## 6. Motion

- **Idle motion is gentle.** Things breathe, bob, or orbit slowly. Nothing jitters or flashes.
- **Camera zooms are the signature move.** Smooth, eased (e.g. `power2.inOut`), about 1–1.5 s, always paired with the zwoop. The camera is a transform on one SVG group wrapping the whole scene, so zooming works the same way on every page.
- **Tappable things announce themselves** with a soft glow or small wiggle, in one colour reserved only for "you can tap this".
- **Respect `prefers-reduced-motion`.** With it on: no idle motion, zooms become quick crossfades, glows become a static outline.

---

## 7. Visual design

Before writing CSS in Phase 1, propose a short design plan: palette as 4–6 named colours (built around the sketch's red, blue and purple), one or two typefaces with their roles, and how a page is laid out. Get it approved.

Direction:

- **Picture book, not app.** The page should feel like a page: generous white space, a clear title, one illustration, a caption. No sidebars, no dashboard chrome, no cards.
- **Keep the sketch's bones:** the purple frame, centred title, rule with square end-caps, caption above the illustration.
- **Flat, friendly shapes.** Circles, soft edges, simple colour. Illustrations should look drawn with intent, not like clip-art.
- **Typography carries the warmth.** Pick a typeface with personality that's still very readable. Avoid the obvious default "kids' font" choices unless the builder picks one.
- **One accent colour means "tap me"** and is used for nothing else.
- Works on a laptop first; should still be usable on a phone.

---

## 8. Build phases

Each phase ends with a checkpoint. Stop, show, wait.

### Phase 1 — The hydrogen page, alive

Build the sketch's page and make it move. Nothing else.

- The page as sketched: purple frame, title, rule, caption, proton, electron.
- Idle animation: the electron circles the proton slowly; the proton gently breathes (tiny scale pulse).
- On load: the rule draws itself outward from the centre, then the title and caption fade in, then the atom appears.
- **Build it in two visual styles** so the builder can compare — for example, a clean flat style close to the sketch, and a hand-drawn/paper-cutout style with slightly wobbly outlines and a subtle paper texture. A toggle switches between them.

**Checkpoint:** builder opens `index.html`, watches it, flips between the two styles, and picks one (or asks for a mix). Also decide the book's real title here.

### Phase 2 — Sound

- Implement the four sounds from §5.
- Add the cover page with "Open the book", the mute button, and the attention chime rule.
- Add the sound test panel (hidden behind a small "sound lab" link) with a button and tuning sliders for each sound.

**Checkpoint:** builder tunes the sounds by ear. Copy the final numbers into `sound.js` as the new defaults, and remove or hide the panel.

### Phase 3 — The zoom

This is the moment that decides whether the whole idea works. The sequence on the hydrogen page:

1. **Tap the atom.** Zwoop. The camera zooms in toward the proton. The electron drifts off the edge of the screen.
2. **Scale reveal.** A caption: "Remember, not to scale. If the proton were the size of a marble, the electron would be about half a kilometre away." (Check this: Bohr radius ≈ 5.3 × 10⁻¹¹ m, proton radius ≈ 0.84 × 10⁻¹⁵ m, ratio ≈ 63,000; a marble of ~0.8 cm radius gives ~500 m.) A small "back" button to zoom out.
3. **Zoom back out.** Reverse zwoop. As the electron returns, it doesn't settle back into its neat orbit — it **smears into a soft, fuzzy cloud** around the proton.
4. **The honest reveal.** Caption: "Actually, electrons don't orbit like little planets. We only know where one is *likely* to be — so it's more like a fuzzy cloud." A footnote in the "not to scale" voice: "This cloud is called an orbital. More on that later."

**Checkpoint:** builder tries it. Is the zoom satisfying? Is the pacing right? Adjust timings until it feels good. Only then move on — every later page reuses this.

### Phase 4 — Turning it into a book

Now that one page works, make pages into data so new ones are easy to add.

- Each page is one JavaScript object in its own file under `pages/`: title, caption, the SVG drawing, idle animations, tappable hotspots, and what each tap triggers (zoom target, new caption, reveal).
- A small engine reads these and handles: page turns (with the page-turn sound), next/back arrows, keyboard arrows, a page counter, the attention chime, the camera.
- Rebuild the hydrogen page in this format. It must behave exactly as before.
- Add a contents page listing all pages, grouped by IB topic.

**Checkpoint:** builder adds a trivial test page themselves by copying the hydrogen file and changing the caption, with guidance. If that's easy, the engine is right.

### Phase 5 — More pages

Add pages from the backlog in §9, one at a time, each reviewed before the next. Suggested first three, because they follow naturally from hydrogen:

1. **Isotopes** — hydrogen, deuterium, tritium side by side; tap to zoom into each nucleus and count neutrons.
2. **Electron shells** — build up from hydrogen to sodium, electrons arriving one by one into shells; then the cloud reveal again for why "shells" is a simplification.
3. **Ionic bonding** — sodium hands its outer electron to chlorine; zoom to see the ions attract.

For each page, update `FACTS.md`.

**Checkpoint:** after each page.

### Phase 6 — Polish and share

- Accessibility pass (§10).
- Test on a phone.
- A short "about" page: what this is, who made it, and that it simplifies on purpose.
- Deploy to GitHub Pages, with step-by-step instructions for the builder.

---

## 9. Page backlog (IB Chemistry)

Mapped to the current IB Chemistry guide (first assessment 2025). Check against the actual syllabus in use before building each page.

**Structure 1 — Models of the particulate nature of matter**
- The hydrogen atom and scale *(Phase 1–3)*
- Isotopes (S1.2)
- Mass spectrometry: sorting atoms by mass (S1.2, AHL)
- Electron shells and configurations (S1.3)
- Emission spectra: why hydrogen glows in colours (S1.3)
- The mole: counting things too small to count (S1.4)
- Gases: particles bouncing in a box (S1.5)

**Structure 2 — Models of bonding and structure**
- Ionic bonding (S2.1)
- Covalent bonding: sharing electrons (S2.2)
- Metallic bonding: a sea of electrons (S2.3)

**Structure 3 — Classification of matter**
- Walking across the periodic table: trends in atom size (S3.1)
- Functional groups as "families" (S3.2)

**Reactivity 1 — What drives chemical reactions?**
- Exothermic vs endothermic: where does the energy go? (R1.1)

**Reactivity 2 — How much, how fast, how far?**
- Collision theory: why heating speeds things up (R2.2)
- Equilibrium: a reaction that runs both ways at once (R2.3)

**Reactivity 3 — What are the mechanisms of chemical change?**
- Acids and bases: passing a proton (R3.1)
- Redox and electrochemical cells: following the electrons — which end is the anode, which is the cathode, and why (R3.2)

---

## 10. Accessibility

- Every sound has a visual partner; nothing depends on hearing.
- Full keyboard use: arrows turn pages, Tab moves between tappable things, Enter/Space taps. Visible focus outline.
- Every SVG scene has a text description for screen readers, and every caption is real text, not drawn into the image.
- Colour is never the only way to tell things apart (the proton and electron also differ in size and label).
- `prefers-reduced-motion` respected (§6).
- Text contrast at WCAG AA or better.

---

## 11. Project layout

```
/index.html
/sketch.png          the original mock-up, for reference
/css/styles.css
/js/
  sound.js           the four synthesised sounds
  camera.js          zoom and pan
  engine.js          page loading, page turns, hotspots, attention chime
/pages/
  01-hydrogen.js
  02-isotopes.js
  ...
/FACTS.md            every on-screen fact and where it was checked
/BUILDLOG.md         one short entry per session: what was built, what changed, what's next
/README.md
```

---

## 12. Out of scope (for now)

Quizzes and scores, user accounts, narration/voiceover, 3D, a mobile app. Any of these could come later; none of them should creep into the early phases.
