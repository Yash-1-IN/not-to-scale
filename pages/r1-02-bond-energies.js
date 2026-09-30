// Bond breaking and bond making: H2 + Cl2 -> 2HCl. Breaking bonds takes energy in, making them gives it out.
// Bond enthalpies (kJ/mol) from the data booklet: H-H 436, Cl-Cl 242, H-Cl 431.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 300 - e * 0.25;                                   // energy (kJ) -> y on the small diagram
  const at = (id, x, y, sym, r, fill) => K.g(id, x, y, `<circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${r * 0.8}px${fill === C.pale ? ";fill:#1B1A22" : ""}">${sym}</text>`);
  const lev = (y, x0, x1) => K.l(x0, y, x1, y, "var(--ink)", 4, 'class="fade"');
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.l(150, 230, 210, 230, "var(--ink)", 5, 'id="bHH" class="fade"')}${K.l(310, 230, 394, 230, "var(--ink)", 5, 'id="bClCl" class="fade"')}
    ${K.l(120, 230, 200, 230, "var(--ink)", 5, 'id="bHCl1" opacity="0"')}${K.l(300, 230, 380, 230, "var(--ink)", 5, 'id="bHCl2" opacity="0"')}
    ${at("H1", 150, 230, "H", 18, C.pale)}${at("H2", 210, 230, "H", 18, C.pale)}${at("Cl1", 310, 230, "Cl", 26, C.product)}${at("Cl2", 394, 230, "Cl", 26, C.product)}
    ${K.t(270, 340, "H₂ + Cl₂", "atom-name fade", 'id="lab2"')}
    ${lev(Y(0), 560, 700)}${K.t(630, Y(0) + 26, "H₂ + Cl₂", "graph-label fade")}
    <g id="up" opacity="0">${lev(Y(678), 720, 860)}${K.arrow(710, Y(0) - 6, 710, Y(678) + 6, C.heat, 5)}${K.t(790, Y(678) - 10, "4 free atoms", "graph-label")}${K.t(698, 210, "+678", "molecule-label", 'style="text-anchor:end"')}${K.t(698, 235, "bonds break", "graph-label", 'style="text-anchor:end"')}</g>
    <g id="down" opacity="0">${lev(Y(-184), 900, 990)}${K.arrow(880, Y(678) + 6, 880, Y(-184) - 6, C.electron, 5)}${K.t(868, 240, "−862", "molecule-label", 'style="text-anchor:end"')}${K.t(868, 265, "bonds form", "graph-label", 'style="text-anchor:end"')}${K.t(944, Y(-184) + 24, "2HCl", "graph-label")}</g>
    ${K.t(500, 440, "H–H 436 + Cl–Cl 242 = 678 kJ in", "molecule-label fade", 'id="tally"')}`;

  K.page({
    id: "bond-energies",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Bond breaking and bond making",
    description: "A hydrogen molecule and a chlorine molecule on the left, and a small energy diagram on the right. Tapping breaks both bonds into four free atoms and draws an arrow up the diagram: 678 kilojoules taken in. Tapping again forms two hydrogen chloride molecules and draws an arrow down: 862 kilojoules given out, leaving the products 184 kilojoules lower than the reactants.",
    svg, bounds: [100, 100, 990, 460], tapLabel: "Tap to break, then make, bonds",
    steps: [
      { caption: "Every reaction breaks some bonds in the reactants and makes new bonds in the products. Take H₂ + Cl₂ → 2HCl. Breaking a bond needs energy; making a bond releases it.",
        booklet: "§12 bond enthalpies: H–H 436, Cl–Cl 242, H–Cl 431 kJ mol⁻¹." },
      { caption: "First the bonds break: 436 kJ to break a mole of H–H bonds, and 242 kJ for a mole of Cl–Cl bonds. That's 678 kJ taken in, so this step is endothermic.",
        to: { "#bHH": { opacity: 0 }, "#bClCl": { opacity: 0 }, "#H1": { x: 110, y: 185 }, "#H2": { x: 245, y: 285 }, "#Cl1": { x: 300, y: 190 }, "#Cl2": { x: 430, y: 285 }, "#up": { opacity: 1, delay: 0.5 } },
        text: { "#lab2": "4 separate atoms", "#tally": "H–H 436 + Cl–Cl 242 = 678 kJ in" }, dur: 1.2 },
      { caption: "Then two new H–Cl bonds form, releasing 2 × 431 = 862 kJ. More energy goes out than came in, so the overall change is 678 − 862 = −184 kJ: exothermic.",
        footnote: "This gives an estimate: bond enthalpies are averages, so the answer is close to the real value, not exact.",
        to: { "#H1": { x: 120, y: 230 }, "#Cl1": { x: 200, y: 230 }, "#H2": { x: 300, y: 230 }, "#Cl2": { x: 380, y: 230 }, "#bHCl1": { opacity: 1, delay: 0.9 }, "#bHCl2": { opacity: 1, delay: 0.9 }, "#down": { opacity: 1, delay: 0.6 } },
        text: { "#lab2": "2 HCl", "#tally": "ΔH = 678 − 862 = −184 kJ" }, dur: 1.4 }
    ]
  });
})();
