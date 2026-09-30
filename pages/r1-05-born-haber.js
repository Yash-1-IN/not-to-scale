// Born-Haber cycle (HL) for sodium chloride. Values (kJ/mol): atomization of Na +107 (not in the booklet),
// ½ Cl–Cl +121 (half of 242, §12), ionization of Na +496 (§9), electron affinity of Cl −349 (§9), lattice
// formation −790 (minus the booklet's lattice enthalpy, §16). The sum is −415; the experimental value is −411.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 110 + (724 - e) * 0.26;
  const LV = [
    { e: 0, x0: 90, lab: "Na(s)+½Cl₂(g)" }, { e: 107, x0: 240, lab: "Na(g)+½Cl₂(g)" }, { e: 228, x0: 390, lab: "Na(g)+Cl(g)" },
    { e: 724, x0: 540, lab: "Na⁺(g)+e⁻+Cl(g)" }, { e: 375, x0: 690, lab: "Na⁺(g)+Cl⁻(g)" }, { e: -415, x0: 840, lab: "NaCl(s)" }
  ];
  const W = 100;
  const svg = `${LV.map((l, i) => `<g id="lv${i}" ${i < 1 ? 'class="fade"' : 'opacity="0"'}>${K.l(l.x0, Y(l.e), l.x0 + W, Y(l.e), "var(--ink)", 4, "")}${K.t(l.x0 + W / 2, Y(l.e) + (l.e > 300 ? -12 : 26), l.lab, "graph-label", 'style="font-size:13px"')}</g>`).join("")}
    <g id="st1" opacity="0">${K.arrow(215, Y(0), 215, Y(107), C.heat, 4)}${K.t(198, 262, "+107", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st2" opacity="0">${K.arrow(365, Y(107), 365, Y(228), C.heat, 4)}${K.t(348, 248, "+121", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st3" opacity="0">${K.arrow(515, Y(228), 515, Y(724), C.heat, 4)}${K.t(498, 170, "+496", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st4" opacity="0">${K.arrow(665, Y(724), 665, Y(375), C.electron, 4)}${K.t(648, 160, "−349", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st5" opacity="0">${K.arrow(815, Y(375), 815, Y(-415), C.electron, 4)}${K.t(798, 300, "−790", "molecule-label", 'style="text-anchor:end"')}</g>
    ${K.t(500, 445, "the elements in their standard states: zero", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "born-haber",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Born–Haber cycles",
    description: "An energy level diagram with six short horizontal levels from left to right for making sodium chloride from sodium and chlorine. Tapping adds the first steps, turning sodium into gaseous atoms, plus 107 kilojoules, and splitting half a chlorine molecule, plus 121. Tapping again adds the electron transfers: ionization of sodium, plus 496, and chlorine's electron affinity, minus 349. A last tap adds the lattice forming, minus 790, ending with the enthalpy of formation of sodium chloride, about minus 415 kilojoules per mole.",
    svg, bounds: [80, 90, 950, 460], tapLabel: "Tap to add the next steps",
    steps: [
      { caption: "A Born–Haber cycle applies Hess's law to an ionic compound: a route from the elements to the solid that is made of steps we can measure. Here, sodium metal and chlorine gas will become sodium chloride.",
        footnote: "The levels are plotted to scale: the higher up, the more energy." },
      { caption: "First the elements must become gaseous atoms: sodium vaporizes (+107 kJ) and half a mole of chlorine molecules splits into atoms (+121 kJ).",
        booklet: "§12: Cl–Cl 242 kJ mol⁻¹, so ½ is 121. (The atomization of sodium, +107, isn't in the booklet.)",
        to: { "#lv1": { opacity: 1 }, "#lv2": { opacity: 1, delay: 0.5 }, "#st1": { opacity: 1, delay: 0.2 }, "#st2": { opacity: 1, delay: 0.7 } }, dur: 1.1 },
      { caption: "Next the electron moves. Removing sodium's outer electron costs its ionization energy (+496 kJ), and chlorine gains it back, releasing its electron affinity (−349 kJ).",
        booklet: "§9: first ionization energy of Na 496; electron affinity of Cl −349 kJ mol⁻¹.",
        to: { "#lv3": { opacity: 1 }, "#lv4": { opacity: 1, delay: 0.7 }, "#st3": { opacity: 1, delay: 0.3 }, "#st4": { opacity: 1, delay: 1.0 } }, text: { "#tag": "ionization of Na +496 · electron affinity of Cl −349" }, dur: 1.2 },
      { caption: "Finally the gaseous ions fall together into a lattice, releasing 790 kJ per mole. Adding it all up: +107 + 121 + 496 − 349 − 790 = −415 kJ. That's the enthalpy of formation of NaCl, and it agrees closely with the measured −411.",
        footnote: "The small mismatch comes from rounding and the averaged, experimental values used.",
        booklet: "§16: lattice enthalpy of NaCl, 790 kJ mol⁻¹ (defined as the energy to separate the lattice into ions, so forming it is −790).",
        to: { "#lv5": { opacity: 1 }, "#st5": { opacity: 1, delay: 0.4 } }, text: { "#tag": "ΔH_f(NaCl) ≈ −415 kJ mol⁻¹ (measured −411)" }, dur: 1.2 }
    ]
  });
})();
