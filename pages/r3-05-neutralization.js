// Neutralization: HCl + NaOH -> NaCl + H2O. The ionic equation is H+ + OH- -> H2O; Na+ and Cl- are
// spectators that don't change.

(() => {
  const K = Kit, C = K.C;
  const N = 5;
  const ionG = (cls, sym, r, fill, sx, sy, mx, my, px, py, dark) =>
    K.g("", sx, sy, `<circle class="${cls}C" r="${r}" fill="${fill}" ${dark ? `stroke="var(--ink)" stroke-width="2"` : ""}/><text class="nuc-sym ${cls}T" style="font-size:${r > 15 ? 13 : 12}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text>`, "fade " + cls, `data-mx="${mx}" data-my="${my}" data-px="${px}" data-py="${py}"`);
  // Grid positions keep every ion (and its label) clear of the others: each kind has its own row in the acid
  // beaker, the alkali beaker, and the mixed beaker. The hydroxide ions sit under the hydrogen ions when mixed.
  const mixX = i => 360 + 55 * i, ROW = { h: [215, 200], cl: [290, 284], na: [215, 326], oh: [290, 242] };
  let ions = "";
  for (let i = 0; i < N; i++) {
    ions += ionG("h", "H⁺", 14, "#fff", 130 + 65 * i, ROW.h[0], mixX(i), ROW.h[1], mixX(i), ROW.h[1], true);
    ions += ionG("cl", "Cl⁻", 19, C.product, 130 + 65 * i, ROW.cl[0], mixX(i), ROW.cl[1], 0, 0);
    ions += ionG("na", "Na⁺", 17, C.ion, 610 + 65 * i, ROW.na[0], mixX(i), ROW.na[1], 0, 0);
    ions += ionG("oh", "OH⁻", 19, C.proton, 610 + 65 * i, ROW.oh[0], mixX(i), ROW.oh[1], mixX(i), ROW.h[1], false);
  }
  const beaker = (x0, x1, id, cls) => `<path id="${id}" ${cls ? `class="${cls}"` : 'opacity="0"'} d="M ${x0} 130 L ${x0 + 10} 350 L ${x1 - 10} 350 L ${x1} 130" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>`;

  const svg = `${beaker(100, 420, "bA", "fade")}${beaker(580, 900, "bB", "fade")}${beaker(320, 680, "bM", "")}
    ${ions}
    ${K.t(260, 116, "hydrochloric acid", "molecule-label fade", 'id="tA"')}${K.t(740, 116, "sodium hydroxide", "molecule-label fade", 'id="tB"')}${K.t(500, 116, "the two solutions, mixed", "molecule-label", 'id="tM" opacity="0"')}
    ${K.t(500, 396, "HCl + NaOH → NaCl + H₂O", "atom-name fade", 'id="eq"')}${K.t(500, 436, "acid + alkali → salt + water", "graph-label fade", 'id="eq2"')}`;

  K.page({
    id: "neutralization",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Neutralization",
    description: "Two beakers: hydrochloric acid on the left with white hydrogen ions and green chloride ions, and sodium hydroxide on the right with grey sodium ions and red hydroxide ions. Tapping pours them together into one beaker where the ions mix. Tapping again pairs each hydrogen ion with a hydroxide ion to make a water molecule, while the sodium and chloride ions stay unchanged as spectators.",
    svg, bounds: [80, 100, 920, 465], tapLabel: "Tap to mix the solutions",
    steps: [
      { caption: "Hydrochloric acid is full of H⁺ and Cl⁻ ions. Sodium hydroxide, an alkali, is full of Na⁺ and OH⁻ ions.",
        footnote: "Acids also neutralize metal oxides and carbonates (making a salt and water, and with carbonates, carbon dioxide too)." },
      { caption: "Mix them and all four kinds of ion are together in one solution.",
        to: { "#bA": { opacity: 0 }, "#bB": { opacity: 0 }, "#bM": { opacity: 1 }, "#tA": { opacity: 0 }, "#tB": { opacity: 0 }, "#tM": { opacity: 1 }, ".h, .cl, .na, .oh": { x: (i, el) => +el.dataset.mx, y: (i, el) => +el.dataset.my, stagger: 0.03 } },
        dur: 1.4 },
      { caption: "Each H⁺ meets an OH⁻ and they join to make a water molecule: H⁺ + OH⁻ → H₂O. That's the whole neutralization reaction. The Na⁺ and Cl⁻ ions don't change: they're spectator ions, left dissolved as the salt, sodium chloride.",
        footnote: "Neutralization is exothermic: about −57 kJ per mole of water made, the same for any strong acid and strong alkali (see the calorimetry page).",
        to: { ".oh": { x: (i, el) => +el.dataset.px, y: (i, el) => +el.dataset.py }, ".ohC": { fill: "#4D94E8" }, ".h": { opacity: 0, delay: 0.6 } },
        text: { ".ohT": "H₂O", "#eq2": "H⁺ + OH⁻ → H₂O   (Na⁺ and Cl⁻ are spectators)" }, dur: 1.4 }
    ]
  });
})();
