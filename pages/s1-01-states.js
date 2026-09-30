// Solid, liquid, gas: the same 28 particles, held in a grid, forming a layer across the bottom of the
// container (a liquid takes the container's shape, keeping its volume), or filling the whole box.

(() => {
  const K = Kit, C = K.C;
  const BOX = { x0: 200, y0: 110, x1: 800, y1: 410 };
  const LIQ = { x0: 200, y0: 318, x1: 800, y1: 410 };   // full width of the container, same volume
  const R = 18, COLS = 7, ROWS = 4, SP = 40;

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <rect id="liqfill" x="${BOX.x0}" y="${LIQ.y0}" width="${BOX.x1 - BOX.x0}" height="${LIQ.y1 - LIQ.y0}" fill="${C.ion}" fill-opacity="0.16" opacity="0"/>
    <g id="ps"></g>
    ${K.t(500, 452, "solid", "atom-name fade", 'id="stateLabel"')}`;

  K.page({
    id: "states",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Particles and the states of matter",
    description: "A box of 28 particles. At first they sit packed in a regular grid at the bottom, only vibrating: a solid. Tapping heats them: they break out of the grid and slide past each other in a layer spread across the whole width of the bottom of the box, taking the shape of the container: a liquid. Tapping again, they fly apart and fill the whole box: a gas.",
    svg, bounds: [200, 110, 800, 460], tapLabel: "Tap to heat the particles",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(5);
      d.mode = 0; d.time = 0;
      d.list = K.spawn(ctx, "#ps", COLS * ROWS, { r: R, fill: C.ion, cls: "fade" }, BOX, rand, 45);
      d.list.forEach((p, i) => {
        p.hx = 500 + ((i % COLS) - (COLS - 1) / 2) * SP;
        p.hy = BOX.y1 - R - 3 - Math.floor(i / COLS) * SP;
        p.x = p.hx; p.y = p.hy;
        p.el.setAttribute("cx", p.x); p.el.setAttribute("cy", p.y);
      });
      K.tick(ctx, dt => {
        d.time += dt;
        const ps = d.list, k = Math.min(1, dt * 8);
        if (d.mode === 0) {
          ps.forEach((p, i) => {
            p.x += (p.hx + Math.sin(d.time * 9 + i * 1.7) * 2.2 - p.x) * k;
            p.y += (p.hy + Math.cos(d.time * 8 + i * 2.3) * 2.2 - p.y) * k;
            p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1));
          });
          return;
        }
        const box = d.mode === 1 ? LIQ : BOX;
        K.setSpeed(ps, d.mode === 1 ? 70 : 130, Math.min(1, dt * 2));
        if (d.mode === 1) {   // liquid: particles touch and can't overlap, so they spread across the bottom
          for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
            const dx = ps[b].x - ps[a].x, dy = ps[b].y - ps[a].y, dist = Math.hypot(dx, dy) || 0.01, min = 2 * R;
            const ux = dx / dist, uy = dy / dist;
            if (dist < min) {
              const push = (min - dist) / 2;
              ps[a].x -= ux * push; ps[a].y -= uy * push; ps[b].x += ux * push; ps[b].y += uy * push;
            }
            if (dist < 90) {   // a gentle push between near neighbours, so the layer spreads out to fill the bottom
              const f = (90 - dist) / 90 * 260 * dt;
              ps[a].vx -= ux * f; ps[b].vx += ux * f;
            }
          }
          ps.forEach(p => {   // the pushes must never move a particle through the container's walls
            p.x = Math.min(BOX.x1 - R, Math.max(BOX.x0 + R, p.x)); p.y = Math.min(BOX.y1 - R, p.y);
          });
        }
        ps.forEach(p => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          // Outside the (new) box the particle is pulled back in; inside, it bounces off the walls.
          if (p.x - p.r < box.x0) { if (p.x < box.x0 - 2) p.vx += 500 * dt; else if (p.vx < 0) p.vx = -p.vx; }
          if (p.x + p.r > box.x1) { if (p.x > box.x1 + 2) p.vx -= 500 * dt; else if (p.vx > 0) p.vx = -p.vx; }
          if (p.y - p.r < box.y0) { if (p.y < box.y0 - 2) p.vy += 500 * dt; else if (p.vy < 0) p.vy = -p.vy; }
          if (p.y + p.r > box.y1) { if (p.y > box.y1 + 2) p.vy -= 500 * dt; else if (p.vy > 0) p.vy = -p.vy; }
          p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1));
        });
      });
    },

    steps: [
      { caption: "This is a solid: the particles are packed close together in a regular pattern. They vibrate on the spot but can't swap places, so a solid keeps its shape and its volume.",
        footnote: "Real particles are far smaller than these, and there are unimaginably more of them — not to scale, of course." },
      { caption: "Heat it and the particles vibrate harder until they break free of their fixed places. In a liquid they still touch, but slide past each other: it flows and spreads out to take the shape of its container, filling the bottom of it, yet keeps its volume.",
        to: { "#liqfill": { opacity: 1 } }, text: { "#stateLabel": "liquid" }, dur: 0.6, run(ctx, tl, dir) { tl.call(() => { ctx.data.mode = dir === "fwd" ? 1 : 0; }, null, 0); } },
      { caption: "Heat it more and the particles fly apart, far from each other and moving fast. A gas has no fixed shape or volume: it fills whatever container it is in.",
        footnote: "In a real gas at everyday pressure, the gaps between particles are much bigger than the particles themselves — bigger than we can draw here.",
        to: { "#liqfill": { opacity: 0 } }, text: { "#stateLabel": "gas" }, dur: 0.6, run(ctx, tl, dir) { tl.call(() => { ctx.data.mode = dir === "fwd" ? 2 : 1; }, null, 0); } }
    ]
  });
})();
