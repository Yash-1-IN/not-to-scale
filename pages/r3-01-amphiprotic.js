// Amphiprotic species: water accepts a proton from HCl (acting as a base) and donates one to NH3
// (acting as an acid).

(() => {
  const K = Kit, C = K.C;
  const mol = (id, x, y, r, label, fill) => K.g(id, x, y, `<circle r="${r}" fill="${fill}"/><text id="${id}T" class="nuc-sym" style="font-size:22px">${label}</text>`, "");
  const token = (id, x, y) => K.g(id, x, y, `<circle r="15" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><text class="h-plus-label" style="font-size:13px">H⁺</text>`, "");

  const svg = `
    <g id="sc1" class="fade">${mol("hcl", 300, 215, 52, "HCl", C.product)}${mol("w1", 700, 215, 52, "H₂O", C.proton)}${token("t1", 356, 215)}</g>
    <g id="sc2" opacity="0">${mol("w2", 300, 215, 52, "H₂O", C.proton)}${mol("nh3", 700, 215, 52, "NH₃", C.electron)}${token("t2", 356, 215)}</g>
    ${K.t(500, 350, "HCl gives a proton to water", "atom-name fade", 'id="what"')}
    ${K.t(500, 400, "", "molecule-label", 'id="role"')}
    ${K.t(500, 432, "", "graph-label", 'id="sub"')}`;

  K.page({
    id: "amphiprotic",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Amphiprotic species: acid or base?",
    description: "A green hydrogen chloride molecule on the left with a small white hydrogen ion, H plus, on its edge, and a red water molecule on the right. Tapping sends the proton across to the water, which becomes H3O plus, so water has acted as a base. Tapping again swaps to water on the left and a blue ammonia molecule on the right: this time the proton moves from the water to the ammonia, so water has acted as an acid.",
    svg, bounds: [220, 130, 780, 450], tapLabel: "Tap to pass the proton",
    steps: [
      { caption: "An acid is a proton donor and a base is a proton acceptor. Some species can be either, depending on what they meet. Here hydrogen chloride, a strong acid, meets water.",
        footnote: "A proton here means a hydrogen ion, H⁺: a hydrogen atom that has lost its electron." },
      { caption: "HCl hands its proton to water. Water has accepted a proton, so here it's acting as a base, and becomes the hydronium ion, H₃O⁺. HCl becomes chloride, Cl⁻.",
        to: { "#t1": { x: 644 } }, text: { "#hclT": "Cl⁻", "#w1T": "H₃O⁺", "#role": "water is a base here: it accepted a proton" }, dur: 1.2 },
      { caption: "Now water meets ammonia, a base. This time water gives up a proton, so it's acting as an acid, and becomes hydroxide, OH⁻. A species that can both donate and accept protons is amphiprotic. Water is the classic example.",
        footnote: "Amphoteric is a wider word: something that can react as an acid or a base, like aluminium oxide. Amphiprotic means specifically that it can donate or accept a proton.",
        to: { "#sc1": { opacity: 0 }, "#sc2": { opacity: 1 }, "#t2": { x: 644, delay: 0.9 } },
        text: { "#w2T": "OH⁻", "#nh3T": "NH₄⁺", "#what": "water gives a proton to NH₃", "#role": "water is an acid here: it donated a proton", "#sub": "HCO₃⁻ is amphiprotic too" }, dur: 1.8 }
    ]
  });
})();
