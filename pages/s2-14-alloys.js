// Alloys: in a pure metal, identical layers of atoms slide over each other easily. In an alloy, atoms of a
// different size break up the layers, so they can't slide, and the alloy is harder.

(() => {
  const K = Kit, C = K.C, SP = 56, X0 = 250, Y0 = 130, COLS = 9, ROWS = 5;
  const big = new Set(["1,2", "1,5", "2,3", "2,7", "3,1", "3,4", "3,6", "0,4", "0,7", "4,2", "4,5", "4,8"]);   // the larger atoms of the second metal
  const lattice = (id, alloy) => {
    const top = [], bottom = [];
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      const x = X0 + j * SP + (i % 2) * 0, y = Y0 + i * SP, isBig = alloy && big.has(i + "," + j);
      (i < 2 ? top : bottom).push(`<circle cx="${x}" cy="${y}" r="${isBig ? 27 : 21}" fill="${isBig ? C.heat : C.ion}" stroke="#fff" stroke-width="2"/>`);
    }
    return K.g(id + "Top", 0, 0, top.join(""), "") + bottom.join("");
  };
  const svg = `
    <g id="pure" class="fade">${lattice("pure", false)}</g>
    <g id="alloy" opacity="0">${lattice("alloy", true)}</g>
    <g id="push" class="fade">${K.arrow(150, 158, 232, 158, C.heat, 7)}${K.t(150, 128, "push", "molecule-label")}</g>
    ${K.t(500, 445, "pure metal: identical atoms in tidy layers", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "alloys",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Alloys: mixing metals",
    description: "Rows of identical blue metal atoms packed in tidy layers, with an orange arrow pushing the top two rows sideways. Tapping lets the top layers slide along easily. Tapping again swaps to an alloy: the same layers with some bigger orange atoms mixed in, and when the top layers are pushed they barely move because the bigger atoms block them.",
    svg, bounds: [120, 100, 820, 440], tapLabel: "Tap to push the top layers",
    steps: [
      { caption: "A pure metal is layers of identical atoms held by the sea of electrons. Because the atoms are all the same size, the layers line up neatly.",
        footnote: "The atoms are drawn as flat discs; a real metal is a 3D stack." },
      { caption: "Push on the top layers and they slide over the ones below, because the bonding is the same wherever the atoms end up. That's why pure metals are malleable and soft.",
        to: { "#pureTop": { x: SP } }, dur: 1.1 },
      { caption: "An alloy is a mixture of a metal with other metals or non-metals. The atoms of the second element are a different size, so they break up the neat layers and lock them together: push, and the layers can't slide. Alloys are usually harder and stronger than their pure metals.",
        footnote: "Brass is copper mixed with zinc. Steel is iron mixed with a little carbon.",
        to: { "#pure": { opacity: 0 }, "#alloy": { opacity: 1 } }, text: { "#tag": "alloy: atoms of a different size block the layers" }, dur: 0.7,
        run(ctx, tl, dir) { if (dir === "fwd") tl.to("#alloyTop", { x: 12, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.9); } }
    ]
  });
})();
