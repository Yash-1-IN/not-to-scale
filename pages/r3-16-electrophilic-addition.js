// Electrophilic addition: ethene + Br2. The electron-rich C=C attacks the δ+ end of an approaching bromine
// molecule; the Br–Br bond breaks heterolytically; the bromide ion then attacks the carbocation.

(() => {
  const K = Kit, C = K.C;
  const BR = "#9C4A2A";
  function curly(x1, y1, cx, cy, x2, y2) {
    const a = Math.atan2(y2 - cy, x2 - cx), h = 13;
    const p = d => `${(x2 - Math.cos(a + d) * h).toFixed(1)},${(y2 - Math.sin(a + d) * h).toFixed(1)}`;
    return `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round"/><polygon points="${x2},${y2} ${p(0.5)} ${p(-0.5)}" fill="${C.heat}"/>`;
  }
  const svg = `
    <ellipse id="pi" class="fade" cx="500" cy="262" rx="100" ry="34" fill="${C.violet}" fill-opacity="0.18"/>
    ${K.l(430, 256, 570, 256, "var(--ink)", 6, 'id="d1" class="fade"')}${K.l(430, 268, 570, 268, "var(--ink)", 6, 'id="d2" class="fade"')}
    <line id="cBr1" x1="430" y1="262" x2="430" y2="170" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    <line id="cBr2" x1="570" y1="262" x2="570" y2="170" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    ${K.atom("c1", 430, 262, 26, "CH₂", C.grey)}${K.atom("c2", 570, 262, 26, "CH₂", C.grey)}
    ${K.l(500, 100, 500, 150, "var(--ink)", 6, 'id="brBond" class="fade"')}
    ${K.g("brA", 500, 150, `<circle r="26" fill="${BR}"/><text class="nuc-sym" style="font-size:20px">Br</text>`)}
    ${K.g("brB", 500, 84, `<circle r="26" fill="${BR}"/><text id="brBT" class="nuc-sym" style="font-size:20px">Br</text>`)}
    <g id="dl" class="fade">${K.t(548, 156, "δ+", "molecule-label")}${K.t(548, 90, "δ−", "molecule-label")}</g>
    <g id="curly" opacity="0">${curly(500, 240, 470, 200, 484, 168)}${curly(512, 128, 560, 112, 528, 90)}</g>
    ${K.t(612, 236, "+", "atom-name", 'id="plus" opacity="0" style="font-size:36px"')}
    ${K.t(500, 420, "ethene and bromine approaching", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "electrophilic-addition",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Electrophilic addition to alkenes",
    description: "Ethene drawn as two CH2 groups joined by a double bond with a purple cloud of pi electrons around it, and a bromine molecule approaching from above, its nearer atom marked delta plus and its far atom delta minus. Tapping draws two curly arrows: from the pi bond to the near bromine, and from the bromine-bromine bond to the far bromine. Tapping again shows the bromide ion leaving, a bromine joined to one carbon and a plus sign on the other. A last tap shows the bromide ion joining the second carbon: 1,2-dibromoethane.",
    svg, bounds: [380, 50, 760, 450], tapLabel: "Tap to follow the electrons",
    steps: [
      { caption: "The C=C double bond in an alkene is a region of high electron density, the π bond. It attracts electron-poor species called electrophiles: species that accept a pair of electrons. Here a bromine molecule approaches; the alkene's electrons push the electrons in the Br–Br bond away, so the nearer bromine becomes δ+.",
        footnote: "Bromine on its own is non-polar. It's the approaching alkene that makes it polar." },
      { caption: "Curly arrows: the pair of electrons in the π bond attacks the δ+ bromine, and the Br–Br bond breaks with both its electrons going to the far bromine. The far bromine leaves as a bromide ion, Br⁻.",
        to: { "#curly": { opacity: 1 } }, dur: 0.7 },
      { caption: "Now one carbon is joined to a bromine, and the other has lost its share of the π electrons: it's a carbocation, with a positive charge and only three bonds.",
        to: { "#curly": { opacity: 0 }, "#brA": { x: 430, y: 170 }, "#brBond": { opacity: 0 }, "#dl": { opacity: 0 }, "#pi": { opacity: 0 }, "#d2": { opacity: 0 }, "#cBr1": { opacity: 1, delay: 0.9 }, "#brB": { x: 720, y: 130, delay: 0.3 }, "#plus": { opacity: 1, delay: 0.9 } },
        text: { "#brBT": "Br⁻", "#tag": "a carbocation, and a bromide ion leaving" }, dur: 1.4 },
      { caption: "The negative bromide ion is attracted to the positive carbocation and uses a lone pair to bond to it. The result is 1,2-dibromoethane: bromine has added across the double bond. This reaction is also the test for a C=C: bromine water is decolourized.",
        to: { "#brB": { x: 570, y: 170 }, "#cBr2": { opacity: 1, delay: 1.0 }, "#plus": { opacity: 0 } }, text: { "#brBT": "Br", "#tag": "1,2-dibromoethane" }, dur: 1.4 }
    ]
  });
})();
