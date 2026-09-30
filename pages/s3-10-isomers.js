// Structural isomers: same molecular formula, different structures. Butane and 2-methylpropane (C4H10)
// differ in shape; ethanol and methoxymethane (C2H6O) differ in functional group.

(() => {
  const K = Kit, C = K.C;
  const zig = (pts, extra = "") => `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const lab = (t, f, bp) => `${K.t(0, 118, t + ", " + f, "molecule-label")}${K.t(0, 148, bp, "graph-label")}`;
  const o = (x, y, s) => K.t(x, y, s, "atom-name", 'style="fill:#D2352C"');

  const butane = zig([[-100, 40], [-33, 0], [33, 40], [100, 0]]);
  const branched = `${K.l(0, 20, 0, -50, "var(--ink)", 7, "")}${K.l(0, 20, -65, 60, "var(--ink)", 7, "")}${K.l(0, 20, 65, 60, "var(--ink)", 7, "")}`;
  const ethanol = zig([[-90, 40], [-10, -6]]) + K.l(-10, -6, 68, 40, "var(--ink)", 7, "") + o(90, 62, "OH");
  const dme = zig([[-90, 40], [0, -6], [90, 40]]) + o(0, -22, "O");

  const svg = `
    ${K.g("bu", 500, 200, butane + lab("butane", "C₄H₁₀", "boils at −0.5 °C"))}
    ${K.g("iso", 700, 200, branched + lab("2-methylpropane", "C₄H₁₀", "boils at −11.7 °C"), "", 'opacity="0"')}
    ${K.g("et", 300, 200, ethanol + lab("ethanol", "C₂H₆O", "boils at 78 °C"), "", 'opacity="0"')}
    ${K.g("me", 700, 200, dme + lab("methoxymethane", "C₂H₆O", "boils at −25 °C"), "", 'opacity="0"')}`;

  K.page({
    id: "isomers",
    topic: "Structure 3 — Classification of matter",
    title: "Structural isomers: same atoms, different shapes",
    description: "A zigzag skeletal drawing of butane, C4H10. Tapping slides it to the left and adds a branched drawing, 2-methylpropane, which has the same formula but boils at a lower temperature. Tapping again swaps both for a different pair with the same formula C2H6O: ethanol, with an OH group, boiling at 78 degrees, and methoxymethane, with an oxygen between two carbons, boiling at minus 25 degrees.",
    svg, bounds: [180, 100, 900, 380], tapLabel: "Tap to meet the isomers",
    steps: [
      { caption: "Butane has the molecular formula C₄H₁₀. But there's another way to join four carbons and ten hydrogens.",
        footnote: "Skeletal formulas: each corner and end is a carbon atom." },
      { caption: "2-methylpropane has the same formula, C₄H₁₀, but a branched chain. They're structural isomers: same molecular formula, different structures. Different structures give different properties: the branched one is more compact, so it has weaker London forces and boils at a lower temperature.",
        to: { "#bu": { x: 300 }, "#iso": { opacity: 1, delay: 0.4 } }, dur: 0.9 },
      { caption: "Isomers can differ in their functional group too. C₂H₆O can be ethanol, an alcohol with an O–H group that forms hydrogen bonds, or methoxymethane, an ether that can't. Ethanol boils at 78 °C; the ether, at −25 °C, is a gas at room temperature.",
        to: { "#bu": { opacity: 0 }, "#iso": { opacity: 0 }, "#et": { opacity: 1 }, "#me": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
