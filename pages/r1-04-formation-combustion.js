// Enthalpies of formation and combustion (HL): ΔH = Σ ΔHf(products) − Σ ΔHf(reactants), with methane burning.
// Formation values (kJ/mol) from the data booklet: CH4 −74, CO2 −394, H2O(l) −286; ΔHc of methane −891.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 110 - e * 0.25;
  const lev = (y, x0, x1, label, dy = 26) => `${K.l(x0, y, x1, y, "var(--ink)", 4, 'class="fade"')}${K.t((x0 + x1) / 2, y + dy, label, "graph-label fade")}`;
  const svg = `
    ${lev(Y(0), 150, 850, "elements in their standard states (zero)", -12)}
    ${lev(Y(-74), 200, 400, "CH₄ + 2O₂", 24)}${lev(Y(-966), 600, 800, "CO₂ + 2H₂O(l)", 24)}
    <g id="form" opacity="0">
      ${K.arrow(270, Y(0) + 4, 270, Y(-74) - 4, C.electron, 5)}${K.t(255, 138, "−74", "molecule-label", 'style="text-anchor:end"')}
      ${K.arrow(700, Y(0) + 4, 700, Y(-966) - 4, C.electron, 5)}${K.t(716, 260, "−394 + 2(−286) = −966", "molecule-label", 'style="text-anchor:start"')}
    </g>
    <g id="rxn" opacity="0">${K.arrow(480, Y(-74) + 4, 480, Y(-966) - 4, C.heat, 7)}${K.t(495, 240, "ΔH = −966 − (−74)", "molecule-label", 'style="text-anchor:start"')}${K.t(495, 272, "= −892 kJ mol⁻¹", "atom-name", 'style="text-anchor:start"')}</g>
    ${K.t(500, 445, "CH₄ + 2O₂ → CO₂ + 2H₂O", "atom-name fade")}`;

  K.page({
    id: "formation-combustion",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Enthalpies of formation and combustion",
    description: "An energy diagram with a line at the top for elements in their standard states, at zero. Tapping draws a short arrow down to methane plus oxygen, minus 74 kilojoules, and a long arrow down to carbon dioxide plus water, minus 966. Tapping again draws an arrow between them: the enthalpy change of burning methane, minus 892 kilojoules per mole, which matches the tabulated enthalpy of combustion, minus 891.",
    svg, bounds: [140, 70, 870, 460], tapLabel: "Tap to build the cycle",
    steps: [
      { caption: "The standard enthalpy of formation, ΔH_f, is the enthalpy change when one mole of a compound is made from its elements in their standard states. Elements themselves are defined as zero. Here's methane burning: CH₄ + 2O₂ → CO₂ + 2H₂O.",
        footnote: "Oxygen is an element, so its ΔH_f is zero." },
      { caption: "Use formation data to place both sides on the same scale: reactants (methane, −74 kJ) and products (carbon dioxide −394, plus two waters at −286 each, −966 in total).",
        booklet: "§13: CH₄ −74, CO₂ −394, H₂O(l) −286 kJ mol⁻¹.",
        to: { "#form": { opacity: 1 } } },
      { caption: "The enthalpy change of the reaction is the difference: ΔH = Σ ΔH_f(products) − Σ ΔH_f(reactants) = −966 − (−74) = −892 kJ. That's the enthalpy of combustion of methane, and it matches the tabulated value of −891.",
        booklet: "§1: ΔH⦵ = Σ(ΔH_f⦵ products) − Σ(ΔH_f⦵ reactants). §14: ΔH_c of methane −891 kJ mol⁻¹.",
        to: { "#rxn": { opacity: 1 } } }
    ]
  });
})();
