// Expanded octets and formal charge (HL): sulfate, SO4 2-. Structure A obeys the octet rule but leaves
// S with +2 and each O with -1. Structure B expands sulfur's octet to 12 electrons and gets every formal
// charge closer to zero, so it is preferred.
// Formal charge = valence electrons - non-bonding electrons - half the bonding electrons.

(() => {
  const K = Kit, C = K.C, D = 95;
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];          // top, right, bottom, left oxygens
  const fcTxt = (id, x, y, s) => K.t(x, y, s, "molecule-label", `id="${id}" style="fill:${C.heat}"`);
  const oxy = i => {
    const [dx, dy] = dirs[i], x = dx * D, y = dy * D;
    return `${K.l(0, 0, x, y, "var(--ink)", 5, `id="sb${i}"`)}
      <g id="dbl${i}" opacity="0">${K.l(dy * 7, -dx * 7, x + dy * 7, y - dx * 7, "var(--ink)", 4, "")}${K.l(-dy * 7, dx * 7, x - dy * 7, y + dx * 7, "var(--ink)", 4, "")}</g>`;
  };
  const oAtoms = i => { const [dx, dy] = dirs[i]; return `<circle cx="${dx * D}" cy="${dy * D}" r="24" fill="${C.proton}"/><text class="nuc-sym" x="${dx * D}" y="${dy * D}" style="font-size:20px">O</text>`; };
  const charges = [[0, -D - 44], [D + 46, 0], [0, D + 52], [-D - 46, 0]];

  const mol = [0, 1, 2, 3].map(oxy).join("") + [0, 1, 2, 3].map(oAtoms).join("") +
    `<circle r="30" fill="${C.heat}"/><text class="nuc-sym" style="font-size:24px">S</text>` +
    fcTxt("fcS", 46, -34, "+2") + charges.map(([x, y], i) => fcTxt("fcO" + i, x, y + 5, "−1")).join("");

  const svg = `${K.g("sulfate", 500, 195, mol)}
    ${K.t(500, 405, "sulfate ion, SO₄²⁻: every bond single", "atom-name fade", 'id="what"')}
    ${K.t(500, 445, "S: 6 − 0 − 4 = +2   ·   each O: 6 − 6 − 1 = −1", "molecule-label fade", 'id="sums"')}`;

  K.page({
    id: "formal-charge",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Expanded octets and formal charge",
    description: "A sulfate ion: an orange sulfur atom in the middle joined by single lines to four red oxygen atoms, each labelled with a formal charge: plus 2 on sulfur and minus 1 on each oxygen. Tapping turns the top and bottom bonds into double bonds, and the formal charges change to 0 on sulfur and the top and bottom oxygens, and minus 1 on the other two oxygens, which is closer to zero and so the preferred structure.",
    svg, bounds: [300, 30, 700, 460], tapLabel: "Tap to expand sulfur's octet",
    steps: [
      { caption: "Sulfate can be drawn with sulfur following the octet rule: eight electrons around it, four single bonds. But work out each atom's formal charge and it looks strained: +2 on sulfur, −1 on every oxygen.",
        footnote: "Formal charge = valence electrons − non-bonding electrons − half the bonding electrons. It's a bookkeeping tool, not a real charge on the atom." },
      { caption: "Atoms in period 3 and below can hold more than eight electrons: an expanded octet. Give sulfur two double bonds, 12 electrons in all, and the formal charges drop to 0 on sulfur and on the double-bonded oxygens, and −1 on two oxygens. Formal charges closest to zero mark the preferred structure.",
        footnote: "Real sulfate is a resonance hybrid: all four S–O bonds are identical, in between these drawings.",
        to: { "#dbl0": { opacity: 1 }, "#dbl2": { opacity: 1 }, "#sb0": { opacity: 0 }, "#sb2": { opacity: 0 } },
        text: { "#fcS": "0", "#fcO0": "0", "#fcO2": "0", "#what": "sulfate ion, SO₄²⁻: two double bonds",
                "#sums": "S: 6 − 0 − 6 = 0 · double-bonded O: 6 − 4 − 2 = 0 · single-bonded O: −1" } }
    ]
  });
})();
