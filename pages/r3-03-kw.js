// The ion product of water: [H+][OH-] = Kw = 1.00 x 10^-14 at 298 K. A seesaw: when one goes up the other
// goes down, and their product stays the same.

(() => {
  const K = Kit, C = K.C;
  const pan = (x, label, fill) => `${K.l(x, 240, x - 40, 300, "var(--ink)", 3, "")}${K.l(x, 240, x + 40, 300, "var(--ink)", 3, "")}
    <rect x="${x - 60}" y="298" width="120" height="34" rx="8" fill="${fill}"/>${K.t(x, 322, label, "molecule-label", 'style="fill:#fff"')}`;
  const svg = `
    <g id="beam" class="fade">
      ${K.l(300, 240, 700, 240, "var(--ink)", 8, "")}${pan(300, "[H⁺]", C.heat)}${pan(700, "[OH⁻]", C.electron)}
    </g>
    <polygon class="fade" points="500,242 470,320 530,320" fill="var(--ink)"/>
    ${K.t(500, 116, "[H⁺] × [OH⁻] = 1.0 × 10⁻¹⁴", "atom-name fade", 'style="font-size:32px"')}
    ${K.t(500, 168, "pure water: pH 7", "molecule-label fade", 'id="ph"')}
    ${K.t(300, 432, "[H⁺] = 1.0 × 10⁻⁷", "molecule-label fade", 'id="hv"')}${K.t(700, 432, "[OH⁻] = 1.0 × 10⁻⁷", "molecule-label fade", 'id="ohv"')}`;

  K.page({
    id: "kw",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Water's own ions: Kw",
    description: "A seesaw with a beam balanced on a triangle and two pans labelled hydrogen ion concentration on the left and hydroxide ion concentration on the right, with the equation that their product equals 1.0 times ten to the minus 14 above. In pure water the beam is level, pH 7. Tapping adds acid: the hydrogen ion side tips down, pH 3. Tapping again adds alkali: the hydroxide side tips down, pH 11.",
    svg, bounds: [220, 90, 780, 450], tapLabel: "Tap to add acid, then alkali",
    setup() { gsap.set("#beam", { svgOrigin: "500 240" }); },
    steps: [
      { caption: "Even pure water has a very few ions, because a tiny fraction of water molecules donate protons to others. There are equal amounts of H⁺ and OH⁻, each 1.0 × 10⁻⁷ mol dm⁻³, so the water is neutral, pH 7.",
        booklet: "§2: K_w = 1.00 × 10⁻¹⁴ mol² dm⁻⁶ at 298.15 K. §1: K_w = [H⁺][OH⁻]." },
      { caption: "Add an acid and [H⁺] shoots up. But the product [H⁺] × [OH⁻] is fixed at 1.0 × 10⁻¹⁴ (at 298 K), so [OH⁻] must fall by the same factor. Here: 10⁻³ × 10⁻¹¹ = 10⁻¹⁴.",
        to: { "#beam": { rotation: -12 } }, text: { "#ph": "acidic: pH 3", "#hv": "[H⁺] = 1.0 × 10⁻³", "#ohv": "[OH⁻] = 1.0 × 10⁻¹¹" }, dur: 1.2 },
      { caption: "Add an alkali instead and it's the other way round: [OH⁻] rises and [H⁺] falls, so that the product stays the same.",
        footnote: "K_w changes with temperature, so pure water is only neutral at pH 7 at 298 K.",
        to: { "#beam": { rotation: 12 } }, text: { "#ph": "alkaline: pH 11", "#hv": "[H⁺] = 1.0 × 10⁻¹¹", "#ohv": "[OH⁻] = 1.0 × 10⁻³" }, dur: 1.4 }
    ]
  });
})();
