// Forces between molecules: London dispersion forces (all particles), dipole-dipole forces (polar
// molecules) and hydrogen bonds (H on N, O or F, next to a lone pair on N, O or F).

(() => {
  const K = Kit, C = K.C;
  const at = (x, y, r, fill, sym, dark) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.round(r * 0.85)}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text></g>`;
  const dash = (x1, y1, x2, y2, col = C.violet) => K.l(x1, y1, x2, y2, col, 4, 'stroke-dasharray="4 9"');
  const lab = (x, y, s) => K.t(x, y, s, "molecule-label");

  // Two argon atoms: the electron cloud of each has slipped to the left.
  const atomWithCloud = x => `<circle cx="${x}" cy="0" r="62" fill="none" stroke="var(--ink)" stroke-width="2.5"/>
    <circle cx="${x - 16}" cy="0" r="50" fill="${C.violet}" opacity="0.2"/>${at(x, 0, 12, C.grey, "")}`;
  const disp = atomWithCloud(-110) + atomWithCloud(110) + lab(-160, -84, "δ−") + lab(-58, -84, "δ+") + lab(60, -84, "δ−") + lab(162, -84, "δ+") +
    dash(-48, 0, 48, 0) + K.t(0, 100, "a passing dipole nudges the next atom's electrons into a matching one", "graph-label");

  const hcl = (x, y) => K.l(x, y, x + 62, y, "var(--ink)", 5) + at(x, y, 20, C.pale, "H", true) + at(x + 62, y, 30, C.product, "Cl");
  const dd = hcl(-190, 0) + hcl(50, 0) + lab(-190, -46, "δ+") + lab(-128, -52, "δ−") + lab(50, -46, "δ+") + lab(112, -52, "δ−") +
    dash(-98, 0, 26, 0) + K.t(0, 100, "δ+ ends are attracted to δ− ends of their neighbours", "graph-label");

  const water = (x, y, hx1, hy1, hx2, hy2) => K.l(x, y, x + hx1, y + hy1, "var(--ink)", 4) + K.l(x, y, x + hx2, y + hy2, "var(--ink)", 4) +
    at(x, y, 25, C.proton, "O") + at(x + hx1, y + hy1, 14, C.pale, "H", true) + at(x + hx2, y + hy2, 14, C.pale, "H", true);
  const hb = water(-170, -10, -40, 34, 40, 34) + water(0, 60, -42, -30, 44, -28) + water(170, -10, 42, -30, 44, 34) +
    dash(-42, 30, -150, 0, C.heat) + dash(44, 32, 150, 0, C.heat) + lab(-96, 34, "H-bond") + lab(100, 34, "H-bond") +
    K.t(0, 130, "H bonded to O, with a lone pair on the next O", "graph-label");

  const svg = `
    ${K.g("fDisp", 500, 215, disp)}${K.g("fDip", 500, 215, dd, "", 'opacity="0"')}${K.g("fHb", 500, 215, hb, "", 'opacity="0"')}
    ${K.t(500, 82, "London dispersion forces", "atom-name fade", 'id="kind"')}
    ${K.t(500, 445, "the weakest, but present between all particles", "molecule-label fade", 'id="rank"')}`;

  K.page({
    id: "imf",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Forces between molecules",
    description: "Two atoms, each an outlined circle with a purple electron cloud that has slipped to the left, joined by a dashed line: London dispersion forces. Tapping swaps it for two polar hydrogen chloride molecules lined up so a positive hydrogen end faces a negative chlorine end: dipole-dipole forces. Tapping again shows three water molecules joined by orange dashed lines from hydrogen to a neighbouring oxygen: hydrogen bonds.",
    svg, bounds: [200, 60, 800, 460], tapLabel: "Tap to see the next force",
    steps: [
      { caption: "Even atoms and molecules with no permanent charge attract each other weakly. Their electrons slosh about, making a brief dipole, which nudges the neighbour's electrons into a matching dipole. These are London (dispersion) forces. More electrons means stronger forces.",
        footnote: "That's why the noble gases, which have no other forces, boil at higher temperatures the bigger they get.",
        booklet: "§8 boiling points: He −268.9 °C, Ne −246.0 °C, Ar −185.8 °C, Kr −153.4 °C, Xe −108.1 °C." },
      { caption: "Polar molecules have a permanent δ+ end and δ− end, so they line up and attract, on top of their dispersion forces. These dipole–dipole forces are stronger than dispersion forces between molecules of a similar size.",
        to: { "#fDisp": { opacity: 0 }, "#fDip": { opacity: 1 } }, text: { "#kind": "dipole–dipole forces", "#rank": "stronger, between polar molecules" }, dur: 0.7 },
      { caption: "When hydrogen is bonded to nitrogen, oxygen or fluorine, it's so δ+ that it's attracted to a lone pair on a neighbouring N, O or F. This hydrogen bond is the strongest of the three, and it's why water is a liquid at room temperature instead of a gas.",
        footnote: "A hydrogen bond is still far weaker than a covalent bond. It's the bond between molecules, not the O–H bond inside them.",
        to: { "#fDip": { opacity: 0 }, "#fHb": { opacity: 1 } }, text: { "#kind": "hydrogen bonds", "#rank": "the strongest of the three" }, dur: 0.7 }
    ]
  });
})();
