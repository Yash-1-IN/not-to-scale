// The limit of convergence (HL): hydrogen's energy levels crowd together towards n = ∞. Electrons falling
// to n = 1 make lines that crowd together too, and the limit they converge on is the ionization energy.

(() => {
  const K = Kit, C = K.C;
  const yOf = n => 90 + 330 / (n * n);                 // energy level n -> canvas y (n = ∞ sits at y = 90)
  const xLine = n => 650 + ((1 - 1 / (n * n) - 0.7) / 0.3) * 280;   // line position by energy of the fall
  const N = [2, 3, 4, 5, 6];
  const left = 'style="text-anchor:end"', start = 'style="text-anchor:start"';

  const levels = [1, 2, 3, 4, 5, 6].map(n => K.l(200, yOf(n), 420, yOf(n), "var(--ink)", 2.5, 'class="fade"')).join("");
  const nLabels = [1, 2, 3, 4].map(n => K.t(190, yOf(n) + 5, "n = " + n, "graph-label fade", left)).join("");

  const svg = `
    ${K.arrow(165, 440, 165, 58, "var(--ink)", 2.5, 'class="fade"')}${K.t(165, 46, "energy", "graph-label fade")}
    ${levels}${nLabels}
    <line class="fade" x1="200" y1="90" x2="420" y2="90" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 6"/>
    ${K.t(190, 95, "n = ∞", "graph-label fade", left)}

    ${N.map((n, i) => K.arrow(235 + i * 42, yOf(n), 235 + i * 42, 416, C.violet, 3, `class="fall" opacity="0"`)).join("")}

    <rect class="fade" x="650" y="205" width="280" height="34" rx="4" fill="#14121b"/>
    ${N.map(n => K.l(xLine(n), 209, xLine(n), 235, C.violet, 4, 'class="specLine" opacity="0"')).join("")}
    ${K.t(790, 268, "hydrogen's Lyman series (ultraviolet)", "graph-label fade")}
    <g id="limitG" opacity="0">
      <line x1="930" y1="195" x2="930" y2="249" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 5"/>
      ${K.t(930, 186, "limit of convergence", "graph-label", 'style="text-anchor:end"')}
      ${K.arrow(460, 418, 460, 96, "var(--ink)", 3)}
      ${K.t(478, 252, "ionization energy", "molecule-label", start)}${K.t(478, 278, "1312 kJ mol⁻¹", "molecule-label", start)}
    </g>`;

  K.page({
    id: "convergence",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The limit of convergence: when an electron escapes",
    description: "An energy-level diagram for hydrogen: horizontal lines for n equals 1, 2, 3 and so on, squeezing closer together towards a dashed line at n equals infinity. Tapping draws arrows from the higher levels down to n equals 1, and the lines they produce on a dark strip crowd together at the right. Tapping again marks the limit where the lines converge, and an arrow from n equals 1 up to infinity labelled ionization energy, 1312 kilojoules per mole.",
    svg, bounds: [150, 40, 940, 450], tapLabel: "Tap to add the electron falls",
    steps: [
      { caption: "In hydrogen, the electron's energy levels get closer and closer together the further out you go, squeezing up towards a limit at the top.",
        footnote: "The levels are not to scale in one way: the real gaps are set by −1/n², which is why they bunch up so quickly." },
      { caption: "An electron falling to n = 1 gives out light: the Lyman series, in the ultraviolet. Since the levels crowd together, the lines from those falls crowd together too, converging on a limit.",
        to: { ".fall": { opacity: 1, stagger: 0.18 }, ".specLine": { opacity: 1, stagger: 0.18, delay: 0.3 } }, dur: 0.6, captionAt: 1.2 },
      { caption: "The lines converge on the energy of an electron falling in from n = ∞, one that has only just been set free. That energy, from n = 1 to ∞, is hydrogen's ionization energy: 1312 kJ mol⁻¹.",
        footnote: "Chemists find it from a real spectrum: measure the frequency where the lines converge, then use E = hf, and multiply by Avogadro's constant for a mole.",
        booklet: "§9: first ionization energy of hydrogen, 1312 kJ mol⁻¹. §1: E = hf. §2: N<sub>A</sub> = 6.02 × 10²³ mol⁻¹.",
        to: { "#limitG": { opacity: 1 } } }
    ]
  });
})();
