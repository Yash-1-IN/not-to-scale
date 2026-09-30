// A homologous series: the alkanes, each member one CH2 longer than the last. The enthalpy of combustion
// changes by a steady amount each time (data booklet section 14).

(() => {
  const K = Kit, C = K.C;
  const SERIES = [
    { name: "methane", f: "CH₄", units: ["CH₄"], hc: "−891", bp: "−162" },
    { name: "ethane", f: "C₂H₆", units: ["CH₃", "CH₃"], hc: "−1561", bp: "−89" },
    { name: "propane", f: "C₃H₈", units: ["CH₃", "CH₂", "CH₃"], hc: "−2219", bp: "−42" },
    { name: "butane", f: "C₄H₁₀", units: ["CH₃", "CH₂", "CH₂", "CH₃"], hc: "−2878", bp: "−0.5" }
  ];
  const chain = (s, i) => {
    const n = s.units.length, W = 100, gap = 28, total = n * W + (n - 1) * gap;
    const boxes = s.units.map((u, k) => {
      const x = -total / 2 + k * (W + gap), mid = n > 2 && k > 0 && k < n - 1;
      return `${k ? K.l(x - gap, 0, x, 0, "var(--ink)", 5, "") : ""}<rect x="${x}" y="-32" width="${W}" height="64" rx="14" fill="${mid ? C.heat : C.ion}"/>${K.t(x + W / 2, 8, u, "atom-name", 'style="fill:#fff;font-size:24px"')}`;
    }).join("");
    return K.g("alk" + i, 500, 200, boxes, i ? "" : "fade", i ? 'opacity="0"' : "");
  };
  const svg = `${SERIES.map(chain).join("")}
    ${K.t(500, 118, "methane, CH₄", "atom-name fade", 'id="nm"')}
    ${K.t(500, 300, "enthalpy of combustion  −891 kJ mol⁻¹", "molecule-label fade", 'id="hc"')}
    ${K.t(500, 336, "boiling point  −162 °C", "molecule-label fade", 'id="bp"')}
    ${K.t(500, 420, "general formula:  CₙH₂ₙ₊₂", "graph-label fade", 'id="gen"')}`.replace("CₙH₂ₙ₊₂", "C<tspan dy=\"5\" style=\"font-size:0.7em\">n</tspan><tspan dy=\"-5\">H</tspan><tspan dy=\"5\" style=\"font-size:0.7em\">2n+2</tspan>");

  const step = i => ({
    caption: [
      "", "Add one CH₂ and you have the next alkane, ethane. The alkanes form a homologous series: a family with the same functional group and general formula, where each member differs from the next by one CH₂.",
      "Add another CH₂: propane. The general formula for an alkane with n carbons is C<sub>n</sub>H<sub>2n+2</sub> (here n = 3, so C₃H₈).",
      "And butane. Chemical properties stay the same all the way down the series, while physical properties change gradually: each CH₂ adds about the same enthalpy of combustion, and longer chains boil at higher temperatures because there are stronger London forces between them."
    ][i],
    booklet: "§14 enthalpies of combustion (kJ mol⁻¹): methane −891, ethane −1561, propane −2219, butane −2878 — about −660 more each time.",
    to: { ["#alk" + (i - 1)]: { opacity: 0 }, ["#alk" + i]: { opacity: 1 } },
    text: { "#nm": SERIES[i].name + ", " + SERIES[i].f, "#hc": "enthalpy of combustion  " + SERIES[i].hc + " kJ mol⁻¹", "#bp": "boiling point  " + SERIES[i].bp + " °C" }, dur: 0.6
  });

  K.page({
    id: "homologous-series",
    topic: "Structure 3 — Classification of matter",
    title: "Homologous series: one CH₂ at a time",
    description: "A chain of blue boxes labelled with groups of atoms: first just methane, CH4, with its enthalpy of combustion and boiling point beneath. Each tap adds one more CH2 box in the middle in orange, giving ethane, propane and butane, while the enthalpy of combustion gets about 660 kilojoules more negative each time and the boiling point rises.",
    svg, bounds: [280, 90, 720, 440], tapLabel: "Tap to add a CH₂",
    steps: [
      { caption: "Here's methane, CH₄, the simplest alkane. Watch what happens as we add one carbon at a time.",
        footnote: "Boiling points are typical textbook values, not from the data booklet." },
      step(1), step(2), step(3)
    ]
  });
})();
