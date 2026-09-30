// Le Châtelier's principle. A box already at equilibrium (equal forward and reverse rates, so it sits
// near half and half). Tap to pour in extra reactant: more converts forward than back until the split
// evens out again. Tap to take all the product away: the reaction makes more to replace it. Each
// particle flips on its own random clock, so the shift is real behaviour, not a scripted animation.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 380 };
  const RATE = 0.22;          // per second, both directions (so K = 1: equilibrium at equal amounts)
  const START = 20, ADD = 10;

  let seed = 29;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const expWait = () => -Math.log(1 - rand()) / RATE;

  // Same looks as the equilibrium page: they differ in size and outline, not just colour.
  const LOOK = {
    reactant: { r: 6, fill: "var(--electron)", stroke: "none" },
    product: { r: 9, fill: "var(--heat)", stroke: "#fff" }
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="420"></text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  function showCount(ctx) {
    const d = ctx.data;
    const r = d.particles.filter(p => p.kind === "reactant").length;
    ctx.$("#counter").textContent = "reactant " + r + " : " + (d.particles.length - r) + " product";
  }

  function paint(p) {
    const look = LOOK[p.kind];
    p.r = look.r;
    p.el.setAttribute("fill", look.fill);
    p.el.setAttribute("stroke", look.stroke);
    p.el.setAttribute("r", look.r);
  }

  // Adds a particle somewhere inside the box; `hidden` ones start transparent so they can fade in.
  function spawn(ctx, kind, hidden) {
    const d = ctx.data;
    const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
    const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
    const angle = rand() * Math.PI * 2, speed = 40 + rand() * 30;
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("stroke-width", 2);
    el.setAttribute("cx", x); el.setAttribute("cy", y);
    if (hidden) el.setAttribute("opacity", 0);
    ctx.$("#particles").appendChild(el);
    const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, el, kind, flipAt: d.t + expWait() };
    paint(p);
    d.particles.push(p);
    return p;
  }

  function removeParticles(ctx, list) {
    const d = ctx.data;
    list.forEach(p => p.el.remove());
    d.particles = d.particles.filter(p => !list.includes(p));
    showCount(ctx);
  }

  // Pour in `n` particles of one kind: they fade in, then join the simulation.
  function pourIn(ctx, kind, n) {
    const tl = gsap.timeline();
    const fresh = [];
    for (let i = 0; i < n; i++) fresh.push(spawn(ctx, kind, true));
    showCount(ctx);
    fresh.forEach((p, i) => tl.to(p.el, { opacity: 1, duration: 0.3 }, i * 0.05));
    tl.call(() => Sound.pop(), null, 0);
    return tl;
  }

  // Take away particles of one kind (all of them, or `n` of them): they fade out, then leave.
  function takeOut(ctx, kind, n) {
    const d = ctx.data;
    let list = d.particles.filter(p => p.kind === kind);
    if (n !== undefined) list = list.slice(0, n);
    list.forEach(p => { p.flipAt = Infinity; }); // leaving: don't let them switch kind on the way out
    const tl = gsap.timeline();
    list.forEach((p, i) => tl.to(p.el, { opacity: 0, duration: 0.3 }, i * 0.03));
    tl.call(() => removeParticles(ctx, list));
    return tl;
  }

  const addReactant = {
    hotspot: "hit", to: "added", sound: "pop", captionAt: 0.6,
    play(ctx) { ctx.data.lastAdded = ADD; return pourIn(ctx, "reactant", ADD); }
  };
  const removeProduct = {
    hotspot: "hit", to: "removed", sound: "zwoop-rev", captionAt: 0.6,
    play(ctx) {
      ctx.data.lastRemoved = ctx.data.particles.filter(p => p.kind === "product").length;
      return takeOut(ctx, "product");
    }
  };
  const undoAdd = {
    to: "steady", sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) { return takeOut(ctx, "reactant", ctx.data.lastAdded || ADD); }
  };
  const undoRemove = {
    to: "added", sound: "pop", captionAt: 0.4,
    play(ctx) { return pourIn(ctx, "product", ctx.data.lastRemoved || 0); }
  };

  Book.register({
    id: "lechatelier",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Le Châtelier's principle: pushing back against a change",
    description: "A box of twenty particles already at equilibrium, about half reactant (small blue) and half product (larger orange), converting both ways all the time. Tapping pours in ten more reactant: for a while more particles convert forward than back, until the split evens out again with more of both. Tapping again removes every product particle: the reactant starts converting to replace it, until the split evens out once more.",
    svg,
    legend: '<span class="dot" style="width:12px;height:12px;background:var(--electron)" aria-hidden="true"></span>reactant <span class="dot" style="width:18px;height:18px;background:var(--heat);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "steady",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to disturb the equilibrium", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.t = 0;
      for (let i = 0; i < START; i++) spawn(ctx, i % 2 ? "product" : "reactant", false);
      d.particles.forEach(p => p.el.setAttribute("class", "fade"));
      showCount(ctx);
      d.render = (time, dt) => {
        if (ctx.reduceMotion) return;
        const step = Math.min(dt, 50) / 1000;
        d.box.step(d.particles, step);
        d.t += step;
        let flipped = false;
        d.particles.forEach(p => {
          if (d.t < p.flipAt) return;
          p.kind = p.kind === "reactant" ? "product" : "reactant";
          paint(p);
          p.x = Math.min(Math.max(p.x, BOX.x0 + p.r), BOX.x1 - p.r); // a bigger radius might not fit where it is
          p.y = Math.min(Math.max(p.y, BOX.y0 + p.r), BOX.y1 - p.r);
          p.flipAt = d.t + expWait();
          flipped = true;
        });
        if (flipped) showCount(ctx);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      steady: {
        caption: "This mixture is already at equilibrium: roughly half reactant, half product, converting both ways at the same rate. Tap to pour in more reactant.",
        footnote: "Nothing looks like it's changing overall, but every particle is still flipping back and forth.",
        tap: addReactant
      },
      added: {
        caption: "Extra reactant tips the balance: for a while more particles convert forward than back, until the split evens out again — now with more of both.",
        footnote: "That's Le Châtelier's principle: when you change an equilibrium, it shifts to partly undo the change. Here it uses up some of the reactant you added. Tap to take the product away.",
        tap: removeProduct,
        back: undoAdd
      },
      removed: {
        caption: "With the product gone, only the forward direction has anything to work with, so product builds up again until the two sides even out.",
        footnote: "Adding or removing a substance shifts where the equilibrium sits, but the ratio it settles at — the equilibrium constant, K — doesn't change. Only a change of temperature changes K.",
        back: undoRemove,
        final: true
      }
    }
  });
})();
