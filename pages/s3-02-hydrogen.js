// Hydrogen: one outer electron like the group 1 metals, one short of a full shell like the halogens.

(() => {
  const K = Kit, C = K.C;
  const at = (n, sym, cx, shells, fill) => {
    const R = [44, 70];
    let s = "";
    shells.forEach((e, k) => {
      s += `<circle r="${R[k]}" fill="none" class="orbit"/>`;
      for (let i = 0; i < e; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / e + (k ? 0.3 : 0), outer = k === shells.length - 1;
        s += `<circle cx="${(R[k] * Math.cos(a)).toFixed(1)}" cy="${(R[k] * Math.sin(a)).toFixed(1)}" r="7" fill="${C.electron}" ${outer ? `stroke="${C.heat}" stroke-width="3"` : ""}/>`;
      }
    });
    return K.g(n, cx, 215, `${s}<circle r="22" fill="${fill}"/><text class="nuc-sym">${sym}</text>`);
  };
  const cap = (x, t) => K.t(x, 335, t, "atom-name fade");

  const svg = `
    ${at("aLi", "Li", 200, [2, 1], C.proton)}${at("aH", "H", 500, [1], C.proton)}${at("aF", "F", 800, [2, 7], C.proton)}
    ${cap(200, "lithium")}${cap(500, "hydrogen")}${cap(800, "fluorine")}
    <g id="linkL" opacity="0">${K.arrow(455, 150, 245, 150, C.heat, 4)}${K.t(350, 130, "like group 1: 1 outer electron", "graph-label")}</g>
    <g id="linkF" opacity="0">${K.arrow(545, 150, 755, 150, C.heat, 4)}${K.t(650, 130, "like group 17: one short of full", "graph-label")}</g>
    ${K.t(500, 395, "H → H⁺ + e⁻", "molecule-label fade", 'id="eqn"')}
    ${K.t(500, 440, "electronegativity: Li 1.0 · H 2.2 · F 4.0", "graph-label", 'id="en" opacity="0"')}`;

  K.page({
    id: "hydrogen-element",
    topic: "Structure 3 — Classification of matter",
    title: "Hydrogen: the element that doesn't fit",
    description: "Three atoms drawn as electron-shell diagrams: lithium on the left with one outer electron, hydrogen in the middle with its single electron, and fluorine on the right with seven outer electrons; the outer electrons are ringed in orange. Tapping draws an arrow from hydrogen to lithium: hydrogen is like a group 1 metal. Tapping again adds an arrow to fluorine: hydrogen is also like a halogen, one electron short of a full shell. Tapping a last time adds their electronegativities showing hydrogen sits in between.",
    svg, bounds: [100, 100, 900, 460], tapLabel: "Tap to compare hydrogen",
    steps: [
      { caption: "Hydrogen has a single electron in its outer shell, just like the group 1 metals, lithium and sodium. Like them, it can lose that electron to form a positive ion, H⁺, and it's usually placed at the top of group 1.",
        to: { "#linkL": { opacity: 1 } } },
      { caption: "But it also looks like a halogen. A halogen is one electron short of a full shell, and so is hydrogen (a full first shell has two). Hydrogen can gain an electron to make the hydride ion, H⁻, and forms diatomic molecules, H₂, like F₂ and Cl₂.",
        to: { "#linkF": { opacity: 1 } }, text: { "#eqn": "H + e⁻ → H⁻" } },
      { caption: "So hydrogen doesn't fit neatly in either group. It's a non-metal gas, with an electronegativity (2.2) between the group 1 metals (about 1) and the halogens (3.2 to 4.0). Some periodic tables give it a box on its own.",
        booklet: "§9 electronegativity: Li 1.0, Na 0.9, H 2.2, Cl 3.2, F 4.0.",
        to: { "#en": { opacity: 1 } }, text: { "#eqn": "hydrogen is a group of one" } }
    ]
  });
})();
