// Page 16: acids and bases. An acid is a proton donor; a base is a proton acceptor. Tap sends a
// proton (H+) from HCl across to NH3, leaving Cl- and NH4+ behind.

(() => {
  const AX = 300, BX = 700, CY = 240, R = 55;

  const svg = `
    <circle class="fade" cx="${AX}" cy="${CY}" r="${R}" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <text class="molecule-label fade" id="acidLabel" x="${AX}" y="${CY}" dominant-baseline="central">HCl</text>
    <text class="atom-sub fade" x="${AX}" y="${CY + R + 26}">acid</text>

    <circle class="fade" cx="${BX}" cy="${CY}" r="${R}" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <text class="molecule-label fade" id="baseLabel" x="${BX}" y="${CY}" dominant-baseline="central">NH₃</text>
    <text class="atom-sub fade" x="${BX}" y="${CY + R + 26}">base</text>

    <g id="proton">
      <circle class="h-plus fade" id="protonDot" cx="${AX + R}" cy="${CY}" r="17"/>
      <text class="h-plus-label fade" id="protonLabel" x="${AX + R}" y="${CY}">H⁺</text>
    </g>

    <rect class="tap-ring" id="ring" x="223" y="163" width="554" height="186" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="${CY}" r="420"/>`;

  const give = {
    hotspot: "hit", to: "given", sound: "zwoop", captionAt: 1.1,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to("#protonDot", { attr: { cx: BX - R }, duration: 1.1, ease: "power2.inOut" }, 0)
        .to("#protonLabel", { attr: { x: BX - R }, duration: 1.1, ease: "power2.inOut" }, 0)
        .call(() => Sound.pop(), null, 1.05)
        .call(() => { ctx.$("#acidLabel").textContent = "Cl⁻"; ctx.$("#baseLabel").textContent = "NH₄⁺"; }, null, 1.1);
      return tl;
    }
  };

  const takeBack = {
    to: "apart", sound: "zwoop-rev", captionAt: 1.1,
    play(ctx) {
      const tl = gsap.timeline();
      tl.call(() => { ctx.$("#acidLabel").textContent = "HCl"; ctx.$("#baseLabel").textContent = "NH₃"; }, null, 0)
        .to("#protonDot", { attr: { cx: AX + R }, duration: 1.0, ease: "power2.inOut" }, 0)
        .to("#protonLabel", { attr: { x: AX + R }, duration: 1.0, ease: "power2.inOut" }, 0);
      return tl;
    }
  };

  Book.register({
    id: "acids",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Acids and bases: passing a proton",
    description: "An acid, HCl, and a base, NH3, drawn as two circles with a small H-plus proton sitting on the acid's edge. Tapping sends the proton across to the base: the acid becomes chloride, Cl-, and the base becomes ammonium, NH4-plus.",
    svg,
    start: "apart",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to let the acid hand over its proton", hint: Hint.ring("#ring", "500 256") }],

    intro() {
      return gsap.to(["circle.fade", "text.fade"], { opacity: 1, duration: 0.6, stagger: 0.04 });
    },

    idle() {
      gsap.to("#proton", { scale: 1.15, transformOrigin: "center", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      apart: {
        caption: "Here's an acid, HCl, and a base, NH₃. Acids are proton donors, and bases are proton acceptors. Tap to watch the proton move.",
        tap: give
      },
      given: {
        caption: "HCl handed over a proton to NH₃. HCl is now Cl⁻, its conjugate base; NH₃ is now NH₄⁺, its conjugate acid.",
        footnote: "This ‘passing a proton’ idea is the Brønsted–Lowry definition of acids and bases.",
        back: takeBack,
        final: true
      }
    }
  });
})();
