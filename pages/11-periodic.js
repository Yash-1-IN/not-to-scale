// Page 11: walking across the periodic table. Atomic radius shrinks across period 3: each element
// has one more proton than the last, pulling the same outer shell in a little tighter.

(() => {
  const BASE_Y = 340; // every atom's bottom edge sits on this line
  const START_R = 46; // all atoms start this size, then shrink to their real relative size
  const ELEMENTS = [
    { sym: "Na", r: 46 }, { sym: "Mg", r: 40 }, { sym: "Al", r: 35 }, { sym: "Si", r: 31 },
    { sym: "P", r: 28 }, { sym: "S", r: 26 }, { sym: "Cl", r: 24 }, { sym: "Ar", r: 22 }
  ];
  const X0 = 140, DX = 100;

  const atoms = ELEMENTS.map((e, i) => ({ ...e, x: X0 + i * DX }));

  const svg = `
    <line class="axis-line fade" x1="${X0 - 40}" y1="${BASE_Y}" x2="${X0 + (ELEMENTS.length - 1) * DX + 40}" y2="${BASE_Y}"/>
    ${atoms.map((a, i) => `
      <circle class="proton fade" id="atom${i}" cx="${a.x}" cy="${BASE_Y - START_R}" r="${START_R}"/>
      <text class="nuc-sym fade" id="sym${i}" x="${a.x}" y="${BASE_Y - START_R}">${a.sym}</text>`).join("")}
    <circle class="tap-ring" id="ring" cx="500" cy="240" r="440" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="240" r="480"/>`;

  const shrink = {
    hotspot: "hit", to: "shown", sound: "zwoop", captionAt: 1.6,
    play(ctx) {
      const tl = gsap.timeline();
      atoms.forEach((a, i) => {
        tl.to("#atom" + i, { attr: { r: a.r, cy: BASE_Y - a.r }, duration: 0.6, ease: "power2.out" }, i * 0.12)
          .to("#sym" + i, { attr: { y: BASE_Y - a.r }, duration: 0.6, ease: "power2.out" }, i * 0.12)
          .call(() => Sound.pop(), null, i * 0.12 + 0.5);
      });
      return tl;
    }
  };

  Book.register({
    id: "periodic",
    topic: "Structure 3 — Classification of matter",
    title: "Walking across the periodic table: trends in atom size",
    description: "Eight atoms in a row, sodium to argon, all starting the same size. Tapping shrinks them one after another from left to right, ending with sodium the largest and argon the smallest, all sitting on the same baseline.",
    svg,
    start: "same",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to see how atom size changes across a period", hint: Hint.ring("#ring", "500 240") }],

    intro() {
      return gsap.to(["circle.proton.fade", "text.nuc-sym.fade", "line.fade"], { opacity: 1, duration: 0.6, stagger: 0.05 });
    },

    idle() {
      atoms.forEach((a, i) => {
        gsap.to("#atom" + i, { scale: 1.04, svgOrigin: a.x + " " + BASE_Y, duration: 2 + i * 0.15, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },

    states: {
      same: {
        caption: "Here are eight atoms, sodium through to argon, drawn the same size to start. Tap to see how they really compare.",
        tap: shrink
      },
      shown: {
        caption: "Each atom has one more proton than the last, pulling the very same outer shell in a little tighter. So atoms get smaller as you move across a period.",
        footnote: "Sizes here are relative to each other, not to any real measurement — not to scale, of course.",
        final: true
      }
    }
  });
})();
