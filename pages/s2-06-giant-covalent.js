// Giant covalent structures: diamond (a rigid network), graphite (layers that slide, delocalized
// electrons), and silicon dioxide (silicon bridged by oxygen).

(() => {
  const K = Kit, C = K.C;
  const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

  // Diamond: every atom bonded to four neighbours (a flat slice of a 3D network).
  let diamond = "";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
    const x = -175 + 70 * j, y = -105 + 70 * i;
    if (j < 5) diamond += K.l(x, y, x + 70, y, "var(--ink)", 4);
    if (i < 3) diamond += K.l(x, y, x, y + 70, "var(--ink)", 4);
  }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) diamond += dot(-175 + 70 * j, -105 + 70 * i, 14, "#3d3b47");

  // Graphite: three layers seen edge-on, atoms in a zigzag, with free electrons between the layers.
  const layer = y => {
    let s = "";
    for (let k = 0; k < 9; k++) {
      const x = -240 + 60 * k, yy = y + (k % 2 ? -9 : 9);
      if (k < 8) s += K.l(x, yy, x + 60, y + ((k + 1) % 2 ? -9 : 9), "var(--ink)", 4);
    }
    for (let k = 0; k < 9; k++) s += dot(-240 + 60 * k, y + (k % 2 ? -9 : 9), 12, "#3d3b47");
    return s;
  };
  let free = "";
  [-40, 40].forEach(y => { for (let k = 0; k < 11; k++) free += dot(-250 + 50 * k, y + (k % 2 ? 6 : -6), 4, C.electron); });
  const graphite = `${K.g("layTop", 0, 0, layer(-80), "", "")}${layer(0)}${layer(80)}${free}
    ${K.l(-260, -40, 260, -40, "var(--ink)", 1.5, 'stroke-opacity="0.3" stroke-dasharray="3 8"')}${K.l(-260, 40, 260, 40, "var(--ink)", 1.5, 'stroke-opacity="0.3" stroke-dasharray="3 8"')}`;

  // Silicon dioxide: silicon atoms with an oxygen atom on every bond.
  let silica = "";
  const sx = j => -180 + 120 * j, sy = i => -120 + 120 * i;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    if (j < 3) silica += K.l(sx(j), sy(i), sx(j + 1), sy(i), "var(--ink)", 4);
    if (i < 2) silica += K.l(sx(j), sy(i), sx(j), sy(i + 1), "var(--ink)", 4);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    if (j < 3) silica += dot((sx(j) + sx(j + 1)) / 2, sy(i), 11, C.proton);
    if (i < 2) silica += dot(sx(j), (sy(i) + sy(i + 1)) / 2, 11, C.proton);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) silica += dot(sx(j), sy(i), 17, C.heat);

  const svg = `
    ${K.g("dia", 500, 225, diamond)}${K.g("gra", 500, 225, graphite, "", 'opacity="0"')}${K.g("sil", 500, 225, silica, "", 'opacity="0"')}
    ${K.t(500, 82, "diamond", "atom-name fade", 'id="subst"')}
    ${K.t(500, 445, "very hard · melts at 3500 °C · does not conduct", "molecule-label fade", 'id="props"')}`;

  K.page({
    id: "giant-covalent",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Giant covalent structures: diamond, graphite and silicon",
    description: "A grid of dark carbon atoms joined by lines in a rigid network: diamond. Tapping swaps it for graphite, three flat layers of carbon atoms seen edge-on with small blue free electrons between the layers, and the top layer slides sideways. Tapping again shows silicon dioxide: orange silicon atoms joined through red oxygen atoms in a network.",
    svg, bounds: [220, 60, 780, 460], tapLabel: "Tap to see another giant structure",
    steps: [
      { caption: "In diamond, every carbon atom is bonded to four others by strong covalent bonds, in one enormous rigid network. There are no molecules, just one giant structure. Diamond is very hard, and melts only at a very high temperature.",
        footnote: "This is a flat slice; in real diamond the four bonds point out in 3D, like the corners of a tetrahedron.",
        booklet: "§8 melting points: carbon, 3500 °C." },
      { caption: "Graphite is also pure carbon, but each atom bonds to only three others, making flat layers. The layers are held together only weakly, so they slide over each other — that's why graphite is soft and used in pencils. The fourth electron of each atom is free to move along the layer, so graphite conducts electricity.",
        to: { "#dia": { opacity: 0 }, "#gra": { opacity: 1 } }, text: { "#subst": "graphite", "#props": "soft, slippery layers · conducts electricity" }, dur: 0.7,
        run(ctx, tl, dir) { if (dir === "fwd") tl.to("#layTop", { x: 50, duration: 0.7, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.0); } },
      { caption: "Silicon sits below carbon in the periodic table and forms the same kind of network as diamond. Silicon dioxide, SiO₂ (the main part of sand and quartz), joins each silicon atom to four oxygens, with each oxygen shared between two silicons. It's hard, melts at a high temperature and doesn't conduct.",
        booklet: "§8 melting points: silicon, 1414 °C.",
        to: { "#gra": { opacity: 0 }, "#sil": { opacity: 1 } }, text: { "#subst": "silicon dioxide", "#props": "hard · very high melting point · does not conduct" }, dur: 0.7 }
    ]
  });
})();
