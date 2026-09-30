// Resonance and benzene (HL): two Kekulé structures, and the truth: six identical bonds sharing a ring
// of delocalized electrons.

(() => {
  const K = Kit, C = K.C, R = 110, CX = 500, CY = 230;
  const v = k => [CX + R * Math.cos(Math.PI / 3 * k - Math.PI / 2), CY + R * Math.sin(Math.PI / 3 * k - Math.PI / 2)];
  // A second line inside the ring, parallel to edge k -> k+1.
  const inner = k => {
    const [x1, y1] = v(k), [x2, y2] = v(k + 1), mx = CX, my = CY, o = 0.2;
    const ip = (x, y) => [x + (mx - x) * o, y + (my - y) * o];
    const [a, b] = ip(x1, y1), [c, d] = ip(x2, y2);
    return `<line x1="${a + (c - a) * 0.12}" y1="${b + (d - b) * 0.12}" x2="${a + (c - a) * 0.88}" y2="${b + (d - b) * 0.88}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`;
  };
  const edges = [0, 1, 2, 3, 4, 5].map(k => { const [x1, y1] = v(k), [x2, y2] = v(k + 1); return K.l(x1, y1, x2, y2, "var(--ink)", 5, 'class="fade"'); }).join("");
  const dbl = ks => `<g id="db${ks[0] % 2 ? "B" : "A"}" ${ks[0] % 2 ? 'opacity="0"' : 'class="fade"'}>${ks.map(inner).join("")}</g>`;

  const svg = `
    ${edges}${dbl([0, 2, 4])}${dbl([1, 3, 5])}
    <circle id="ringE" cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${C.electron}" stroke-width="6" opacity="0"/>
    <g id="both" opacity="0">${K.arrow(640, 230, 730, 230, "var(--ink)", 4)}${K.arrow(730, 230, 640, 230, "var(--ink)", 4)}</g>
    ${K.t(500, 405, "benzene, C₆H₆ (a carbon at each corner, hydrogens not shown)", "graph-label fade")}
    ${K.t(500, 445, "one way to draw it", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "benzene",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Resonance and benzene",
    description: "A hexagon representing benzene, with three double bonds drawn as second lines on alternate sides. Tapping switches the double bonds to the other three sides, with a double-headed arrow to show the two drawings are related by resonance. Tapping again removes the double lines and draws a blue circle inside the hexagon: all six bonds are identical, sharing a ring of delocalized electrons.",
    svg, bounds: [360, 100, 760, 460], tapLabel: "Tap to redraw the molecule",
    steps: [
      { caption: "Benzene, C₆H₆, is a ring of six carbon atoms. One way to draw it gives three C=C double bonds and three C–C single bonds, alternating round the ring.",
        footnote: "Each corner is a carbon atom with one hydrogen attached, left out to keep the picture simple." },
      { caption: "But you can draw it equally well with the double bonds on the other three sides. Neither drawing is right: the molecule doesn't flip between them. Structures like these, which differ only in where the electrons are drawn, are called resonance structures.",
        to: { "#dbA": { opacity: 0 }, "#dbB": { opacity: 1 }, "#both": { opacity: 1, delay: 0.4 } }, text: { "#tag": "the other way to draw it" }, dur: 0.8 },
      { caption: "In fact all six carbon–carbon bonds in benzene are identical, all about 140 pm: in between a single bond (154 pm) and a double bond (134 pm). The electrons of the extra bonds are spread evenly all round the ring: delocalized. That's often drawn as a circle.",
        footnote: "The delocalization makes benzene unusually stable.",
        booklet: "§11: C–C 154 pm and C=C 134 pm. (The 140 pm figure for benzene isn't in the booklet.)",
        to: { "#dbB": { opacity: 0 }, "#both": { opacity: 0 }, "#ringE": { opacity: 1, delay: 0.3 } }, text: { "#tag": "the real molecule: six identical bonds" }, dur: 0.8 }
    ]
  });
})();
