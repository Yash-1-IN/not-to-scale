// Page 13: exothermic vs endothermic. A ball rolls along an energy profile. Roll downhill and energy
// is released to the surroundings (exothermic); roll uphill and energy is taken in (endothermic).

(() => {
  const X0 = 230, XHUMP = 500, X1 = 770;
  const REACT_Y = 290, HUMP_Y = 120;
  const EXO_PROD_Y = 360, ENDO_PROD_Y = 190;
  const BALL_R = 16;
  const BRACKET_X = 195;

  // A single quadratic actually peaks well below its control point (at t=0.5 the curve only reaches
  // a quarter/half/quarter blend of the three points), which is why the original curve looked so
  // flat: it used HUMP_Y as the control height and never actually rose that far. XHUMP sits exactly
  // midway between X0 and X1, so the curve's highest point always falls at x=XHUMP — solving that
  // blend backwards for the control height makes the curve actually pass through (XHUMP, HUMP_Y).
  const path = (py) => {
    const cy = 2 * HUMP_Y - 0.5 * (REACT_Y + py);
    return `M ${X0} ${REACT_Y} Q ${XHUMP} ${cy} ${X1} ${py}`;
  };

  const svg = `
    <path class="axis-line fade" d="M 160 400 L 160 130 M 155 140 L 160 128 L 165 140" />
    <text class="graph-label fade" x="150" y="120" text-anchor="end">energy</text>
    <path class="axis-line fade" d="M 160 400 L 850 400 M 838 395 L 850 400 L 838 405" />
    <text class="graph-label fade" x="500" y="430">reaction progress</text>

    <g id="eaBracket" class="fade">
      <line class="axis-line" x1="${BRACKET_X}" y1="${REACT_Y}" x2="${BRACKET_X}" y2="${HUMP_Y}" stroke-width="2" opacity="0.55"/>
      <path d="M ${BRACKET_X - 5} ${REACT_Y - 9} L ${BRACKET_X} ${REACT_Y} L ${BRACKET_X + 5} ${REACT_Y - 9}" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M ${BRACKET_X - 5} ${HUMP_Y + 9} L ${BRACKET_X} ${HUMP_Y} L ${BRACKET_X + 5} ${HUMP_Y + 9}" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>
      <text class="graph-label" x="${BRACKET_X - 14}" y="${(REACT_Y + HUMP_Y) / 2}" transform="rotate(-90 ${BRACKET_X - 14} ${(REACT_Y + HUMP_Y) / 2})">activation energy</text>
    </g>

    <path id="pathExo" d="${path(EXO_PROD_Y)}" fill="none" stroke="var(--heat)" stroke-width="4" opacity="0"/>
    <path id="pathEndo" d="${path(ENDO_PROD_Y)}" fill="none" stroke="var(--electron)" stroke-width="4" opacity="0"/>

    <text class="graph-label fade" x="${X0}" y="${REACT_Y + 26}">reactants</text>
    <text class="graph-label" id="prodLabel" x="${X1}" y="${EXO_PROD_Y + 26}" opacity="0">products</text>

    <circle class="ball fade" id="ball" cx="${X0}" cy="${REACT_Y}" r="${BALL_R}"/>
    <rect class="tap-ring" id="ring" x="160" y="95" width="690" height="335" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="270" r="420"/>`;

  function roll(ctx, curveId, py, glowColour) {
    const tl = gsap.timeline();
    tl.to("#" + curveId, { opacity: 1, duration: 0.3 }, 0)
      .to("#ball", { attr: { cx: XHUMP, cy: HUMP_Y }, duration: 0.7, ease: "power1.out" }, 0.1)
      .to("#ball", { attr: { cx: X1, cy: py }, duration: 0.7, ease: "power1.in" }, 0.8)
      .call(() => Sound.pop(), null, 1.5)
      .fromTo("#ball", { fill: glowColour }, { fill: "", duration: 0.8 }, 1.5)
      .to("#prodLabel", { attr: { y: py + 26 }, opacity: 1, duration: 0.3 }, 1.5);
    return tl;
  }

  const toExo = {
    hotspot: "hit", to: "exo", sound: "zwoop", captionAt: 1.7,
    play(ctx) { return roll(ctx, "pathExo", EXO_PROD_Y, "var(--heat)"); }
  };
  const toEndo = {
    hotspot: "hit", to: "endo", sound: "zwoop", captionAt: 1.7,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to("#pathExo", { opacity: 0, duration: 0.3 }, 0)
        .set("#ball", { attr: { cx: X0, cy: REACT_Y } }, 0.3)
        .set("#prodLabel", { opacity: 0 }, 0.3)
        .add(roll(ctx, "pathEndo", ENDO_PROD_Y, "var(--electron)"), 0.4);
      return tl;
    }
  };
  const backToStart = {
    to: "start", sound: "zwoop-rev", captionAt: 0.5,
    play() {
      return gsap.timeline()
        .to(["#pathExo"], { opacity: 0, duration: 0.4 }, 0)
        .to("#ball", { attr: { cx: X0, cy: REACT_Y }, fill: "", duration: 0.5 }, 0)
        .to("#prodLabel", { opacity: 0, duration: 0.3 }, 0);
    }
  };
  const backToExo = {
    to: "exo", sound: "zwoop-rev", captionAt: 0.5,
    play() {
      return gsap.timeline()
        .to("#pathEndo", { opacity: 0, duration: 0.4 }, 0)
        .set("#pathExo", { opacity: 1 }, 0.4)
        .to("#ball", { attr: { cx: X1, cy: EXO_PROD_Y }, fill: "", duration: 0.5 }, 0.4)
        .to("#prodLabel", { attr: { y: EXO_PROD_Y + 26 }, opacity: 1, duration: 0.3 }, 0.7);
    }
  };

  Book.register({
    id: "energy",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Exothermic vs endothermic: where does the energy go?",
    description: "A ball sitting at the reactants' energy level on a graph of energy against reaction progress. Tapping rolls it up over a small hump and down to the products' level, which is lower for an exothermic reaction and higher for an endothermic one.",
    svg,
    start: "start",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to run the reaction", hint: Hint.ring("#ring", "505 262") }],

    intro() {
      return gsap.to(["path.axis-line.fade", "text.fade", "#ball", "#eaBracket"], { opacity: 1, duration: 0.6, stagger: 0.05 });
    },

    // Pulses the ball's radius rather than a CSS scale: a scale+svgOrigin tween repeated on an
    // element whose position is separately driven by attribute tweens (the roll) is exactly the bug
    // that broke the functional-groups badge, so every idle "breathing" pulse in this book now goes
    // through the attribute it already owns instead of a transform.
    idle(ctx) {
      const ball = ctx.$("#ball");
      gsap.to(ball, { attr: { r: BALL_R * 1.2 }, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      start: {
        caption: "Some reactions release energy; some take it in. Tap to run a reaction that releases energy.",
        tap: toExo
      },
      exo: {
        caption: "The products end up lower in energy than the reactants. The difference is released as heat, warming the surroundings.",
        footnote: "This is an exothermic reaction, like burning fuel. Tap to try one that goes the other way.",
        tap: toEndo,
        back: backToStart
      },
      endo: {
        caption: "This time the products end up higher in energy. The reaction takes heat in from its surroundings to get there.",
        footnote: "This is an endothermic reaction, like the reaction inside an instant cold pack, which is why it feels cold.",
        back: backToExo,
        final: true
      }
    }
  });
})();
