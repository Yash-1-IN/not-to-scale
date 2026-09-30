// Radicals: UV light splits Cl2 by homolytic fission into two chlorine radicals, which then carry a chain
// reaction with methane (propagation) until two radicals meet (termination).

(() => {
  const K = Kit, C = K.C;
  const dot = (x, y, cls) => `<circle class="${cls}" cx="${x}" cy="${y}" r="6" fill="${C.heat}" opacity="0"/>`;
  const wave = `<path d="M 500 70 l 12 12 l -24 12 l 24 12 l -24 12 l 12 12" fill="none" stroke="#6A2BD9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${K.arrow(500, 128, 500, 150, "#6A2BD9", 5)}`;
  const svg = `
    <line id="bond" class="fade" x1="420" y1="200" x2="580" y2="200" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>
    ${K.atom("cl1", 420, 200, 36, "Cl", C.product)}${K.atom("cl2", 580, 200, 36, "Cl", C.product)}
    <g id="uv" class="fade">${wave}${K.t(545, 108, "UV light", "molecule-label", 'style="text-anchor:start;fill:#6A2BD9"')}</g>
    ${dot(338, 200, "rad")}${dot(662, 200, "rad")}
    <g id="prop" opacity="0">
      ${K.t(500, 310, "Cl• + CH₄ → HCl + •CH₃", "atom-name")}${K.t(500, 358, "•CH₃ + Cl₂ → CH₃Cl + Cl•", "atom-name")}
    </g>
    <g id="term" opacity="0">
      ${K.t(500, 310, "Cl• + Cl• → Cl₂", "molecule-label")}${K.t(500, 346, "•CH₃ + •CH₃ → C₂H₆", "molecule-label")}${K.t(500, 382, "•CH₃ + Cl• → CH₃Cl", "molecule-label")}
    </g>
    ${K.t(500, 440, "chlorine molecule, Cl₂", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "radicals",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Radicals: a lone electron looking for trouble",
    description: "A chlorine molecule, two green atoms joined by a line, with a purple zigzag arrow of UV light shining on it. Tapping breaks the bond: the two atoms move apart and each gets an orange dot, an unpaired electron: chlorine radicals. Tapping again lists the two propagation steps, where a chlorine radical takes a hydrogen from methane and the resulting methyl radical takes a chlorine from another chlorine molecule, making more chlorine radicals. A last tap lists termination steps, where two radicals meet.",
    svg, bounds: [280, 60, 720, 460], tapLabel: "Tap to follow the chain reaction",
    steps: [
      { caption: "A radical is a species with an unpaired electron, which makes it very reactive. They can be made by shining UV light on a chlorine molecule, which has enough energy to break the Cl–Cl bond.",
        footnote: "The chlorination of methane in sunlight is the standard example of a radical substitution." },
      { caption: "The bond breaks evenly, with one electron going to each atom. That's homolytic fission, and it leaves two chlorine radicals, Cl•, each with an unpaired electron (shown as a dot).",
        to: { "#cl1": { x: 300 }, "#cl2": { x: 700 }, "#bond": { opacity: 0 }, "#uv": { opacity: 0 }, ".rad": { opacity: 1, delay: 0.9 } }, text: { "#tag": "two chlorine radicals, Cl•" }, dur: 1.2 },
      { caption: "Now the chain reaction. A chlorine radical takes a hydrogen atom from methane, making HCl and a methyl radical. The methyl radical then takes a chlorine atom from a chlorine molecule, making chloromethane and a new chlorine radical, which can start the cycle again. That's propagation.",
        to: { "#prop": { opacity: 1 }, ".rad": { opacity: 0 }, "#cl1": { opacity: 0 }, "#cl2": { opacity: 0 } }, text: { "#tag": "propagation: radical in, radical out" }, dur: 0.8 },
      { caption: "The chain ends when two radicals meet and pair up their electrons, leaving no radical behind. That's termination. Each of these is rare, since radicals are few and far between, so a single chain can run for thousands of cycles first.",
        to: { "#prop": { opacity: 0 }, "#term": { opacity: 1 } }, text: { "#tag": "termination: two radicals combine" }, dur: 0.8 }
    ]
  });
})();
