// Page 15: equilibrium. Particles keep switching between reactant and product in both directions.
// Tap starts the reaction: over time the two rates balance out, and the split settles into a steady
// ratio, even though individual particles never stop converting back and forth.

(() => {
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 380 };
  const N = 20;
  const RATE_FORWARD = 0.28;  // reactant -> product, per second
  const RATE_REVERSE = 0.14;  // product -> reactant, per second

  let seed = 21;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const expWait = rate => -Math.log(1 - rand()) / rate;

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="420">reactant 20 : 0 product</text>
    <circle class="tap-ring" id="ring" cx="500" cy="250" r="330" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  const start = {
    hotspot: "hit", to: "running", sound: "zwoop", captionAt: 0.4,
    play(ctx) { ctx.data.running = true; ctx.data.t = 0; return gsap.timeline(); }
  };

  const reset = {
    to: "before", sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) {
      const d = ctx.data;
      d.running = false;
      d.particles.forEach(p => {
        if (p.kind !== "reactant") { d.counts[p.kind]--; d.counts.reactant++; p.kind = "reactant"; p.el.setAttribute("fill", "var(--electron)"); }
      });
      ctx.$("#counter").textContent = "reactant " + d.counts.reactant + " : " + d.counts.product + " product";
      return gsap.timeline();
    }
  };

  Book.register({
    id: "equilibrium",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Equilibrium: a reaction that runs both ways at once",
    description: "Twenty particles bouncing in a box, all starting as reactant (blue). Tapping starts the reaction: particles keep switching to product (orange) and back again in both directions, and the running count settles into a steady split even though individual particles never stop converting.",
    svg,
    legend: '<span class="dot" style="width:14px;height:14px;background:var(--electron)" aria-hidden="true"></span>reactant <span class="dot" style="width:14px;height:14px;background:var(--heat)" aria-hidden="true"></span>product',
    start: "before",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to start the reaction", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.running = false;
      d.t = 0;
      d.counts = { reactant: N, product: 0 };
      const layer = ctx.$("#particles");
      for (let i = 0; i < N; i++) {
        const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
        const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
        const angle = rand() * Math.PI * 2, speed = 40 + rand() * 30;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "fade");
        el.setAttribute("r", 7);
        el.setAttribute("fill", "var(--electron)");
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 7, el, kind: "reactant" };
        p.flipAt = expWait(RATE_FORWARD);
        d.particles.push(p);
      }
      const setKind = (p, kind) => {
        d.counts[p.kind]--; p.kind = kind; d.counts[kind]++;
        p.el.setAttribute("fill", kind === "reactant" ? "var(--electron)" : "var(--heat)");
        p.flipAt = d.t + expWait(kind === "reactant" ? RATE_FORWARD : RATE_REVERSE);
        ctx.$("#counter").textContent = "reactant " + d.counts.reactant + " : " + d.counts.product + " product";
      };
      d.render = (time, dt) => {
        if (ctx.reduceMotion) return;
        const step = Math.min(dt, 50) / 1000;
        d.box.step(d.particles, step);
        if (!d.running) return;
        d.t += step;
        d.particles.forEach(p => { if (d.t >= p.flipAt) setKind(p, p.kind === "reactant" ? "product" : "reactant"); });
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      before: {
        caption: "Right now, everything here is reactant. Tap to let the reaction run — forwards and backwards at the same time.",
        tap: start
      },
      running: {
        caption: "Particles keep converting both ways, reactant to product and back again. Watch the count below settle into a steady split.",
        footnote: "That's dynamic equilibrium: the two rates end up equal, so the amounts stop changing, even though individual particles never stop switching.",
        back: reset,
        final: true
      }
    }
  });
})();
