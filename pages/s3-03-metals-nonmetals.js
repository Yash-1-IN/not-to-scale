// Metals and non-metals across period 3: conductivity, and the oxides going from basic through amphoteric
// to acidic.

(() => {
  const K = Kit, C = K.C;
  const EL = [
    ["Na", "metal", "conducts", "Na₂O", "basic"], ["Mg", "metal", "conducts", "MgO", "basic"], ["Al", "metal", "conducts", "Al₂O₃", "amphoteric"],
    ["Si", "metalloid", "semiconductor", "SiO₂", "acidic"], ["P", "non-metal", "insulator", "P₄O₁₀", "acidic"], ["S", "non-metal", "insulator", "SO₃", "acidic"],
    ["Cl", "non-metal", "insulator", "Cl₂O₇", "acidic"], ["Ar", "noble gas", "insulator", "no oxide", "–"]
  ];
  const x = k => 150 + k * 100;
  const col = k => (k < 3 ? C.ion : k === 3 ? C.grey : C.product);
  const svg = `${EL.map((e, k) => `
    <rect class="fade" x="${x(k) - 42}" y="118" width="84" height="84" rx="14" fill="${col(k)}"/>
    ${K.t(x(k), 174, e[0], "atom-name fade", 'style="fill:#fff;font-size:34px"')}
    ${K.t(x(k), 236, e[1], "graph-label fade")}${K.t(x(k), 262, e[2], "graph-label fade")}
    <g class="ox" opacity="0">${K.t(x(k), 320, e[3], "molecule-label")}${K.t(x(k), 350, e[4], "graph-label")}</g>`).join("")}
    ${K.t(500, 96, "period 3", "atom-name fade", 'style="font-size:20px"')}
    <g id="trend" opacity="0">${K.arrow(120, 405, 880, 405, C.heat, 5)}${K.t(500, 440, "metallic character decreases across a period", "molecule-label")}</g>`;

  K.page({
    id: "metals-nonmetals",
    topic: "Structure 3 — Classification of matter",
    title: "Metals and non-metals",
    description: "The eight elements of period 3, sodium to argon, in tiles labelled metal, metalloid, non-metal or noble gas, with whether they conduct electricity. Tapping adds the formula of each element's oxide and whether it is basic, amphoteric or acidic. Tapping again adds an arrow across the bottom: metallic character decreases across a period.",
    svg, bounds: [90, 85, 910, 460], tapLabel: "Tap to look at the oxides",
    steps: [
      { caption: "Across period 3 the elements change from metals to non-metals. Sodium, magnesium and aluminium are metals: they conduct electricity. Silicon is a metalloid, in between, and the rest are non-metals that don't conduct.",
        footnote: "Metals are also shiny, malleable and ductile. Non-metals are usually brittle when solid." },
      { caption: "Their oxides change too. Metal oxides are basic, non-metal oxides are acidic, and aluminium oxide, in between, is amphoteric: it reacts with both acids and bases.",
        to: { ".ox": { opacity: 1, stagger: 0.1 } } },
      { caption: "So metallic character decreases from left to right across a period (and increases going down a group). It's a gradual change, not a sudden switch.",
        to: { "#trend": { opacity: 1 } } }
    ]
  });
})();
