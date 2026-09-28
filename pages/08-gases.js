// Page 8: gases. Particles bounce around a sealed box. Tapping heats them: faster particles hit the
// walls more often and harder, which is what pressure actually is.

(() => {
  const BOX = { x0: 190, y0: 110, x1: 810, y1: 390 };
  const N = 16;

  let seed = 5;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <circle class="tap-ring" id="ring" cx="500" cy="250" r="330" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { p.vx *= 1.9; p.vy *= 1.9; });
      return gsap.timeline()
        .to("#particles circle", { attr: { r: 9 }, duration: 0.4, ease: "power2.out" }, 0)
        .to("#particles circle", { attr: { r: 7 }, duration: 0.4, ease: "power2.in" }, 0.4);
    }
  };

  const cool = {
    to: "cool", sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { p.vx /= 1.9; p.vy /= 1.9; });
      return gsap.timeline();
    }
  };

  Book.register({
    id: "gases",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Gases: particles bouncing in a box",
    description: "A sealed box with sixteen particles bouncing around inside it and off the walls. Tapping heats the gas: the particles speed up and strike the walls more often and harder.",
    svg,
    start: "cool",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to heat the gas", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      const layer = ctx.$("#particles");
      for (let i = 0; i < N; i++) {
        const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
        const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
        const angle = rand() * Math.PI * 2, speed = 70 + rand() * 40;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "particle fade");
        el.setAttribute("r", 7);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        d.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 7, el });
      }
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.particles, Math.min(dt, 50) / 1000);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to("#particles circle, rect.fade", { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      cool: {
        caption: "These particles are bouncing around a sealed box, the way gas particles really do. Tap to heat them up.",
        footnote: "Real gas particles also bump into each other; we're only showing wall bounces here to keep it clear.",
        tap: heat
      },
      hot: {
        caption: "Heating a gas makes its particles move faster. Faster particles hit the walls more often, and harder — that's what pressure is.",
        back: cool,
        final: true
      }
    }
  });
})();
