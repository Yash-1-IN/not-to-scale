// Page 14: collision theory. Two kinds of particle bounce around a box. Most collisions just bounce
// off harmlessly; only a fast, hard enough collision actually reacts, turning both into product.
// Tapping heats the mixture: faster particles collide more often, and more of those collisions succeed.

(() => {
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 400 };
  const N_EACH = 7;
  const THRESHOLD_COOL = 230; // relative speed a collision needs to "succeed" while cool
  const THRESHOLD_HOT = 150;  // ...and while hot (still needs some energy, just an easier bar)

  let seed = 13;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="440">reacted so far: 0</text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="260" r="420"/>`;

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { if (p.kind !== "product") { p.vx *= 1.7; p.vy *= 1.7; } });
      ctx.data.threshold = THRESHOLD_HOT;
      // Pulse each particle's own radius attribute rather than a CSS scale: the physics ticker keeps
      // writing cx/cy on these same circles every frame while this plays, and a CSS transform pulsing
      // concurrently with that is exactly what let particles visually drift past the walls.
      const tl = gsap.timeline();
      ctx.data.particles.forEach(p => {
        tl.to(p.el, { attr: { r: p.r * 1.4 }, duration: 0.4, ease: "power2.out" }, 0)
          .to(p.el, { attr: { r: p.r }, duration: 0.4, ease: "power2.in" }, 0.4);
      });
      return tl;
    }
  };

  Book.register({
    id: "collision",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Collision theory: why heating speeds things up",
    description: "Red and blue particles bounce around a box. Most collisions just bounce off, but a fast, hard enough collision turns both particles green, a successful reaction. Tapping heats the mixture, so collisions happen more often and more of them succeed.",
    svg,
    legend: '<span class="dot" style="width:18px;height:18px;background:var(--proton)" aria-hidden="true"></span>reactant A <span class="dot" style="width:12px;height:12px;background:var(--electron);border:2px solid var(--ink)" aria-hidden="true"></span>reactant B <span class="dot" style="width:16px;height:16px;background:var(--product);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "cool",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to heat the mixture", hint: Hint.ring("#ring", "500 260") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.reacted = 0;
      d.threshold = THRESHOLD_COOL;
      const layer = ctx.$("#particles");
      // A, B and product differ by more than colour alone (size, and whether they have an outline),
      // so the page still reads without colour.
      const LOOK = {
        A: { r: 9, fill: "var(--proton)", stroke: "none" },
        B: { r: 6, fill: "var(--electron)", stroke: "var(--ink)" },
        product: { r: 8, fill: "var(--product)", stroke: "#fff" }
      };
      const spawn = kind => {
        const look = LOOK[kind];
        for (let i = 0; i < N_EACH; i++) {
          const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
          const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
          const angle = rand() * Math.PI * 2, speed = 60 + rand() * 40;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          el.setAttribute("class", "fade");
          el.setAttribute("r", look.r);
          el.setAttribute("fill", look.fill);
          el.setAttribute("stroke", look.stroke);
          el.setAttribute("stroke-width", 2);
          el.setAttribute("cx", x); el.setAttribute("cy", y);
          layer.appendChild(el);
          d.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: look.r, el, kind });
        }
      };
      spawn("A");
      spawn("B");

      const onCollide = (a, b, speed) => {
        if (a.kind === "product" || b.kind === "product" || a.kind === b.kind) return;
        if (speed < d.threshold) return;
        [a, b].forEach(p => {
          p.kind = "product"; p.r = LOOK.product.r;
          p.el.setAttribute("fill", LOOK.product.fill);
          p.el.setAttribute("stroke", LOOK.product.stroke);
          p.el.setAttribute("r", LOOK.product.r);
          // The new radius can be bigger than the one that was inside the walls a moment ago —
          // reclamp now rather than waiting for next frame's step() to catch it.
          p.x = Math.min(Math.max(p.x, BOX.x0 + p.r), BOX.x1 - p.r);
          p.y = Math.min(Math.max(p.y, BOX.y0 + p.r), BOX.y1 - p.r);
          p.el.setAttribute("cx", p.x.toFixed(1));
          p.el.setAttribute("cy", p.y.toFixed(1));
        });
        d.reacted += 2;
        ctx.$("#counter").textContent = "reacted so far: " + d.reacted;
        Sound.pop();
      };
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.particles, Math.min(dt, 50) / 1000, onCollide);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      cool: {
        caption: "Only a fast, head-on enough collision actually reacts — most just bounce off. Tap to heat things up.",
        footnote: "This is collision theory: particles must collide with enough energy, not just collide at all.",
        tap: heat
      },
      hot: {
        caption: "Heating makes particles move faster. They collide more often, and more of those collisions now have enough energy to react.",
        footnote: "That combination — more collisions, and a bigger share of them succeeding — is why heating speeds a reaction up so much.",
        final: true
      }
    }
  });
})();
