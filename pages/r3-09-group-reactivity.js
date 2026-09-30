// Reactivity down a group: alkali metals lose electrons more easily going down (ionization energy falls),
// halogens are weaker oxidizing agents going down (E° falls). So chlorine oxidizes bromide ions.

(() => {
  const K = Kit, C = K.C;
  const BASE = 390;
  const bars = (items, xs, colour, scale, fmt, w) => items.map(([sym, v], i) => `
    <rect x="${xs(i) - w / 2}" y="${BASE - v * scale}" width="${w}" height="${v * scale}" rx="4" fill="${colour}"/>
    ${K.t(xs(i), BASE - v * scale - 10, fmt(v), "graph-label")}${K.t(xs(i), 418, sym, "atom-name", 'style="font-size:22px"')}`).join("");
  const IE = [["Li", 520], ["Na", 496], ["K", 419], ["Rb", 403], ["Cs", 376]];
  const EO = [["F₂", 2.87], ["Cl₂", 1.36], ["Br₂", 1.09], ["I₂", 0.54]];
  const tube = (x, liquid) => `<path d="M ${x - 45} 130 L ${x - 45} 300 Q ${x - 45} 340 ${x} 340 Q ${x + 45} 340 ${x + 45} 300 L ${x + 45} 130" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path d="M ${x - 43} 200 L ${x - 43} 300 Q ${x - 43} 338 ${x} 338 Q ${x + 43} 338 ${x + 43} 300 L ${x + 43} 200 Z" fill="${liquid}"/>`;

  const svg = `
    <g id="gM" class="fade">${bars(IE, i => 210 + i * 145, C.ion, 0.5, v => v, 70)}${K.t(150, 96, "first ionization energy, kJ mol⁻¹", "graph-label", 'style="text-anchor:start"')}
      ${K.arrow(150, 444, 850, 444, C.heat, 4)}${K.t(500, 470, "easier to oxidize: more reactive down the group", "molecule-label")}</g>
    <g id="gH" opacity="0">${bars(EO, i => 250 + i * 165, C.product, 80, v => v.toFixed(2), 80)}${K.t(150, 96, "standard reduction potential, E° / V (as an oxidizing agent)", "graph-label", 'style="text-anchor:start"')}${K.arrow(150, 444, 850, 444, C.product, 4)}${K.t(500, 470, "weaker oxidizing agents down the group", "molecule-label")}</g>
    <g id="gT" opacity="0">${tube(300, "#FFFDF8")}${tube(700, "#F2A33C")}${K.arrow(400, 250, 590, 250, "var(--ink)", 4)}
      ${K.t(300, 112, "bromide ions, Br⁻(aq)", "molecule-label")}${K.t(700, 112, "orange: bromine, Br₂", "molecule-label")}${K.t(495, 232, "+ chlorine", "graph-label")}
      ${K.t(500, 405, "Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂", "atom-name")}${K.t(500, 445, "Cl₂ (1.36 V) oxidizes Br⁻ because it is a stronger oxidizing agent than Br₂ (1.09 V)", "graph-label")}</g>`;

  K.page({
    id: "group-reactivity",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Who gets oxidized? Reactivity down a group",
    description: "A bar chart of the first ionization energies of lithium, sodium, potassium, rubidium and caesium, falling steadily from 520 to 376 kilojoules per mole, with an arrow beneath. Tapping swaps it for a chart of the standard reduction potentials of fluorine, chlorine, bromine and iodine, falling from 2.87 to 0.54 volts. Tapping again shows two test tubes: colourless bromide solution, and orange bromine formed when chlorine is added.",
    svg, bounds: [120, 80, 890, 470], tapLabel: "Tap to compare the halogens",
    steps: [
      { caption: "Down group 1, the outer electron is further from the nucleus and shielded by more inner shells, so the first ionization energy falls. The metal loses its electron (is oxidized) more easily, so the alkali metals get more reactive down the group.",
        booklet: "§9 first ionization energies: Li 520, Na 496, K 419, Rb 403, Cs 376 kJ mol⁻¹." },
      { caption: "Group 17 goes the other way. A halogen is an oxidizing agent: it takes electrons. The atoms get bigger down the group, so the incoming electron is held less tightly, and the elements become weaker oxidizing agents. Fluorine is the strongest.",
        booklet: "§19: ½F₂ + e⁻ → F⁻ +2.87 V; ½Cl₂ +1.36 V; ½Br₂ +1.09 V; ½I₂ +0.54 V.",
        to: { "#gM": { opacity: 0 }, "#gH": { opacity: 1 } }, dur: 0.7 },
      { caption: "That predicts displacement reactions. Chlorine is a stronger oxidizing agent than bromine, so chlorine water added to bromide ions takes their electrons: chlorine is reduced to chloride, and bromide is oxidized to orange bromine.",
        to: { "#gH": { opacity: 0 }, "#gT": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
