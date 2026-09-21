// Phase 1 + 2: the hydrogen page, the zoom out to the real world, sound.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CENTER = "470 240";         // the proton / the hand, in scene coordinates
const ZOOM_FACTOR = 4000;         // how far the "camera" pulls back (a cheat, on purpose)
const $ = id => document.getElementById(id);

const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const muteBtn = $("mute");

let started = false;              // has the book been opened?
let busy = false;                 // a zoom is playing
let tapped = false;               // has the atom been tapped yet?
// atom = start, zoomed = up close on the proton, cloud = electron smeared, world = person in the park
let state = "atom";

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
  gsap.set(["#caption2", "#captionScale", "#captionCloud"], { opacity: 0 });
  applyZoom();

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => { busy = false; state = "world"; updateNav(); },
    onReverseComplete: () => { busy = false; state = tapped ? "cloud" : "atom"; updateNav(); armAttention(); }
  });
  tl.to(zoom, { p: 1, duration: 4.5, ease: "power2.inOut", onUpdate: applyZoom }, 0)
    .to(["#page1Captions", "#legend"], { opacity: 0, duration: 0.5 }, 0)
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
  if (busy || !started || !(state === "atom" || state === "cloud")) return;
  busy = true;
  clearAttention();
  stopRing();
  Sound.zwoop(reduceMotion ? { dur: 0.25 } : {});
  updateNav();
  zoomTl.play();
}
function goBack() {
  if (busy || !started) return;
  if (state === "zoomed") return zoomOutOfProton();
  if (state !== "world") return;
  busy = true;
  Sound.zwoop(reduceMotion ? { reverse: true, dur: 0.25 } : { reverse: true });
  updateNav();
  zoomTl.reverse();
}

function updateNav() {
  nextBtn.hidden = !started || !(state === "atom" || state === "cloud");
  backBtn.hidden = !started || !(state === "zoomed" || state === "world");
  nextBtn.disabled = busy;
  backBtn.disabled = busy;
  const canTap = started && !busy && state === "atom";
  atomHit.setAttribute("tabindex", canTap ? "0" : "-1");
  atomHit.style.pointerEvents = canTap ? "auto" : "none";
}

nextBtn.addEventListener("click", goNext);
backBtn.addEventListener("click", goBack);
document.addEventListener("keydown", e => {
  if (!started || !$("lab").hidden) return;
  if (e.key === "ArrowRight") goNext();
  if (e.key === "ArrowLeft") goBack();
});

// ---------- Attention chime ----------
// After ~8 s with no interaction, once per page state: chime, and the thing to tap glows.
let idleTimer = null;
const chimed = { atom: false, cloud: false };

function clearAttention() {
  clearTimeout(idleTimer);
  nextBtn.classList.remove("attn");
}
function armAttention() {
  clearTimeout(idleTimer);
  if (!started || busy) return;
  const key = state === "atom" && !tapped ? "atom" : state === "cloud" ? "cloud" : null;
  if (!key || chimed[key]) return;
  idleTimer = setTimeout(() => {
    chimed[key] = true;
    Sound.tindin();
    if (key === "atom") startRing(true);
    else nextBtn.classList.add("attn");
  }, 8000);
}
["pointerdown", "keydown"].forEach(evt => document.addEventListener(evt, armAttention));

// ---------- Tap-me ring on the atom (gold = "you can tap this") ----------
const atomHit = $("atomHit");
let ringTween = null;

function startRing(strong) {
  if (ringTween) ringTween.kill();
  gsap.set("#tapRing", { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: CENTER });
  if (reduceMotion) return; // static outline instead of a pulse
  ringTween = gsap.to("#tapRing", {
    scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: CENTER,
    duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
  });
}
function stopRing() {
  if (ringTween) ringTween.kill();
  ringTween = null;
  gsap.to("#tapRing", { opacity: 0, duration: 0.3 });
}

// ---------- The electron cloud: dots scattered like a 1s orbital, seen flat ----------
// Distance from the proton follows r^2 * e^(-2r/a); the direction is random in 3D, then squashed to 2D.
const cloudDots = [];
(function buildCloud() {
  let seed = 7; // fixed seed so the cloud always looks the same
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = 80; // cloud size (the dotted orbit is a bit bigger, on purpose)
  const layer = $("cloud");
  while (cloudDots.length < 420) {
    const r = -(a / 2) * (Math.log(1 - rand()) + Math.log(1 - rand()) + Math.log(1 - rand()));
    const cosT = 2 * rand() - 1, sinT = Math.sqrt(1 - cosT * cosT), phi = 2 * Math.PI * rand();
    const x = r * sinT * Math.cos(phi), y = r * sinT * Math.sin(phi);
    if (Math.abs(y) > 225 || Math.abs(x) > 440) continue;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const startAngle = rand() * Math.PI * 2;
    dot.setAttribute("class", "cloud-dot");
    dot.setAttribute("r", (1.6 + rand() * 1.8).toFixed(2));
    dot.setAttribute("cx", 470 + 160 * Math.cos(startAngle)); // starts on the orbit ring
    dot.setAttribute("cy", 240 + 160 * Math.sin(startAngle));
    dot.style.opacity = 0;
    layer.appendChild(dot);
    cloudDots.push({ dot, x: 470 + x, y: 240 + y, alpha: 0.3 + rand() * 0.35 });
  }
})();

// ---------- Tap the atom: zoom in to the proton ----------
function tapAtom() {
  if (busy || !started || state !== "atom") return;
  busy = true;
  tapped = true;
  clearAttention();
  stopRing();
  Sound.zwoop(reduceMotion ? { dur: 0.25 } : {});
  updateNav();
  const tl = gsap.timeline({ onComplete: () => { busy = false; state = "zoomed"; updateNav(); } });
  tl.to("#cam", { scale: 5, svgOrigin: CENTER, duration: 1.8, ease: "power2.inOut" }, 0)
    .to("#caption1", { opacity: 0, duration: 0.5 }, 0)
    .to("#captionScale", { opacity: 1, duration: 0.7 }, 1.3);
  if (reduceMotion) tl.timeScale(12);
}
atomHit.addEventListener("click", tapAtom);
atomHit.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapAtom(); }
});

// ---------- Zoom back out: the electron doesn't return to its orbit, it smears ----------
function zoomOutOfProton() {
  busy = true;
  Sound.zwoop(reduceMotion ? { reverse: true, dur: 0.25 } : { reverse: true });
  updateNav();
  const tl = gsap.timeline({ onComplete: () => { busy = false; state = "cloud"; updateNav(); armAttention(); } });
  tl.to("#cam", { scale: 1, svgOrigin: CENTER, duration: 1.8, ease: "power2.inOut" }, 0)
    .to("#captionScale", { opacity: 0, duration: 0.5 }, 0)
    .to("#electron", { opacity: 0, duration: 0.6 }, 1.0)
    .to("#orbit", { opacity: 0, duration: 1.6 }, 1.0)
    .to("#captionCloud", { opacity: 1, duration: 0.8 }, 2.6);
  cloudDots.forEach(d => {
    tl.to(d.dot, { attr: { cx: d.x, cy: d.y }, opacity: d.alpha, duration: 1.6, ease: "power2.out" }, 1.0 + Math.random() * 0.7);
  });
  if (reduceMotion) tl.timeScale(12);
}

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
    startRing(false);
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
    .add(() => { startIdle(); startRing(false); updateNav(); armAttention(); });
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
