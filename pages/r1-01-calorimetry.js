// Measuring enthalpy changes: neutralization in a polystyrene cup. Q = mcΔT, then ΔH = -Q / n.
// 50 cm3 of 1.0 mol/dm3 HCl + 50 cm3 of 1.0 mol/dm3 NaOH: the temperature rises 6.8 K.

(() => {
  const K = Kit, C = K.C;
  const T0 = 20.0, T1 = 26.8;
  const hg = T => ({ attr: { y: +(360 - (110 + (T - 20) * 10)).toFixed(1), height: +(110 + (T - 20) * 10).toFixed(1) } });
  const start = 'style="text-anchor:start"';
  const beaker = (x, label) => `<g class="pour fade"><path d="M ${x - 40} 76 L ${x - 34} 146 L ${x + 34} 146 L ${x + 40} 76" fill="#CFE8FF" stroke="var(--ink)" stroke-width="3"/>${K.t(x, 170, label, "graph-label")}</g>`;
  const heat = x => `<path d="M ${x} 215 q 9 -12 0 -24 q -9 -12 0 -24" fill="none" stroke="${C.heat}" stroke-width="4" stroke-linecap="round"/>`;

  const svg = `
    <polygon id="liquid" class="fade" points="412,250 708,250 682,390 438,390" fill="#CFE8FF"/>
    <path class="fade" d="M 400 200 L 436 398 L 684 398 L 720 200" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linejoin="round"/>
    ${beaker(490, "HCl")}${beaker(630, "NaOH")}
    <g id="heat" opacity="0">${heat(490)}${heat(560)}${heat(630)}</g>
    <rect class="fade" x="841" y="100" width="18" height="260" rx="9" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    <rect id="hg" class="fade" x="846" y="${360 - 110}" width="8" height="110" fill="${C.heat}"/>
    <circle class="fade" cx="850" cy="372" r="17" fill="${C.heat}" stroke="var(--ink)" stroke-width="3"/>
    ${K.t(850, 84, "20.0 °C", "atom-name fade", 'id="temp"')}
    <g id="c1" opacity="0">${K.t(30, 160, "Q = m × c × ΔT", "atom-name", start)}${K.t(30, 202, "= 100 g × 4.18 J g⁻¹ K⁻¹ × 6.8 K", "molecule-label", start)}${K.t(30, 240, "= 2842 J", "molecule-label", start)}</g>
    <g id="c2" opacity="0">${K.t(30, 300, "n(water made) = 0.050 mol", "molecule-label", start)}${K.t(30, 342, "ΔH = −Q ÷ n", "atom-name", start)}${K.t(30, 384, "= −2.84 kJ ÷ 0.050 mol", "molecule-label", start)}${K.t(30, 424, "= −56.9 kJ mol⁻¹", "atom-name", `${start} fill="${C.heat}"`)}</g>`;

  K.page({
    id: "calorimetry",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Measuring enthalpy changes: Q = mcΔT",
    description: "A polystyrene cup of solution with a thermometer beside it reading 20.0 degrees Celsius, and two small beakers of hydrochloric acid and sodium hydroxide on either side. Tapping mixes them: wavy heat lines rise from the cup and the thermometer climbs to 26.8 degrees, with the working Q equals m c delta T equals 2842 joules. Tapping again shows the enthalpy change per mole: minus 56.9 kilojoules per mole.",
    svg, bounds: [20, 60, 900, 440], tapLabel: "Tap to mix the solutions",
    steps: [
      { caption: "To measure the enthalpy change of a reaction, run it in an insulated cup and watch the temperature. Here 50 cm³ of 1.0 mol dm⁻³ hydrochloric acid will be mixed with 50 cm³ of 1.0 mol dm⁻³ sodium hydroxide, both at 20.0 °C.",
        footnote: "Polystyrene is a good insulator, so little heat escapes. Real experiments still lose some, which is why measured values come out a little low." },
      { caption: "The temperature rises to 26.8 °C, so the reaction gave out heat. The heat absorbed by the solution is Q = mcΔT. The 100 cm³ of solution has a mass of about 100 g, and we treat it as water.",
        booklet: "§1 equations: Q = mcΔT. §2: specific heat capacity of water, c = 4.18 J g⁻¹ K⁻¹.",
        to: { ".pour": { opacity: 0 }, "#hg": hg(T1), "#liquid": { fill: "#F5D6C6" }, "#heat": { opacity: 1, delay: 0.5 }, "#c1": { opacity: 1, delay: 0.7 } },
        text: { "#temp": "26.8 °C" }, dur: 1.4 },
      { caption: "That's the heat for 0.050 mol of acid reacting. Divide by the moles to get the enthalpy change per mole. It's negative, because the reaction lost energy to its surroundings: an exothermic reaction.",
        footnote: "The temperature rose, but ΔH is negative: ΔH describes the system, and the system lost energy.",
        to: { "#c2": { opacity: 1 } } }
    ]
  });
})();
