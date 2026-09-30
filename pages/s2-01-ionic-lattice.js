// Ionic lattices: one Na+ and one Cl- attract; add more and a lattice builds. Slide a layer by one ion
// and like charges meet, so the crystal splits (brittle).

(() => {
  const K = Kit, C = K.C;
  const COLS = 8, ROWS = 5, SP = 60, X0 = 290, Y0 = 115;
  const ion = (i, j) => {
    const pos = (i + j) % 2 === 0, x = X0 + j * SP, y = Y0 + i * SP, seed = i === 2 && (j === 3 || j === 4);
    return `<g class="${seed ? "fade" : "lat"}" ${seed ? "" : 'opacity="0"'} data-d="${Math.hypot(j - 3.5, i - 2).toFixed(2)}">
      <circle cx="${x}" cy="${y}" r="${pos ? 19 : 30}" fill="${pos ? C.proton : C.electron}"/>
      <text class="nuc-sym" x="${x}" y="${y}" style="font-size:22px">${pos ? "+" : "−"}</text></g>`;
  };
  const rows = (a, b) => { let s = ""; for (let i = a; i <= b; i++) for (let j = 0; j < COLS; j++) s += ion(i, j); return s; };
  const crack = `M 270 205 L 320 195 L 370 215 L 420 195 L 470 215 L 520 195 L 570 215 L 620 195 L 670 215 L 720 195 L 790 210`;

  const svg = `
    ${K.g("bottom", 0, 0, rows(2, 4))}${K.g("top", 0, 0, rows(0, 1))}
    <path id="crack" d="${crack}" fill="none" stroke="${C.heat}" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round" opacity="0"/>
    ${K.t(880, 210, "cracks!", "molecule-label", 'id="crackLab" opacity="0"')}
    ${K.t(500, 445, "small red: sodium ions, Na⁺  ·  big blue: chloride ions, Cl⁻", "graph-label fade")}`;

  K.page({
    id: "ionic-lattice",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Ionic lattices: why salt makes crystals",
    description: "A single small red sodium ion, plus, sits next to a big blue chloride ion, minus. Tapping adds more ions until a rectangular lattice forms, red and blue alternating in every direction. Tapping again slides the top two rows one ion to the right so that like charges sit above each other, and a dashed orange crack appears between the layers.",
    svg, bounds: [260, 85, 830, 450], tapLabel: "Tap to build and break the crystal",
    steps: [
      { caption: "On the ionic bonding page, one Na⁺ ion attracted one Cl⁻ ion. But an ion attracts every ion of the opposite charge around it, in every direction, not just one partner.",
        footnote: "Ions are drawn as flat discs here. Real ions are 3D spheres, and the chloride ion really is bigger than sodium's." },
      { caption: "So ions pile up into a giant lattice: every Na⁺ surrounded by Cl⁻, every Cl⁻ by Na⁺, all held by strong attraction in every direction. That's why ionic compounds are hard crystals with high melting points.",
        footnote: "In real, 3D sodium chloride, each ion touches six of the opposite charge.",
        booklet: "§10 ionic radii: Na⁺ 102 pm, Cl⁻ 181 pm. §16 lattice enthalpy of NaCl: 790 kJ mol⁻¹ (the energy to pull one mole of the crystal apart into gaseous ions).",
        to: { ".lat": { opacity: 1, delay: (i, el) => +el.dataset.d * 0.12 } }, dur: 0.5, captionAt: 1.6 },
      { caption: "Hit the crystal and a layer can slide along by one ion. Now like charges sit side by side and repel, and the crystal splits. That's why ionic solids are hard but brittle.",
        footnote: "Melt it or dissolve it and the ions are free to move, so it conducts electricity. As a solid, the ions are locked in place and it doesn't.",
        to: { "#top": { x: SP }, "#crack": { opacity: 1, delay: 0.7 }, "#crackLab": { opacity: 1, delay: 0.7 } }, dur: 1.0 }
    ]
  });
})();
