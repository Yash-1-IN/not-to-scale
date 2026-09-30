// The van Arkel–Ketelaar bonding triangle, drawn like the data booklet's (§17). A compound sits at
// (average electronegativity, electronegativity difference); the corners are metallic, covalent and ionic
// and most bonds sit in between. The right-hand scale reads off % covalent / % ionic character.
// The scale marks (8, 25, 50, 75, 92 % ionic) follow Pauling's estimate: % ionic = 100 (1 − e^(−Δχ²/4)).

(() => {
  const K = Kit, C = K.C;
  const X = m => 100 + (m - 0.79) / 3.21 * 540;        // average electronegativity -> x
  const Y = d => 395 - d * 88;                         // electronegativity difference -> y
  const SC = 740;                                      // x of the percentage scale
  const ionic = d => 100 * (1 - Math.exp(-d * d / 4)); // % ionic character
  const dOf = p => 2 * Math.sqrt(-Math.log(1 - p / 100)); // difference that gives p % ionic

  const pt = (id, name, m, d, fill, extra = 'opacity="0"', dx = 0) => `
    <g id="${id}" ${extra} data-x="${X(m)}" data-y="${Y(d)}"><circle r="11" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${K.t(dx, -19, name, "molecule-label")}</g>`;
  const pct = (id, name, m, d) => `
    <g id="${id}" opacity="0">${K.l(X(m), Y(d), SC - 38, Y(d), C.violet, 2.5, 'stroke-dasharray="6 5"')+K.l(SC - 38, Y(d), SC - 30, Y(d), C.violet, 2.5, '')}${K.c(SC, Y(d), 6, C.violet)}
      ${K.t(SC + 44, Y(d) + 5, `${name}: ${Math.round(ionic(d))} % ionic`, "molecule-label", 'style="text-anchor:start"')}</g>`;

  const xTicks = [0.79, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map(m =>
    K.l(X(m), 395, X(m), 402, "var(--ink)", 2, "") + K.t(X(m), 420, m === 0.79 ? "0.79" : m.toFixed(1), "graph-label")).join("");
  const yTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(d =>
    K.l(72, Y(d), 80, Y(d), "var(--ink)", 2, "") + K.t(64, Y(d) + 5, d === 0 ? "0" : d.toFixed(1), "graph-label", 'style="text-anchor:end"')).join("");
  const scale = [[100, 0], [75, 25], [50, 50], [25, 75], [8, 92]].map(([cov, ion]) =>
    K.l(SC - 6, Y(dOf(ion)), SC + 6, Y(dOf(ion)), "var(--ink)", 2, "") +
    K.t(SC - 12, Y(dOf(ion)) + 5, cov, "graph-label", 'style="text-anchor:end"') + K.t(SC + 12, Y(dOf(ion)) + 5, ion, "graph-label", 'style="text-anchor:start"')).join("");

  const svg = `
    <g class="fade">
      ${K.l(80, Y(0), 80, Y(3.2), "var(--ink)", 2, "")}${yTicks}${K.l(X(0.79), 395, X(4.0), 395, "var(--ink)", 2, "")}${xTicks}
      ${K.t(30, 96, "difference Δχ = |χa − χb|", "graph-label", 'style="text-anchor:start"')}
      ${K.t(X(2.4), 448, "average electronegativity, (χa + χb) ÷ 2", "graph-label")}
      ${K.l(SC, Y(0), SC, Y(3.2), "var(--ink)", 2, "")}${scale}
      ${K.t(SC - 12, 96, "% covalent", "graph-label", 'style="text-anchor:end"')}${K.t(SC + 12, 96, "% ionic", "graph-label", 'style="text-anchor:start"')}
    </g>
    <path class="fade" d="M ${X(0.79)} ${Y(0)} L ${X(4.0)} ${Y(0)} L ${X(2.4)} ${Y(3.2)} Z" fill="${C.violet}" fill-opacity="0.07" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    ${K.t(X(2.4), Y(3.2) - 14, "ionic", "atom-name fade")}
    ${K.t(X(1.7), Y(0.5), "metallic", "atom-name fade")}${K.t(X(3.3), Y(0.5), "covalent", "atom-name fade")}
    ${K.t(X(2.4), Y(1.6), "polar covalent", "molecule-label fade")}
    ${pt("pNa", "Na", 0.9, 0, C.ion, 'opacity="0"', 26)}${pt("pCl2", "Cl₂", 3.2, 0, C.product)}${pt("pNaCl", "NaCl", 2.05, 2.3, C.proton)}
    ${pt("pHCl", "HCl", 2.7, 1.0, C.heat)}${pt("pSi", "Si", 1.9, 0, C.grey)}
    ${pct("mNaCl", "NaCl", 2.05, 2.3)}${pct("mHCl", "HCl", 2.7, 1.0)}`;

  K.page({
    id: "bonding-triangle",
    topic: "Structure 2 — Models of bonding and structure",
    title: "The bonding triangle: ionic, covalent, metallic",
    description: "The data booklet's bonding triangle. A large triangle with axes: average electronegativity along the bottom from 0.79 to 4.0 and electronegativity difference up the left from 0 to 3.0, and a scale on the right giving percent covalent and percent ionic character. Its corners are labelled metallic at the bottom left, covalent at the bottom right and ionic at the top, with polar covalent in between. Tapping places sodium near the metallic corner, chlorine gas near the covalent corner and sodium chloride near the ionic corner. Tapping again places hydrogen chloride and silicon. A last tap reads off the percentages: sodium chloride about 73 percent ionic and hydrogen chloride about 22 percent ionic.",
    svg, bounds: [20, 80, 990, 466], tapLabel: "Tap to place compounds on the triangle",
    steps: [
      { caption: "Ionic, covalent and metallic bonding are three models, but real bonding is a continuum between them. The bonding triangle places a substance by two numbers: the average electronegativity of its two atoms, (χa + χb) ÷ 2, along the bottom, and the difference between them, Δχ = |χa − χb|, up the side.",
        booklet: "§17 triangular bonding diagram (van Arkel–Ketelaar triangle), with the % covalent and % ionic scale; §9 electronegativity values." },
      { caption: "Sodium, with two atoms of low electronegativity, sits at the metallic corner. Chlorine gas, two identical atoms of high electronegativity, sits at the covalent corner. Sodium chloride has a big difference (3.2 − 0.9 = 2.3) and lands near the ionic corner.",
        booklet: "§9: Na 0.9, Cl 3.2, H 2.2, Si 1.9.",
        to: { "#pNa": { opacity: 1 }, "#pCl2": { opacity: 1, delay: 0.3 }, "#pNaCl": { opacity: 1, delay: 0.6 } } },
      { caption: "Most compounds fall in between. Hydrogen chloride has a medium difference (1.0): a polar covalent bond. Silicon, with identical atoms of middling electronegativity, sits along the bottom edge between metallic and covalent, and is a semiconductor.",
        to: { "#pHCl": { opacity: 1 }, "#pSi": { opacity: 1, delay: 0.3 } } },
      { caption: "The scale on the right turns the difference into character percentages. Follow a compound across to it: sodium chloride is about 73 % ionic (27 % covalent), hydrogen chloride only about 22 % ionic (78 % covalent). No bond is 100 % ionic: even the most ionic compounds have some covalent character.",
        footnote: "The marks on the scale follow Pauling's estimate: % ionic = 100 × (1 − e^(−Δχ²/4)). The formula itself isn't printed in the booklet.",
        booklet: "§17: % covalent and % ionic scale (100/0, 75/25, 50/50, 25/75, 8/92).",
        to: { "#mNaCl": { opacity: 1 }, "#mHCl": { opacity: 1, delay: 0.4 } } }
    ]
  });
})();
