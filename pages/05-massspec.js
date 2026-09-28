// Page 5: mass spectrometry. Neon ions fire through a magnetic field; lighter ions bend more than
// heavier ones, so each isotope lands in its own spot. Tap fires the beam and reveals the spectrum.

(() => {
  const SRC = { x: 90, y: 240 };
  const DET_X = 860;
  // Two isotopes of neon: [label, mass number, how far it deflects (smaller mass -> bends more), colour]
  const IONS = [
    { label: "Ne-20", mass: 20, endY: 110, colour: "var(--proton)" },
    { label: "Ne-22", mass: 22, endY: 190, colour: "var(--electron)" }
  ];
  const BAR = { x: [430, 530], base: 400, top: 300, w: 60 }; // graph baseline y=430, bars grow upward to y=300
  const HEIGHT = { 20: 100, 22: 20 }; // relative abundance, exaggerated bar heights in px

  const svg = `
    <text class="graph-label" x="90" y="180">ion source</text>
    <rect x="230" y="150" width="380" height="180" rx="16" fill="none" stroke="var(--ink)" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="6 6"/>
    <text class="graph-label" x="420" y="138">magnetic field</text>
    <line class="wire" x1="820" y1="80" x2="820" y2="400" stroke-dasharray="1 10" stroke-width="3" opacity="0.5"/>
    <text class="graph-label" x="880" y="80">detector</text>

    <circle class="particle fade" id="ionA" cx="${SRC.x}" cy="${SRC.y - 10}" r="10" fill="var(--proton)"/>
    <circle class="particle fade" id="ionB" cx="${SRC.x}" cy="${SRC.y + 10}" r="10" fill="var(--electron)"/>

    <g id="graph" opacity="0">
      <line class="axis-line" x1="380" y1="${BAR.base}" x2="620" y2="${BAR.base}"/>
      <rect id="bar20" x="${BAR.x[0]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" fill="var(--proton)"/>
      <rect id="bar22" x="${BAR.x[1]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" fill="var(--electron)"/>
      <text class="mass-axis-label" x="${BAR.x[0] + BAR.w / 2}" y="${BAR.base + 22}">20</text>
      <text class="mass-axis-label" x="${BAR.x[1] + BAR.w / 2}" y="${BAR.base + 22}">22</text>
      <text class="graph-label" x="500" y="${BAR.base + 42}">mass / charge (m/z)</text>
    </g>

    <circle class="tap-ring" id="ring" cx="450" cy="240" r="260" opacity="0"/>
    <circle class="hit" id="hit" cx="450" cy="240" r="420"/>`;

  const fire = {
    hotspot: "hit", to: "result", sound: "zwoop", captionAt: 1.6,
    play(ctx) {
      const tl = gsap.timeline();
      IONS.forEach((ion, i) => {
        const el = ctx.$("#ion" + (i === 0 ? "A" : "B"));
        tl.to(el, { attr: { cx: DET_X, cy: ion.endY }, duration: 1.7, ease: i === 0 ? "power3.out" : "power1.out" }, 0.2)
          .call(() => Sound.pop(), null, 1.85 + i * 0.05);
      });
      tl.to("#graph", { opacity: 1, duration: 0.4 }, 2.0)
        .to("#bar20", { attr: { y: BAR.base - HEIGHT[20], height: HEIGHT[20] }, duration: 0.7, ease: "power2.out" }, 2.1)
        .to("#bar22", { attr: { y: BAR.base - HEIGHT[22], height: HEIGHT[22] }, duration: 0.7, ease: "power2.out" }, 2.2);
      return tl;
    }
  };

  Book.register({
    id: "massspec",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Mass spectrometry: sorting atoms by mass",
    description: "A beam of neon ions travels through a dashed region marked 'magnetic field'. Tapping fires the beam: the lighter ions curve more and the heavier ions curve less, so each isotope lands at its own spot on a detector. A small bar graph then appears showing neon-20 as the tall, common bar and neon-22 as a short, rarer one.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>neon-20 <span class="dot dot-e" aria-hidden="true"></span>neon-22',
    start: "ready",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to fire the ion beam", hint: Hint.ring("#ring", "450 240") }],

    intro() {
      return gsap.timeline().to(["#ionA", "#ionB"], { opacity: 1, duration: 0.6, stagger: 0.15 });
    },

    idle() {
      gsap.to(["#ionA", "#ionB"], { y: "+=6", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 });
    },

    states: {
      ready: {
        caption: "Neon atoms are turned into ions and fired through a magnetic field. Tap to fire the beam.",
        footnote: "This machine is a mass spectrometer, AHL content if your course covers it.",
        tap: fire
      },
      result: {
        caption: "Lighter ions are easier to deflect, so neon-20 curves more than neon-22. Each isotope lands in its own spot.",
        footnote: "The bar graph is the result: a mass spectrum. Taller bars mean more of that isotope. (A trace of neon-21 exists too, too small to draw here.)",
        final: true
      }
    }
  });
})();
