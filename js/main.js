// Phase 1: the hydrogen page, alive.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CENTER = "470 240"; // proton position in the scene's coordinates

// ----- Style toggle (flat <-> paper cutout) -----
const toggle = document.getElementById("styleToggle");
const styleName = document.getElementById("styleName");

function setStyle(name) {
  document.body.dataset.style = name;
  styleName.textContent = name === "flat" ? "Flat" : "Paper cutout";
  toggle.setAttribute("aria-pressed", name === "cutout");
  try { sessionStorage.setItem("style", name); } catch (e) {}
}

toggle.addEventListener("click", () => {
  setStyle(document.body.dataset.style === "flat" ? "cutout" : "flat");
});

try { setStyle(sessionStorage.getItem("style") || "flat"); } catch (e) { setStyle("flat"); }

// ----- Intro: rule draws out, text fades in, atom appears -----
const fades = ["#title", "#caption", "#orbit", "#proton", "#electron", "#legend"];
const ruleParts = [".rule .line", ".rule .cap"];

if (reduceMotion) {
  document.documentElement.className = ""; // show everything at once, no idle motion
} else {
  const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
  intro
    .to(".rule .line", { scaleX: 1, duration: 1.1, ease: "power2.inOut" })
    .to(".rule .cap", { opacity: 1, duration: 0.3 }, "-=0.2")
    .fromTo("#title", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.6")
    .fromTo("#caption", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.2")
    .fromTo("#proton", { opacity: 0, scale: 0.6, svgOrigin: CENTER }, { opacity: 1, scale: 1, svgOrigin: CENTER, duration: 0.7, ease: "back.out(2)" }, "-=0.1")
    .to("#orbit", { opacity: 1, duration: 0.6 }, "-=0.2")
    .to("#electron", { opacity: 1, duration: 0.5 }, "-=0.3")
    .to("#legend", { opacity: 1, duration: 0.5 }, "-=0.2")
    .add(startIdle);
}

// ----- Idle motion: electron orbits, proton breathes -----
function startIdle() {
  gsap.to("#electronArm", { rotation: 360, svgOrigin: CENTER, duration: 9, ease: "none", repeat: -1 });
  gsap.to("#proton", { scale: 1.07, svgOrigin: CENTER, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
}
