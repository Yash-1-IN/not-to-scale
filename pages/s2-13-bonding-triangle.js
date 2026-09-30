// The van Arkel–Ketelaar bonding triangle. A compound sits at (average electronegativity,
// electronegativity difference); corners are metallic, covalent and ionic; most bonds sit in between.

(() => {
  const K = Kit, C = K.C;
  const X = m => 140 + (m - 0.79) / 3.21 * 720;        // average electronegativity -> x
  const Y = d => 400 - d / 3.3 * 300;                  // electronegativity difference -> y
  const pt = (id, name, m, d, fill, extra = 'opacity="0"') => `
    <g id="${id}" ${extra} data-x="${X(m)}" data-y="${Y(d)}"><circle r="11" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${K.t(0, -19, name, "molecule-label")}</g>`;
  const svg = `
    <path class="fade" d="M ${X(0.79)} ${Y(0)} L ${X(4.0)} ${Y(0)} L ${X(2.4)} ${Y(3.3)} Z" fill="${C.violet}" fill-opacity="0.07" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    ${K.t(X(2.4), 92, "ionic", "atom-name fade")}${K.t(X(0.79) + 20, 440, "metallic", "atom-name fade")}${K.t(X(4.0) - 20, 440, "covalent", "atom-name fade")}
    ${K.t(X(2.4), 122, "a big electronegativity difference", "graph-label fade")}
    ${K.t(X(0.79) + 20, 466, "both atoms low", "graph-label fade")}${K.t(X(4.0) - 20, 466, "both atoms high", "graph-label fade")}
    ${pt("pNa", "Na", 0.9, 0, C.ion)}${pt("pCl2", "Cl₂", 3.2, 0, C.product)}${pt("pNaCl", "NaCl", 2.05, 2.3, C.proton)}
    ${pt("pHCl", "HCl", 2.7, 1.0, C.heat)}${pt("pSi", "Si", 1.9, 0, C.grey)}`;

  K.page({
    id: "bonding-triangle",
    topic: "Structure 2 — Models of bonding and structure",
    title: "The bonding triangle: ionic, covalent, metallic",
    description: "A large triangle with three corners labelled ionic at the top, metallic at the bottom left and covalent at the bottom right. Tapping places sodium near the metallic corner, chlorine gas near the covalent corner and sodium chloride near the ionic corner. Tapping again places hydrogen chloride between the covalent and ionic corners and silicon along the bottom edge between metallic and covalent, showing that most bonding falls in between the three models.",
    svg, bounds: [110, 80, 890, 476], tapLabel: "Tap to place compounds on the triangle",
    steps: [
      { caption: "Ionic, covalent and metallic bonding are three models, but real bonding is a continuum between them. The bonding triangle places a substance by two numbers: the average electronegativity of its atoms, and the difference between them.",
        booklet: "§17 triangular bonding diagram (van Arkel–Ketelaar triangle); §9 electronegativity values." },
      { caption: "Sodium, with two atoms of low electronegativity, sits at the metallic corner. Chlorine gas, two identical atoms of high electronegativity, sits at the covalent corner. Sodium chloride has a big difference (3.2 − 0.9 = 2.3) and lands near the ionic corner.",
        booklet: "§9: Na 0.9, Cl 3.2, H 2.2, Si 1.9.",
        to: { "#pNa": { opacity: 1 }, "#pCl2": { opacity: 1, delay: 0.3 }, "#pNaCl": { opacity: 1, delay: 0.6 } } },
      { caption: "Most compounds fall in between. Hydrogen chloride has a medium difference (1.0): a polar covalent bond. Silicon, with identical atoms of middling electronegativity, sits along the bottom edge between metallic and covalent, and is a semiconductor.",
        to: { "#pHCl": { opacity: 1 }, "#pSi": { opacity: 1, delay: 0.3 } } }
    ]
  });
})();
