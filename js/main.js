// Phase 1 + 2: the hydrogen page, the zoom out to the real world, sound.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CENTER = "470 240";         // the proton / the hand, in scene coordinates
const ZOOM_FACTOR = 4000;         // how far the "camera" pulls back (a cheat, on purpose)
const $ = id => document.getElementById(id);

const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const muteBtn = $("mute");

let started = false;              // has the book been opened?
let onWorldPage = false;
let busy = false;                 // a zoom is playing

// ---------- Mute button ----------
function showMute() {
  const muted = Sound.isMuted();
  muteBtn.textContent = muted ? "Sound: off" : "Sound: on";
  muteBtn.setAttribute("aria-pressed", muted);
}
muteBtn.addEventListener("click", () => {
  Sound.unlock();
  Sound.setMuted(!Sound.isMuted());
  showMute();
});
showMute();

// ---------- Sound lab ----------
$("labLink").addEventListener("click", () => { Sound.unlock(); $("lab").hidden = false; });
$("labClose").addEventListener("click", () => { $("lab").hidden = true; });

// ---------- The zoom timeline (atom <-> real world) ----------
// One number, `zoom.p`, runs 0 -> 1. The atom shrinks and the world (magnified
// around the hand) shrinks down to normal size, both around the same point.
const zoom = { p: 0 };
const clamp01 = x => Math.max(0, Math.min(1, x));
const K = Math.log(ZOOM_FACTOR);

function applyZoom() {
  const atomScale = Math.exp(-K * zoom.p);
  const worldScale = Math.exp(K * (1 - zoom.p));
  gsap.set("#atomLayer", { scale: atomScale, svgOrigin: CENTER, opacity: clamp01((atomScale - 0.03) / 0.1) });
  gsap.set("#world", {
    scale: worldScale, svgOrigin: CENTER,
    opacity: clamp01((Math.log(150) - Math.log(worldScale)) / (Math.log(150) - Math.log(60)))
  });
}

let arrowLength = 0;
function buildZoomTimeline() {
  const line = $("pointerLine");
  arrowLength = line.getTotalLength();
  gsap.set(line, { strokeDasharray: arrowLength, strokeDashoffset: arrowLength });
  gsap.set("#caption2", { opacity: 0 });
  applyZoom();

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => { busy = false; onWorldPage = true; updateNav(); },
    onReverseComplete: () => { busy = false; onWorldPage = false; updateNav(); armAttention(); }
  });
  tl.to(zoom, { p: 1, duration: 4.5, ease: "power2.inOut", onUpdate: applyZoom }, 0)
    .to(["#caption1", "#legend"], { opacity: 0, duration: 0.5 }, 0)
    .to("#caption2", { opacity: 1, duration: 0.7 }, 4.0)
    .to("#pointerLabel", { opacity: 1, duration: 0.4 }, 4.6)
    .to(line, { opacity: 1, duration: 0.05 }, 4.6)
    .to(line, { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 4.6)
    .to("#pointerHead", { opacity: 1, duration: 0.2 }, 5.25)
    .call(() => { if (!tl.reversed()) Sound.pop(); }, null, 4.6);
  if (reduceMotion) tl.timeScale(12); // "zoom" becomes a quick crossfade
  return tl;
}
const zoomTl = buildZoomTimeline();

function goNext() {
  if (busy || onWorldPage || !started) return;
  busy = true;
  clearAttention();
  Sound.zwoop({ dur: reduceMotion ? 0.25 : 0.7 });
  updateNav();
  zoomTl.play();
}
function goBack() {
  if (busy || !onWorldPage) return;
  busy = true;
  Sound.zwoop({ reverse: true, dur: reduceMotion ? 0.25 : 0.7 });
  updateNav();
  zoomTl.reverse();
}

function updateNav() {
  nextBtn.hidden = !started || onWorldPage;
  backBtn.hidden = !started || !onWorldPage;
  nextBtn.disabled = busy;
  backBtn.disabled = busy;
}

nextBtn.addEventListener("click", goNext);
backBtn.addEventListener("click", goBack);
document.addEventListener("keydown", e => {
  if (!started || !$("lab").hidden) return;
  if (e.key === "ArrowRight") goNext();
  if (e.key === "ArrowLeft") goBack();
});

// ---------- Attention chime ----------
// After ~8 s of no interaction, once per page, chime and make "Next" glow.
let idleTimer = null;
let chimedOnAtomPage = false;

function clearAttention() {
  clearTimeout(idleTimer);
  nextBtn.classList.remove("attn");
}
function armAttention() {
  clearTimeout(idleTimer);
  if (!started || onWorldPage || busy || chimedOnAtomPage) return;
  idleTimer = setTimeout(() => {
    chimedOnAtomPage = true;
    Sound.tindin();
    nextBtn.classList.add("attn");
  }, 8000);
}
["pointerdown", "keydown"].forEach(evt => document.addEventListener(evt, armAttention));

// ---------- Idle motion: electron orbits, proton breathes ----------
function startIdle() {
  gsap.to("#electronArm", { rotation: 360, svgOrigin: CENTER, duration: 9, ease: "none", repeat: -1 });
  gsap.to("#proton", { scale: 1.07, svgOrigin: CENTER, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
}

// ---------- Opening the book ----------
function startIntro() {
  $("page").removeAttribute("inert");
  started = true;

  if (reduceMotion) {
    document.documentElement.className = "";
    gsap.set("#pointerLabel, #pointerHead, #pointerLine", { opacity: 0 });
    gsap.set("#caption2", { opacity: 0 });
    updateNav();
    armAttention();
    return;
  }

  gsap.timeline({ defaults: { ease: "power2.out" } })
    .to(".rule .line", { scaleX: 1, duration: 1.1, ease: "power2.inOut" })
    .to(".rule .cap", { opacity: 1, duration: 0.3 }, "-=0.2")
    .fromTo("#title", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.6")
    .fromTo("#caption1", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.2")
    .fromTo("#proton", { opacity: 0, scale: 0.6, svgOrigin: CENTER }, { opacity: 1, scale: 1, svgOrigin: CENTER, duration: 0.7, ease: "back.out(2)" }, "-=0.1")
    .call(() => Sound.pop(), null, "<0.2")
    .to("#orbit", { opacity: 1, duration: 0.6 }, "-=0.2")
    .to("#electron", { opacity: 1, duration: 0.5 }, "-=0.3")
    .to("#legend", { opacity: 1, duration: 0.5 }, "-=0.2")
    .add(() => { startIdle(); updateNav(); armAttention(); });
}

$("openBook").addEventListener("click", () => {
  Sound.unlock();
  const cover = $("cover");
  if (reduceMotion) {
    cover.hidden = true;
    startIntro();
  } else {
    Sound.page();
    gsap.to(cover, { opacity: 0, duration: 0.6, onComplete: () => { cover.hidden = true; startIntro(); } });
  }
});
