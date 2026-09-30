// Double and triple bonds: more shared pairs pull the atoms closer and hold them harder.
// C-C in ethane, C=C in ethene, C≡C in ethyne. Lengths (pm) and enthalpies (kJ/mol) from the data booklet.

(() => {
  const K = Kit, C = K.C;
  const PX = 2;                                       // canvas px per pm
  const X = pm => [500 - pm * PX / 2, 500 + pm * PX / 2];
  const LINES = { // y of each of the three lines, and whether it shows, for 1, 2 and 3 shared pairs
    1: [[235, 1], [235, 0], [235, 0]],
    2: [[222, 1], [248, 1], [235, 0]],
    3: [[212, 1], [258, 1], [235, 1]]
  };
  const move = (order, pm) => {
    const [xa, xb] = X(pm), out = { "#cL": { x: xa }, "#cR": { x: xb } };
    LINES[order].forEach(([y, show], i) => { out["#ln" + i] = { attr: { x1: xa, x2: xb, y1: y, y2: y }, opacity: show }; });
    return out;
  };
  const [x0, x1] = X(154);

  const svg = `
    ${[0, 1, 2].map(i => `<line id="ln${i}" ${i === 0 ? 'class="fade"' : 'opacity="0"'} x1="${x0}" y1="235" x2="${x1}" y2="235" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>`).join("")}
    ${K.atom("cL", x0, 235, 34, "C", C.grey)}${K.atom("cR", x1, 235, 34, "C", C.grey)}
    ${K.t(500, 140, "ethane: a single bond, C–C", "atom-name fade", 'id="what"')}
    ${K.t(500, 340, "bond length 154 pm", "molecule-label fade", 'id="len"')}
    ${K.t(500, 376, "bond enthalpy 346 kJ mol⁻¹", "molecule-label fade", 'id="enth"')}`;

  K.page({
    id: "multiple-bonds",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Double and triple bonds",
    description: "Two grey carbon atoms joined by one line, a single bond, 154 picometres long with a bond enthalpy of 346 kilojoules per mole. Tapping adds a second line and the atoms move closer, 134 picometres and 614 kilojoules per mole for a double bond. Tapping again adds a third, 120 picometres and 839 kilojoules per mole for a triple bond.",
    svg, bounds: [300, 120, 700, 400], tapLabel: "Tap to share another pair",
    steps: [
      { caption: "A single bond is one shared pair of electrons. The C–C bond in ethane is 154 pm long, and it takes 346 kJ to break a mole of them.",
        booklet: "§11 bond lengths: C–C 154 pm. §12 bond enthalpies: C–C 346 kJ mol⁻¹." },
      { caption: "Share two pairs and you have a double bond, as in ethene. More shared electrons pull the atoms closer, so the bond is shorter (134 pm) and stronger (614 kJ mol⁻¹).",
        booklet: "§11: C=C 134 pm. §12: C=C 614 kJ mol⁻¹.",
        to: move(2, 134), text: { "#what": "ethene: a double bond, C=C", "#len": "bond length 134 pm", "#enth": "bond enthalpy 614 kJ mol⁻¹" } },
      { caption: "Three shared pairs make a triple bond, as in ethyne: shorter still (120 pm) and stronger still (839 kJ mol⁻¹).",
        footnote: "Notice the double bond is stronger than a single one, but not twice as strong (614 against 346). The extra pairs don't help as much as the first.",
        booklet: "§11: C≡C 120 pm. §12: C≡C 839 kJ mol⁻¹.",
        to: move(3, 120), text: { "#what": "ethyne: a triple bond, C≡C", "#len": "bond length 120 pm", "#enth": "bond enthalpy 839 kJ mol⁻¹" } }
    ]
  });
})();
