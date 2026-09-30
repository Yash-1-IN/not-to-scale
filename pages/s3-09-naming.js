// IUPAC naming, using a three-carbon chain: the stem counts carbons, the ending shows the functional group,
// and a number says which carbon it's on.

(() => {
  const K = Kit, C = K.C;
  const P = [[340, 290], [500, 200], [660, 290]];
  const badge = (x, y, n) => `<g class="num" opacity="0"><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x, y + 5, n, "graph-label")}</g>`;
  const STEMS = ["1 carbon: meth-", "2: eth-", "3: prop-", "4: but-", "5: pent-", "6: hex-"];

  const svg = `
    <polyline class="fade" points="${P.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    ${K.l(340, 290, 272, 336, "var(--ink)", 7, 'id="bond1" opacity="0"')}${K.t(244, 362, "OH", "atom-name", 'id="oh1" opacity="0" style="fill:#D2352C"')}
    ${K.l(500, 200, 500, 132, "var(--ink)", 7, 'id="bond2" opacity="0"')}${K.t(500, 112, "OH", "atom-name", 'id="oh2" opacity="0" style="fill:#D2352C"')}
    ${badge(340, 336, 1)}${badge(500, 246, 2)}${badge(660, 336, 3)}
    <g class="stems fade">${STEMS.map((s, i) => K.t(770, 130 + i * 26, s, "graph-label", 'style="text-anchor:start"')).join("")}</g>
    ${K.t(500, 440, "prop-", "atom-name", 'id="name" style="font-size:40px"')}`;

  K.page({
    id: "naming",
    topic: "Structure 3 — Classification of matter",
    title: "Naming organic compounds",
    description: "A skeletal three-carbon chain, with a list of stems on the right: meth, eth, prop, but, pent, hex for one to six carbons. Tapping numbers the carbons 1, 2 and 3 and names the chain propane. Tapping again adds an OH group on carbon 1, making propan-1-ol. Tapping again moves the OH to carbon 2, making propan-2-ol, a different compound.",
    svg, bounds: [220, 90, 900, 460], tapLabel: "Tap to name the molecule",
    steps: [
      { caption: "Organic names are built from parts. The first part, the stem, counts the carbons in the longest chain: this chain has three, so its stem is prop-.",
        footnote: "IUPAC nomenclature is the international system, so every compound has one agreed name." },
      { caption: "The ending shows the family. With only single bonds between carbons it's an alkane, ending in -ane: prop + ane = propane. Number the carbons from one end.",
        to: { ".num": { opacity: 1, stagger: 0.15 } }, text: { "#name": "propane" } },
      { caption: "Add an –OH group and it's an alcohol, ending in -ol. The number says which carbon it's attached to: this OH is on carbon 1, so the name is propan-1-ol.",
        to: { "#bond1": { opacity: 1 }, "#oh1": { opacity: 1 } }, text: { "#name": "propan-1-ol" } },
      { caption: "Move the OH to the middle carbon and you get propan-2-ol: a different compound with different properties, even though the formula, C₃H₈O, hasn't changed. That's why the number matters.",
        to: { "#bond1": { opacity: 0 }, "#oh1": { opacity: 0 }, "#bond2": { opacity: 1, delay: 0.3 }, "#oh2": { opacity: 1, delay: 0.3 } }, text: { "#name": "propan-2-ol" } }
    ]
  });
})();
