// Half-equations: zinc and copper(II) ions. Zn + Cu2+ -> Zn2+ + Cu splits into an oxidation half-equation
// and a reduction half-equation; the electrons cancel when they are added.

(() => {
  const K = Kit, C = K.C;
  const e = (id, x, y) => K.g(id, x, y, `<circle r="8" fill="${C.electron}"/>`, "fade");
  const svg = `
    ${K.g("zn", 220, 190, `<circle id="znC" r="36" fill="${C.grey}"/><text id="znT" class="nuc-sym" style="font-size:22px">Zn</text>`)}
    ${K.g("cu", 780, 190, `<circle id="cuC" r="36" fill="${C.ion}"/><text id="cuT" class="nuc-sym" style="font-size:20px">Cu²⁺</text>`)}
    ${e("e1", 275, 178)}${e("e2", 275, 204)}
    ${K.t(500, 300, "Zn + Cu²⁺ → Zn²⁺ + Cu", "atom-name fade")}
    <g id="halves" opacity="0">
      ${K.t(500, 350, "oxidation:  Zn → Zn²⁺ + 2e⁻", "molecule-label", `style="fill:${C.heat}"`)}
      ${K.t(500, 386, "reduction:  Cu²⁺ + 2e⁻ → Cu", "molecule-label", `style="fill:${C.electron}"`)}
    </g>
    ${K.t(500, 436, "", "graph-label", 'id="chk"')}`;

  K.page({
    id: "half-equations",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Half-equations",
    description: "A grey zinc atom on the left and a blue copper two plus ion on the right, with two blue electrons beside the zinc, and the overall equation below. Tapping sends the two electrons across: the zinc becomes a zinc two plus ion and the copper ion becomes a copper atom, and two half-equations appear, oxidation of zinc and reduction of copper. Tapping again adds them up: the electrons cancel and the charges balance.",
    svg, bounds: [160, 130, 840, 460], tapLabel: "Tap to move the electrons",
    steps: [
      { caption: "When zinc metal is put into a solution of copper(II) ions, a reaction happens: Zn + Cu²⁺ → Zn²⁺ + Cu. The zinc dissolves, and copper metal appears.",
        footnote: "Written as one equation it doesn't show the electrons, which are the whole point of a redox reaction." },
      { caption: "Look at what each species does. Zinc loses two electrons: that's oxidation. The copper(II) ion gains them: that's reduction. Splitting the reaction in two shows the electron transfer, and each part is a half-equation.",
        booklet: "§19 standard reduction potentials: Zn²⁺ + 2e⁻ → Zn −0.76 V; Cu²⁺ + 2e⁻ → Cu +0.34 V.",
        to: { "#e1": { x: 728, y: 178 }, "#e2": { x: 728, y: 204, delay: 0.15 }, "#halves": { opacity: 1, delay: 0.8 }, "#znC": { fill: C.ion }, "#cuC": { fill: C.heat } },
        text: { "#znT": "Zn²⁺", "#cuT": "Cu" }, dur: 1.5 },
      { caption: "Add the two half-equations together and the electrons on each side cancel out, leaving the overall equation again. Check both atoms and charge balance: 0 + 2+ on the left, 2+ + 0 on the right.",
        to: { "#e1": { opacity: 0 }, "#e2": { opacity: 0 } }, text: { "#chk": "charge: 0 + (2+) = (2+) + 0 ✓" } }
    ]
  });
})();
