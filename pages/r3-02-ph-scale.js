// The pH scale: pH = -log10[H+], so each pH unit is a factor of ten in hydrogen ion concentration.

(() => {
  const K = Kit, C = K.C;
  const COL = ["#D7263D", "#E4432D", "#EE6B2B", "#F5943A", "#F7B733", "#F4D03F", "#C9D84A", "#7CC66B", "#46B88B", "#3AA5A8", "#3B82C4", "#4A62B8", "#5B48A8", "#6A3E96"];
  const W = 800 / 14, X = p => 100 + p * W;
  const bar = COL.map((c, i) => `<rect class="fade" x="${X(i)}" y="210" width="${W + 0.5}" height="40" fill="${c}"/>`).join("");
  const ticks = Array.from({ length: 15 }, (_, p) => K.t(X(p), 274, p, "graph-label fade")).join("");
  const marker = (id, p, name, conc) => `<g id="${id}" opacity="0">
    <polygon points="${X(p) - 10},186 ${X(p) + 10},186 ${X(p)},207" fill="var(--ink)"/>${K.t(X(p), 172, name, "molecule-label")}${K.t(X(p), 312, conc, "graph-label")}</g>`;

  const svg = `${bar}${ticks}
    ${K.t(500, 116, "pH = −log₁₀[H⁺]", "atom-name fade", 'style="font-size:34px"')}
    ${K.t(X(1.5), 448, "acidic", "molecule-label fade")}${K.t(X(7), 448, "neutral", "molecule-label fade")}${K.t(X(12.5), 448, "alkaline", "molecule-label fade")}
    ${marker("mLemon", 2, "lemon juice", "1 × 10⁻² mol dm⁻³")}${marker("mWater", 7, "pure water", "1 × 10⁻⁷ mol dm⁻³")}${marker("mAmm", 11, "household ammonia", "1 × 10⁻¹¹ mol dm⁻³")}
    <g id="span" opacity="0">
      <path d="M ${X(2)} 345 L ${X(2)} 353 L ${X(7)} 353 L ${X(7)} 345" fill="none" stroke="${C.heat}" stroke-width="4" stroke-linejoin="round"/>
      ${K.t((X(2) + X(7)) / 2, 385, "5 pH units: 10⁵ = 100 000 times more H⁺ in lemon juice", "molecule-label", `style="fill:${C.heat}"`)}
    </g>`;

  K.page({
    id: "ph-scale",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "pH: a scale in powers of ten",
    description: "A colour bar from red on the left to purple on the right, numbered from pH 0 to 14, with pH equals minus log of the hydrogen ion concentration written above it. Tapping places three markers: lemon juice at pH 2, pure water at pH 7 and household ammonia at pH 11, each with its hydrogen ion concentration. Tapping again brackets lemon juice and pure water, five pH units apart, and shows that means a hundred thousand times more hydrogen ions.",
    svg, bounds: [80, 100, 920, 470], tapLabel: "Tap to place some examples",
    steps: [
      { caption: "pH measures how acidic or alkaline a solution is: it's the negative logarithm (base 10) of the hydrogen ion concentration in mol dm⁻³. Low pH is acidic, 7 is neutral, and high pH is alkaline.",
        booklet: "§1 equations: pH = −log₁₀[H⁺] (or −log₁₀[H₃O⁺]).",
        footnote: "The colours are those of universal indicator, which changes through the rainbow as pH rises." },
      { caption: "Lemon juice has a pH of about 2, so [H⁺] = 1 × 10⁻² mol dm⁻³. Pure water is neutral at pH 7, with [H⁺] = 1 × 10⁻⁷. Household ammonia is alkaline, around pH 11.",
        footnote: "Typical values, which vary from sample to sample.",
        to: { "#mLemon": { opacity: 1 }, "#mWater": { opacity: 1, delay: 0.3 }, "#mAmm": { opacity: 1, delay: 0.6 } }, dur: 0.6 },
      { caption: "Because it's a logarithmic scale, one pH unit is a factor of ten in [H⁺]. Lemon juice is five units below pure water, so it has 10⁵, or 100 000, times more hydrogen ions.",
        to: { "#span": { opacity: 1 } } }
    ]
  });
})();
