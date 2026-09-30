// Ways to write an organic molecule, using butane: molecular and empirical formulas, the condensed
// structural formula, the full structural (displayed) formula, and the skeletal formula.

(() => {
  const K = Kit, C = K.C;
  const CX = [350, 450, 550, 650], CY = 300;
  let shown = "";
  CX.forEach((x, i) => {
    if (i < 3) shown += K.l(x, CY, CX[i + 1], CY, "var(--ink)", 4, "");
    shown += K.l(x, CY, x, CY - 58, "var(--ink)", 3, "") + K.l(x, CY, x, CY + 58, "var(--ink)", 3, "");
  });
  shown += K.l(350, CY, 292, CY, "var(--ink)", 3, "") + K.l(650, CY, 708, CY, "var(--ink)", 3, "");
  const hs = [[292, CY], [708, CY], ...CX.flatMap(x => [[x, CY - 58], [x, CY + 58]])];
  shown += hs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${C.pale}"/>${K.t(x, y + 5, "H", "graph-label", 'style="font-size:14px"')}`).join("");
  shown += CX.map(x => `<circle cx="${x}" cy="${CY}" r="19" fill="${C.grey}"/>${K.t(x, CY + 5, "C", "graph-label", 'style="fill:#fff;font-size:17px"')}`).join("");

  const svg = `
    ${K.t(500, 100, "molecular formula:  C₄H₁₀", "molecule-label fade")}
    ${K.t(500, 136, "empirical formula:  C₂H₅", "molecule-label fade")}
    ${K.t(500, 176, "condensed structural formula:  CH₃CH₂CH₂CH₃", "molecule-label", 'id="cond" opacity="0"')}
    <g id="disp" opacity="0">${shown}</g>
    <polyline id="skel" points="350,330 450,270 550,330 650,270" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;

  K.page({
    id: "organic-formulas",
    topic: "Structure 3 — Classification of matter",
    title: "Drawing organic molecules: types of formula",
    description: "Butane written several ways. At first only two lines of text: the molecular formula C4H10 and the empirical formula C2H5. Tapping adds the condensed structural formula, CH3CH2CH2CH3, and a full drawing of four carbon atoms in a row with every hydrogen and bond shown. Tapping again replaces that with the skeletal formula: just a zigzag line, where each end and corner is a carbon atom.",
    svg, bounds: [280, 80, 720, 460], tapLabel: "Tap to write it another way",
    steps: [
      { caption: "The molecular formula counts the atoms of each element in one molecule: butane is C₄H₁₀. The empirical formula gives just the simplest whole-number ratio: C₂H₅.",
        footnote: "Neither tells you how the atoms are joined up, and that matters in organic chemistry." },
      { caption: "The condensed structural formula shows the atoms in order, group by group: CH₃CH₂CH₂CH₃. The full structural (displayed) formula draws every atom and every bond.",
        to: { "#cond": { opacity: 1 }, "#disp": { opacity: 1 } } },
      { caption: "Drawing every hydrogen gets tedious for big molecules, so chemists use skeletal formulas. Each end and corner of the zigzag is a carbon atom, and each carbon has as many hydrogens as it needs to make four bonds. Only other atoms, like O, are written in.",
        to: { "#disp": { opacity: 0 }, "#skel": { opacity: 1, delay: 0.3 } }, dur: 0.7 }
    ]
  });
})();
