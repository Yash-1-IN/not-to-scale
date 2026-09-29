// Maxwell–Boltzmann distribution. Particles are "measured" one at a time and drop into a histogram of
// kinetic energy, the same keep-sampling-until-it-settles idea as the mass-spec page. Heating re-measures
// them: the curve flattens and stretches right, and far more of it lies past the activation energy.
//
// Bar heights are exact, not random: each bin gets its share of N from the real 3D energy distribution
// (largest-remainder rounding so they add up to N). Only the order the particles arrive in is shuffled.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const N = 200;
  const BIN_W = 0.5, BINS = 20;              // energy bins 0–10, in units where the cool gas has kT = 1
                                              // (wide enough that the last bin's share of the tail is ~1 particle)
  const T_COOL = 1, T_HOT = 1.6;
  const EA = 4.5;                             // activation energy, on a bin boundary
  const EA_BIN = EA / BIN_W;                  // first bin past the line
  const CHART = { x0: 170, x1: 870, base: 400, top: 125 };
  const PX = 5;                               // bar height per particle
  const BIN_PX = (CHART.x1 - CHART.x0) / BINS;
  const eX = e => CHART.x0 + (e / (BIN_W * BINS)) * (CHART.x1 - CHART.x0);
  const EA_X = eX(EA);

  let seed = 17;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Abramowitz & Stegun 7.1.26 (error < 1.5e-7), for x >= 0.
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * x);
    return 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  }
  // 3D Maxwell–Boltzmann in energy (k = 1): density, and the fraction of particles below E.
  const pdf = (E, T) => 2 * Math.sqrt(E / Math.PI) * Math.pow(T, -1.5) * Math.exp(-E / T);
  const cdf = (E, T) => { const x = E / T; return erf(Math.sqrt(x)) - 2 * Math.sqrt(x / Math.PI) * Math.exp(-x); };

  function binCounts(T) {
    // The share beyond the chart's right edge (under 0.6% even when hot) is spread back over the bins
    // by rescaling, rather than piled into the last bar where it would show as a fake spike.
    const shown = cdf(BINS * BIN_W, T);
    const exact = [];
    for (let i = 0; i < BINS; i++) exact.push(N * (cdf((i + 1) * BIN_W, T) - cdf(i * BIN_W, T)) / shown);
    const c = exact.map(Math.floor);
    const left = N - c.reduce((a, b) => a + b, 0);
    exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => c[i]++);
    return c;
  }
  const COOL = binCounts(T_COOL), HOT = binCounts(T_HOT);
  const pastEa = c => c.slice(EA_BIN).reduce((a, b) => a + b, 0);
  const curveY = (E, T) => CHART.base - PX * N * BIN_W * pdf(E, T);

  function curvePath(T) {
    let d = "";
    for (let k = 0; k <= 180; k++) {
      const E = (k / 180) * BIN_W * BINS;
      d += (k ? " L " : "M ") + eX(E).toFixed(1) + " " + curveY(E, T).toFixed(1);
    }
    return d;
  }

  const bars = Array.from({ length: BINS }, (_, i) =>
    `<rect id="bin${i}" x="${(CHART.x0 + i * BIN_PX + 2).toFixed(1)}" y="${CHART.base}" width="${(BIN_PX - 4).toFixed(1)}" height="0" rx="2" fill="${i >= EA_BIN ? "var(--heat)" : "var(--ion)"}"/>`).join("");

  const svg = `
    <path class="axis-line fade" d="M ${CHART.x0 - 10} ${CHART.base} L ${CHART.x0 - 10} ${CHART.top} M ${CHART.x0 - 15} ${CHART.top + 12} L ${CHART.x0 - 10} ${CHART.top} L ${CHART.x0 - 5} ${CHART.top + 12}"/>
    <path class="axis-line fade" d="M ${CHART.x0 - 10} ${CHART.base} L ${CHART.x1 + 20} ${CHART.base} M ${CHART.x1 + 8} ${CHART.base - 5} L ${CHART.x1 + 20} ${CHART.base} L ${CHART.x1 + 8} ${CHART.base + 5}"/>
    <text class="graph-label fade" x="${(CHART.x0 + CHART.x1) / 2}" y="${CHART.base + 30}">kinetic energy</text>
    <text class="graph-label fade" x="${CHART.x0 - 26}" y="${(CHART.base + CHART.top) / 2}" transform="rotate(-90 ${CHART.x0 - 26} ${(CHART.base + CHART.top) / 2})">number of particles</text>

    <g id="bars">${bars}</g>
    <g id="drops"></g>

    <path id="curveCool" d="${curvePath(T_COOL)}" fill="none" stroke="var(--electron)" stroke-width="3" stroke-linejoin="round" opacity="0"/>
    <path id="curveHot" d="${curvePath(T_HOT)}" fill="none" stroke="var(--heat)" stroke-width="3" stroke-linejoin="round" opacity="0"/>
    <text class="graph-label" id="labelCool" x="${eX(1.2)}" y="${curveY(1.2, T_COOL) - 14}" opacity="0">cooler</text>
    <text class="graph-label" id="labelHot" x="${eX(3.2)}" y="${curveY(3.2, T_HOT) - 18}" opacity="0">hotter</text>

    <g class="fade">
      <line x1="${EA_X}" y1="${CHART.base}" x2="${EA_X}" y2="${CHART.top}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 6"/>
      <text class="graph-label" x="${EA_X}" y="${CHART.top - 10}">activation energy</text>
    </g>
    <text class="graph-label fade" x="740" y="175">enough energy to react:</text>
    <text class="molecule-label fade" id="count" x="740" y="203">–</text>

    <rect class="tap-ring" id="ring" x="120" y="95" width="780" height="360" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="510" cy="265" r="500"/>`;

  function setCount(ctx, n) { ctx.$("#count").textContent = n + " of " + N; }

  // Drop one particle per entry of `counts` into its bar, in shuffled order. Each landing raises the
  // bar by one step and updates the "enough energy" count.
  function measure(ctx, tl, counts, t0) {
    const order = [];
    counts.forEach((n, bin) => { for (let k = 0; k < n; k++) order.push(bin); });
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

    const heights = new Array(BINS).fill(0);
    let past = 0;
    const layer = ctx.$("#drops");
    order.forEach((bin, k) => {
      heights[bin]++;
      const h = heights[bin] * PX;
      const at = t0 + k * 0.012;
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", (CHART.x0 + (bin + 0.5) * BIN_PX + (rand() - 0.5) * (BIN_PX - 14)).toFixed(1));
      dot.setAttribute("cy", CHART.top + 10);
      dot.setAttribute("r", 3.5);
      dot.setAttribute("fill", bin >= EA_BIN ? "var(--heat)" : "var(--ion)");
      dot.setAttribute("opacity", 0);
      layer.appendChild(dot);
      tl.set(dot, { opacity: 1 }, at)
        .to(dot, { attr: { cy: CHART.base - h }, duration: 0.3, ease: "power2.in" }, at)
        .call(() => {
          const bar = ctx.$("#bin" + bin);
          bar.setAttribute("y", CHART.base - h);
          bar.setAttribute("height", h);
          dot.remove();
          if (bin >= EA_BIN) setCount(ctx, ++past);
          if (k % 25 === 0) Sound.pop();
        }, null, at + 0.3);
    });
    return t0 + order.length * 0.012 + 0.3;
  }

  function setBars(tl, counts, at) {
    counts.forEach((n, i) => tl.to("#bin" + i, { attr: { y: CHART.base - n * PX, height: n * PX }, duration: 0.4, ease: "power2.inOut" }, at));
  }

  const measureCool = {
    hotspot: "hit", to: "cool", sound: "pop",
    captionAt: 0.3 + N * 0.012 + 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      setCount(ctx, 0);
      const end = measure(ctx, tl, COOL, 0.3);
      tl.to(["#curveCool", "#labelCool"], { opacity: 1, duration: 0.6 }, end);
      return tl;
    }
  };

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop",
    captionAt: 0.6 + N * 0.012 + 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      ctx.$("#curveCool").setAttribute("stroke-dasharray", "6 6");
      tl.to("#curveCool", { opacity: 0.6, duration: 0.4 }, 0);
      setBars(tl, new Array(BINS).fill(0), 0);
      tl.call(() => setCount(ctx, 0), null, 0.4);
      const end = measure(ctx, tl, HOT, 0.6);
      tl.to(["#curveHot", "#labelHot"], { opacity: 1, duration: 0.6 }, end);
      return tl;
    }
  };

  const unmeasure = {
    to: "empty", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      setBars(tl, new Array(BINS).fill(0), 0);
      tl.to(["#curveCool", "#labelCool"], { opacity: 0, duration: 0.4 }, 0)
        .call(() => { ctx.$("#count").textContent = "–"; }, null, 0.4);
      return tl;
    }
  };

  const cool = {
    to: "cool", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      ctx.$("#curveCool").removeAttribute("stroke-dasharray");
      setBars(tl, COOL, 0);
      tl.to(["#curveHot", "#labelHot"], { opacity: 0, duration: 0.4 }, 0)
        .to("#curveCool", { opacity: 1, duration: 0.4 }, 0)
        .call(() => setCount(ctx, pastEa(COOL)), null, 0.4);
      return tl;
    }
  };

  Book.register({
    id: "maxwell",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Maxwell–Boltzmann: why a little heat goes a long way",
    description: "An empty bar chart of kinetic energy, with a dashed vertical line marking the activation energy. Tapping measures 200 gas particles one at a time: each drops into a bar, building a lopsided hump with a long tail to the right, and a smooth curve appears over it. Only a few particles land past the activation-energy line. Tapping again heats the gas and measures again: the new curve is lower, wider and shifted right, with the same area, and many more particles land past the line.",
    svg,
    start: "empty",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to measure the particles' energies", hint: Hint.ring("#ring", "510 275") }],

    states: {
      empty: {
        caption: "In a gas, particles don't all have the same energy. Tap to measure a couple of hundred of them, one at a time.",
        footnote: "Not to scale: a real sample has vastly more particles, which is why the real curve is perfectly smooth.",
        tap: measureCool
      },
      cool: {
        caption: "Most have modest energy. Only the few in the long tail, past the dashed line, have enough to react. Tap to heat the gas.",
        footnote: "Here that's " + pastEa(COOL) + " of " + N + ". This spread is called the Maxwell–Boltzmann distribution.",
        tap: heat,
        back: unmeasure
      },
      hot: {
        caption: "Hotter, the curve gets lower and stretches right. It's the same particles, so the same area — but far more of them now sit past the line.",
        footnote: "From " + pastEa(COOL) + " to " + pastEa(HOT) + " out of " + N + ": a modest temperature rise multiplies the number that can react. That's why heating speeds reactions up so much.",
        back: cool,
        final: true
      }
    }
  });
})();
