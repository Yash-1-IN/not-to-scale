// Dips in first ionization energy across periods 2 and 3 (HL). Values are the data booklet's, section 9.
// The dips at B and Al (a p electron replaces an s electron) and at O and S (paired p electrons repel).

(() => {
  const K = Kit, C = K.C;
  const EL = ["Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
  const IE = [520, 900, 801, 1086, 1402, 1314, 1681, 2081, 496, 738, 578, 787, 1012, 1000, 1251, 1520];
  const X = k => 130 + k * 48 + (k >= 8 ? 36 : 0), Y = v => 400 - v / 2200 * 290;
  const line = (a, b) => `<polyline class="fade" points="${IE.slice(a, b).map((v, i) => `${X(a + i)},${Y(v)}`).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-opacity="0.55"/>`;
  const grid = [500, 1000, 1500, 2000].map(v => `<line class="fade" x1="110" y1="${Y(v)}" x2="890" y2="${Y(v)}" stroke="var(--ink)" stroke-opacity="0.2" stroke-dasharray="4 7"/>${K.t(102, Y(v) + 5, v, "graph-label fade", 'style="text-anchor:end"')}`).join("");
  const ring = k => `<circle cx="${X(k)}" cy="${Y(IE[k])}" r="17" fill="none" stroke="${C.heat}" stroke-width="4"/>`;

  const svg = `${grid}${line(0, 8)}${line(8, 16)}
    ${IE.map((v, k) => `<circle class="fade" cx="${X(k)}" cy="${Y(v)}" r="7" fill="${k < 8 ? C.electron : C.heat}"/>${K.t(X(k), 424, EL[k], "graph-label fade")}`).join("")}
    ${K.t(80, 96, "first ionization energy, kJ mol⁻¹", "graph-label fade", 'style="text-anchor:start"')}
    ${K.t(X(3.5), 454, "period 2", "molecule-label fade")}${K.t(X(11.5), 454, "period 3", "molecule-label fade")}
    <g id="dipA" opacity="0">${ring(2)}${ring(10)}</g><g id="dipB" opacity="0">${ring(5)}${ring(13)}</g>`;

  K.page({
    id: "ionization-dips",
    topic: "Structure 3 — Classification of matter",
    title: "Dips in ionization energy",
    description: "A line graph of the first ionization energy of the elements lithium to neon and sodium to argon, with a general rise across each period. Tapping rings the dips at boron and aluminium, where the energy falls slightly. Tapping again rings the dips at oxygen and sulfur.",
    svg, bounds: [70, 80, 900, 470], tapLabel: "Tap to circle the dips",
    steps: [
      { caption: "Going across a period, the first ionization energy generally rises: more protons pull on electrons in the same shell, so they're harder to remove. But the rise isn't smooth.",
        booklet: "§9 first ionization energies (kJ mol⁻¹): Li 520, Be 900, B 801, C 1086, N 1402, O 1314, F 1681, Ne 2081." },
      { caption: "Boron dips below beryllium, and aluminium below magnesium. The outer electron of B and Al is in a p orbital, which is a little higher in energy and further out than the s orbital before it, so it's easier to remove.",
        booklet: "§9: Be 900 → B 801; Mg 738 → Al 578.",
        to: { "#dipA": { opacity: 1 } } },
      { caption: "Oxygen dips below nitrogen, and sulfur below phosphorus. In N and P each p orbital holds one electron. In O and S, the fourth p electron has to share an orbital with another, and the two repel each other, so one is easier to remove.",
        booklet: "§9: N 1402 → O 1314; P 1012 → S 1000.",
        to: { "#dipB": { opacity: 1 } } }
    ]
  });
})();
