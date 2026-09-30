// Entropy and spontaneity (HL). Water: liquid -> gas has ΔH = +44 kJ and ΔS = +119 J/K/mol, so
// ΔG = ΔH − TΔS = 44 − 0.119 T (kJ) turns negative above about 370 K.
// Data booklet section 13: ΔHf H2O(l) −286, H2O(g) −242; S° H2O(l) 70, H2O(g) 189.

(() => {
  const K = Kit, C = K.C, rand = K.rng(23);
  const dots = (cx, cy, w, h, n, id) => {
    let s = "";
    for (let i = 0; i < n; i++) s += `<circle cx="${(cx - w / 2 + rand() * w).toFixed(1)}" cy="${(cy - h / 2 + rand() * h).toFixed(1)}" r="7" fill="${C.ion}"/>`;
    return s;
  };
  const gx = T => 200 + (T - 250) * 3, gy = g => 300 - g * 8;
  const dG = T => 44 - 0.119 * T;
  const start = 'style="text-anchor:start"';

  const svg = `
    <g id="ent">
      <rect class="fade" x="140" y="150" width="200" height="130" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>${dots(240, 215, 170, 100, 14)}
      <rect class="fade" x="440" y="110" width="360" height="210" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>${dots(620, 215, 320, 175, 14)}
      ${K.t(240, 115, "liquid water", "atom-name fade", 'style="font-size:20px"')}${K.t(620, 100, "steam", "atom-name fade", 'style="font-size:20px"')}
      ${K.t(240, 315, "S = 70 J K⁻¹ mol⁻¹", "molecule-label fade")}${K.t(620, 345, "S = 189 J K⁻¹ mol⁻¹", "molecule-label fade")}
      ${K.t(500, 405, "the same 14 particles: far more ways to be arranged as a gas", "graph-label fade")}
    </g>
    <g id="calc" opacity="0">
      ${K.t(500, 448, "ΔH = −242 − (−286) = +44 kJ mol⁻¹     ΔS = 189 − 70 = +119 J K⁻¹ mol⁻¹", "molecule-label")}
    </g>
    <g id="graph" opacity="0">
      ${K.arrow(190, 300, 830, 300, "var(--ink)", 3)}${K.arrow(200, 320, 200, 120, "var(--ink)", 3)}
      ${K.t(840, 330, "T / K", "graph-label", start)}${K.t(206, 112, "ΔG / kJ mol⁻¹", "graph-label", start)}
      ${K.t(gx(300), 322, "300", "graph-label")}${K.t(gx(400), 322, "400", "graph-label")}
      <path d="M ${gx(250)} ${gy(dG(250))} L ${gx(450)} ${gy(dG(450))}" stroke="${C.heat}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="${gx(370)}" y="302" width="${gx(450) - gx(370)}" height="70" fill="${C.product}" opacity="0.18"/>
      ${K.t((gx(370) + gx(450)) / 2, 394, "ΔG < 0: spontaneous", "molecule-label")}
      <circle cx="${gx(369.7)}" cy="300" r="7" fill="${C.heat}"/>${K.t(gx(369.7), 285, "≈ 370 K", "molecule-label")}
      ${K.t(gx(258), gy(dG(258)) - 14, "ΔG = ΔH − TΔS", "molecule-label", start)}
    </g>`;

  K.page({
    id: "entropy",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Entropy and spontaneity",
    description: "Two boxes with the same fourteen particles: in liquid water they are close together, entropy 70, and in steam they are spread through a bigger box, entropy 189. Tapping shows the enthalpy and entropy changes for turning the liquid into steam. Tapping again replaces the boxes with a graph of free energy change against temperature: a falling straight line that crosses zero at about 370 kelvin, with the region beyond that labelled spontaneous.",
    svg, bounds: [120, 90, 850, 440], tapLabel: "Tap to see when it's spontaneous",
    steps: [
      { caption: "Entropy, S, is a measure of how spread out the energy and particles are: the number of ways they can be arranged. Gases have much higher entropy than liquids, and liquids more than solids. Nature tends to favour more entropy.",
        booklet: "§13 thermodynamic data: S⦵ of H₂O(l) 70, H₂O(g) 189 J K⁻¹ mol⁻¹." },
      { caption: "Turning liquid water into steam takes energy in (ΔH is positive, +44 kJ mol⁻¹, which works against it), but entropy increases a lot (+119 J K⁻¹ mol⁻¹, which favours it). Which wins depends on the temperature.",
        booklet: "§13: ΔH_f H₂O(l) −286, H₂O(g) −242 kJ mol⁻¹.",
        to: { "#calc": { opacity: 1 } } },
      { caption: "The Gibbs free energy change, ΔG = ΔH − TΔS, combines them. A reaction is spontaneous when ΔG is negative. For evaporation, ΔG is positive at low temperatures and turns negative above about 370 K (97 °C), close to water's real boiling point.",
        footnote: "Spontaneous means it can happen without a continuous push, not that it happens fast: a spontaneous reaction can still be very slow.",
        booklet: "§1: ΔG⦵ = ΔH⦵ − TΔS⦵.",
        to: { "#ent": { opacity: 0 }, "#calc": { opacity: 0 }, "#graph": { opacity: 1, delay: 0.3 } }, dur: 0.8 }
    ]
  });
})();
