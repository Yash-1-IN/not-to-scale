// Page 6: emission spectra. An excited electron falls back to the second shell, releasing a photon
// each time. Bigger falls release more energetic, bluer light. Four taps build up hydrogen's four
// visible lines on a spectrum strip. Back removes the last line (from the first tap, Back turns the page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CX = 500, CY = 210, HOME_R = 70;
  const STRIP = { x0: 260, x1: 740, y: 400, h: 26 };
  const GAUGE = { x0: 830, base: 335, w: 20, gap: 28, scale: 0.55 }; // a little bar per fall, height ~ how big the jump was

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

    <g id="gauge" opacity="0">
      <text class="graph-label" x="${GAUGE.x0 + GAUGE.gap * 1.5}" y="${GAUGE.base - FALLS[3].out * GAUGE.scale - 20}">size of the jump</text>
      <line class="axis-line" x1="${GAUGE.x0 - 14}" y1="${GAUGE.base}" x2="${GAUGE.x0 + GAUGE.gap * 3 + GAUGE.w + 14}" y2="${GAUGE.base}"/>
      ${FALLS.map((f, i) => `<rect id="gbar${i}" x="${GAUGE.x0 + i * GAUGE.gap}" y="${GAUGE.base}" width="${GAUGE.w}" height="0" rx="4" fill="${f.colour}"/>`).join("")}
    </g>
    <g id="connectors"></g>

    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY}" r="48" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY}" r="270"/>`;

  // After the last fall: send a little dot from the top of each gauge bar down to the matching line
  // on the spectrum, so the size of the jump and its position in the spectrum line up visually.
  function compareGauge(ctx, tl, atTime) {
    FALLS.forEach((f, i) => {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("r", 5);
      dot.setAttribute("fill", f.colour);
      const bx = GAUGE.x0 + i * GAUGE.gap + GAUGE.w / 2;
      const by = GAUGE.base - f.out * GAUGE.scale;
      dot.setAttribute("cx", bx); dot.setAttribute("cy", by);
      ctx.$("#connectors").appendChild(dot);
      const lx = STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0);
      const ly = STRIP.y - 14;
      tl.to(dot, { attr: { cx: lx, cy: ly }, duration: 0.6, ease: "power1.inOut" }, atTime + i * 0.15)
        .to(dot, { scale: 1.6, svgOrigin: lx + " " + ly, duration: 0.2, yoyo: true, repeat: 1 }, atTime + i * 0.15 + 0.6)
        .to(dot, { opacity: 0, duration: 0.4, onComplete: () => dot.remove() }, atTime + i * 0.15 + 1.0);
    });
    tl.call(() => Sound.tindin(), null, atTime + FALLS.length * 0.15 + 0.6);
  }

  const fall = i => ({
    hotspot: "hit", to: "e" + (i + 2), sound: "zwoop", captionAt: i === FALLS.length - 1 ? 3.4 : 1.4,
    play(ctx) {
      const f = FALLS[i];
      const line = ctx.$("#ln" + i);
      const bar = ctx.$("#gbar" + i);
      const tl = gsap.timeline();
      tl.to("#e", { attr: { cx: CX + f.out, cy: CY }, fill: f.colour, duration: 0.6, ease: "power2.out" }, 0)
        .to("#e", { attr: { cx: CX + HOME_R, cy: CY }, duration: 0.7, ease: "power2.in" }, 0.75)
        .call(() => Sound.pop(), null, 1.45)
        .set("#e", { fill: "" }, 1.45)
        .to(line, { opacity: 1, duration: 0.3 }, 1.5)
        .to("#gauge", { opacity: 1, duration: 0.3 }, 1.5)
        .to(bar, { attr: { y: GAUGE.base - f.out * GAUGE.scale, height: f.out * GAUGE.scale }, duration: 0.5, ease: "power2.out" }, 1.5);
      if (i === FALLS.length - 1) compareGauge(ctx, tl, 2.3);
      return tl;
    }
  });

  const unfall = i => ({
    to: "e" + (i + 1), sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      ctx.$("#connectors").innerHTML = "";
      const tl = gsap.timeline();
      tl.to(ctx.$("#ln" + i), { opacity: 0, duration: 0.5 }, 0)
        .to(ctx.$("#gbar" + i), { attr: { y: GAUGE.base, height: 0 }, duration: 0.4 }, 0);
      return tl;
    }
  });

  const states = {};
  for (let i = 0; i < FALLS.length; i++) {
    states["e" + (i + 1)] = {
      caption: i === 0
        ? "Give this hydrogen atom some energy (heat, or a spark) and its electron jumps up, then falls back down. Tap to try it."
        : i === FALLS.length - 1
          ? "One more fall. Watch the little bar on the right grow with it — its height stands for how big this jump was."
          : "Falling from further out releases more energy — and more energy means a bluer photon. The bar on the right grows to match. Tap for another fall.",
      footnote: i === 0 ? "We're starting from the second shell, not the very first, to keep the colours the ones you'd actually see." : undefined,
      tap: fall(i)
    };
    if (i > 0) states["e" + (i + 1)].back = unfall(i - 1);
  }
  states["e" + (FALLS.length + 1)] = {
    caption: "Four falls, four coloured lines. This pattern is hydrogen's emission spectrum — like a fingerprint for the element. Watch the dots: the biggest jump lands closest to the violet end.",
    footnote: "Every element has its own pattern of lines, because its electrons sit at their own particular energies.",
    booklet: "§1 equations: E = hf and c = fλ — more energy means a higher frequency and a shorter wavelength. §5: visible light runs from about 400 nm (violet) to 700 nm (red).",
    back: unfall(FALLS.length - 1),
    final: true
  };

  Book.register({
    id: "emission",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Emission spectra: why hydrogen glows in colours",
    description: "A hydrogen atom with one electron on a ring around it. Tapping the atom sends the electron jumping outward and falling back, releasing a coloured flash of light each time, which lands as a line on a dark strip below. A small bar to the right grows with each fall, showing how big that jump was. Four taps build up hydrogen's four visible spectral lines: red, cyan, blue and violet, and a final animation sends a dot from each bar down to its matching line to compare the two.",
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
