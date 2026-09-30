// Polar bonds and polar molecules. HCl has one polar bond, so the molecule is polar. CO2 has two polar
// bonds that cancel, so it isn't. In bent H2O the bond dipoles add up, so it is.

(() => {
  const K = Kit, C = K.C;
  const cloud = (cx, rx) => `<ellipse cx="${cx}" cy="0" rx="${rx}" ry="34" fill="${C.violet}" opacity="0.17"/>`;
  const at = (x, y, r, fill, sym, dark) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.round(r * 0.85)}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text></g>`;
  const lab = (x, y, s) => K.t(x, y, s, "molecule-label");

  const hcl = cloud(30, 78) + at(-72, 0, 22, C.pale, "H", true) + at(72, 0, 34, C.product, "Cl") +
    lab(-72, -46, "δ+") + lab(72, -56, "δ−") + K.arrow(-60, 78, 62, 78, C.violet, 5) + K.t(0, 112, "the electrons are pulled towards chlorine", "graph-label");
  const co2 = at(0, 0, 25, C.grey, "C") + at(-118, 0, 30, C.proton, "O") + at(118, 0, 30, C.proton, "O") +
    lab(-118, -50, "δ−") + lab(118, -50, "δ−") + lab(0, -44, "2δ+") +
    K.arrow(-22, 70, -104, 70, C.violet, 5) + K.arrow(22, 70, 104, 70, C.violet, 5) + K.t(0, 112, "equal and opposite: no overall dipole", "graph-label");
  const h2o = K.l(0, -10, -78, 66, "var(--ink)", 5) + K.l(0, -10, 78, 66, "var(--ink)", 5) +
    at(0, -10, 32, C.proton, "O") + at(-78, 66, 21, C.pale, "H", true) + at(78, 66, 21, C.pale, "H", true) +
    lab(0, -60, "δ−") + K.arrow(-90, 92, -28, 14, C.violet, 4) + K.arrow(90, 92, 28, 14, C.violet, 4) +
    K.arrow(178, 70, 178, -30, C.violet, 8) + K.t(178, 100, "net dipole", "graph-label") + K.t(0, 132, "the dipoles add up: a polar molecule", "graph-label");

  const svg = `
    ${K.g("sHCl", 500, 200, hcl)}${K.g("sCO2", 500, 200, co2, "", 'opacity="0"')}${K.g("sH2O", 500, 200, h2o, "", 'opacity="0"')}
    ${K.t(500, 405, "H–Cl: 3.2 − 2.2 = 1.0", "atom-name fade", 'id="calc"')}
    ${K.t(500, 445, "a polar bond, so a polar molecule", "molecule-label fade", 'id="verdict"')}`;

  K.page({
    id: "polarity",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Polar bonds and polar molecules",
    description: "A hydrogen chloride molecule: a small grey hydrogen and a bigger green chlorine joined together, with a purple electron cloud pulled towards chlorine, which is marked delta minus while hydrogen is delta plus, and an arrow below pointing from hydrogen towards chlorine. Tapping swaps it for a straight carbon dioxide molecule, whose two purple arrows point in opposite directions and cancel. Tapping again swaps it for a bent water molecule, whose bond arrows add up to a large net dipole arrow.",
    svg, bounds: [300, 110, 800, 460], tapLabel: "Tap to try another molecule",
    steps: [
      { caption: "In H–Cl, chlorine attracts the shared electrons more strongly than hydrogen does. The bond is polar: chlorine is slightly negative (δ−) and hydrogen slightly positive (δ+). The bigger the electronegativity difference, the more polar the bond.",
        booklet: "§9 electronegativity: H 2.2, C 2.6, O 3.4, Cl 3.2." },
      { caption: "Carbon dioxide has two polar bonds, but the molecule is a straight line, so they pull in opposite directions and cancel out. A molecule can have polar bonds and still not be polar overall.",
        to: { "#sHCl": { opacity: 0 }, "#sCO2": { opacity: 1 } }, text: { "#calc": "C=O: 3.4 − 2.6 = 0.8", "#verdict": "polar bonds, but a non-polar molecule" }, dur: 0.7 },
      { caption: "Water's bonds are polar too, but the molecule is bent, so they don't cancel: they add up to a net dipole. Water is a polar molecule, which is why it dissolves so many things.",
        footnote: "Polar molecules attract each other more strongly than non-polar ones, and dissolve in polar solvents — 'like dissolves like'.",
        to: { "#sCO2": { opacity: 0 }, "#sH2O": { opacity: 1 } }, text: { "#calc": "O–H: 3.4 − 2.2 = 1.2", "#verdict": "polar bonds, bent shape: a polar molecule" }, dur: 0.7 }
    ]
  });
})();
