// Nucleophilic substitution: hydroxide attacks the δ+ carbon of bromoethane, and the C–Br bond breaks so
// that bromine takes both electrons (heterolytic fission). Curly arrows show the movement of electron pairs.

(() => {
  const K = Kit, C = K.C;
  const BR = "#9C4A2A";
  // A curly arrow: a curve with a small arrowhead on the end, following the curve's final direction.
  function curly(x1, y1, cx, cy, x2, y2) {
    const a = Math.atan2(y2 - cy, x2 - cx), h = 13;
    const p = d => `${(x2 - Math.cos(a + d) * h).toFixed(1)},${(y2 - Math.sin(a + d) * h).toFixed(1)}`;
    return `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round"/><polygon points="${x2},${y2} ${p(0.5)} ${p(-0.5)}" fill="${C.heat}"/>`;
  }
  const hAt = (id, x, y) => K.g(id, x, y, `<circle r="15" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:14px">H</text>`);
  const svg = `
    ${K.l(480, 235, 430, 300, "var(--ink)", 6, 'class="fade"')}${K.l(480, 235, 480, 320, "var(--ink)", 6, 'class="fade"')}${K.l(480, 235, 530, 300, "var(--ink)", 6, 'class="fade"')}
    ${K.l(480, 235, 640, 235, "var(--ink)", 6, 'id="cbr" class="fade"')}
    <line id="newBond" x1="352" y1="235" x2="470" y2="235" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    ${hAt("hA", 482, 330)}${hAt("hB", 536, 308)}
    ${K.atom("me", 424, 308, 30, "CH₃", C.grey)}
    ${K.atom("cc", 480, 235, 24, "C", C.grey)}
    ${K.g("br", 650, 235, `<circle r="32" fill="${BR}"/><text id="brT" class="nuc-sym" style="font-size:22px">Br</text>`)}
    ${K.g("oh", 190, 235, `<circle r="32" fill="${C.proton}"/><text id="ohT" class="nuc-sym" style="font-size:20px">OH⁻</text><circle cx="40" cy="-6" r="4.5" fill="#fff"/><circle cx="40" cy="6" r="4.5" fill="#fff"/>`)}
    <g id="dl"><g class="fade">${K.t(500, 190, "δ+", "molecule-label")}${K.t(645, 188, "δ−", "molecule-label")}</g></g>
    <g id="curly" opacity="0">${curly(238, 224, 340, 130, 448, 214)}${curly(560, 222, 606, 176, 630, 208)}</g>
    ${K.t(500, 420, "bromoethane, and hydroxide ions in solution", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "nucleophilic-substitution",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Nucleophilic substitution",
    description: "A bromoethane molecule: a grey carbon in the middle joined to a brown bromine atom on the right, a CH3 group and two hydrogens, with delta plus over the carbon and delta minus over the bromine. A red hydroxide ion approaches from the left. Tapping draws two curly arrows: one from the hydroxide's lone pair to the carbon, one from the carbon-bromine bond to the bromine. Tapping again shows the products: hydroxide now joined to the carbon as ethanol, and a bromide ion leaving.",
    svg, bounds: [140, 130, 720, 450], tapLabel: "Tap to follow the electrons",
    steps: [
      { caption: "In bromoethane the C–Br bond is polar: bromine is more electronegative, so the carbon is slightly positive (δ+). A nucleophile, a species with a lone pair to donate, is attracted to a δ+ carbon. Hydroxide ions are nucleophiles.",
        footnote: "In this drawing hydroxide comes in from the side opposite the bromine, which is where it has to attack from." },
      { caption: "Curly arrows show electrons moving. One arrow goes from hydroxide's lone pair to the carbon, forming a new C–O bond. Another goes from the C–Br bond to bromine, showing the bond breaking with both its electrons going to bromine.",
        to: { "#curly": { opacity: 1 } }, text: { "#tag": "each curly arrow is a pair of electrons moving" }, dur: 0.8 },
      { caption: "The hydroxide has replaced the bromine: ethanol and a bromide ion, Br⁻. That's nucleophilic substitution. The bond broke unevenly, one atom keeping both electrons, which is called heterolytic fission (unlike the even split in radicals).",
        to: { "#curly": { opacity: 0 }, "#dl": { opacity: 0 }, "#oh": { x: 322 }, "#newBond": { opacity: 1, delay: 1.0 }, "#br": { x: 800, y: 190 }, "#cbr": { opacity: 0 } },
        text: { "#ohT": "OH", "#brT": "Br⁻", "#tag": "ethanol, CH₃CH₂OH, and a bromide ion" }, dur: 1.4 }
    ]
  });
})();
