// Relative atomic mass as a weighted average of isotopes, and molar mass in g/mol.
// Chlorine: about 76 of every 100 atoms are Cl-35 and 24 are Cl-37.

(() => {
  const K = Kit, C = K.C, rand = K.rng(3);
  // Which 24 of the 100 grid places hold a chlorine-37 atom.
  const order = Array.from({ length: 100 }, (_, i) => i);
  for (let i = 99; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const heavy = new Set(order.slice(0, 24));
  const grid = Array.from({ length: 100 }, (_, i) => {
    const x = 105 + (i % 10) * 30, y = 105 + Math.floor(i / 10) * 30;
    return heavy.has(i) ? `<circle class="fade" cx="${x}" cy="${y}" r="12" fill="${C.heat}" stroke="var(--ink)" stroke-width="2"/>`
                        : `<circle class="fade" cx="${x}" cy="${y}" r="9" fill="${C.ion}"/>`;
  }).join("");
  const start = 'style="text-anchor:start"';

  const svg = `${grid}
    <circle class="fade" cx="490" cy="130" r="9" fill="${C.ion}"/>${K.t(510, 136, "chlorine-35: 76 atoms", "molecule-label fade", start)}
    <circle class="fade" cx="490" cy="170" r="12" fill="${C.heat}" stroke="var(--ink)" stroke-width="2"/>${K.t(510, 176, "chlorine-37: 24 atoms", "molecule-label fade", start)}
    <g id="calc" opacity="0">
      ${K.t(500, 228, "76 × 35 = 2660", "molecule-label", start)}${K.t(500, 258, "24 × 37 = 888", "molecule-label", start)}
      ${K.t(500, 296, "(2660 + 888) ÷ 100 ≈ 35.5", "atom-name", start)}
    </g>
    <g id="jars" opacity="0">
      <rect x="500" y="340" width="130" height="62" rx="8" fill="${C.ion}"/>${K.t(565, 379, "35.45 g", "molecule-label", 'style="fill:#fff"')}${K.t(565, 424, "1 mol Cl atoms", "graph-label")}
      <rect x="720" y="330" width="150" height="72" rx="8" fill="${C.heat}"/>${K.t(795, 373, "58.44 g", "molecule-label", 'style="fill:#fff"')}${K.t(795, 424, "1 mol NaCl", "graph-label")}
    </g>`;

  K.page({
    id: "molar-mass",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Weighing atoms: relative and molar mass",
    description: "A grid of one hundred chlorine atoms: seventy-six small blue ones, chlorine-35, and twenty-four larger orange ones with an outline, chlorine-37. Tapping shows the weighted-average sum that gives chlorine's relative atomic mass, about 35.5. Tapping again shows that one mole of chlorine atoms weighs 35.45 grams and one mole of sodium chloride weighs 58.44 grams.",
    svg, bounds: [90, 90, 880, 440], tapLabel: "Tap to work out the average mass",
    steps: [
      { caption: "Chlorine atoms aren't all identical. Of every 100, about 76 are chlorine-35 and 24 are chlorine-37: isotopes with different numbers of neutrons.",
        footnote: "Chlorine-37 is drawn bigger and outlined so you can tell them apart without colour — the real size difference is tiny." },
      { caption: "The 'average' chlorine atom has a weighted-average mass: (76 × 35 + 24 × 37) ÷ 100 = 35.5. That's the relative atomic mass, A<sub>r</sub>, of chlorine.",
        booklet: "§7 periodic table: chlorine's relative atomic mass is 35.45, a touch under our 35.5 because real isotope masses aren't exact whole numbers.",
        to: { "#calc": { opacity: 1 } } },
      { caption: "Weigh out the relative atomic mass in grams and you have one mole of atoms. That mass per mole is the molar mass, M: 35.45 g mol⁻¹ for chlorine. For a compound, add up its atoms: NaCl = 22.99 + 35.45 = 58.44 g mol⁻¹.",
        booklet: "§7: A<sub>r</sub> of Na is 22.99 and of Cl is 35.45. §2: one mole is N<sub>A</sub> = 6.02 × 10²³ particles.",
        to: { "#jars": { opacity: 1 } } }
    ]
  });
})();
