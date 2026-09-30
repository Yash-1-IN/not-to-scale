// Successive ionization energies (HL): sodium's eleven electrons removed one at a time. Big jumps mark
// the shell boundaries. Values are approximate (rounded from standard tables), on a log scale.

(() => {
  const K = Kit, C = K.C;
  const IE = [496, 4562, 6910, 9543, 13354, 16613, 20117, 25496, 28932, 141362, 159076];
  const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th"];
  const BASE = 400, X0 = 160, PITCH = 62, W = 44;
  const hOf = v => +((Math.log10(v) - 2) * 90).toFixed(1);
  const colour = i => (i === 0 ? C.heat : i < 9 ? C.ion : C.electron);
  const xOf = i => X0 + i * PITCH;
  const fmt = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const grid = [1000, 10000, 100000].map(v => `
    <line class="fade" x1="150" y1="${BASE - hOf(v)}" x2="850" y2="${BASE - hOf(v)}" stroke="var(--ink)" stroke-opacity="0.25" stroke-dasharray="4 6"/>
    ${K.t(142, BASE - hOf(v) + 5, fmt(v), "graph-label fade", 'style="text-anchor:end"')}`).join("");

  const bars = IE.map((v, i) => `
    <rect id="bar${i}" class="${i === 0 ? "fade" : ""}" x="${xOf(i)}" y="${i === 0 ? BASE - hOf(v) : BASE}" width="${W}" height="${i === 0 ? hOf(v) : 0}" rx="3" fill="${colour(i)}"/>
    ${K.t(xOf(i) + W / 2, BASE - hOf(v) - 8, fmt(v), i === 0 ? "graph-label fade" : "graph-label", i === 0 ? `id="val${i}"` : `id="val${i}" opacity="0"`)}
    ${K.t(xOf(i) + W / 2, 420, ORD[i], "graph-label fade")}`).join("");

  const bracket = (a, b, text) => `<g class="shells" opacity="0">
    <path d="M ${xOf(a)} 436 L ${xOf(a)} 442 L ${xOf(b) + W} 442 L ${xOf(b) + W} 436" fill="none" stroke="var(--ink)" stroke-width="2.5"/>
    ${K.t((xOf(a) + xOf(b) + W) / 2, 463, text, "graph-label")}</g>`;

  const svg = `${grid}${bars}
    ${K.t(150, 104, "energy needed, kJ mol⁻¹ (log scale)", "graph-label fade", 'style="text-anchor:start"')}
    ${bracket(0, 0, "3rd shell: 1 e⁻")}${bracket(1, 8, "2nd shell: 8 e⁻")}${bracket(9, 10, "1st shell: 2 e⁻")}`;

  const grow = (from, to, extra = {}) => {
    const o = {};
    for (let i = from; i <= to; i++) {
      o["#bar" + i] = { attr: { y: BASE - hOf(IE[i]), height: hOf(IE[i]) }, delay: (i - from) * 0.09, ...extra };
      o["#val" + i] = { opacity: 1, delay: (i - from) * 0.09 + 0.5 };
    }
    return o;
  };

  K.page({
    id: "successive-ie",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Successive ionization energies: peeling off electrons",
    description: "A bar chart on a logarithmic scale of the energy needed to remove sodium's eleven electrons one at a time. At first only the first bar, 496 kilojoules per mole, is shown. Tapping adds the second to ninth bars, which are about ten times taller, then the tenth and eleventh, which are far taller again. Brackets underneath group them as the third shell with one electron, the second shell with eight, and the first shell with two.",
    svg, bounds: [100, 100, 870, 470], tapLabel: "Tap to remove more electrons",
    steps: [
      { caption: "How much energy does it take to pull off a sodium atom's first electron? About 496 kJ for a mole of atoms. Then the second, the third… each from an ion that's more positive than the last. Tap to see.",
        booklet: "§9: first ionization energy of sodium, 496 kJ mol⁻¹. (The booklet lists only the first.)" },
      { caption: "The second electron costs nine times as much: 4562 kJ. It comes from a full inner shell, much closer to the nucleus. That big jump says sodium has only one outer electron.",
        footnote: "Values are rounded from standard tables, and the axis is logarithmic so all eleven fit on the page.",
        to: grow(1, 8), dur: 0.7, captionAt: 1.2 },
      { caption: "After the ninth, another enormous jump: the tenth electron comes from the innermost shell. Reading the jumps, sodium's eleven electrons sit 2, 8, 1 in their shells.",
        to: { ...grow(9, 10), ".shells": { opacity: 1, stagger: 0.2, delay: 0.7 } }, dur: 0.9 }
    ]
  });
})();
