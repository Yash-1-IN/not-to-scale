// Pick an acid, set its concentration, and see its pH, the share of its molecules that ionize and a picture of
// 100 of them. pH comes from the full charge balance, [H+] = [A-] + Kw/[H+], solved by bisection, so it is
// right even for very dilute weak acids (where water's own H+ matters). Ka values are from tables, not
// the data booklet (flagged on the page and in FACTS.md).

(() => {
  const K = Kit, C = K.C, KW = 1e-14;
  // name, formula, Ka (Infinity = strong)
  const ACIDS = [
    ["hydrochloric acid", "HCl", Infinity], ["nitric acid", "HNO₃", Infinity],
    ["hydrofluoric acid", "HF", 6.8e-4], ["methanoic acid", "HCOOH", 1.8e-4], ["ethanoic acid", "CH₃COOH", 1.8e-5],
    ["chloric(I) acid", "HOCl", 3.0e-8], ["hydrocyanic acid", "HCN", 4.9e-10]
  ];
  const BOX = { x0: 290, x1: 640, y0: 92, y1: 292 }, COLS = 10, ROWS = 10, N = COLS * ROWS;
  const SLX0 = 290, SLX1 = 640;
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹", sci = x => {
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(1) >= 10) { m /= 10; e++; }
    const ex = String(Math.abs(e)).split("").map(d => sup[+d]).join("");
    return m.toFixed(1) + " × 10" + (e < 0 ? "⁻" : "") + ex;
  };
  const concText = c => c.toPrecision(2).replace(/e.*/, "");

  // [H+] of an acid of concentration c: charge balance h = Ka c / (Ka + h) + Kw / h
  function hydrogen(Ka, c) {
    if (!isFinite(Ka)) return (c + Math.sqrt(c * c + 4 * KW)) / 2;
    let lo = -14, hi = 0;                                     // bisect on log10(h): f rises with h
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2, h = Math.pow(10, mid);
      if (h - Ka * c / (Ka + h) - KW / h > 0) hi = mid; else lo = mid;
    }
    return Math.pow(10, (lo + hi) / 2);
  }

  // ----- drawing -----
  const rand = K.rng(8);
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const rank = new Array(N); order.forEach((u, r) => { rank[u] = r; });   // unit u ionizes when rank[u] < n

  const unit = u => {
    const x = BOX.x0 + 17.5 + (u % COLS) * 35, y = BOX.y0 + 11 + Math.floor(u / COLS) * 19.5;
    const t = 'style="transition: transform .45s ease"';
    return `<circle class="uH" data-u="${u}" cx="${x - 6}" cy="${y}" r="4.5" fill="#fff" stroke="var(--ink)" stroke-width="1.5" ${t}/>` +
           `<circle class="uA" data-u="${u}" cx="${x + 6}" cy="${y}" r="8.5" fill="${C.heat}" ${t}/>`;
  };
  let grid = ""; for (let u = 0; u < N; u++) grid += unit(u);

  const chipY = i => 74 + i * 52;
  const chips = ACIDS.map((a, i) => `<g id="chip${i}" class="chip" role="button" tabindex="-1" aria-pressed="false" aria-label="${a[0]}">
      <rect class="chip-bg" x="30" y="${chipY(i)}" width="230" height="42" rx="14" fill="${C.paper}" stroke="var(--ink)" stroke-width="2.5"/>
      ${K.t(46, chipY(i) + 27, a[1], "molecule-label", `id="chipT${i}" style="text-anchor:start"`)}${K.t(244, chipY(i) + 27, isFinite(a[2]) ? "weak" : "strong", "graph-label", `id="chipS${i}" style="text-anchor:end"`)}
    </g>`).join("");

  const svg = `
    <defs><linearGradient id="phgrad" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#E5352B"/><stop offset="0.2" stop-color="#F28C28"/><stop offset="0.36" stop-color="#F5D327"/>
      <stop offset="0.5" stop-color="#5CB85C"/><stop offset="0.66" stop-color="#2E9E9E"/><stop offset="0.82" stop-color="#2E6FE0"/><stop offset="1" stop-color="#6A2BD9"/>
    </linearGradient></defs>
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="12" fill="#CFE8FF" fill-opacity="0.35" stroke="var(--ink)" stroke-width="3"/>
    <g id="units" class="fade">${grid}</g>
    ${K.t(465, 70, "100 acid molecules in water", "graph-label fade", 'id="beakerLab"')}
    ${K.t(830, 130, "pH 1.00", "atom-name fade", 'id="phText" style="font-size:40px"')}
    ${K.t(830, 178, "", "molecule-label fade", 'id="hText"')}
    ${K.t(830, 214, "", "molecule-label fade", 'id="alphaText"')}
    ${K.t(830, 258, "", "graph-label fade", 'id="kaText"')}
    <rect class="fade" x="${SLX0}" y="378" width="${SLX1 - SLX0}" height="14" rx="7" fill="url(#phgrad)"/>
    <g id="marker" class="fade" data-x="${SLX0}" data-y="375"><polygon points="0,0 -9,-14 9,-14" fill="var(--ink)"/></g>
    ${K.t(SLX0, 418, "0", "graph-label fade")}${K.t((SLX0 + SLX1) / 2, 418, "7", "graph-label fade")}${K.t(SLX1, 418, "14", "graph-label fade")}
    ${K.t(465, 455, "pH scale · small white: H⁺ · large: A⁻ (the rest of the acid)", "graph-label fade")}
    <g id="controls" opacity="0">
      ${chips}
      ${K.t(465, 318, "", "molecule-label", 'id="concText"')}
      ${K.sliderMarkup("cslider", SLX0, SLX1, 345, "Concentration of the acid")}
    </g>`;

  // ----- behaviour -----
  function draw(ctx) {
    const d = ctx.data, a = ACIDS[d.acid], Ka = a[2], c = d.conc;
    const h = hydrogen(Ka, c), pH = -Math.log10(h);
    const strong = !isFinite(Ka), alpha = strong ? 1 : Ka / (Ka + h);
    const n = Math.round(N * alpha);
    ctx.$$(".uH").forEach(e => { const r = rank[+e.dataset.u] < n; e.style.transform = r ? "translate(-10px,-6px)" : "none"; });
    ctx.$$(".uA").forEach(e => { const r = rank[+e.dataset.u] < n; e.style.transform = r ? "translate(8px,5px)" : "none"; });
    ctx.$("#phText").textContent = "pH " + pH.toFixed(2);
    ctx.$("#hText").textContent = "[H⁺] = " + sci(h) + " mol dm⁻³";
    ctx.$("#alphaText").textContent = strong ? "fully ionized" : alpha >= 0.1 ? Math.round(alpha * 100) + " % ionized" : (alpha * 100 < 0.1 ? "<0.1" : (alpha * 100).toFixed(1)) + " % ionized";
    ctx.$("#kaText").textContent = strong ? "strong acid" : "Ka = " + sci(Ka) + " (tables)";
    ctx.$("#beakerLab").textContent = "100 molecules of " + a[0] + ", " + concText(c) + " mol dm⁻³";
    ctx.$("#concText").textContent = "concentration: " + concText(c) + " mol dm⁻³";
    gsap.set(ctx.$("#marker"), { x: SLX0 + Math.min(14, Math.max(0, pH)) / 14 * (SLX1 - SLX0) });
    ACIDS.forEach((_, i) => {
      const on = i === d.acid, g = ctx.$("#chip" + i);
      g.setAttribute("aria-pressed", on);
      g.querySelector(".chip-bg").setAttribute("fill", on ? C.ink : C.paper);
      g.querySelectorAll("text").forEach(t => { t.style.fill = on ? C.paper : C.ink; });
    });
  }

  K.page({
    id: "acid-picker",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Pick an acid: see its pH",
    description: "A box of one hundred acid molecules in water, each a small white hydrogen ion touching a larger orange ion, with a readout of pH, hydrogen ion concentration and percentage ionized, and a colour bar for the pH scale with a marker. At first it shows 0.10 mol per cubic decimetre hydrochloric acid, fully ionized, pH 1. Tapping reveals controls: a list of seven acids, two strong and five weak, and a slider for concentration. You choose an acid and a concentration and the picture, pH and percentage ionized update. A strong acid is always completely ionized; a weak acid only a little, and a lower share the more dilute it is, so its pH is higher than a strong acid's at the same concentration.",
    svg, bounds: [20, 55, 980, 470], tapLabel: "Tap to pick your own acid",
    setup(ctx) {
      const d = ctx.data;
      d.acid = 0; d.conc = 0.1;
      ACIDS.forEach((_, i) => {
        const g = ctx.$("#chip" + i), pick = () => { d.acid = i; draw(ctx); };
        g.addEventListener("click", pick);
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); pick(); } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation(); });
      });
      d.slider = K.slider(ctx, "cslider", { min: -3, max: 0, value: -1, step: 0.05, onInput: v => { d.conc = Math.pow(10, v); draw(ctx); } });
      ctx.$("#cslider").setAttribute("tabindex", "-1");
      draw(ctx);
    },
    steps: [
      { caption: "Here is 0.10 mol dm⁻³ hydrochloric acid, a strong acid: every molecule has split into H⁺ and Cl⁻, so [H⁺] = 0.10 and pH = −log₁₀ 0.10 = 1.00. The picture shows 100 molecules; the pH bar below shows where that lands on the scale.",
        footnote: "pH = −log₁₀[H⁺]. Each pH unit is a factor of ten in H⁺ concentration." },
      { caption: "Now you choose. Pick an acid, then drag the slider to change its concentration. A strong acid is always fully ionized. A weak acid ionizes only a little (more of it the more dilute it is), so its pH is higher than a strong acid's at the same concentration.",
        footnote: "Weak acid: Ka = [H⁺][A⁻] / [HA]. The Ka values come from tables, not from the data booklet. Water's own H⁺ is included, which matters for very weak, dilute acids.",
        booklet: "§1 equations: pH = −log₁₀[H⁺]; Kw = [H⁺][OH⁻].",
        to: { "#controls": { opacity: 1 } }, dur: 0.7,
        run(ctx, tl, dir) {
          const on = dir === "fwd";
          tl.call(() => {
            ACIDS.forEach((_, i) => ctx.$("#chip" + i).setAttribute("tabindex", on ? "0" : "-1"));
            ctx.$("#cslider").setAttribute("tabindex", on ? "0" : "-1");
          }, null, 0.3);
        } }
    ]
  });
})();
