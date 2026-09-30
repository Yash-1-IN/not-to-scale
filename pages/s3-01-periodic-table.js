// The periodic table, periods 1 to 4: rows are periods, columns are groups, and the block names come from
// the type of orbital filled last.

(() => {
  const K = Kit, C = K.C;
  const ROWS = [
    { cols: [0, 17], syms: ["H", "He"] },
    { cols: [0, 1, 12, 13, 14, 15, 16, 17], syms: ["Li", "Be", "B", "C", "N", "O", "F", "Ne"] },
    { cols: [0, 1, 12, 13, 14, 15, 16, 17], syms: ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"] },
    { cols: Array.from({ length: 18 }, (_, i) => i), syms: ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"] }
  ];
  const X = c => 104 + c * 44, Y = r => 128 + r * 46;
  const tint = c => (c < 2 || c === 17 && false ? "#FBE3DC" : c >= 12 ? "#E1ECFA" : c >= 2 ? "#E9E1F8" : "#FBE3DC");

  let cells = "";
  ROWS.forEach((row, r) => row.cols.forEach((c, i) => {
    const he = row.syms[i] === "He";
    cells += `<rect class="fade" x="${X(c)}" y="${Y(r)}" width="40" height="40" rx="6" fill="${he ? "#E1ECFA" : tint(c)}" stroke="var(--ink)" stroke-width="2"/>
      ${K.t(X(c) + 20, Y(r) + 26, row.syms[i], "graph-label fade")}`;
  }));
  const heads = Array.from({ length: 18 }, (_, c) => K.t(X(c) + 20, 118, c + 1, "graph-label fade")).join("");
  const nums = [1, 2, 3, 4].map(r => K.t(92, Y(r - 1) + 26, r, "graph-label fade", 'style="text-anchor:end"')).join("");
  const bracket = (c0, c1, text) => `<g class="blk" opacity="0"><path d="M ${X(c0)} 322 L ${X(c0)} 330 L ${X(c1) + 40} 330 L ${X(c1) + 40} 322" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t((X(c0) + X(c1) + 40) / 2, 356, text, "atom-name")}</g>`;

  const svg = `${cells}${heads}${nums}
    ${K.t(500, 96, "group", "atom-name fade", 'style="font-size:18px"')}${K.t(56, 240, "period", "atom-name fade", 'style="font-size:18px"')}
    <rect id="hiPeriod" x="98" y="${Y(2) - 6}" width="802" height="52" rx="10" fill="none" stroke="${C.heat}" stroke-width="5" opacity="0"/>
    <rect id="hiGroup" x="${X(16) - 6}" y="${Y(1) - 6}" width="52" height="${46 * 3 + 6}" rx="10" fill="none" stroke="${C.heat}" stroke-width="5" opacity="0"/>
    ${bracket(0, 1, "s block")}${bracket(2, 11, "d block")}${bracket(12, 17, "p block")}
    ${K.t(500, 445, "period 3: electrons up to the third shell", "molecule-label", 'id="note" opacity="0"')}`;

  K.page({
    id: "periodic-table",
    topic: "Structure 3 — Classification of matter",
    title: "The periodic table: periods, groups and blocks",
    description: "The first four rows of the periodic table drawn as a grid of tinted boxes, with group numbers 1 to 18 along the top and period numbers 1 to 4 down the side. Tapping outlines period 3, the row from sodium to argon. Tapping again outlines group 17: fluorine, chlorine and bromine. Tapping a last time brackets the s block, d block and p block underneath.",
    svg, bounds: [50, 80, 950, 470], tapLabel: "Tap to pick out rows, columns and blocks",
    steps: [
      { caption: "The periodic table arranges the elements by atomic number. Each row is a period and each column is a group. Here are the first four periods.",
        footnote: "Helium sits in group 18 with the noble gases, though it has just two electrons.",
        booklet: "§7 the periodic table." },
      { caption: "The period number shows the outer energy level that holds electrons. Across period 3, from sodium to argon, each atom adds electrons to the same third shell.",
        to: { "#hiPeriod": { opacity: 1 }, "#note": { opacity: 1 } } },
      { caption: "Elements in a group have the same number of outer electrons, so they behave alike. Fluorine, chlorine and bromine (group 17) each have seven outer electrons, and all form 1− ions and react in similar ways.",
        to: { "#hiPeriod": { opacity: 0 }, "#hiGroup": { opacity: 1 } }, text: { "#note": "group 17: seven outer electrons each" } },
      { caption: "The table also falls into blocks, named after the type of orbital being filled last: the s block, the p block, and the d block of transition elements in between.",
        to: { "#hiGroup": { opacity: 0 }, ".blk": { opacity: 1, stagger: 0.2 }, "#note": { opacity: 0 } } }
    ]
  });
})();
