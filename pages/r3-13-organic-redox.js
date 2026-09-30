// Oxidizing and reducing organic molecules: ethanol -> ethanal -> ethanoic acid with acidified dichromate(VI),
// and the reduction of ethene by hydrogen. Skeletal formulas.

(() => {
  const K = Kit, C = K.C;
  const red = (x, y, s) => K.t(x, y, s, "atom-name", 'style="fill:#D2352C;font-size:22px"');
  const ethanol = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(0, -14, 50, 20, "var(--ink)", 6, "") + red(70, 42, "OH");
  const ethanal = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(-3, -18, 48, 14, "var(--ink)", 4, "") + K.l(4, -10, 55, 24, "var(--ink)", 4, "") + red(64, 44, "O");
  const acid = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(-5, -14, -5, -62, "var(--ink)", 4, "") + K.l(5, -14, 5, -62, "var(--ink)", 4, "") + K.l(0, -14, 50, 20, "var(--ink)", 6, "") + red(0, -78, "O") + red(70, 42, "OH");
  const ethene = K.l(-45, -5, 45, -5, "var(--ink)", 6, "") + K.l(-45, 7, 45, 7, "var(--ink)", 6, "");
  const ethane = K.l(-45, 0, 45, 0, "var(--ink)", 6, "");
  const cap = (t, s) => K.t(0, 90, t, "molecule-label") + K.t(0, 116, s, "graph-label");

  const svg = `
    ${K.g("m1", 210, 200, ethanol + cap("ethanol", "alcohol"))}
    ${K.g("m2", 500, 200, ethanal + cap("ethanal", "aldehyde"), "", 'opacity="0"')}
    ${K.g("m3", 790, 200, acid + cap("ethanoic acid", "carboxylic acid"), "", 'opacity="0"')}
    <g id="ar1" opacity="0">${K.arrow(300, 190, 420, 190, "var(--ink)", 5)}${K.t(360, 165, "[O]", "atom-name", 'style="font-size:22px"')}</g>
    <g id="ar2" opacity="0">${K.arrow(590, 190, 710, 190, "var(--ink)", 5)}${K.t(650, 165, "[O]", "atom-name", 'style="font-size:22px"')}</g>
    <g id="reag" opacity="0"><circle id="chip" cx="330" cy="372" r="13" fill="#E0791F" stroke="var(--ink)" stroke-width="2"/>${K.t(360, 378, "acidified potassium dichromate(VI): orange → green", "graph-label", 'style="text-anchor:start"')}</g>
    ${K.g("m4", 260, 200, ethene + K.t(0, 90, "ethene", "molecule-label"), "", 'opacity="0"')}
    ${K.g("m5", 740, 200, ethane + K.t(0, 90, "ethane", "molecule-label"), "", 'opacity="0"')}
    <g id="ar3" opacity="0">${K.arrow(340, 195, 660, 195, "var(--ink)", 5)}${K.t(500, 168, "H₂, nickel catalyst", "molecule-label")}</g>`;

  K.page({
    id: "organic-redox",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Oxidizing and reducing organic molecules",
    description: "A skeletal drawing of ethanol, an alcohol. Tapping adds an arrow marked oxygen and ethanal, an aldehyde, with a coloured dot for the orange dichromate turning green. Tapping again adds an arrow to ethanoic acid, a carboxylic acid. Tapping a last time swaps these for the reduction of ethene, a double bond, to ethane, a single bond, with hydrogen and a nickel catalyst.",
    svg, bounds: [120, 80, 900, 450], tapLabel: "Tap to oxidize, then reduce",
    steps: [
      { caption: "Organic molecules can be oxidized and reduced too. Ethanol is a primary alcohol. Heat it with an oxidizing agent, acidified potassium dichromate(VI), and it's oxidized.",
        footnote: "[O] is a shorthand for the oxygen supplied by the oxidizing agent." },
      { caption: "First it loses hydrogen to become ethanal, an aldehyde. The orange dichromate(VI) ions are reduced to green chromium(III) ions, which is how you can tell it happened.",
        to: { "#m2": { opacity: 1, delay: 0.3 }, "#ar1": { opacity: 1 }, "#reag": { opacity: 1 }, "#chip": { fill: "#3E9B57", delay: 0.8 } }, dur: 1.0 },
      { caption: "Keep heating with more oxidizing agent (under reflux, so nothing escapes) and the aldehyde gains an oxygen to become ethanoic acid, a carboxylic acid. Each step is an oxidation.",
        footnote: "A secondary alcohol is oxidized to a ketone and stops there.",
        to: { "#m3": { opacity: 1, delay: 0.3 }, "#ar2": { opacity: 1 } }, dur: 1.0 },
      { caption: "Reduction goes the other way, by gaining hydrogen. Ethene, with a C=C double bond, reacts with hydrogen over a nickel catalyst to give ethane: the double bond is gone, so the degree of unsaturation is lowered.",
        to: { "#m1": { opacity: 0 }, "#m2": { opacity: 0 }, "#m3": { opacity: 0 }, "#ar1": { opacity: 0 }, "#ar2": { opacity: 0 }, "#reag": { opacity: 0 },
              "#m4": { opacity: 1, delay: 0.5 }, "#ar3": { opacity: 1, delay: 0.5 }, "#m5": { opacity: 1, delay: 0.9 } }, dur: 1.0 }
    ]
  });
})();
