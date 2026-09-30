// Expanded octets and formal charge (HL): sulfate, SO4 2-. Structure A obeys the octet rule but leaves
// S with +2 and each O with -1. Structure B expands sulfur's octet to 12 electrons and gets every formal
// charge closer to zero, so it is preferred.
// The trick used here: formal charge = valence electrons − sticks − stones, where a "stick" is a bond
// (each stick is half of a bonding pair, so counting sticks already halves the bonding electrons) and a
// "stone" is a single electron in a lone pair.

(() => {
  const K = Kit, C = K.C, D = 95;
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];          // top, right, bottom, left oxygens
  const fcTxt = (id, x, y, s) => K.t(x, y, s, "molecule-label", `id="${id}" style="fill:${C.heat}"`);
  const STONE = "#1B1A22";
  // A lone pair of stones at angle `deg` (0 = straight out from the molecule), `dist` from an atom's centre.
  const pair = (deg, dist, id, extra = "", rad = 3.6, sep = 5) => {
    const a = deg * Math.PI / 180, px = Math.cos(a) * dist, py = Math.sin(a) * dist, nx = -Math.sin(a) * sep, ny = Math.cos(a) * sep;
    return `<g ${id ? `id="${id}"` : ""} ${extra}>${K.c(px + nx, py + ny, rad, STONE)}${K.c(px - nx, py - ny, rad, STONE)}</g>`;
  };
  const outAngle = i => Math.atan2(dirs[i][1], dirs[i][0]) * 180 / Math.PI;

  const oxy = i => {
    const [dx, dy] = dirs[i], x = dx * D, y = dy * D;
    return `${K.l(0, 0, x, y, "var(--ink)", 5, `id="sb${i}"`)}
      <g id="dbl${i}" opacity="0">${K.l(dy * 7, -dx * 7, x + dy * 7, y - dx * 7, "var(--ink)", 4, "")}${K.l(-dy * 7, dx * 7, x - dy * 7, y + dx * 7, "var(--ink)", 4, "")}</g>`;
  };
  // each oxygen: disc, symbol, and three lone pairs (out, and to each side); the "out" pair of the top
  // and bottom oxygens goes when they become double-bonded (6 stones → 4)
  const oAtoms = i => {
    const [dx, dy] = dirs[i], a = outAngle(i);
    return `<g data-x="${dx * D}" data-y="${dy * D}" id="oAt${i}"><circle r="24" fill="${C.proton}"/><text class="nuc-sym" style="font-size:20px">O</text>
      ${pair(a, 36, `lpo${i}`)}${pair(a + 90, 36, `lps${i}`)}${pair(a - 90, 36, `lpt${i}`)}</g>`;
  };
  const charges = [[0, -D - 72], [D + 72, 0], [0, D + 76], [-D - 72, 0]];

  const mol = [0, 1, 2, 3].map(oxy).join("") + [0, 1, 2, 3].map(oAtoms).join("") +
    `<circle r="30" fill="${C.heat}"/><text class="nuc-sym" style="font-size:24px">S</text>` +
    `<circle id="hiS" cx="0" cy="0" r="42" fill="none" stroke="${C.frame}" stroke-width="4" stroke-dasharray="7 6" opacity="0"/>` +
    fcTxt("fcS", 46, -34, "+2") + charges.map(([x, y], i) => fcTxt("fcO" + i, x, y + 5, "−1")).join("");

  // ----- the zoomed-in counting view on the right: a big atom with its sticks and stones -----
  const ZX = 730, ZY = 200;
  const zoomS = `
    <g id="zS" opacity="0" data-x="${ZX}" data-y="${ZY}">
      ${[0, 1, 2, 3].map(i => `<g id="zs${i}">${K.l(0, 0, dirs[i][0] * 100, dirs[i][1] * 100, "var(--ink)", 8, "")}<circle cx="${dirs[i][0] * 100}" cy="${dirs[i][1] * 100}" r="17" fill="${C.proton}" opacity="0.35"/></g>`).join("")}
      <circle r="46" fill="${C.heat}"/><text class="nuc-sym" style="font-size:34px">S</text>
      ${[0, 1, 2, 3].map(i => `<text id="zn${i}" class="atom-name" opacity="0" x="${dirs[i][0] * 56 + (dirs[i][0] === 0 ? 24 : 0)}" y="${dirs[i][1] * 62 + 8 - (dirs[i][1] === 0 ? 24 : 0)}" style="fill:${C.heat}">${i + 1}</text>`).join("")}
    </g>`;
  const zoomO = `
    <g id="zO" opacity="0" data-x="${ZX}" data-y="${ZY}">
      ${K.l(0, 0, 125, 0, "var(--ink)", 8, 'id="zo0"')}<circle cx="125" cy="0" r="17" fill="${C.heat}" opacity="0.35"/>
      <circle r="46" fill="${C.proton}"/><text class="nuc-sym" style="font-size:34px">O</text>
      ${[120, 180, 240].map((d, k) => pair(d, 68, `zp${k}`, 'opacity="0"', 6.5, 9)).join("")}
      ${K.t(80, -16, "1", "atom-name", 'id="zon0" opacity="0" style="fill:#E05A2B"')}
    </g>`;
  const ledger = `
    <g id="ledger" opacity="0">
      ${K.t(ZX, 348, "", "molecule-label", 'id="lv"')}${K.t(ZX, 378, "", "molecule-label", 'id="lk"')}
      ${K.t(ZX, 408, "", "molecule-label", 'id="ls"')}${K.t(ZX, 442, "", "atom-name", 'id="lr" style="fill:#E05A2B"')}
    </g>`;

  const svg = `${K.g("sulfate", 300, 192, mol)}
    ${zoomS}${zoomO}${ledger}
    ${K.t(300, 402, "sulfate ion, SO₄²⁻: every bond single", "atom-name fade", 'id="what"')}
    ${K.t(300, 434, "formal charge = valence e⁻ − sticks − stones", "molecule-label fade", 'id="sums"')}
    ${K.t(300, 460, "", "molecule-label", 'id="sums2"')}`;

  K.page({
    id: "formal-charge",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Expanded octets and formal charge",
    description: "A sulfate ion: an orange sulfur atom in the middle joined by single lines (sticks) to four red oxygen atoms, each oxygen with three pairs of small white dots (stones, the lone-pair electrons). Formal charges are labelled: plus 2 on sulfur and minus 1 on each oxygen. Tapping zooms in on sulfur, counting its four sticks and no stones: 6 minus 4 minus 0 equals plus 2. Tapping again zooms in on an oxygen: one stick and six stones, 6 minus 1 minus 6 equals minus 1. A last tap turns the top and bottom bonds into double bonds, the formal charges on sulfur and those two oxygens drop to 0, and the sums are shown.",
    svg, bounds: [20, 30, 880, 470], tapLabel: "Tap to count sticks and stones",
    steps: [
      { caption: "Sulfate can be drawn with sulfur following the octet rule: eight electrons around it, four single bonds. To see how strained that is, work out each atom's formal charge with a trick: formal charge = valence electrons − sticks − stones. A stick is a bond (a line), and a stone is a single electron in a lone pair (a dot).",
        footnote: "Counting sticks already halves the bonding electrons: each bond is two electrons shared, and half of each pair is yours. That's the step people forget. It's a bookkeeping tool, not a real charge on the atom." },
      { caption: "Zoom in on sulfur. Sulfur is in group 16, so it has 6 valence electrons. Count its sticks: four bonds. Count its stones: none, because sulfur has no lone pairs here. So 6 − 4 − 0 = +2.",
        footnote: "The formula: FC = valence electrons − (bonds) − (lone-pair electrons).",
        to: { "#sulfate": { x: 215, opacity: 1 }, "#zS": { opacity: 1 }, "#what": { opacity: 0 }, "#sums": { opacity: 0 }, "#ledger": { opacity: 1 }, "#hiS": { opacity: 1 },
              "#zs0": { opacity: 1 }, "#zs1": { opacity: 1 }, "#zs2": { opacity: 1 }, "#zs3": { opacity: 1 } },
        text: { "#lv": "valence electrons: 6", "#lk": "− sticks: 4", "#ls": "− stones: 0", "#lr": "6 − 4 − 0 = +2" }, dur: 1.2,
        run(ctx, tl, dir) {
          if (dir !== "fwd") return;
          [0, 1, 2, 3].forEach(i => tl.fromTo(ctx.$("#zn" + i), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.0 + i * 0.35));
        } },
      { caption: "Now an oxygen. Oxygen is also in group 16: 6 valence electrons. It has one stick (the single bond to sulfur) and three lone pairs, so six stones. 6 − 1 − 6 = −1. That's why every oxygen shows −1 here.",
        to: { "#zS": { opacity: 0 }, "#zO": { opacity: 1 }, "#hiS": { attr: { cx: 95, r: 34 } }, "#zp0": { opacity: 1 }, "#zp1": { opacity: 1, delay: 0.2 }, "#zp2": { opacity: 1, delay: 0.4 }, "#zo0": { opacity: 1 }, "#zon0": { opacity: 1, delay: 0.6 } },
        text: { "#lv": "valence electrons: 6", "#lk": "− sticks: 1", "#ls": "− stones: 6", "#lr": "6 − 1 − 6 = −1" }, dur: 1.0 },
      { caption: "Atoms in period 3 and below can hold more than eight electrons: an expanded octet. Give sulfur two double bonds, 12 electrons in all. Sulfur now has six sticks: 6 − 6 − 0 = 0. A double-bonded oxygen has two sticks and four stones: 6 − 2 − 4 = 0. Formal charges closest to zero mark the preferred structure.",
        footnote: "Real sulfate is a resonance hybrid: all four S–O bonds are identical, in between these drawings.",
        to: { "#zO": { opacity: 0 }, "#ledger": { opacity: 0 }, "#hiS": { opacity: 0 }, "#sulfate": { x: 300 }, "#what": { opacity: 1 }, "#sums": { opacity: 1 },
              "#dbl0": { opacity: 1 }, "#dbl2": { opacity: 1 }, "#sb0": { opacity: 0 }, "#sb2": { opacity: 0 }, "#lpo0": { opacity: 0 }, "#lpo2": { opacity: 0 } },
        text: { "#fcS": "0", "#fcO0": "0", "#fcO2": "0", "#what": "sulfate ion, SO₄²⁻: two double bonds",
                "#sums": "sulfur: 6 − 6 − 0 = 0", "#sums2": "double-bonded O: 6 − 2 − 4 = 0 · single-bonded O: 6 − 1 − 6 = −1" }, dur: 1.2 }
    ]
  });
})();
