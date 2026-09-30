// Chromatography: a mixture of dyes on a paper strip. The solvent creeps up the paper and carries each
// dye a different distance. Rf = distance moved by the spot / distance moved by the solvent.

(() => {
  const K = Kit, C = K.C;
  const BASE = 380, TOP = 140, FRONT = BASE - TOP;
  const SPOTS = [
    { id: "A", rf: 0.85, fill: "#E5B800", name: "yellow" },
    { id: "B", rf: 0.55, fill: "#D2352C", name: "red" },
    { id: "C", rf: 0.25, fill: "#2E6FE0", name: "blue" }
  ];
  const yOf = rf => BASE - rf * FRONT;

  const svg = `
    <rect class="fade" x="400" y="90" width="200" height="330" fill="#F3EBD9" stroke="var(--ink)" stroke-width="2.5"/>
    <rect id="wet" class="fade" x="401" y="${BASE}" width="198" height="0" fill="#CFE8FF" fill-opacity="0.8"/>
    <line class="fade" x1="400" y1="${BASE}" x2="600" y2="${BASE}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 5"/>
    <line id="frontLine" class="fade" x1="400" y1="${BASE}" x2="600" y2="${BASE}" stroke="#5A93C8" stroke-width="3"/>
    <ellipse id="mix" class="fade" cx="500" cy="${BASE}" rx="12" ry="9" fill="#3a3540"/>
    ${SPOTS.map(s => `<ellipse id="sp${s.id}" cx="500" cy="${BASE}" rx="11" ry="8" fill="${s.fill}" opacity="0"/>`).join("")}
    ${K.t(500, 452, "start line", "graph-label fade", 'id="baseLab"')}
    <g id="rfTable" opacity="0">
      ${SPOTS.map((s, i) => K.t(760, 215 + i * 44, `${s.id}: Rf = ${(s.rf * FRONT).toFixed(0)} ÷ ${FRONT} = ${s.rf.toFixed(2)}`, "molecule-label")).join("")}
      ${K.t(760, 175, "distance moved by spot ÷ by solvent", "graph-label")}
    </g>
    <g id="labs" opacity="0">${SPOTS.map(s => K.t(560, yOf(s.rf) + 5, s.id, "atom-name", 'style="text-anchor:start"')).join("")}</g>`;

  K.page({
    id: "chromatography",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Chromatography: a race on paper",
    description: "A strip of paper with a single dark spot of dye mixture on a start line at the bottom. Tapping lets the solvent rise up the paper and the spot splits into three: yellow travelling furthest, red in the middle and blue only a little way. Tapping again labels the three spots A, B and C and shows their Rf values: distance moved by the spot divided by distance moved by the solvent, 0.85, 0.55 and 0.25.",
    svg, bounds: [380, 80, 900, 460], tapLabel: "Tap to start the solvent",
    steps: [
      { caption: "A drop of ink is really a mixture of dyes. Put a spot of it on the start line of a strip of paper, and dip the bottom edge in a solvent.",
        footnote: "The paper is the stationary phase, and the solvent is the mobile phase." },
      { caption: "The solvent creeps up the paper, carrying the dyes with it. A dye that dissolves well in the solvent and clings less to the paper is carried further; one that clings to the paper hangs back. The mixture separates.",
        to: { "#wet": { attr: { y: TOP, height: FRONT } }, "#frontLine": { attr: { y1: TOP, y2: TOP } }, "#mix": { opacity: 0 },
              "#spA": { opacity: 1, attr: { cy: yOf(0.85), ry: 14 } }, "#spB": { opacity: 1, attr: { cy: yOf(0.55), ry: 12 } }, "#spC": { opacity: 1, attr: { cy: yOf(0.25), ry: 10 } } },
        text: { "#baseLab": "start line" }, dur: 2.4 },
      { caption: "Chemists compare substances with the Rf value: the distance moved by the spot divided by the distance moved by the solvent. It's always between 0 and 1, and for a given solvent and paper it identifies the substance.",
        footnote: "Chromatography is used to check the purity of a sample, or to identify what's in a mixture by matching Rf values with known substances.",
        to: { "#rfTable": { opacity: 1 }, "#labs": { opacity: 1 } } }
    ]
  });
})();
