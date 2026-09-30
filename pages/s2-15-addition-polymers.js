// Addition polymers: ethene monomers each break their C=C double bond and join end to end into
// poly(ethene). n CH2=CH2 -> (-CH2-CH2-)n

(() => {
  const K = Kit, C = K.C, Y = 235;
  const FINAL = p => 230 + p * 180, START = p => 160 + p * 230;
  const unit = x => `<circle cx="${x}" cy="0" r="26" fill="${C.grey}"/><text class="nuc-sym" x="${x}" y="0" style="font-size:16px">CH₂</text>`;
  const monomer = p => K.g("mono" + p, START(p), Y, `
    ${K.l(-45, -6, 45, -6, "var(--ink)", 5, 'class="dbl1"')}${K.l(-45, 6, 45, 6, "var(--ink)", 5, 'class="dbl2"')}
    ${unit(-45)}${unit(45)}
    <circle class="ends" cx="-82" cy="0" r="6" fill="${C.heat}" opacity="0"/><circle class="ends" cx="82" cy="0" r="6" fill="${C.heat}" opacity="0"/>`);
  const links = [0, 1, 2].map(p => K.l(FINAL(p) + 45, Y, FINAL(p + 1) - 45, Y, "var(--ink)", 5, `class="link" opacity="0"`)).join("");

  const svg = `${links}${[0, 1, 2, 3].map(monomer).join("")}
    ${K.t(500, 350, "ethene, CH₂=CH₂: four separate molecules", "atom-name fade", 'id="tag"')}
    ${K.t(500, 405, "n CH₂=CH₂  →  ( –CH₂–CH₂– )<tspan dy=\"5\" style=\"font-size:0.7em\">n</tspan>", "molecule-label", 'id="eq" opacity="0"')}`;

  K.page({
    id: "addition-polymers",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Addition polymers: monomers joining hands",
    description: "Four ethene molecules in a row, each two grey CH2 units joined by a double bond. Tapping opens each double bond into a single bond, leaving reactive orange dots at the ends. Tapping again slides the molecules together and new single bonds link them into one long chain: poly(ethene).",
    svg, bounds: [80, 170, 920, 430], tapLabel: "Tap to make the polymer",
    steps: [
      { caption: "Ethene is a small molecule with a C=C double bond. A monomer is a small molecule like this that can be joined to many others.",
        footnote: "Hydrogen atoms are left out of the drawing to keep it simple: each CH₂ has two." },
      { caption: "In addition polymerization, one bond of each double bond breaks. Each monomer is left with a reactive end at either side, ready to join to another.",
        to: { ".dbl2": { opacity: 0 }, ".dbl1": { attr: { y1: 0, y2: 0 } }, ".ends": { opacity: 1, stagger: 0.03, delay: 0.3 } }, text: { "#tag": "each double bond opens up" } },
      { caption: "The monomers link end to end with new single bonds, making one long chain: poly(ethene), or polythene. Nothing is lost: the polymer's atoms are exactly the monomers' atoms, added together, which is why it's called addition polymerization.",
        footnote: "Real chains have thousands of units, far more than fit on the page.",
        to: { "#mono0": { x: FINAL(0) }, "#mono1": { x: FINAL(1) }, "#mono2": { x: FINAL(2) }, "#mono3": { x: FINAL(3) },
              ".ends": { opacity: 0 }, ".link": { opacity: 1, delay: 1.3 }, "#eq": { opacity: 1, delay: 1.4 } },
        text: { "#tag": "poly(ethene): one long chain" }, dur: 1.5 }
    ]
  });
})();
