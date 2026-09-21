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
