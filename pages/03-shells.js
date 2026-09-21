// Page 3: electron shells. Tap the atom to add a proton and an electron: hydrogen up to sodium.
// e1 --tap--> e2 --tap--> ... --tap--> e11 --tap--> reveal (the neat rings dissolve into clouds)
// Back removes the last electron (from e1, Back turns to the previous page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CX = 500, CY = 215;          // the atom's centre in the scene
  const RAD = [65, 125, 180];        // shell radii (not to scale, on purpose)
  const FAR = 330;                   // where new electrons arrive from
  const BASE = [-Math.PI / 2, -Math.PI / 2 + 0.6, -Math.PI / 2 + 1.2]; // where each shell's first electron sits
  const SPEED = [0.35, -0.22, 0.15]; // slow drift of each shell, radians per second
  const LAST = 11;                   // sodium

  const ELEMENTS = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na"];
  const shellOf = z => (z <= 2 ? 0 : z <= 10 ? 1 : 2);       // z = which electron (1 to 11)
  const arrangement = n => [Math.min(n, 2), Math.max(0, Math.min(n - 2, 8)), Math.max(0, n - 10)].filter(x => x > 0).join(",");

  const CAPTIONS = [
    "Hydrogen: 1 proton, so 1 electron. It sits in the first shell, the one closest to the nucleus. Tap the atom to add a proton and an electron.",
    "Helium: 2 electrons. The first shell holds a maximum of 2, so it's now full.",
    "Lithium: 3 electrons. The first shell is full, so the third electron starts the second shell.",
    "Beryllium: 4 electrons, 2 in the first shell and 2 in the second.",
    "Boron: 5 electrons. The second shell is filling up.",
    "Carbon: 6 electrons, 2 in the first shell and 4 in the second.",
    "Nitrogen: 7 electrons, 5 of them in the second shell.",
    "Oxygen: 8 electrons, 6 of them in the second shell.",
    "Fluorine: 9 electrons. The second shell has 7, one short of full.",
    "Neon: 10 electrons. The second shell holds a maximum of 8, so it's full too.",
    "Sodium: 11 electrons. The first two shells are full, so the eleventh electron starts the third shell."
  ];

  const svg = `
    <circle class="orbit fade" id="sh0" cx="${CX}" cy="${CY}" r="${RAD[0]}"/>
    <circle class="orbit fade" id="sh1" cx="${CX}" cy="${CY}" r="${RAD[1]}"/>
    <circle class="orbit fade" id="sh2" cx="${CX}" cy="${CY}" r="${RAD[2]}"/>
    <g id="cloud"></g>
    <g id="electrons"></g>
    <circle class="proton fade" id="nucleus" cx="${CX}" cy="${CY}" r="24"/>
    <text class="nuc-sym fade" id="sym" x="${CX}" y="${CY}">H</text>
    <g class="fade" id="cfgBox">
      <text class="atom-name" id="cfg" x="${CX}" y="428">1</text>
      <text class="atom-sub" x="${CX}" y="454">electron arrangement</text>
    </g>
    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY}" r="42" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY}" r="200"/>`;

  // ---------- Electrons ----------
  // Each electron is a plain object {k: shell, slot: angle, r: distance, op: opacity, el: the circle}.
  // A small loop draws them every frame, so shells can drift and electrons can fly in smoothly.
  function makeElectron(ctx, k) {
    const d = ctx.data;
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", 7);
    el.setAttribute("class", "electron");
    ctx.$("#electrons").appendChild(el);
    const e = { k, slot: BASE[k], r: FAR, op: 0, el };
    d.electrons.push(e);
    return e;
  }

  // Spread a shell's electrons evenly around it. Existing ones slide to their new spots.
  function spread(ctx, tl, k, duration) {
    const members = ctx.data.electrons.filter(e => e.k === k);
    members.forEach((m, i) => {
      const target = BASE[k] + i * 2 * Math.PI / members.length;
      if (m.fresh) { m.slot = target; m.fresh = false; }
      else tl.to(m, { slot: target, duration, ease: "power2.inOut" }, 0);
    });
  }

  function showText(tl, n, at) {
    tl.call(() => {
      document.getElementById("sym").textContent = ELEMENTS[n - 1];
      document.getElementById("cfg").textContent = arrangement(n);
    }, null, at)
      .fromTo(["#sym", "#cfg"], { opacity: 0 }, { opacity: 1, duration: 0.35 }, at);
  }

  function syncRings(ctx, tl) {
    const counts = [0, 0, 0];
    ctx.data.electrons.forEach(e => counts[e.k]++);
    counts.forEach((c, k) => tl.to("#sh" + k, { opacity: c > 0 ? 1 : 0, duration: 0.5 }, 0));
  }

  // ---------- Transitions ----------
  const addElectron = z => ({          // from e{z} to e{z+1}
    hotspot: "hit", to: "e" + (z + 1), sound: "pop", captionAt: 0.5,
    play(ctx) {
      const tl = gsap.timeline();
      const e = makeElectron(ctx, shellOf(z + 1));
      e.fresh = true;
      spread(ctx, tl, e.k, 0.9);
      tl.to(e, { r: RAD[e.k], op: 1, duration: 0.9, ease: "power2.out" }, 0);
      syncRings(ctx, tl);
      showText(tl, z + 1, 0.4);
      return tl;
    }
  });

  const removeElectron = z => ({       // from e{z} back to e{z-1}
    to: "e" + (z - 1), sound: "pop", captionAt: 0.5,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline();
      const e = d.electrons.pop();
      d.leaving.push(e);
      tl.to(e, { r: FAR, op: 0, duration: 0.8, ease: "power2.in" }, 0)
        .call(() => { e.el.remove(); d.leaving = d.leaving.filter(x => x !== e); }, null, 0.85);
      spread(ctx, tl, e.k, 0.8);
      syncRings(ctx, tl);
      showText(tl, z - 1, 0.4);
      return tl;
    }
  });

  // The reveal: the neat rings dissolve into fuzzy clouds, one for each shell.
  const toReveal = {
    hotspot: "hit", to: "reveal", sound: "zwoop", captionAt: 1.0,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline();
      tl.to(d.electrons, { op: 0, duration: 0.6 }, 0.6)
        .to(["#sh0", "#sh1", "#sh2"], { opacity: 0, duration: 1.2 }, 0.6);
      d.cloudDots.forEach(c => {
        tl.to(c.dot, { attr: { cx: c.x, cy: c.y }, opacity: c.alpha, duration: 1.6, ease: "power2.out" }, 0.4 + Math.random() * 0.7);
      });
      return tl;
    }
  };

  const fromReveal = {
    to: "e" + LAST, sound: "pop", captionAt: 0.7,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline({
        onComplete: () => d.cloudDots.forEach(c => gsap.set(c.dot, { attr: { cx: c.sx, cy: c.sy }, opacity: 0 }))
      });
      tl.to(d.cloudDots.map(c => c.dot), { opacity: 0, duration: 0.6 }, 0)
        .to(d.electrons, { op: 1, duration: 0.6 }, 0.3)
        .to(["#sh0", "#sh1", "#sh2"], { opacity: 1, duration: 0.6 }, 0.3);
      return tl;
    }
  };

  // ---------- The cloud dots (built once, hidden until the reveal) ----------
  function buildCloud(ctx) {
    let seed = 11;
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const plan = [[0, 70, 12], [1, 130, 20], [2, 50, 26]]; // [shell, number of dots, spread]
    const layer = ctx.$("#cloud");
    const dots = [];
    plan.forEach(([k, count, spreadPx]) => {
      for (let i = 0; i < count; i++) {
        const r = Math.max(8, RAD[k] + gauss() * spreadPx);
        const a = rand() * Math.PI * 2, sa = rand() * Math.PI * 2;
        const dot = document.createElementNS(NS, "circle");
        const sx = CX + RAD[k] * Math.cos(sa), sy = CY + RAD[k] * Math.sin(sa);
        dot.setAttribute("class", "cloud-dot");
        dot.setAttribute("r", (1.6 + rand() * 1.6).toFixed(2));
        dot.setAttribute("cx", sx);
        dot.setAttribute("cy", sy);
        dot.style.opacity = 0;
        layer.appendChild(dot);
        dots.push({ dot, sx, sy, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), alpha: 0.3 + rand() * 0.35 });
      }
    });
    ctx.data.cloudDots = dots;
  }

  // ---------- States: e1 ... e11, then the reveal ----------
  const states = {};
  for (let z = 1; z <= LAST; z++) {
    states["e" + z] = {
      caption: CAPTIONS[z - 1],
      footnote: z === 1 ? "We're leaving out the neutrons, and the shells are hugely not to scale." : undefined,
      tap: z < LAST ? addElectron(z) : toReveal
    };
    if (z > 1) states["e" + z].back = removeElectron(z);
  }
  states.reveal = {
    caption: "Really, electrons don't travel on neat rings. Each shell is an energy level, and its electrons are spread out in a cloud-like region.",
    footnote: "So the shells are a handy simplification. Not to scale, of course.",
    back: fromReveal,
    final: true
  };

  Book.register({
    id: "shells",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Electron shells and configurations",
    description: "An atom with a red nucleus in the middle and blue electrons on dotted rings around it. Each tap adds a proton and an electron, building from hydrogen up to sodium: the first shell fills with 2 electrons, the second with 8, and sodium's eleventh electron starts the third. At the end the rings dissolve into fuzzy clouds.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "e1",

    hotspots: [{
      id: "hit", selector: "#hit", label: "Tap the atom to add a proton and an electron",
      hint: { // the gold ring: "you can tap this"
        start(ctx, strong) {
          const d = ctx.data;
          if (d.ring) d.ring.kill();
          const o = CX + " " + CY;
          gsap.set("#ring", { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: o });
          if (ctx.reduceMotion) return;
          d.ring = gsap.to("#ring", {
            scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: o,
            duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
          });
        },
        stop(ctx) {
          if (ctx.data.ring) ctx.data.ring.kill();
          ctx.data.ring = null;
          gsap.to("#ring", { opacity: 0, duration: 0.3 });
        }
      }
    }],

    setup(ctx) {
      const d = ctx.data;
      d.electrons = [];
      d.leaving = [];
      d.rot = [0, 0, 0];
      gsap.set(["#sh1", "#sh2"], { opacity: 0 });
      buildCloud(ctx);
      makeElectron(ctx, 0);            // the hydrogen electron; it flies in during the intro
      d.electrons[0].fresh = false;
      // Draw every electron each frame. Shells drift slowly (not when the reader prefers reduced motion).
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.rot.forEach((_, k) => { d.rot[k] += SPEED[k] * dt / 1000; });
        d.electrons.concat(d.leaving).forEach(e => {
          const a = e.slot + d.rot[e.k];
          e.el.setAttribute("cx", CX + e.r * Math.cos(a));
          e.el.setAttribute("cy", CY + e.r * Math.sin(a));
          e.el.style.opacity = e.op;
        });
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro(ctx) {
      const o = CX + " " + CY;
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("#nucleus", { opacity: 0, scale: 0.5, svgOrigin: o }, { opacity: 1, scale: 1, svgOrigin: o, duration: 0.7, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to("#sym", { opacity: 1, duration: 0.4 }, "<0.2")
        .to("#sh0", { opacity: 1, duration: 0.5 }, "-=0.2")
        .to("#cfgBox", { opacity: 1, duration: 0.5 }, "<")
        .to(ctx.data.electrons[0], { r: RAD[0], op: 1, duration: 0.9 });
    },

    states
  });
})();
