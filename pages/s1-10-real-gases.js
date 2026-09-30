// Real gases: an ideal gas is tiny particles that never attract each other. Squeeze it (high pressure)
// and the particles' own size matters; cool it (low temperature) and their attractions matter.

(() => {
  const K = Kit, C = K.C;
  const TOP = 150, BOT = 390, LEFT = 140, WIDE = 760, TIGHT = 340, R = 10;
  const share = w => Math.round(100 * 14 * Math.PI * R * R / (w - LEFT) / (BOT - TOP));

  const svg = `
    <path class="fade" d="M ${WIDE + 30} ${TOP} L ${LEFT} ${TOP} L ${LEFT} ${BOT} L ${WIDE + 30} ${BOT}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="halos" opacity="0"></g><g id="ps"></g>
    ${K.g("piston", WIDE, 0, `<line x1="0" y1="${TOP}" x2="0" y2="${BOT}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="270" x2="46" y2="270" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(500, 440, "ideal gas: tiny particles, no forces between them", "molecule-label fade", 'id="tag"')}
    ${K.t(500, 122, "the particles fill about " + share(WIDE) + " % of the space", "graph-label fade", 'id="fill"')}`;

  K.page({
    id: "real-gases",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Real gases: when particles get in each other's way",
    description: "A cylinder with a piston, holding 14 particles bouncing freely: the ideal gas model. Tapping pushes the piston in, so the particles fill a much bigger share of the space. Tapping again slows the particles and draws a pale halo round each one to show the attractions between real particles that matter at low temperature.",
    svg, bounds: [130, 110, 810, 460], tapLabel: "Tap to squeeze or cool the gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(14);
      d.box = { x0: LEFT, y0: TOP, x1: WIDE, y1: BOT };
      d.speed = 90;
      d.list = K.spawn(ctx, "#ps", 14, { r: R, fill: C.ion, cls: "fade" }, d.box, rand, 90);
      d.halos = d.list.map(() => {
        const h = document.createElementNS(K.NS, "circle");
        h.setAttribute("r", 26); h.setAttribute("fill", C.violet); h.setAttribute("opacity", 0.16);
        ctx.$("#halos").appendChild(h);
        return h;
      });
      K.tick(ctx, dt => {
        K.setSpeed(d.list, d.speed, Math.min(1, dt * 3));
        K.bounce(d.list, d.box, dt);
        d.list.forEach((p, i) => { d.halos[i].setAttribute("cx", p.x); d.halos[i].setAttribute("cy", p.y); });
      });
    },

    steps: [
      { caption: "The ideal gas is a simple model: particles so small they take up no space, and that never attract or repel each other. Real gases behave almost like this at low pressure and high temperature.",
        footnote: "Here the particles are drawn much bigger than in real life, so you can see the effect." },
      { caption: "Squeeze the gas at high pressure and the particles' own size stops being negligible: they fill a real share of the space, so there's less room to move than the ideal gas law assumes.",
        to: { "#piston": { x: TIGHT } }, text: { "#fill": "the particles fill about " + share(TIGHT) + " % of the space" }, dur: 1.4,
        run(ctx, tl, dir) { tl.to(ctx.data.box, { x1: dir === "fwd" ? TIGHT : WIDE, duration: dir === "fwd" ? 1.4 : 0.9, ease: "power2.inOut" }, 0); } },
      { caption: "Cool it and the particles slow down so much that their weak attractions matter. They pull on each other and hit the walls less hard, so the pressure is lower than the ideal gas law predicts. Cool enough and the gas condenses to a liquid.",
        to: { "#halos": { opacity: 1 } }, text: { "#tag": "real gas: particles that attract each other" },
        run(ctx, tl, dir) { tl.to(ctx.data, { speed: dir === "fwd" ? 28 : 90, duration: 1.2 }, 0); } }
    ]
  });
})();
