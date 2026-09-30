// Hess's law: the enthalpy change from C + O2 to CO2 is the same whether it goes in one step (-394) or
// via CO in two (-111, then -283). Values from the data booklet.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 120 - e * 0.5;
  const lev = (y, label) => `${K.l(300, y, 700, y, "var(--ink)", 4, 'class="fade"')}${K.t(500, y + (y > 300 ? 28 : -12), label, "molecule-label fade")}`;
  const svg = `
    ${lev(Y(0), "C(s) + O₂(g)")}${lev(Y(-111), "CO(g) + ½O₂(g)")}${lev(Y(-394), "CO₂(g)")}
    <g id="direct" opacity="0">${K.arrow(340, Y(0) + 4, 340, Y(-394) - 4, C.heat, 6)}${K.t(325, 240, "−394 kJ", "atom-name", 'style="text-anchor:end"')}</g>
    <g id="via" opacity="0">
      ${K.arrow(600, Y(0) + 4, 600, Y(-111) - 4, C.electron, 5)}${K.t(615, Y(-55) + 5, "−111", "molecule-label", 'style="text-anchor:start"')}
      ${K.arrow(600, Y(-111) + 4, 600, Y(-394) - 4, C.electron, 5)}${K.t(615, Y(-252) + 5, "−283", "molecule-label", 'style="text-anchor:start"')}
    </g>
    ${K.t(500, 445, "one step: ΔH = −394 kJ mol⁻¹", "molecule-label", 'id="verdict" opacity="0"')}`;

  K.page({
    id: "hess",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Hess's law: two routes, same total",
    description: "An energy level diagram with three horizontal lines: carbon plus oxygen at the top, carbon monoxide plus half an oxygen a little lower, and carbon dioxide at the bottom. Tapping draws a single orange arrow straight from the top to the bottom, minus 394 kilojoules. Tapping again draws the two-step route via carbon monoxide, minus 111 then minus 283, ending in the same place with the same total.",
    svg, bounds: [220, 60, 780, 470], tapLabel: "Tap to take a route",
    steps: [
      { caption: "Burning carbon can end up as carbon dioxide, and we can measure the enthalpy change directly. Here are the starting point at the top and the finish at the bottom.",
        booklet: "§13 enthalpies of formation: CO −111, CO₂ −394 kJ mol⁻¹. §14: ΔHc of CO −283 kJ mol⁻¹." },
      { caption: "Straight to carbon dioxide, the enthalpy change is −394 kJ per mole of carbon.",
        to: { "#direct": { opacity: 1 }, "#verdict": { opacity: 1 } }, dur: 0.9 },
      { caption: "But carbon can also burn to carbon monoxide first (−111 kJ), and that burns on to carbon dioxide (−283 kJ). Add the two steps: −111 + −283 = −394 kJ. Same start, same finish, same total. That's Hess's law: the enthalpy change doesn't depend on the route taken.",
        footnote: "It's a consequence of energy being conserved. It lets us work out enthalpy changes we can't measure directly, like the first step here, which is hard to stop at CO.",
        to: { "#via": { opacity: 1 } }, text: { "#verdict": "two steps: −111 + −283 = −394 kJ mol⁻¹" }, dur: 0.9 }
    ]
  });
})();
