// Transition elements (HL): coloured ions, more than one oxidation state, and why they're coloured
// (ligands split the d orbitals; an electron absorbs light to jump between the two levels).

(() => {
  const K = Kit, C = K.C;
  const TUBES = [
    ["Cu²⁺", "#4D94E8", "blue"], ["Fe²⁺", "#B7D9A0", "pale green"], ["Fe³⁺", "#E3B23C", "yellow"], ["Co²⁺", "#F0A6C8", "pink"]
  ];
  const tx = i => 130 + i * 100;
  const tubes = TUBES.map(([ion, col, name], i) => `
    <path class="fade" d="M ${tx(i) - 30} 150 L ${tx(i) - 30} 320 Q ${tx(i) - 30} 350 ${tx(i)} 350 Q ${tx(i) + 30} 350 ${tx(i) + 30} 320 L ${tx(i) + 30} 150" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path class="fade" d="M ${tx(i) - 28} 210 L ${tx(i) - 28} 320 Q ${tx(i) - 28} 348 ${tx(i)} 348 Q ${tx(i) + 28} 348 ${tx(i) + 28} 320 L ${tx(i) + 28} 210 Z" fill="${col}"/>
    ${K.t(tx(i), 386, ion, "atom-name fade", 'style="font-size:22px"')}${K.t(tx(i), 412, name, "graph-label fade")}`).join("");
  const box = (x, y, arrows) => `<rect x="${x}" y="${y}" width="44" height="28" rx="4" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x + 22, y + 21, arrows, "molecule-label")}`;

  const svg = `${tubes}
    ${K.t(280, 108, "hexaaqua ions in solution", "molecule-label fade")}
    <g id="oxid" opacity="0">${K.arrow(238, 262, 262, 262, C.heat, 4)}${K.t(250, 130, "Fe²⁺ → Fe³⁺ + e⁻", "molecule-label", `style="fill:${C.heat}"`)}</g>
    <g id="dsplit" opacity="0">
      ${K.t(730, 108, "d orbitals in a complex", "molecule-label")}
      ${box(632, 170, "↑↓")}${box(688, 170, "↑")}
      ${box(604, 280, "↑↓")}${box(660, 280, "↑↓")}${box(716, 280, "↑↓")}
      ${K.arrow(760, 300, 740, 205, C.heat, 5)}
      ${K.t(730, 345, "light absorbed: red–orange", "graph-label")}${K.t(730, 375, "so the solution looks blue", "graph-label")}
    </g>`;

  K.page({
    id: "transition-elements",
    topic: "Structure 3 — Classification of matter",
    title: "Transition elements: many oxidation states, coloured complexes",
    description: "Four test tubes of solutions of transition metal ions: copper two plus is blue, iron two plus pale green, iron three plus yellow and cobalt two plus pink. Tapping adds an arrow from the iron two plus tube to the iron three plus tube, showing iron in two oxidation states. Tapping again shows a diagram of d orbitals split into a lower level of three boxes and an upper level of two, with an arrow for an electron absorbing red-orange light so the solution looks blue.",
    svg, bounds: [60, 90, 900, 430], tapLabel: "Tap to see what makes them tick",
    steps: [
      { caption: "Compounds of the transition elements are often brightly coloured, unlike most compounds of the s-block metals. Copper(II) is blue, iron(II) pale green, iron(III) yellow, cobalt(II) pink.",
        footnote: "These are the ions surrounded by six water molecules, called hexaaqua complexes." },
      { caption: "Transition elements can also form more than one stable ion, with different oxidation states. Iron makes Fe²⁺ and Fe³⁺: after losing its 4s electrons, it can lose a 3d electron too, because the 3d and 4s energy levels are so close.",
        booklet: "§19 standard reduction potentials: Fe³⁺/Fe²⁺ +0.77 V; Cu²⁺/Cu⁺ +0.15 V.",
        to: { "#oxid": { opacity: 1 } } },
      { caption: "The colour comes from the d orbitals. Surrounding ligands (here water) split the d orbitals into two levels. An electron can jump from the lower to the upper level by absorbing light of just the right energy. We see the colour that's left over.",
        footnote: "Copper(II) absorbs red-orange light, so what reaches your eye is blue.",
        to: { "#dsplit": { opacity: 1 } } }
    ]
  });
})();
