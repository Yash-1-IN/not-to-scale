// Catalysts. The same energy profile as the exo/endothermic page, then a second, lower hump drawn over
// it: same reactants, same products, a smaller activation energy. The ball then rolls the easier route.

(() => {
  const X0 = 280, XHUMP = 550, X1 = 820;      // XHUMP is exactly midway, so each curve peaks at x = XHUMP
  const REACT_Y = 290, PROD_Y = 360;
  const PEAK = 120, PEAK_CAT = 215;
  const BALL_R = 16;
  const EA_X = 195, EA_CAT_X = 245;          // the two activation-energy brackets beside the axis

  // Same maths as pages/13-energy.js: pick the control point so the curve really peaks at `peak`.
  const path = peak => {
    const cy = 2 * peak - 0.5 * (REACT_Y + PROD_Y);
    return `M ${X0} ${REACT_Y} Q ${XHUMP} ${cy} ${X1} ${PROD_Y}`;
  };

  const bracket = (x, top, colour) => `
      <line x1="${x}" y1="${REACT_Y}" x2="${x}" y2="${top}" stroke="${colour}" stroke-width="2"/>
      <path d="M ${x - 5} ${REACT_Y - 9} L ${x} ${REACT_Y} L ${x + 5} ${REACT_Y - 9}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M ${x - 5} ${top + 9} L ${x} ${top} L ${x + 5} ${top + 9}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const guide = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--ink)" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 6"/>`;
  const sideLabel = (x, y, text) => `<text class="graph-label" x="${x}" y="${y}" transform="rotate(-90 ${x} ${y})">${text}</text>`;

  const svg = `
    <path class="axis-line fade" d="M 160 400 L 160 130 M 155 140 L 160 128 L 165 140" />
    <text class="graph-label fade" x="150" y="120" text-anchor="end">energy</text>
    <path class="axis-line fade" d="M 160 400 L 850 400 M 838 395 L 850 400 L 838 405" />
    <text class="graph-label fade" x="500" y="430">reaction progress</text>

    <g id="uncat" class="fade">
      ${guide(EA_X, XHUMP, PEAK)}
      ${guide(EA_X, X0, REACT_Y)}
      <g opacity="0.7">${bracket(EA_X, PEAK, "var(--ink)")}</g>
      ${sideLabel(EA_X - 14, (REACT_Y + PEAK) / 2, "Ea without catalyst")}
      <path id="pathSlow" d="${path(PEAK)}" fill="none" stroke="var(--electron)" stroke-width="4" stroke-linecap="round"/>
    </g>

    <g id="cat" opacity="0">
      ${guide(EA_CAT_X, XHUMP, PEAK_CAT)}
      ${bracket(EA_CAT_X, PEAK_CAT, "var(--product)")}
      ${sideLabel(EA_CAT_X - 14, (REACT_Y + PEAK_CAT) / 2, "Ea with catalyst")}
      <path id="pathCat" d="${path(PEAK_CAT)}" fill="none" stroke="var(--product)" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 8"/>
    </g>

    <text class="graph-label fade" x="${X0}" y="${REACT_Y + 26}">reactants</text>
    <text class="graph-label fade" x="${X1}" y="${PROD_Y + 26}">products</text>

    <circle class="ball fade" id="ball" cx="${X0}" cy="${REACT_Y}" r="${BALL_R}"/>
    <rect class="tap-ring" id="ring" x="160" y="95" width="690" height="335" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="505" cy="262" r="480"/>`;

  // Rolls the ball along a drawn path by reading points off it (no motion-path plugin needed).
  function rollAlong(ball, pathEl, duration) {
    const len = pathEl.getTotalLength();
    const proxy = { t: 0 };
    return gsap.to(proxy, {
      t: 1, duration, ease: "power1.inOut",
      onUpdate() {
        const p = pathEl.getPointAtLength(proxy.t * len);
        ball.setAttribute("cx", p.x);
        ball.setAttribute("cy", p.y);
      }
    });
  }

  const addCatalyst = {
    hotspot: "hit", to: "catalysed", sound: "zwoop", captionAt: 0.8,
    play(ctx) {
      return gsap.timeline()
        .to("#cat", { opacity: 1, duration: 0.7 }, 0)
        .add(rollAlong(ctx.$("#ball"), ctx.$("#pathCat"), 1.8), 0.8)
        .call(() => Sound.pop(), null, 2.6);
    }
  };

  const removeCatalyst = {
    to: "slow", sound: "zwoop-rev", captionAt: 0.3,
    play() {
      return gsap.timeline()
        .to("#cat", { opacity: 0, duration: 0.5 }, 0)
        .to("#ball", { attr: { cx: X0, cy: REACT_Y }, duration: 0.6, ease: "power2.inOut" }, 0);
    }
  };

  Book.register({
    id: "catalysts",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Catalysts: a lower hump to get over",
    description: "An energy profile: a ball sits at the reactants' level, with a tall hump before the lower products' level. A bracket beside the energy axis marks the activation energy. Tapping adds a catalyst: a second, dashed green curve appears with a much lower hump between the same reactants and products, with its own smaller activation-energy bracket, and the ball rolls over the lower hump to the products.",
    svg,
    start: "slow",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to add a catalyst", hint: Hint.ring("#ring", "505 262") }],

    idle(ctx) {
      gsap.to(ctx.$("#ball"), { attr: { r: BALL_R * 1.2 }, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      slow: {
        caption: "To react, particles need enough energy to get over this hump: the activation energy. Tap to add a catalyst.",
        footnote: "The ball is a stand-in for the reacting particles, not a real thing rolling anywhere.",
        tap: addCatalyst
      },
      catalysed: {
        caption: "A catalyst gives the reaction a different route with a lower hump. Same start, same finish, but far less energy needed to get over.",
        booklet: "§1 equations (HL): in k = Ae<sup>−Ea/RT</sup>, a smaller Ea gives a larger rate constant k.",
        footnote: "The catalyst comes out unchanged, and the overall energy change stays the same. With a lower hump, many more particles have enough energy — see the Maxwell–Boltzmann page.",
        back: removeCatalyst,
        final: true
      }
    }
  });
})();
