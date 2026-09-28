// Page 6: emission spectra. An excited electron falls back to the second shell, releasing a photon
// each time. Bigger falls release more energetic, bluer light. Four taps build up hydrogen's four
// visible lines on a spectrum strip. Back removes the last line (from the first tap, Back turns the page).

(() => {
  const CX = 500, CY = 210, HOME_R = 70;
  const STRIP = { x0: 260, x1: 740, y: 400, h: 26 };

  // [how far out the electron jumps, the photon's colour, where it lands on the strip (0=violet end, 1=red end), name]
  const FALLS = [
    { out: 145, colour: "#E5382B", pos: 0.86, name: "red" },
    { out: 178, colour: "#22B6A5", pos: 0.6, name: "cyan" },
    { out: 206, colour: "#2E6FE0", pos: 0.36, name: "blue" },
    { out: 230, colour: "#6A2BD9", pos: 0.12, name: "violet" }
  ];

  const svg = `
    <circle class="orbit fade" cx="${CX}" cy="${CY}" r="${HOME_R}"/>
    <circle class="proton fade" cx="${CX}" cy="${CY}" r="22"/>
    <text class="nuc-sym fade" x="${CX}" y="${CY}">H</text>
    <circle class="electron fade" id="e" cx="${CX + HOME_R}" cy="${CY}" r="7"/>

    <g id="strip">
      <rect class="spectrum-strip" x="${STRIP.x0}" y="${STRIP.y}" width="${STRIP.x1 - STRIP.x0}" height="${STRIP.h}" rx="4"/>
      ${FALLS.map((f, i) => `<line class="spectrum-line" id="ln${i}" x1="${STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0)}" x2="${STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0)}" y1="${STRIP.y + 2}" y2="${STRIP.y + STRIP.h - 2}" stroke="${f.colour}" opacity="0"/>`).join("")}
    </g>
    <text class="graph-label fade" x="500" y="${STRIP.y + STRIP.h + 24}">hydrogen's emission spectrum</text>

    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY}" r="48" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY}" r="270"/>`;

  const fall = i => ({
    hotspot: "hit", to: "e" + (i + 2), sound: "zwoop", captionAt: 1.4,
    play(ctx) {
      const f = FALLS[i];
      const line = ctx.$("#ln" + i);
      const tl = gsap.timeline();
      tl.to("#e", { attr: { cx: CX + f.out, cy: CY }, fill: f.colour, duration: 0.6, ease: "power2.out" }, 0)
        .to("#e", { attr: { cx: CX + HOME_R, cy: CY }, duration: 0.7, ease: "power2.in" }, 0.75)
        .call(() => Sound.pop(), null, 1.45)
        .set("#e", { fill: "" }, 1.45)
        .to(line, { opacity: 1, duration: 0.3 }, 1.5);
      return tl;
    }
  });

  const unfall = i => ({
    to: "e" + (i + 1), sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      return gsap.to(ctx.$("#ln" + i), { opacity: 0, duration: 0.5 });
    }
  });

  const states = {};
  for (let i = 0; i < FALLS.length; i++) {
    states["e" + (i + 1)] = {
      caption: i === 0
        ? "Give this hydrogen atom some energy (heat, or a spark) and its electron jumps up, then falls back down. Tap to try it."
        : "Falling from further out releases more energy — and more energy means a bluer photon. Tap for another fall.",
      footnote: i === 0 ? "We're starting from the second shell, not the very first, to keep the colours the ones you'd actually see." : undefined,
      tap: fall(i)
    };
    if (i > 0) states["e" + (i + 1)].back = unfall(i - 1);
  }
  states["e" + (FALLS.length + 1)] = {
    caption: "Four falls, four coloured lines. This pattern is hydrogen's emission spectrum — like a fingerprint for the element.",
    footnote: "Every element has its own pattern of lines, because its electrons sit at their own particular energies.",
    back: unfall(FALLS.length - 1),
    final: true
  };

  Book.register({
    id: "emission",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Emission spectra: why hydrogen glows in colours",
    description: "A hydrogen atom with one electron on a ring around it. Tapping the atom sends the electron jumping outward and falling back, releasing a coloured flash of light each time, which lands as a line on a dark strip below. Four taps build up hydrogen's four visible spectral lines: red, cyan, blue and violet.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "e1",

    hotspots: [{ id: "hit", selector: "#hit", label: "Give the atom energy and watch it fall back", hint: Hint.ring("#ring", CX + " " + CY) }],

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("circle.proton", { opacity: 0, scale: 0.6, svgOrigin: CX + " " + CY }, { opacity: 1, scale: 1, svgOrigin: CX + " " + CY, duration: 0.6, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to(["text.nuc-sym", ".orbit", "#e", ".graph-label"], { opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.2");
    },

    idle() {
      gsap.to("#e", { scale: 1.15, svgOrigin: CX + " " + CY, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states
  });
})();
