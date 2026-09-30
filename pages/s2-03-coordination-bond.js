// A coordination bond: ammonia's lone pair reaches out to a hydrogen ion, supplying both electrons of the
// new bond. Afterwards, all four N-H bonds in NH4+ are identical.

(() => {
  const K = Kit, C = K.C;
  const H = (x, y, id = "") => `<g ${id ? `id="${id}"` : ""} class="fade" data-x="${x}" data-y="${y}"><circle r="20" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:18px">H</text></g>`;
  const bond = (x, y, extra = 'class="fade"') => K.l(450, 240, x, y, "var(--ink)", 5, extra);

  const svg = `
    ${bond(360, 300)}${bond(540, 300)}${bond(450, 340)}
    <line id="newBond" x1="450" y1="240" x2="450" y2="146" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" opacity="0"/>
    ${H(360, 300)}${H(540, 300)}${H(450, 340)}
    ${K.atom("nAtom", 450, 240, 32, "N", C.electron)}
    <g id="pair" class="fade"><circle cx="441" cy="188" r="5" fill="${C.electron}"/><circle cx="459" cy="188" r="5" fill="${C.electron}"/></g>
    ${K.g("hPlus", 760, 110, `<circle r="20" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><text class="h-plus-label" style="font-size:15px">H⁺</text>`)}
    <g id="giveArrow" opacity="0">${K.arrow(450, 180, 450, 148, C.heat, 4)}</g>
    ${K.t(555, 165, "+", "atom-name", 'id="plus" opacity="0" style="font-size:38px"')}
    ${K.t(500, 445, "ammonia, NH₃, and a hydrogen ion, H⁺", "graph-label fade", 'id="tag"')}`;

  K.page({
    id: "coordination-bond",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Coordination bonds: one atom brings both electrons",
    description: "A blue nitrogen atom joined to three small grey hydrogen atoms, with a pair of blue dots, a lone pair, above it. A hydrogen ion, H plus, sits off to the top right. Tapping moves the hydrogen ion above the lone pair and an orange arrow shows the pair being donated. Tapping again draws a fourth bond and a plus sign: an ammonium ion, NH4 plus, with four identical bonds.",
    svg, bounds: [330, 90, 800, 460], tapLabel: "Tap to bring in the hydrogen ion",
    steps: [
      { caption: "Ammonia, NH₃, has a lone pair: two of nitrogen's outer electrons that aren't used in bonding. A hydrogen ion, H⁺, has no electrons at all, so it has an empty space for a pair.",
        footnote: "H⁺ is just a bare proton. Hydrogen loses its one electron to become an ion." },
      { caption: "The lone pair swings round to make a bond. Both electrons of this new bond come from nitrogen. A bond where one atom supplies both electrons is called a coordination bond (or dative covalent bond).",
        to: { "#hPlus": { x: 450, y: 118 }, "#giveArrow": { opacity: 1, delay: 0.9 } }, text: { "#tag": "the lone pair forms a coordination bond" }, dur: 1.1 },
      { caption: "Once it's formed, NH₄⁺ has four N–H bonds that are all identical. You couldn't tell which one was the coordination bond. The whole ion carries a 1+ charge.",
        to: { "#newBond": { opacity: 1 }, "#pair": { opacity: 0 }, "#giveArrow": { opacity: 0 }, "#plus": { opacity: 1, delay: 0.3 } }, text: { "#tag": "the ammonium ion, NH₄⁺" } }
    ]
  });
})();
