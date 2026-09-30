// Orbitals: the fuzzy cloud from page 1 has a name. s is a sphere, p is a dumbbell in three directions,
// and each orbital holds at most two electrons.

(() => {
  const K = Kit, C = K.C, rand = K.rng(11);
  const dot = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + rand() * 1.6).toFixed(1)}" fill="${C.electron}" opacity="${(0.3 + rand() * 0.45).toFixed(2)}"/>`;
  const sub = s => `<tspan dy="5" style="font-size:0.7em">${s}</tspan>`;

  // s: dots at a distance following r² e^(-2r/a), in a random 3D direction, flattened to 2D.
  let s = "";
  for (let n = 0; n < 190;) {
    const rr = -22 * (Math.log(1 - rand()) + Math.log(1 - rand()) + Math.log(1 - rand()));
    if (rr > 100) continue;
    const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = 2 * Math.PI * rand();
    s += dot(rr * st * Math.cos(ph), rr * st * Math.sin(ph)); n++;
  }
  // p: two lobes, dots spread through an ellipse either side of the middle, then turned by `deg`.
  function dumbbell(deg) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let out = "";
    [-1, 1].forEach(side => {
      for (let n = 0; n < 60;) {
        const u = 2 * rand() - 1, v = 2 * rand() - 1;
        if (u * u + v * v > 1) continue;
        const px = side * 54 + u * 46, py = v * 25;
        out += dot(px * ca - py * sa, px * sa + py * ca); n++;
      }
    });
    return out;
  }
  const box = (x, y) => `<g class="orbBox" opacity="0"><rect x="${x - 22}" y="${y}" width="44" height="34" rx="5" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x, y + 23, "↑↓", "molecule-label")}</g>`;

  const svg = `
    ${K.g("sOrb", 190, 205, s)}
    ${K.t(190, 328, "s orbital", "atom-name fade")}
    ${K.g("px", 430, 205, dumbbell(0), "", 'opacity="0"')}${K.g("py", 580, 205, dumbbell(90), "", 'opacity="0"')}${K.g("pz", 730, 205, dumbbell(-35), "", 'opacity="0"')}
    ${K.t(430, 328, "p" + sub("x"), "atom-name pLab", 'opacity="0"')}
    ${K.t(580, 328, "p" + sub("y"), "atom-name pLab", 'opacity="0"')}
    ${K.t(730, 328, "p" + sub("z"), "atom-name pLab", 'opacity="0"')}
    ${box(190, 352)}${box(430, 352)}${box(580, 352)}${box(730, 352)}
    ${K.t(190, 412, "1 orbital · 2 e⁻", "graph-label orbBox", 'opacity="0"')}
    ${K.t(580, 412, "3 orbitals · 6 e⁻", "graph-label orbBox", 'opacity="0"')}`;

  K.page({
    id: "orbitals",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Orbitals: the shapes of the clouds",
    description: "A fuzzy blue cloud of dots shaped like a sphere, labelled s orbital. Tapping adds three dumbbell-shaped clouds side by side, one lying along each direction, labelled p x, p y and p z. Tapping again draws a box with two arrows under each orbital to show that every orbital holds at most two electrons: one s orbital holds 2, three p orbitals hold 6.",
    svg, bounds: [80, 100, 830, 425], tapLabel: "Tap to reveal more orbitals",
    steps: [
      { caption: "Remember the fuzzy cloud from the first page? Its proper name is an orbital: a region of space where an electron is likely to be found. This shape, a sphere, is an s orbital.",
        footnote: "Denser dots mean the electron is more likely to be found there. It's a picture of probability, not a picture of an electron's path." },
      { caption: "Not every orbital is a sphere. A p orbital has two lobes, like a dumbbell, and the three p orbitals point in three directions at right angles: p" + sub("x") + ", p" + sub("y") + " and p" + sub("z") + ".",
        footnote: "p" + sub("z") + " really points toward you, out of the page. It's drawn slanted so you can see it.",
        to: { "#px": { opacity: 1 }, "#py": { opacity: 1, delay: 0.25 }, "#pz": { opacity: 1, delay: 0.5 }, ".pLab": { opacity: 1, delay: 0.6, stagger: 0.15 } } },
      { caption: "An orbital can hold at most two electrons, with opposite spins. So one s orbital holds 2 electrons and the three p orbitals together hold 6.",
        footnote: "Next come five d orbitals (10 electrons) and seven f orbitals (14).",
        to: { ".orbBox": { opacity: 1, stagger: 0.12 } } }
    ]
  });
})();
