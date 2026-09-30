// Oxidation states: the charge an atom would have if every bond were ionic. They add up to the charge on
// the species. NaCl, then H2O, then sulfate (working backwards to find sulfur's).

(() => {
  const K = Kit, C = K.C;
  const scene = (id, name, atoms, sum, hidden) => {
    const n = atoms.length;
    const cells = atoms.map(([sym, ox, fill, dark], i) => {
      const x = (i - (n - 1) / 2) * 96;
      return `<circle cx="${x}" cy="0" r="30" fill="${fill}"/><text class="nuc-sym" x="${x}" y="0" style="font-size:24px${dark ? ";fill:#1B1A22" : ""}">${sym}</text>
        ${K.t(x, -50, ox, "atom-name", `style="fill:${C.heat}"`)}`;
    }).join("");
    return K.g(id, 500, 215, `${cells}${K.t(0, -105, name, "molecule-label")}${K.t(0, 92, sum, "atom-name")}`, hidden ? "" : "fade", hidden ? 'opacity="0"' : "");
  };
  const svg = `
    ${scene("nacl", "sodium chloride, NaCl", [["Na", "+1", C.ion], ["Cl", "−1", C.product]], "(+1) + (−1) = 0", false)}
    ${scene("h2o", "water, H₂O", [["H", "+1", C.pale, true], ["H", "+1", C.pale, true], ["O", "−2", C.proton]], "2 × (+1) + (−2) = 0", true)}
    ${scene("so4", "sulfate ion, SO₄²⁻", [["S", "+6", C.heat], ["O", "−2", C.proton], ["O", "−2", C.proton], ["O", "−2", C.proton], ["O", "−2", C.proton]], "(+6) + 4 × (−2) = −2", true)}
    ${K.t(500, 400, "the oxidation states add up to the charge on the whole species", "graph-label fade", 'id="rule"')}`;

  K.page({
    id: "oxidation-states",
    topic: "Structure 3 — Classification of matter",
    title: "Oxidation states: keeping score of electrons",
    description: "Sodium chloride drawn as two discs, sodium labelled plus 1 and chlorine minus 1, adding up to 0. Tapping swaps it for water: two hydrogens at plus 1 and oxygen at minus 2, adding up to 0. Tapping again swaps it for the sulfate ion: sulfur at plus 6 and four oxygens at minus 2, adding up to minus 2, the charge on the ion.",
    svg, bounds: [280, 90, 720, 420], tapLabel: "Tap to try another compound",
    steps: [
      { caption: "An oxidation state keeps score of electrons: it's the charge an atom would have if every bond in the compound were ionic. In sodium chloride that's simply the ion charges, Na +1 and Cl −1.",
        footnote: "Oxidation states are written with the sign first: +1, not 1+. (Ion charges go the other way round: Na⁺.)" },
      { caption: "In a covalent compound, give the shared electrons to the more electronegative atom. Oxygen is more electronegative than hydrogen, so in water oxygen is −2 and each hydrogen +1: 2 × (+1) + (−2) = 0.",
        booklet: "§9 electronegativity: O 3.4, H 2.2.",
        to: { "#nacl": { opacity: 0 }, "#h2o": { opacity: 1 } }, dur: 0.7 },
      { caption: "Work backwards to find an unknown. In sulfate, four oxygens at −2 make −8, but the ion's charge is only 2−, so sulfur must be +6. The Roman numerals in names use these numbers: iron(III) means Fe in the +3 state.",
        footnote: "Exceptions: oxygen is −1 in peroxides, and hydrogen is −1 in metal hydrides, such as NaH.",
        to: { "#h2o": { opacity: 0 }, "#so4": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
