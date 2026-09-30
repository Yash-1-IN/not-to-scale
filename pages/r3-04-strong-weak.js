// Strong and weak acids: a strong acid (HCl) ionizes completely in water; a weak acid (ethanoic acid)
// only slightly. Same concentration, very different pH. Ka(CH3COOH) = 1.8e-5 (not in the booklet).

(() => {
  const K = Kit, C = K.C, rand = K.rng(12);
  const BX = { s: 90, w: 530 };
  const part = (cls, id, x, y, r, fill, stroke) => K.g(id, x, y, `<circle r="${r}" fill="${fill}" ${stroke ? `stroke="var(--ink)" stroke-width="2"` : ""}/>`, "fade", `data-cls="${cls}"`).replace('class="fade"', `class="fade ${cls}"`);
  let s = "";
  ["s", "w"].forEach(kind => {
    for (let i = 0; i < 10; i++) {
      const x = BX[kind] + 60 + (i % 5) * 65, y = 190 + Math.floor(i / 5) * 80;
      s += part(kind + "H", kind + "H" + i, x - 9, y, 8, "#fff", true) + part(kind + "A", kind + "A" + i, x + 8, y, 16, kind === "s" ? C.product : C.heat, false);
    }
  });
  const box = x => `<rect class="fade" x="${x}" y="140" width="380" height="180" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>`;

  const svg = `${box(BX.s)}${box(BX.w)}${s}
    ${K.t(280, 116, "hydrochloric acid, HCl", "molecule-label fade")}${K.t(720, 116, "ethanoic acid, CH₃COOH", "molecule-label fade")}
    ${K.t(280, 352, "acid molecules, HA", "molecule-label fade", 'id="eqS"')}${K.t(720, 352, "acid molecules, HA", "molecule-label fade", 'id="eqW"')}
    ${K.t(500, 445, "small white: H⁺  ·  large: the rest of the acid, A⁻", "graph-label fade")}
    <g id="res" opacity="0">${K.t(280, 400, "pH 1.0 · fully ionized", "molecule-label")}${K.t(720, 400, "pH 2.9 · about 1 % ionized", "molecule-label")}</g>`;

  K.page({
    id: "strong-weak",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Strong and weak acids",
    description: "Two boxes, each with ten acid molecules drawn as a small white hydrogen ion touching a larger coloured ion: hydrochloric acid, a strong acid, on the left and ethanoic acid, a weak acid, on the right. Tapping lets them dissolve: in the strong acid every molecule splits into separate ions, but in the weak acid only one of the ten does. Tapping again shows that at the same concentration the strong acid has pH 1.0 and the weak acid pH 2.9.",
    svg, bounds: [80, 100, 920, 465], tapLabel: "Tap to dissolve the acids",
    steps: [
      { caption: "Here are ten molecules of each of two acids, in water at the same concentration, 0.10 mol dm⁻³. Each has a hydrogen it could give away as H⁺.",
        footnote: "Strong and weak describe how far an acid ionizes. That's different from concentrated and dilute, which describe how much acid is in the water." },
      { caption: "A strong acid ionizes completely: every HCl molecule splits into H⁺ and Cl⁻. A weak acid ionizes only partially: most of the ethanoic acid stays as molecules, with a few splitting into ions and reforming all the time. That's why it's written with an equilibrium arrow, ⇌.",
        to: { ".sH": { x: (i, el) => +el.dataset.x - 30, y: (i, el) => +el.dataset.y - 30, stagger: 0.05 }, ".sA": { x: (i, el) => +el.dataset.x + 26, y: (i, el) => +el.dataset.y + 22, stagger: 0.05 },
              "#wH0": { x: (i, el) => +el.dataset.x - 30, y: (i, el) => +el.dataset.y - 30, delay: 0.3 }, "#wA0": { x: (i, el) => +el.dataset.x + 26, y: (i, el) => +el.dataset.y + 22, delay: 0.3 } },
        text: { "#eqS": "HCl → H⁺ + Cl⁻", "#eqW": "CH₃COOH ⇌ H⁺ + CH₃COO⁻" }, dur: 1.1, captionAt: 1.2 },
      { caption: "So the strong acid has far more H⁺ in the same volume: at 0.10 mol dm⁻³, HCl has pH 1.0, while ethanoic acid has pH 2.9, with only about 1 % of its molecules ionized. A strong acid also reacts faster with metals and conducts electricity better.",
        footnote: "The ionization of a weak acid has an equilibrium constant, K_a, which for ethanoic acid is 1.8 × 10⁻⁵ (from tables, not the booklet).",
        to: { "#res": { opacity: 1 } } }
    ]
  });
})();
