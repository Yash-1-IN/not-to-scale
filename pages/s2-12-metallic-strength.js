// What makes a metallic bond strong: more delocalized electrons per atom, and a smaller ion.
// Na (1 electron, 102 pm ion) -> Mg (2, 72 pm) -> Al (3, 54 pm). Melting points from the data booklet.

(() => {
  const K = Kit, C = K.C, rand = K.rng(17);
  const GX = (j) => 350 + j * 100, GY = i => 150 + i * 100;
  const ions = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ions.push(`<circle class="mion fade" cx="${GX(j)}" cy="${GY(i)}" r="28" fill="${C.ion}"/>`);
  // 27 electrons scattered between the ions; the first 9 always show, then 9 more, then the last 9.
  let e = "";
  for (let n = 0; n < 27; n++) {
    const x = 305 + rand() * 390, y = 105 + rand() * 290;
    e += `<circle class="${n < 9 ? "fade" : "e" + (n < 18 ? 2 : 3)}" ${n < 9 ? "" : 'opacity="0"'} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${C.electron}"/>`;
  }
  const svg = `${ions.join("")}${e}
    ${K.t(500, 68, "sodium: Na⁺ ions, 1 electron each", "atom-name fade", 'id="metal"')}
    ${K.t(840, 215, "melting point", "graph-label fade")}${K.t(840, 255, "98 °C", "atom-name fade", 'id="mp"')}
    ${K.t(500, 440, "ion radius 102 pm", "molecule-label fade", 'id="rad"')}`;

  K.page({
    id: "metallic-strength",
    topic: "Structure 2 — Models of bonding and structure",
    title: "What makes a metallic bond strong",
    description: "A three by three grid of blue positive ions with small blue electrons scattered between them, labelled sodium, one electron each, melting point 98 degrees Celsius. Tapping changes it to magnesium: the ions shrink, twice as many electrons appear, and the melting point rises to 650 degrees. Tapping again changes it to aluminium: smaller ions, three electrons each, melting point 660 degrees.",
    svg, bounds: [280, 40, 900, 460], tapLabel: "Tap to move across the period",
    steps: [
      { caption: "A metallic bond is the attraction between positive metal ions and the sea of delocalized electrons around them. Sodium gives just one electron per atom to the sea, and its ions are relatively big. The bond is weak, and sodium melts at only 98 °C.",
        booklet: "§8 melting points: Na 97.79 °C. §10 ionic radius: Na⁺ 102 pm." },
      { caption: "Magnesium gives two electrons per atom, and its ion is smaller and carries a 2+ charge. More electrons in the sea, more charge, and ions that get closer to it: a much stronger attraction, and a melting point of 650 °C.",
        booklet: "§8: Mg 650.0 °C. §10: Mg²⁺ 72 pm.",
        to: { ".mion": { attr: { r: 20 } }, ".e2": { opacity: 1, stagger: 0.04 } }, text: { "#metal": "magnesium: Mg²⁺ ions, 2 electrons each", "#mp": "650 °C", "#rad": "ion radius 72 pm" } },
      { caption: "Aluminium gives three electrons per atom and has a smaller ion again: the strongest metallic bond of the three, and the highest melting point, 660 °C.",
        footnote: "Transition elements do even better: their d electrons join the sea too, which is why many transition metals melt at very high temperatures.",
        booklet: "§8: Al 660.3 °C. §10: Al³⁺ 54 pm.",
        to: { ".mion": { attr: { r: 15 } }, ".e3": { opacity: 1, stagger: 0.04 } }, text: { "#metal": "aluminium: Al³⁺ ions, 3 electrons each", "#mp": "660 °C", "#rad": "ion radius 54 pm" } }
    ]
  });
})();
