// Page 15: equilibrium. Particles keep switching between reactant and product in both directions.
// Tap starts a reaction with equal forward/reverse rates, settling close to half and half. Further
// taps swap in a reaction with skewed rate constants, so the same particles resettle favouring
// product, then favouring reactant — the equilibrium constant K, shown as a live shift rather than
// three separate reactions.

(() => {
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 380 };
  const N = 20;
  // Three reactions that differ only in their rate constants — the whole idea behind an equilibrium
  // constant K = rateF/rateR. Equal rates settle close to half and half; skewed rates settle skewed.
  const SCENARIOS = {
    balanced: { rateF: 0.22, rateR: 0.22 },
    favorsProduct: { rateF: 0.34, rateR: 0.09 },
    favorsReactant: { rateF: 0.09, rateR: 0.34 }
  };

  let seed = 21;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const expWait = rate => -Math.log(1 - rand()) / rate;

  // Reactant and product differ by more than colour (size, and an outline on product), so the
  // page still reads without colour.
  const LOOK = {
    reactant: { r: 6, fill: "var(--electron)", stroke: "none" },
    product: { r: 9, fill: "var(--heat)", stroke: "#fff" }
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="420">reactant 20 : 0 product</text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  // Re-aims every particle's next flip at the new rates (exponential waits are memoryless, so this
  // is a clean restart, not a discontinuity) — used both to start the reaction and to swap in a
  // different reaction's rate constants without resetting the particles themselves.
  function retarget(ctx, rates) {
    const d = ctx.data;
    d.rateF = rates.rateF; d.rateR = rates.rateR;
    d.particles.forEach(p => { p.flipAt = d.t + expWait(p.kind === "reactant" ? d.rateF : d.rateR); });
  }

  const start = {
    hotspot: "hit", to: "balanced", sound: "zwoop", captionAt: 0.4,
    play(ctx) { ctx.data.running = true; ctx.data.t = 0; retarget(ctx, SCENARIOS.balanced); return gsap.timeline(); }
  };

  const shiftTo = (scenario, toState) => ({
    hotspot: "hit", to: toState, sound: "zwoop", captionAt: 0.4,
    play(ctx) { retarget(ctx, SCENARIOS[scenario]); return gsap.timeline(); }
  });

  const shiftBackTo = (scenario, toState) => ({
    to: toState, sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) { retarget(ctx, SCENARIOS[scenario]); return gsap.timeline(); }
  });

  const reset = {
    to: "before", sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) {
      const d = ctx.data;
      d.running = false;
      d.particles.forEach(p => {
        if (p.kind !== "reactant") {
          d.counts[p.kind]--; d.counts.reactant++; p.kind = "reactant"; p.r = LOOK.reactant.r;
          p.el.setAttribute("fill", LOOK.reactant.fill);
          p.el.setAttribute("stroke", LOOK.reactant.stroke);
          p.el.setAttribute("r", LOOK.reactant.r);
        }
      });
      ctx.$("#counter").textContent = "reactant " + d.counts.reactant + " : " + d.counts.product + " product";
      return gsap.timeline();
    }
  };

  Book.register({
    id: "equilibrium",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Equilibrium: a reaction that runs both ways at once",
    description: "Twenty particles bouncing in a box, all starting as reactant (blue). Tapping starts the reaction: particles keep switching to product (orange) and back again in both directions, settling close to half and half. Further taps swap in a reaction with different rate constants, so the same particles settle skewed toward product, then skewed toward reactant, showing how an equilibrium constant sets which side a reaction favours.",
    svg,
    legend: '<span class="dot" style="width:12px;height:12px;background:var(--electron)" aria-hidden="true"></span>reactant <span class="dot" style="width:18px;height:18px;background:var(--heat);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "before",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to run or shift the reaction", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.running = false;
      d.t = 0;
      d.rateF = SCENARIOS.balanced.rateF;
      d.rateR = SCENARIOS.balanced.rateR;
      d.counts = { reactant: N, product: 0 };
      const layer = ctx.$("#particles");
      for (let i = 0; i < N; i++) {
        const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
        const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
        const angle = rand() * Math.PI * 2, speed = 40 + rand() * 30;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "fade");
        el.setAttribute("r", LOOK.reactant.r);
        el.setAttribute("fill", LOOK.reactant.fill);
        el.setAttribute("stroke", "none");
        el.setAttribute("stroke-width", 2);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: LOOK.reactant.r, el, kind: "reactant", flipAt: Infinity };
        d.particles.push(p);
      }
      const setKind = (p, kind) => {
        d.counts[p.kind]--; p.kind = kind; d.counts[kind]++;
        const look = LOOK[kind];
        p.el.setAttribute("fill", look.fill);
        p.el.setAttribute("stroke", look.stroke);
        p.el.setAttribute("r", look.r);
        p.r = look.r;
        p.flipAt = d.t + expWait(kind === "reactant" ? d.rateF : d.rateR);
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
        caption: "Right now, everything here is reactant. Tap to start a reaction where the forward and reverse rates are equal.",
        tap: start
      },
      balanced: {
        caption: "Particles keep converting both ways. With equal rates each way, the split settles close to half and half.",
        footnote: "That's dynamic equilibrium: the two rates end up equal, so the amounts stop changing, even though individual particles never stop switching.",
        tap: shiftTo("favorsProduct", "favorsProduct"),
        back: reset
      },
      favorsProduct: {
        caption: "Same box, same particles — only the rate constants changed. Converting to product faster than back means it settles with far more product than reactant.",
        footnote: "Chemists write this reaction's equilibrium constant as K = [product] / [reactant]. A reaction like this one has a large K.",
        tap: shiftTo("favorsReactant", "favorsReactant"),
        back: shiftBackTo("balanced", "balanced")
      },
      favorsReactant: {
        caption: "Flip the rates the other way and the same reaction settles with mostly reactant left instead.",
        footnote: "A small K this time — same idea, just run the other way. Which side a reaction “prefers” at equilibrium is exactly what K measures.",
        back: shiftBackTo("favorsProduct", "favorsProduct"),
        final: true
      }
    }
  });
})();
