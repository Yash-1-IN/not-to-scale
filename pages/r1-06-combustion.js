// Combustion of methane, complete and incomplete. Plenty of oxygen: CO2 + H2O and a blue flame. Too little:
// carbon monoxide and soot too, a yellow flame, and less energy released.
// ΔH (methane -> CO + 2H2O(l)) = -111 + 2(-286) - (-74) = -609 kJ/mol from data booklet section 13.

(() => {
  const K = Kit, C = K.C;
  const flame = (id, w, h, fill, extra = "") =>
    `<path id="${id}" d="M 0 0 C ${-w} 0 ${-w} ${-h * 0.5} 0 ${-h} C ${w} ${-h * 0.5} ${w} 0 0 0 Z" fill="${fill}" ${extra}/>`;
  const soot = Array.from({ length: 8 }, (_, i) => `<circle class="soot" cx="${262 + (i % 4) * 26}" cy="${186 - i * 12}" r="${4 + (i % 2) * 2}" fill="#3a3540" opacity="0"/>`).join("");
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.g("burner", 300, 330, `<rect x="-14" y="0" width="28" height="80" fill="${C.grey}"/><rect x="-40" y="76" width="80" height="16" rx="6" fill="${C.grey}"/><rect id="airHole" x="-14" y="30" width="28" height="18" fill="#FFFDF8" stroke="var(--ink)" stroke-width="2"/>
      ${flame("outer", 34, 130, "#4D94E8")}${flame("inner", 16, 70, "#9CC8FF")}`)}
    ${soot}
    ${K.t(300, 452, "air hole open: plenty of oxygen", "molecule-label fade", 'id="air"')}
    <g class="fade">
      ${K.t(470, 130, "products:", "graph-label", start)}
      ${K.t(470, 168, "CO₂ + H₂O", "atom-name", 'id="prods" ' + start)}
      ${K.t(470, 214, "CH₄ + 2O₂ → CO₂ + 2H₂O", "molecule-label", 'id="eqn" ' + start)}
      ${K.t(470, 260, "energy released  891 kJ per mole", "molecule-label", 'id="en" ' + start)}
    </g>`;

  K.page({
    id: "combustion",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Combustion, complete and incomplete",
    description: "A gas burner with a blue flame and its air hole open, with the products carbon dioxide and water and the equation for methane burning listed on the right. Tapping closes the air hole: the flame turns yellow, soot particles appear, and the products change to include carbon monoxide and carbon, with less energy released per mole.",
    svg, bounds: [220, 90, 900, 470], tapLabel: "Tap to close the air hole",
    idle() { gsap.to("#outer", { scaleY: 1.06, svgOrigin: "0 0", duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 }); },
    steps: [
      { caption: "Combustion is a fuel reacting with oxygen and releasing energy. With plenty of oxygen, a hydrocarbon burns completely: all its carbon becomes carbon dioxide and all its hydrogen becomes water. The flame is blue.",
        footnote: "Every combustion reaction is exothermic.",
        booklet: "§14 enthalpies of combustion: methane −891 kJ mol⁻¹." },
      { caption: "Close the air hole and there isn't enough oxygen for all the carbon to become CO₂. Some ends up as carbon monoxide, CO, and some as tiny bits of carbon: soot. The flame goes yellow and smoky, and less energy is released.",
        footnote: "Carbon monoxide is colourless, odourless and toxic: it binds to haemoglobin in your blood in place of oxygen. Faulty gas heaters that burn incompletely can be deadly.",
        booklet: "§13: CH₄ −74, CO −111, H₂O(l) −286 kJ mol⁻¹, so making CO gives ΔH = −111 + 2(−286) − (−74) = −609 kJ mol⁻¹.",
        to: { "#outer": { fill: "#F2C230" }, "#inner": { fill: "#F7DF7A" }, "#airHole": { attr: { height: 2, y: 46 } }, ".soot": { opacity: 0.8, stagger: 0.12, delay: 0.5 } },
        text: { "#air": "air hole closed: not enough oxygen", "#prods": "CO + C + H₂O (and some CO₂)", "#eqn": "2CH₄ + 3O₂ → 2CO + 4H₂O", "#en": "energy released  609 kJ per mole" }, dur: 1.1 }
    ]
  });
})();
