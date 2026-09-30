// Concentration: the same five dots (0.50 mol of solute) in a beaker whose water level changes.
// c = n / V. Diluting spreads the dots out; boiling water away crowds them together.

(() => {
  const K = Kit, C = K.C, rand = K.rng(7);
  const BOT = 410, PX = 160;                        // canvas px per dm³ of solution
  const yOf = V => BOT - PX * V;
  const level = V => ({ y: yOf(V), height: PX * V });
  const start = 'style="text-anchor:start"';

  const dots = Array.from({ length: 5 }, (_, i) => {
    const x = 265 + rand() * 150, f = 0.15 + (i + rand() * 0.7) / 5 * 0.8;   // f: fraction of the way up the water
    return `<circle class="sol fade" cx="${x.toFixed(1)}" cy="${(BOT - f * PX).toFixed(1)}" r="8" fill="${C.heat}" data-f="${f.toFixed(3)}"/>`;
  }).join("");
  const dotY = V => (i, el) => BOT - +el.dataset.f * PX * V;
  const tick = (V, text) => `${K.l(448, yOf(V), 462, yOf(V), "var(--ink)", 2.5, 'class="fade"')}${K.t(470, yOf(V) + 5, text, "graph-label fade", start)}`;

  const svg = `
    <rect id="water" class="fade" x="243" y="${yOf(1)}" width="194" height="${PX}" fill="#CFE8FF"/>
    <path class="fade" d="M 240 80 L 240 ${BOT} L 440 ${BOT} L 440 80" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    ${dots}${tick(0.5, "0.50 dm³")}${tick(1, "1.00 dm³")}${tick(2, "2.00 dm³")}
    ${K.t(700, 175, "n = 0.50 mol", "molecule-label fade")}
    ${K.t(700, 215, "V = 1.00 dm³", "molecule-label fade", 'id="vVal"')}
    ${K.t(700, 275, "c = n ÷ V", "graph-label fade")}
    ${K.t(700, 315, "0.50 mol dm⁻³", "atom-name fade", 'id="cVal"')}`;

  K.page({
    id: "concentration",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Concentration: how crowded a solution is",
    description: "A beaker of water holding five orange dots of dissolved solute, 0.50 moles in 1.00 cubic decimetres, a concentration of 0.50 moles per cubic decimetre. Tapping adds water up to 2.00 cubic decimetres and the dots spread out, giving 0.25. Tapping again boils the water down to 0.50 cubic decimetres and the same dots crowd together, giving 1.00.",
    svg, bounds: [230, 70, 900, 420], tapLabel: "Tap to change the volume",
    steps: [
      { caption: "Here, 0.50 mol of solute is dissolved in 1.00 dm³ of solution. Concentration is the amount of solute per unit volume: c = n ÷ V, so 0.50 mol dm⁻³.",
        booklet: "§1 equations: n = C × V, so C = n ÷ V. (§4: 1 dm³ = 1 litre.)",
        footnote: "Written in square brackets, [NaCl] means the concentration of NaCl in mol dm⁻³. Other measures include molality, mole fraction and parts per million." },
      { caption: "Add water, up to 2.00 dm³, and the same amount of solute is spread through twice the volume: the concentration halves to 0.25 mol dm⁻³. This is dilution.",
        to: { "#water": { attr: level(2) }, ".sol": { attr: { cy: dotY(2) } } }, text: { "#vVal": "V = 2.00 dm³", "#cVal": "0.25 mol dm⁻³" } },
      { caption: "Now boil most of the water away, down to 0.50 dm³. The solute is still there, but crowded into a quarter of the volume: 1.00 mol dm⁻³.",
        to: { "#water": { attr: level(0.5) }, ".sol": { attr: { cy: dotY(0.5) } } }, text: { "#vVal": "V = 0.50 dm³", "#cVal": "1.00 mol dm⁻³" }, dur: 1.3 }
    ]
  });
})();
