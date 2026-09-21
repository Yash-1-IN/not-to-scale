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
