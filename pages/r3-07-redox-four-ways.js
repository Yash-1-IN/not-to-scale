// Oxidation and reduction described four ways: electrons, oxidation state, oxygen, hydrogen. Each row is
// one definition; a worked example changes with it.

(() => {
  const K = Kit, C = K.C;
  const ROWS = [
    ["electrons", "loses electrons", "gains electrons", "Mg → Mg²⁺ + 2e⁻: magnesium loses electrons, so it's oxidized"],
    ["oxidation state", "increases", "decreases", "Mg: 0 → +2: its oxidation state increases, so it's oxidized"],
    ["oxygen", "gains oxygen", "loses oxygen", "2Mg + O₂ → 2MgO: magnesium gains oxygen, so it's oxidized"],
    ["hydrogen", "loses hydrogen", "gains hydrogen", "CH₃CH₂OH → CH₃CHO: ethanol loses hydrogen, so it's oxidized"]
  ];
  const Y = i => 205 + i * 55;
  const row = (r, i) => `<g id="row${i}" ${i ? 'opacity="0"' : 'class="fade"'}>
    ${K.t(80, Y(i) + 6, r[0], "molecule-label", 'style="text-anchor:start"')}${K.t(500, Y(i) + 6, r[1], "molecule-label")}${K.t(760, Y(i) + 6, r[2], "molecule-label")}</g>`;

  const svg = `
    ${K.t(500, 150, "oxidation", "atom-name fade", `style="fill:${C.heat}"`)}${K.t(760, 150, "reduction", "atom-name fade", `style="fill:${C.electron}"`)}
    ${K.l(70, 170, 900, 170, "var(--ink)", 2.5, 'class="fade" stroke-opacity="0.4"')}
    ${ROWS.map(row).join("")}
    ${K.t(500, 445, ROWS[0][3], "molecule-label fade", 'id="ex"')}`;

  const step = (i, cap, extra = {}) => ({ caption: cap, to: { ["#row" + i]: { opacity: 1 } }, text: { "#ex": ROWS[i][3] }, ...extra });

  K.page({
    id: "redox-four-ways",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Oxidation and reduction: four ways",
    description: "A table with oxidation in orange on one side and reduction in blue on the other. It starts with one row, electrons: oxidation is losing electrons and reduction is gaining them. Each tap adds a row: oxidation state increases or decreases; gaining or losing oxygen; losing or gaining hydrogen. A worked example beneath changes with each row.",
    svg, bounds: [60, 110, 940, 470], tapLabel: "Tap to add another definition",
    steps: [
      { caption: "Oxidation and reduction can be described in four ways. The most general is in terms of electrons: oxidation is loss of electrons, and reduction is gain of electrons. They always happen together.",
        footnote: "OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons)." },
      step(1, "Oxidation states give the same answer: an atom that is oxidized has its oxidation state go up, and one that is reduced has it go down."),
      step(2, "The oldest definition is in terms of oxygen: gaining oxygen is oxidation, and losing oxygen is reduction. It's how the words started, from things burning in air."),
      step(3, "Organic chemistry often uses hydrogen: losing hydrogen is oxidation, and gaining hydrogen is reduction.",
        { footnote: "Try any of the four on the same reaction and they'll agree." })
    ]
  });
})();
