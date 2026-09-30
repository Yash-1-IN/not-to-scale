// What changes the rate: four cards, revealed one at a time. Concentration/pressure, temperature,
// surface area, catalyst. Each one changes how often particles collide, or how many collisions succeed.

(() => {
  const K = Kit, C = K.C, rand = K.rng(41);
  const card = (id, x, y, title, inner, note, cls) => `<g id="${id}" ${cls} >
    <rect x="${x}" y="${y}" width="400" height="170" rx="16" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    ${K.t(x + 16, y + 30, title, "atom-name", 'style="text-anchor:start;font-size:20px"')}${inner}
    ${K.t(x + 200, y + 154, note, "graph-label")}</g>`;
  const dots = (x0, y0, w, h, n) => { let s = ""; for (let i = 0; i < n; i++) s += `<circle cx="${(x0 + 8 + rand() * (w - 16)).toFixed(1)}" cy="${(y0 + 8 + rand() * (h - 16)).toFixed(1)}" r="6" fill="${C.ion}"/>`; return s; };

  // A: concentration
  const A = `<rect x="130" y="150" width="120" height="76" rx="8" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${dots(130, 150, 120, 76, 4)}
    ${K.arrow(262, 188, 310, 188, "var(--ink)", 3)}
    <rect x="322" y="150" width="120" height="76" rx="8" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${dots(322, 150, 120, 76, 14)}`;
  // B: temperature
  const B = `<circle cx="560" cy="160" r="9" fill="${C.ion}"/>${K.arrow(575, 160, 615, 160, "var(--ink)", 3)}${K.t(770, 165, "cooler: slow", "graph-label", 'style="text-anchor:start"')}
    <circle cx="560" cy="204" r="9" fill="${C.heat}"/>${K.arrow(575, 204, 735, 204, "var(--ink)", 4)}${K.t(770, 209, "hotter: fast", "graph-label", 'style="text-anchor:start"')}`;
  // C: surface area
  // The exposed surface is outlined in orange: one block has a small outline, twenty small blocks have a lot.
  let small = "";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) small += `<rect x="${326 + i * 18}" y="${350 + j * 18}" width="14" height="14" fill="${C.grey}" stroke="${C.heat}" stroke-width="2.5"/>`;
  const Cc = `<rect x="150" y="350" width="76" height="72" fill="${C.grey}" stroke="${C.heat}" stroke-width="2.5"/>${K.arrow(250, 386, 306, 386, "var(--ink)", 3)}${small}
    ${K.t(188, 342, "1 block", "graph-label")}${K.t(370, 342, "20 small blocks", "graph-label")}`;
  // D: catalyst
  const D = `<path d="M 550 420 L 590 420 Q 660 300 730 420 L 770 420" fill="none" stroke="var(--ink)" stroke-width="4"/>
    <path d="M 590 420 Q 660 372 730 420 " fill="none" stroke="${C.product}" stroke-width="4" stroke-dasharray="8 6"/>${K.t(660, 348, "Ea", "molecule-label", "")}`;

  const svg = `${card("cA", 90, 100, "concentration (pressure)", A, "more crowded: more collisions per second", 'class="fade"')}
    ${card("cB", 510, 100, "temperature", B, "faster: more collisions, and more with enough energy", 'opacity="0"')}
    ${card("cC", 90, 285, "surface area", Cc, "more surface exposed: more collisions", 'opacity="0"')}
    ${card("cD", 510, 285, "catalyst", D, "lower activation energy: more collisions succeed", 'opacity="0"')}`;

  K.page({
    id: "rate-factors",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "What changes the rate",
    description: "A two by two grid of cards. The first shows a box of a few particles beside a box of many, for concentration. Tapping reveals a card for temperature: a slow particle with a short arrow and a fast one with a long arrow. Tapping again shows a block of solid turning into many small blocks for surface area, and a last tap shows an energy hump with a lower dashed hump for a catalyst.",
    svg, bounds: [80, 90, 920, 465], tapLabel: "Tap to add the next factor",
    steps: [
      { caption: "For a reaction to happen, particles have to collide, and with enough energy. Anything that makes collisions more frequent, or makes more of them successful, speeds the reaction up. Crowd more particles into the same volume (a higher concentration, or a higher pressure for a gas) and they collide more often.",
        footnote: "Collision theory in one line: rate depends on collision frequency and on the fraction of collisions with enough energy." },
      { caption: "Raising the temperature makes particles move faster. They collide more often, and a much bigger share of the collisions have enough energy to react.",
        to: { "#cB": { opacity: 1 } } },
      { caption: "When one reactant is a solid, the reaction can only happen at its surface. Crush the solid into a powder and far more of it is exposed, so there are more collisions.",
        to: { "#cC": { opacity: 1 } } },
      { caption: "A catalyst gives the reaction another route with a lower activation energy, so a bigger share of collisions succeed. It's not used up.",
        footnote: "See the pages on collision theory, Maxwell–Boltzmann distributions and catalysts for more.",
        to: { "#cD": { opacity: 1 } } }
    ]
  });
})();
