// pH curves: 25 cm3 of 0.100 mol/dm3 acid titrated with 0.100 mol/dm3 NaOH. Calculated, not drawn by hand.
// Strong acid (HCl) and weak acid (ethanoic, Ka = 1.8e-5). Indicator ranges from the data booklet, section 18.

(() => {
  const K = Kit, C = K.C;
  const CONC = 0.1, VA = 25, KA = 1.8e-5, KW = 1e-14;
  const X = v => 160 + v * 13.6, Y = ph => 400 - ph * 22;
  // Charge balance [Na+] + [H+] = [A-] + [OH-], solved for pH by bisection.
  const solve = (v, weak) => {
    const V = VA + v, na = CONC * v / V, ca = CONC * VA / V;
    const g = x => { const h = Math.pow(10, -x), a = weak ? ca * KA / (KA + h) : ca; return na + h - a - KW / h; };
    let lo = 0.01, hi = 13.99;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const path = weak => { let d = ""; for (let v = 0; v <= 50; v += 0.5) d += (v ? " L " : "M ") + X(v).toFixed(1) + " " + Y(solve(v, weak)).toFixed(1); return d; };
  const band = (lo, hi, name, col) => `<g class="band" opacity="0"><rect x="160" y="${Y(hi)}" width="680" height="${Y(lo) - Y(hi)}" fill="${col}" opacity="0.28"/>${K.t(850, (Y(lo) + Y(hi)) / 2 + 5, name, "graph-label", 'style="text-anchor:start"')}</g>`;
  const eqStrong = solve(25, false), eqWeak = solve(25, true);

  const svg = `
    ${K.arrow(150, 400, 850, 400, "var(--ink)", 3, 'class="fade"')}${K.arrow(160, 410, 160, 84, "var(--ink)", 3, 'class="fade"')}
    ${[0, 10, 20, 30, 40, 50].map(v => K.t(X(v), 424, v, "graph-label fade")).join("")}${[0, 7, 14].map(p => K.t(146, Y(p) + 5, p, "graph-label fade", 'style="text-anchor:end"')).join("")}
    ${K.t(500, 452, "volume of NaOH added / cm³", "graph-label fade")}${K.t(172, 82, "pH", "atom-name fade", 'style="text-anchor:start"')}
    ${band(3.1, 4.4, "methyl orange", "#E85D3A")}${band(6.0, 7.6, "bromothymol blue", "#4D94E8")}${band(8.0, 10.0, "phenolphthalein", "#E85DA6")}
    <path class="fade" d="${path(false)}" fill="none" stroke="${C.electron}" stroke-width="5" stroke-linecap="round"/>
    <path id="weakCurve" d="${path(true)}" fill="none" stroke="${C.heat}" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 7" opacity="0"/>
    <g id="eqS" opacity="0"><circle cx="${X(25)}" cy="${Y(eqStrong)}" r="8" fill="${C.electron}" stroke="#fff" stroke-width="2"/>${K.t(X(25) + 14, Y(eqStrong) + 26, "equivalence: pH 7", "molecule-label", 'style="text-anchor:start"')}</g>
    <g id="eqW" opacity="0"><circle cx="${X(25)}" cy="${Y(eqWeak)}" r="8" fill="${C.heat}" stroke="#fff" stroke-width="2"/>${K.t(X(25) - 14, Y(eqWeak) - 14, "equivalence: pH 8.7", "molecule-label", 'style="text-anchor:end"')}</g>
    ${K.t(400, 130, "strong acid + strong base", "molecule-label fade", `style="fill:${C.electron}"`)}
    ${K.t(700, 300, "weak acid + strong base", "molecule-label", `id="wk" opacity="0" style="fill:${C.heat}"`)}`;

  K.page({
    id: "ph-curves",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "pH curves",
    description: "A graph of pH against volume of sodium hydroxide added to 25 cubic centimetres of acid. A blue curve for a strong acid starts near pH 1, stays low, shoots up almost vertically around 25 cubic centimetres, and levels off near pH 13. Tapping marks the equivalence point at pH 7 and shades the colour-change ranges of three indicators. Tapping again adds a dashed orange curve for a weak acid, which starts higher, rises gently, and has its equivalence point at pH 8.7.",
    svg, bounds: [130, 70, 990, 470], tapLabel: "Tap to mark the equivalence point",
    steps: [
      { caption: "In a titration, an alkali is added a little at a time to an acid while the pH is recorded. For a strong acid and a strong base, the pH starts low, barely changes for most of the addition, then shoots up steeply right where the acid has been used up.",
        footnote: "Curve calculated for 25 cm³ of 0.100 mol dm⁻³ acid and 0.100 mol dm⁻³ NaOH." },
      { caption: "The steep part is centred on the equivalence point, where exactly the right amount of alkali has been added, at 25.0 cm³. For a strong acid with a strong base it's at pH 7. An indicator is a weak acid that changes colour over a small pH range, and any whose range sits in the steep part will show the end point.",
        booklet: "§18 indicators: methyl orange pH 3.1–4.4, bromothymol blue 6.0–7.6, phenolphthalein 8.0–10.0.",
        to: { "#eqS": { opacity: 1 }, ".band": { opacity: 1, stagger: 0.25, delay: 0.3 } }, dur: 0.8 },
      { caption: "With a weak acid, the curve looks different: it starts higher, the rise is gentler, and the equivalence point is above 7 (here 8.7) because the salt formed is slightly alkaline. Now the choice of indicator matters: phenolphthalein changes in the right place, but methyl orange would change far too early.",
        to: { "#weakCurve": { opacity: 1 }, "#eqW": { opacity: 1, delay: 0.5 }, "#wk": { opacity: 1 } }, dur: 1.0 }
    ]
  });
})();
