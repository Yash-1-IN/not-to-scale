// Sigma and pi bonds, and hybridization (HL). A sigma bond is orbitals overlapping head-on along the bond
// axis; a pi bond is p orbitals overlapping sideways, above and below it. Hybridization explains the
// bond angles: sp3 (109.5°), sp2 (120°), sp (180°).

(() => {
  const K = Kit, C = K.C;
  const blob = (cx, cy, rx, ry, fill, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${op}"/>`;
  const row = (y, name, hyb, bonds, angle) =>
    K.t(150, y, name, "molecule-label", 'style="text-anchor:start"') + K.t(370, y, hyb, "atom-name", 'style="text-anchor:start"') +
    K.t(500, y, bonds, "molecule-label", 'style="text-anchor:start"') + K.t(770, y, angle, "molecule-label", 'style="text-anchor:start"');

  const svg = `
    <g id="sigma" class="fade">
      ${blob(440, 235, 78, 60, C.electron, 0.3)}${blob(560, 235, 78, 60, C.electron, 0.3)}${blob(500, 235, 40, 44, C.electron, 0.35)}
      ${K.atom("s1", 400, 235, 16, "", C.grey)}${K.atom("s2", 600, 235, 16, "", C.grey)}
      <g id="sigTxt">${K.t(500, 330, "overlap head-on, on the line between the nuclei", "graph-label")}</g>
    </g>
    <g id="pi" opacity="0">
      ${blob(440, 150, 46, 30, C.violet, 0.4)}${blob(560, 150, 46, 30, C.violet, 0.4)}${blob(440, 320, 46, 30, C.violet, 0.4)}${blob(560, 320, 46, 30, C.violet, 0.4)}
      ${blob(500, 150, 20, 26, C.violet, 0.5)}${blob(500, 320, 20, 26, C.violet, 0.5)}
      ${K.t(500, 380, "overlap sideways, above and below the line", "graph-label")}
    </g>
    <g id="table" opacity="0">
      ${K.t(150, 110, "carbon in…", "graph-label", 'style="text-anchor:start"')}${K.t(370, 110, "hybrid", "graph-label", 'style="text-anchor:start"')}${K.t(500, 110, "bonds", "graph-label", 'style="text-anchor:start"')}${K.t(770, 110, "angle", "graph-label", 'style="text-anchor:start"')}
      ${row(190, "ethane, C₂H₆", "sp³", "4 σ", "109.5°")}
      ${row(270, "ethene, C₂H₄", "sp²", "3 σ + 1 π", "120°")}
      ${row(350, "ethyne, C₂H₂", "sp", "2 σ + 2 π", "180°")}
    </g>
    ${K.t(500, 445, "a σ (sigma) bond", "atom-name fade", 'id="tag"')}`;

  K.page({
    id: "hybridization",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Sigma and pi bonds, and hybridization",
    description: "Two grey nuclei with two large overlapping blue clouds joined head-on between them, labelled a sigma bond. Tapping adds four purple lobes, two above and two below the line, overlapping sideways: a pi bond. Tapping again replaces the picture with a table: ethane's carbon is sp3 with four sigma bonds at 109.5 degrees, ethene's is sp2 with three sigma and one pi at 120 degrees, and ethyne's is sp with two sigma and two pi at 180 degrees.",
    svg, bounds: [130, 80, 880, 460], tapLabel: "Tap to add a pi bond",
    steps: [
      { caption: "A sigma (σ) bond forms when two orbitals overlap head-on, so the electron density is concentrated along the line between the nuclei. Every single bond is a sigma bond.",
        footnote: "Any pair of orbitals that overlaps like this counts: s with s, s with p, or p with p end-to-end." },
      { caption: "A pi (π) bond forms when two p orbitals overlap sideways, above and below the bond axis, with the electron density off the line. A double bond is one σ plus one π; a triple bond is one σ plus two π. The sideways overlap is weaker, which is why π bonds are the reactive part of alkenes.",
        to: { "#pi": { opacity: 1 }, "#sigTxt": { opacity: 0 } }, text: { "#tag": "plus a π (pi) bond: a double bond" } },
      { caption: "Why are the bond angles what they are? Carbon mixes (hybridizes) its 2s and 2p orbitals into new hybrid orbitals that point where the electron pairs want to be: four sp³ (109.5°), three sp² with one p left over for a π bond (120°), or two sp with two p left over (180°).",
        to: { "#sigma": { opacity: 0 }, "#pi": { opacity: 0 }, "#table": { opacity: 1, delay: 0.3 } }, text: { "#tag": "hybridization decides the shape" }, dur: 0.8 }
    ]
  });
})();
