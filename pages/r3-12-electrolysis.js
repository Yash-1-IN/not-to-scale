// Electrolysis of molten sodium chloride: a power supply forces a non-spontaneous reaction.
// Cathode (−): Na+ + e− -> Na (reduction). Anode (+): 2Cl− -> Cl2 + 2e− (oxidation).

(() => {
  const K = Kit, C = K.C;
  // A checkerboard of ions in the melt (so no two labels overlap), each with its final place beside an electrode.
  let ions = "", nn = 0, cn = 0;
  for (let k = 0; k < 12; k++) {
    const col = k % 4, row = Math.floor(k / 4), x = 410 + col * 60, y = 270 + row * 50;
    if ((col + row) % 2 === 0) {
      ions += K.g("", x, y, `<circle r="15" fill="${C.ion}"/><text class="nuc-sym" style="font-size:12px">Na⁺</text>`, "fade na", `data-fx="${372 + (nn % 2) * 36}" data-fy="${270 + Math.floor(nn / 2) * 44}"`); nn++;
    } else {
      ions += K.g("", x, y, `<circle r="18" fill="${C.product}"/><text class="nuc-sym" style="font-size:12px">Cl⁻</text>`, "fade cl", `data-fx="${628 - (cn % 2) * 36}" data-fy="${270 + Math.floor(cn / 2) * 44}"`); cn++;
    }
  }
  const svg = `
    <path class="fade" d="M 300 230 L 312 430 L 688 430 L 700 230" fill="#F8E7C7" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <rect class="fade" x="338" y="200" width="22" height="200" fill="${C.grey}"/><rect class="fade" x="640" y="200" width="22" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 349 200 L 349 110 L 450 110 M 550 110 L 651 110 L 651 200" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="fade">${K.l(450, 84, 450, 136, "var(--ink)", 6)}${K.l(472, 96, 472, 124, "var(--ink)", 6)}${K.l(500, 84, 500, 136, "var(--ink)", 6)}${K.l(522, 96, 522, 124, "var(--ink)", 6)}${K.l(472, 110, 500, 110, "var(--ink)", 3)}${K.l(522, 110, 550, 110, "var(--ink)", 3)}</g>
    ${K.t(435, 78, "−", "atom-name fade", 'style="font-size:30px"')}${K.t(565, 78, "+", "atom-name fade", 'style="font-size:30px"')}
    ${ions}
    <g id="products" opacity="0">
      <ellipse cx="349" cy="404" rx="30" ry="10" fill="#B8BEC6" stroke="var(--ink)" stroke-width="2"/>
      ${[0, 1, 2, 3].map(i => `<circle cx="${640 + (i % 2) * 24}" cy="${190 - i * 12}" r="8" fill="#fff" stroke="${C.product}" stroke-width="3"/>`).join("")}
    </g>
    ${K.t(349, 172, "cathode", "molecule-label fade")}${K.t(651, 172, "anode", "molecule-label fade")}
    ${K.t(500, 460, "molten sodium chloride: Na⁺ and Cl⁻ ions", "graph-label fade", 'id="tag"')}
    <g id="eqs" opacity="0">
      ${K.t(175, 240, "Na⁺ + e⁻ → Na", "molecule-label", 'style="fill:#0B44A8"')}${K.t(175, 268, "reduction", "graph-label")}
      ${K.t(830, 240, "2Cl⁻ → Cl₂ + 2e⁻", "molecule-label", 'style="fill:#E05A2B"')}${K.t(830, 268, "oxidation", "graph-label")}
    </g>`;

  K.page({
    id: "electrolysis",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Electrolysis: pushing a reaction uphill",
    description: "A beaker of molten sodium chloride with two electrodes joined over the top to a power supply, negative on the left and positive on the right, with grey sodium ions and green chloride ions moving about in the melt. Tapping switches the current on: sodium ions drift towards the negative cathode and chloride ions to the positive anode. Tapping again shows the products: a blob of sodium metal at the cathode and bubbles of chlorine at the anode, with the half-equations at each.",
    svg, bounds: [140, 60, 860, 480], tapLabel: "Tap to switch on the current",
    steps: [
      { caption: "Sodium chloride melts at a high temperature, and molten NaCl is full of free-moving Na⁺ and Cl⁻ ions. On its own nothing happens. Now put two electrodes in the melt and connect them to a power supply.",
        footnote: "An electrolytic cell is the opposite of the cells before it: electrical energy drives a non-spontaneous reaction, instead of a spontaneous reaction making electricity." },
      { caption: "The power supply makes one electrode negative and the other positive. Opposite charges attract: the positive Na⁺ ions (cations) drift towards the negative electrode, the cathode, and the negative Cl⁻ ions (anions) towards the positive electrode, the anode.",
        to: { ".na": { x: (i, el) => +el.dataset.fx, y: (i, el) => +el.dataset.fy, stagger: 0.06 }, ".cl": { x: (i, el) => +el.dataset.fx, y: (i, el) => +el.dataset.fy, stagger: 0.06 } }, dur: 1.4,
        text: { "#tag": "ions drift to the electrode of opposite charge" } },
      { caption: "At the cathode, sodium ions gain electrons (reduction) and turn into sodium metal. At the anode, chloride ions lose electrons (oxidation) and become chlorine gas. Reduction at the cathode, oxidation at the anode, as always.",
        footnote: "The reaction is driven uphill: it needs a voltage of at least about 4.07 V, from the difference between the two electrode potentials.",
        booklet: "§19: Na⁺ + e⁻ → Na −2.71 V; ½Cl₂ + e⁻ → Cl⁻ +1.36 V.",
        to: { "#products": { opacity: 1 }, "#eqs": { opacity: 1, delay: 0.3 } }, text: { "#tag": "sodium at the cathode, chlorine at the anode" } }
    ]
  });
})();
