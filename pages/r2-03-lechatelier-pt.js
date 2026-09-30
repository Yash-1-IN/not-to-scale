// Le Châtelier's principle for pressure and temperature: N2O4 (colourless) ⇌ 2 NO2 (brown), ΔH = +57 kJ/mol.
// A gas in a container with a plunger. Every N2O4 splits with probability kf·dt and every pair of NO2
// recombines at a rate kr·(pairs)·(V0/V), so squeezing the gas favours the side with fewer particles
// (N2O4), and heating raises kf much more than kr (the forward reaction is endothermic), favouring NO2.
// The particles' colours, counts and the box's tint come straight from the running simulation.

(() => {
  const K = Kit, C = K.C, BR = "#9C4A2A";
  const BX0 = 260, BX1 = 740, BY1 = 400, H0 = 200, LID_H = 14;
  const A_LOOK = { r: 14, fill: "#E7EAF0", stroke: "#8B8590" };
  const B_LOOK = { r: 8, fill: BR, stroke: "none" };
  
  // Conditions for each step: plunger height (1 = start), particle speed, forward and reverse rate constants.
  const COND = [
    { h: 1, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 0.4, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 1.6, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 1, speed: 135, kf: 1.5, kr: 0.019 },
    { h: 1, speed: 45, kf: 0.09, kr: 0.0115 }
  ];

  const svg = `
    <rect id="tint" x="${BX0 + 2}" y="${BY1 - H0}" width="${BX1 - BX0 - 4}" height="${H0}" fill="${BR}" fill-opacity="0.1"/>
    <path class="fade" d="M ${BX0} 60 L ${BX0} ${BY1} L ${BX1} ${BY1} L ${BX1} 60" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <g id="pl" class="fade">
      <rect id="lid" x="${BX0 + 2}" y="${BY1 - H0 - LID_H}" width="${BX1 - BX0 - 4}" height="${LID_H}" fill="#6B6672"/>
      <line id="rod" x1="500" y1="${BY1 - H0 - LID_H}" x2="500" y2="${BY1 - H0 - LID_H - 42}" stroke="#6B6672" stroke-width="8" stroke-linecap="round"/>
      <rect id="handle" x="450" y="${BY1 - H0 - LID_H - 54}" width="100" height="14" rx="7" fill="#3A3540"/>
    </g>
    <g id="ps"></g>
    ${K.g("flame", 500, 432, `<path d="M -26 38 Q -34 8 -12 -14 Q -8 10 0 4 Q 6 -22 14 -32 Q 34 4 26 38 Z" fill="${C.heat}"/><path d="M -10 38 Q -14 20 -2 10 Q 4 24 10 38 Z" fill="#F5B841"/>`, "", 'opacity="0"')}
    ${K.g("ice", 500, 430, [-70, -22, 26].map(x => `<rect x="${x}" y="-16" width="44" height="34" rx="6" fill="#BFE3FA" stroke="#5A93C8" stroke-width="2.5"/>`).join(""), "", 'opacity="0"')}
    ${K.t(140, 110, "N₂O₄ ⇌ 2NO₂", "atom-name fade")}${K.t(140, 142, "ΔH = +57 kJ mol⁻¹", "graph-label fade")}
    ${K.c(60, 205, A_LOOK.r, A_LOOK.fill, `stroke="${A_LOOK.stroke}" stroke-width="2.5" class="fade"`)}${K.t(92, 211, "", "molecule-label", 'id="cA" style="text-anchor:start"')}
    ${K.c(60, 262, B_LOOK.r, B_LOOK.fill, 'class="fade"')}${K.t(92, 268, "", "molecule-label", 'id="cB" style="text-anchor:start"')}
    ${K.t(780, 205, "volume: normal", "molecule-label fade", 'id="vol" style="text-anchor:start"')}
    ${K.t(780, 250, "temperature: normal", "molecule-label fade", 'id="tmp" style="text-anchor:start"')}`;

  const step = (i, o) => ({
    ...o,
    run(ctx, tl, dir) {
      const c = COND[dir === "fwd" ? i : i - 1];
      tl.to(ctx.data.env, { ...c, duration: 1.6, ease: "power2.inOut" }, 0);
    }
  });

  K.page({
    id: "lechatelier-pt",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Le Châtelier: pressure and temperature",
    description: "A gas in a container with a plunger, at equilibrium: large pale N2O4 particles and pairs of small brown NO2 particles converting into each other, the mixture tinted brown by the NO2. Tapping pushes the plunger in, raising the pressure: the equilibrium shifts to the side with fewer particles and the brown fades as pairs join into N2O4. Tapping again pulls the plunger out, lowering the pressure, so N2O4 splits into more NO2. A further tap resets the volume and heats the container with a flame: the endothermic forward reaction speeds up and the mixture turns darker brown. A last tap cools it with ice, and the equilibrium shifts back towards N2O4.",
    svg, bounds: [30, 30, 950, 470], tapLabel: "Tap to squeeze the gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(17);
      d.env = { ...COND[0] };
      d.list = [];
      d.rand = rand;
      d.n = { a: 0, b: 0 };
      const layer = ctx.$("#ps");
      const make = (kind, x, y, fresh) => {
        const look = kind === "A" ? A_LOOK : B_LOOK, el = document.createElementNS(K.NS, "circle");
        el.setAttribute("r", look.r); el.setAttribute("fill", look.fill);
        if (look.stroke !== "none") { el.setAttribute("stroke", look.stroke); el.setAttribute("stroke-width", 2.5); }
        if (!fresh) el.setAttribute("class", "fade");
        const a = rand() * Math.PI * 2, s = COND[0].speed * (0.7 + rand() * 0.6);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        const p = { kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: look.r, el };
        d.list.push(p);
        return p;
      };
      const setKind = (p, kind) => {
        const look = kind === "A" ? A_LOOK : B_LOOK;
        p.kind = kind; p.r = look.r;
        p.el.setAttribute("r", look.r); p.el.setAttribute("fill", look.fill);
        if (look.stroke !== "none") { p.el.setAttribute("stroke", look.stroke); p.el.setAttribute("stroke-width", 2.5); } else p.el.removeAttribute("stroke");
      };
      const inBox = (x0, x1, y0, y1, r) => [x0 + r + rand() * (x1 - x0 - 2 * r), y0 + r + rand() * (y1 - y0 - 2 * r)];
      for (let i = 0; i < 10; i++) make("A", ...inBox(BX0, BX1, BY1 - H0, BY1, 14), false);
      for (let i = 0; i < 24; i++) make("B", ...inBox(BX0, BX1, BY1 - H0, BY1, 8), false);

      const counts = () => {
        d.n.a = d.list.filter(p => p.kind === "A").length; d.n.b = d.list.length - d.n.a;
        ctx.$("#cA").textContent = "N₂O₄: " + d.n.a; ctx.$("#cB").textContent = "NO₂: " + d.n.b;
      };
      counts();

      K.tick(ctx, dt => {
        const e = d.env, top = BY1 - H0 * e.h, box = { x0: BX0, x1: BX1, y0: top, y1: BY1 };
        K.setSpeed(d.list, e.speed, Math.min(1, dt * 3));
        K.bounce(d.list, box, dt);
        // reactions
        let changed = false;
        d.list.slice().forEach(p => {
          if (p.kind === "A" && rand() < e.kf * dt) {          // N2O4 → 2 NO2
            setKind(p, "B");
            const q = make("B", p.x, p.y, true), a = rand() * Math.PI * 2;
            q.vx = Math.cos(a) * e.speed; q.vy = Math.sin(a) * e.speed; p.vx = -q.vx; p.vy = -q.vy;
            changed = true;
          }
        });
        const bs = d.list.filter(p => p.kind === "B"), pairs = bs.length * (bs.length - 1) / 2;
        if (bs.length >= 2 && rand() < e.kr * pairs / e.h * dt) {  // 2 NO2 → N2O4 (denser gas: more often)
          const i = Math.floor(rand() * bs.length); let j = Math.floor(rand() * (bs.length - 1)); if (j >= i) j++;
          const a = bs[i], b = bs[j];
          setKind(a, "A"); a.x = (a.x + b.x) / 2; a.y = Math.min(BY1 - a.r, Math.max(top + a.r, (a.y + b.y) / 2));
          b.el.remove(); d.list.splice(d.list.indexOf(b), 1);
          changed = true;
        }
        if (changed) counts();
        // the plunger and the colour of the gas (which follows the concentration of NO2)
        ctx.$("#lid").setAttribute("y", top - LID_H);
        ctx.$("#rod").setAttribute("y1", top - LID_H); ctx.$("#rod").setAttribute("y2", top - LID_H - 42);
        ctx.$("#handle").setAttribute("y", top - LID_H - 54);
        const tint = ctx.$("#tint");
        tint.setAttribute("y", top); tint.setAttribute("height", BY1 - top);
        tint.setAttribute("fill-opacity", Math.min(0.75, 0.04 + 0.55 * (d.n.b / e.h) / 60).toFixed(3));
      });
    },

    steps: [
      { caption: "Here is a real equilibrium: N₂O₄ ⇌ 2NO₂, in a gas syringe. N₂O₄ is colourless and NO₂ is brown, so the colour of the gas shows where the equilibrium sits. Notice one gas particle on the left becomes two on the right.",
        footnote: "The forward reaction (N₂O₄ → 2NO₂) absorbs heat: it is endothermic, ΔH ≈ +57 kJ mol⁻¹. (Value not from the data booklet.)" },
      step(1, { caption: "Push the plunger in: the same particles in less space, so the pressure goes up. The system pushes back by shifting to the side with fewer gas particles, which means fewer collisions with the walls. Two NO₂ join up into one N₂O₄, and the brown fades.",
        footnote: "Right at the moment of squeezing the gas gets darker, because everything is more concentrated. Only afterwards does it fade as the equilibrium shifts.",
        text: { "#vol": "volume: squeezed" }, dur: 1.6 }),
      step(2, { caption: "Pull the plunger out: more space, lower pressure. Now the system shifts to the side with more gas particles, so N₂O₄ splits into NO₂ and the gas gets browner.",
        footnote: "If both sides had the same number of gas particles, pressure would have no effect on the position of the equilibrium.",
        text: { "#vol": "volume: expanded" }, dur: 1.6 }),
      step(3, { caption: "Now put the plunger back to the start and heat the container. The forward reaction absorbs heat, so the system shifts forward to use some of the extra heat up: more NO₂, a darker brown. Unlike pressure, a temperature change changes the value of K.",
        footnote: "Raising the temperature favours the endothermic direction.",
        to: { "#flame": { opacity: 1 } }, text: { "#vol": "volume: normal", "#tmp": "temperature: hot" }, dur: 1.6 }),
      step(4, { caption: "Take the flame away and cool it in ice. The system shifts in the exothermic direction, releasing heat to oppose the cooling: back towards N₂O₄, and the brown fades. K gets smaller.",
        footnote: "A catalyst would not shift the equilibrium at all: it speeds up both directions equally.",
        to: { "#flame": { opacity: 0 }, "#ice": { opacity: 1 } }, text: { "#tmp": "temperature: cold" }, dur: 1.6 })
    ]
  });
})();
