// VSEPR: electron pairs repel, so they spread out. Lone pairs repel more than bonding pairs and squeeze
// the bond angle: methane 109.5°, ammonia about 107°, water about 104.5°.

(() => {
  const K = Kit, C = K.C, L = 95;
  const wedge = (x, y) => {
    const len = Math.hypot(x, y), px = -y / len * 7, py = x / len * 7;
    return `<polygon points="0,0 ${x + px},${y + py} ${x - px},${y - py}" fill="var(--ink)"/>`;
  };
  const plane = (x, y) => K.l(0, 0, x, y, "var(--ink)", 5);
  const away = (x, y) => K.l(0, 0, x, y, "var(--ink)", 4, 'stroke-dasharray="4 7"');
  const H = (x, y) => `<g transform="translate(${x} ${y})"><circle r="19" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:17px">H</text></g>`;
  const lobe = (x, y) => `<circle cx="${x}" cy="${y}" r="24" fill="${C.violet}" opacity="0.16"/><circle cx="${x - 7}" cy="${y}" r="4.5" fill="${C.violet}"/><circle cx="${x + 7}" cy="${y}" r="4.5" fill="${C.violet}"/>`;
  const centre = (sym, fill) => `<circle r="27" fill="${fill}"/><text class="nuc-sym" style="font-size:22px">${sym}</text>`;

  const ch4 = plane(-78, 55) + plane(78, 55) + wedge(48, -52) + away(-48, -52) + H(-78, 55) + H(78, 55) + H(48, -52) + H(-48, -52) + centre("C", C.grey);
  const nh3 = plane(-76, 58) + plane(76, 58) + wedge(45, -55) + lobe(-45, -58) + H(-76, 58) + H(76, 58) + H(45, -55) + centre("N", C.electron);
  const h2o = plane(-72, 58) + plane(72, 58) + lobe(-48, -55) + lobe(48, -55) + H(-72, 58) + H(72, 58) + centre("O", C.proton);

  const svg = `
    ${K.g("mCH4", 500, 210, ch4)}${K.g("mNH3", 500, 210, nh3, "", 'opacity="0"')}${K.g("mH2O", 500, 210, h2o, "", 'opacity="0"')}
    ${K.t(500, 345, "methane, CH₄: tetrahedral", "atom-name fade", 'id="shape"')}
    ${K.t(500, 385, "H–C–H angle 109.5°", "molecule-label fade", 'id="angle"')}
    ${K.t(500, 430, "solid wedge: towards you · dashed: away from you · purple: a lone pair", "graph-label fade")}`;

  K.page({
    id: "vsepr",
    topic: "Structure 2 — Models of bonding and structure",
    title: "VSEPR: electron pairs pushing apart",
    description: "A methane molecule: a grey carbon atom in the middle with four small hydrogen atoms around it in a tetrahedral arrangement, two bonds in the plane, one solid wedge coming towards you and one dashed going away, with a bond angle of 109.5 degrees. Tapping swaps it for ammonia, where one position is a purple lone pair and the angle is about 107 degrees. Tapping again swaps it for water, with two lone pairs and an angle of about 104.5 degrees.",
    svg, bounds: [380, 110, 620, 450], tapLabel: "Tap to swap the molecule",
    steps: [
      { caption: "Electron pairs repel each other, so around a central atom they spread as far apart as they can. Methane has four bonding pairs, giving a tetrahedral shape with 109.5° between the bonds.",
        footnote: "Two pairs make a straight line (180°), three a flat triangle (120°), four a tetrahedron (109.5°)." },
      { caption: "Ammonia has four pairs too, but one is a lone pair. A lone pair is held by only one nucleus, so it spreads out and repels harder, squeezing the bonding pairs together: trigonal pyramidal, about 107°.",
        to: { "#mCH4": { opacity: 0 }, "#mNH3": { opacity: 1 } }, text: { "#shape": "ammonia, NH₃: trigonal pyramidal", "#angle": "H–N–H angle about 107°" }, dur: 0.7 },
      { caption: "Water has two lone pairs, which squeeze the bonding pairs even closer: a bent shape, about 104.5°. The shape of the molecule is the shape of its atoms, not its electron pairs.",
        footnote: "HL: five electron pairs make a trigonal bipyramid, six an octahedron.",
        to: { "#mNH3": { opacity: 0 }, "#mH2O": { opacity: 1 } }, text: { "#shape": "water, H₂O: bent", "#angle": "H–O–H angle about 104.5°" }, dur: 0.7 }
    ]
  });
})();
