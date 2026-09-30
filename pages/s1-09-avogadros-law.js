// Avogadro's law: equal volumes of gases, same temperature and pressure, hold equal numbers of
// particles. Then double the particles in one cylinder and the piston moves out to double the volume.

(() => {
  const K = Kit, C = K.C;
  const A = { x0: 80, y0: 170, x1: 320, y1: 400 };      // x1 moves with the piston
  const B = { x0: 680, y0: 170, x1: 920, y1: 400 };
  const HE = { r: 9, fill: C.ion }, CO2 = { r: 14, fill: C.heat, stroke: "#fff", sw: 2 };

  const svg = `
    <path class="fade" d="M ${B.x0} ${B.y0} L ${B.x1} ${B.y0} L ${B.x1} ${B.y1} L ${B.x0} ${B.y1} Z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <path class="fade" d="M 570 ${A.y0} L ${A.x0} ${A.y0} L ${A.x0} ${A.y1} L 570 ${A.y1}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="psA"></g><g id="psB"></g>
    ${K.g("pistonA", 320, 0, `<line x1="0" y1="${A.y0}" x2="0" y2="${A.y1}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="285" x2="46" y2="285" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(200, 448, "8 helium atoms", "graph-label fade", 'id="nA"')}${K.t(800, 448, "8 carbon dioxide molecules", "graph-label fade")}
    ${K.t(200, 148, "helium (He)", "molecule-label fade")}${K.t(800, 148, "carbon dioxide (CO₂)", "molecule-label fade")}`;

  K.page({
    id: "avogadros-law",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Avogadro's law: equal volumes, equal numbers",
    description: "Two cylinders of gas of equal size: the left holds 8 small helium atoms and the right holds 8 bigger carbon dioxide molecules. Tapping adds 8 more helium atoms to the left cylinder and its piston slides out to double the volume, keeping the same temperature and pressure.",
    svg, bounds: [70, 130, 930, 460], tapLabel: "Tap to add more gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(9);
      d.a = A; d.boxA = { ...A }; d.boxB = { ...B };
      d.pa = K.spawn(ctx, "#psA", 8, { ...HE, cls: "fade" }, d.boxA, rand, 70);
      d.pb = K.spawn(ctx, "#psB", 8, { ...CO2, cls: "fade" }, d.boxB, rand, 70);
      d.extra = [];
      K.tick(ctx, dt => { K.bounce(d.pa.concat(d.extra), d.boxA, dt); K.bounce(d.pb, d.boxB, dt); });
    },

    steps: [
      { caption: "Two gases in equal-sized containers, at the same temperature and pressure: 8 helium atoms on the left, 8 carbon dioxide molecules on the right. Avogadro's law says equal volumes of gases hold equal numbers of particles, whatever the gas.",
        footnote: "The carbon dioxide molecules are drawn bigger, but in a gas the particles are so far apart that their size hardly matters." },
      { caption: "Now put twice as much gas in the left cylinder, keeping the temperature and pressure the same. The piston has to move out to double the volume: volume is proportional to the amount of gas, V ∝ n.",
        footnote: "At standard temperature and pressure, one mole of any ideal gas takes up 22.7 dm³.",
        booklet: "§2: molar volume of an ideal gas at STP, 22.7 dm³ mol⁻¹. §4: STP is 273.15 K and 100 kPa.",
        to: { "#pistonA": { x: 570 } }, text: { "#nA": "16 helium atoms" }, dur: 1.4,
        run(ctx, tl, dir) {
          const d = ctx.data;
          if (dir === "fwd") {
            const fresh = K.spawn(ctx, "#psA", 8, { ...HE, fade: true }, { x0: A.x0, y0: A.y0, x1: 320, y1: A.y1 }, K.rng(21), 70);
            d.extra = fresh;
            tl.to(fresh.map(p => p.el), { opacity: 1, duration: 0.5 }, 0).to(d.boxA, { x1: 570, duration: 1.4, ease: "power2.inOut" }, 0);
          } else {
            const gone = d.extra;
            tl.to(d.boxA, { x1: 320, duration: 0.9, ease: "power2.inOut" }, 0)
              .to(gone.map(p => p.el), { opacity: 0, duration: 0.5 }, 0.3)
              .call(() => { gone.forEach(p => p.el.remove()); if (d.extra === gone) d.extra = []; }, null, 0.9);
          }
        } }
    ]
  });
})();
