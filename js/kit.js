// Kit: building blocks for "tap to step through" pages, so a page is mostly its drawing and captions.
//
//   Kit.page({
//     id, topic, title, description, svg, bounds: [x0, y0, x1, y1], tapLabel,
//     legend?, setup?(ctx), teardown?(ctx), intro?(ctx), idle?(ctx),
//     steps: [
//       { caption, footnote?, booklet? },                                   // step 0: how the page starts
//       { caption, footnote?, booklet?, sound?, dur?,                       // step 1: tap in step 0 to get here
//         to:   { "#selector": { opacity: 1, attr: { cx: 300 }, x: 20, fill: "#abc", delay: .2, stagger: .1 } },
//         text: { "#label": "new text" },                                   // swapped part-way through
//         run(ctx, tl, dir) { ... }                                          // optional extra animation; dir is "fwd" or "back"
//       }, ...
//     ]
//   })
//
// Tapping in step i plays step i+1's `to`/`text`/`run`. Back plays them in reverse: before each step
// runs, the current values of everything it touches are recorded, and Back tweens straight to those, so
// the reverse is exact and no undo code is needed. Colours must be hex (use Kit.C), not var(--x).
// Elements with class="fade" fade in at the start; give things that appear later opacity="0".
// A <g> with data-x/data-y is placed there by GSAP (never write a transform attribute by hand).

const Kit = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = {
    proton: "#FF3131", electron: "#0B44A8", heat: "#E05A2B", product: "#2E9E63", ion: "#4C6E9E",
    ink: "#1B1A22", frame: "#8B5CF6", grey: "#8B8590", pale: "#B8BEC6", violet: "#6A2BD9",
    cyan: "#22B6A5", blue: "#2E6FE0", paper: "#FFFDF8"
  };

  // ----- little SVG string helpers -----
  const t = (x, y, text, cls = "graph-label", extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${text}</text>`;
  const c = (x, y, r, fill, extra = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const l = (x1, y1, x2, y2, stroke = "var(--ink)", w = 3, extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const r = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  // A line with an arrowhead at (x2, y2).
  function arrow(x1, y1, x2, y2, stroke = "var(--ink)", w = 3, extra = "") {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 6 + w * 1.6;
    const px = x2 - Math.cos(a) * h * 0.6, py = y2 - Math.sin(a) * h * 0.6;
    const p = (ang, d) => (x2 - Math.cos(a + ang) * d).toFixed(1) + "," + (y2 - Math.sin(a + ang) * d).toFixed(1);
    return `<g ${extra}>${l(x1, y1, px, py, stroke, w)}<polygon points="${x2},${y2} ${p(0.45, h)} ${p(-0.45, h)}" fill="${stroke}"/></g>`;
  }
  // A group centred on (0, 0), moved to (x, y) by GSAP when the page loads.
  const g = (id, x, y, inner, cls = "fade", extra = "") =>
    `<g ${id ? `id="${id}"` : ""} class="${cls}" data-x="${x}" data-y="${y}" ${extra}>${inner}</g>`;
  // An atom-style disc with a white symbol, as a movable group.
  const atom = (id, x, y, rad, sym, fill = C.proton, cls = "fade") =>
    g(id, x, y, `<circle r="${rad}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.max(11, Math.min(22, rad * 0.9))}px">${sym}</text>`, cls);

  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ----- particles bouncing in a box that may change size -----
  function spawn(ctx, layerSel, n, spec, box, rand, speed = 60) {
    const layer = ctx.$(layerSel), list = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("r", spec.r);
      el.setAttribute("fill", spec.fill);
      if (spec.stroke) { el.setAttribute("stroke", spec.stroke); el.setAttribute("stroke-width", spec.sw || 2); }
      if (spec.fade) el.setAttribute("opacity", 0);
      if (spec.cls) el.setAttribute("class", spec.cls);
      const x = box.x0 + spec.r + rand() * (box.x1 - box.x0 - 2 * spec.r);
      const y = box.y0 + spec.r + rand() * (box.y1 - box.y0 - 2 * spec.r);
      const a = rand() * Math.PI * 2, s = speed * (0.7 + rand() * 0.6);
      el.setAttribute("cx", x); el.setAttribute("cy", y);
      layer.appendChild(el);
      list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: spec.r, el });
    }
    return list;
  }
  function bounce(list, box, dt) {
    list.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x - p.r < box.x0) { p.x = box.x0 + p.r; p.vx = Math.abs(p.vx); }
      if (p.x + p.r > box.x1) { p.x = box.x1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y - p.r < box.y0) { p.y = box.y0 + p.r; p.vy = Math.abs(p.vy); }
      if (p.y + p.r > box.y1) { p.y = box.y1 - p.r; p.vy = -Math.abs(p.vy); }
      p.el.setAttribute("cx", p.x.toFixed(1));
      p.el.setAttribute("cy", p.y.toFixed(1));
    });
  }
  // Rescale every particle's speed to `s` (keeping its direction).
  function setSpeed(list, s, ease = 1) {
    list.forEach(p => {
      const cur = Math.hypot(p.vx, p.vy) || 1, k = 1 + (s / cur - 1) * ease;
      p.vx *= k; p.vy *= k;
    });
  }
  // Run fn(dtSeconds) every frame while the page is showing (skipped under reduced motion).
  function tick(ctx, fn) {
    const f = (time, dt) => { if (!ctx.reduceMotion) fn(Math.min(dt, 50) / 1000); };
    gsap.ticker.add(f);
    (ctx.data.kitTickers ||= []).push(f);
  }

  // ----- steps -> states -----
  const CONTROL = new Set(["delay", "dur", "ease", "stagger", "at"]);
  const num = v => { const f = Number(v); return v !== null && v !== "" && !isNaN(f) ? f : v; };

  function snapshot(el, spec) {
    const out = {};
    Object.keys(spec).forEach(k => {
      if (CONTROL.has(k)) return;
      if (k === "attr") {
        out.attr = {};
        Object.keys(spec.attr).forEach(a => { const v = num(el.getAttribute(a)); if (v !== null) out.attr[a] = v; });
      } else out[k] = gsap.getProperty(el, k);
    });
    return out;
  }

  function forward(ctx, steps, i) {
    const kd = (ctx.data.kit ||= { undo: [] });
    const s = steps[i], tl = gsap.timeline(), dur = s.dur ?? 0.9, undo = [];
    Object.entries(s.to || {}).forEach(([sel, spec]) => {
      const els = ctx.$$(sel);
      if (!els.length) console.warn("Kit: nothing matches " + sel);
      els.forEach(el => undo.push([el, snapshot(el, spec)]));
      const vars = { ...spec, duration: spec.dur ?? dur, ease: spec.ease ?? "power2.inOut" };
      delete vars.dur; delete vars.at;
      tl.to(els, vars, spec.at ?? 0);
    });
    const texts = [];
    Object.entries(s.text || {}).forEach(([sel, val]) => {
      ctx.$$(sel).forEach(el => texts.push([el, el.textContent]));
      tl.call(() => ctx.$$(sel).forEach(el => { el.textContent = val; }), null, s.textAt ?? dur * 0.5);
    });
    kd.undo[i] = { undo, texts };
    if (s.run) s.run(ctx, tl, "fwd");
    return tl;
  }

  function backward(ctx, steps, i) {
    const u = ctx.data.kit.undo[i], tl = gsap.timeline(), dur = (steps[i].dur ?? 0.9) * 0.6;
    u.undo.forEach(([el, vals]) => tl.to(el, { ...vals, duration: dur, ease: "power2.inOut" }, 0));
    u.texts.forEach(([el, old]) => tl.call(() => { el.textContent = old; }, null, 0));
    if (steps[i].run) steps[i].run(ctx, tl, "back");
    return tl;
  }

  // The squircle tap hint, fitted around the bounds [x0, y0, x1, y1] and kept on the canvas.
  function ring(b) {
    const pad = 24, x0 = Math.max(6, b[0] - pad), y0 = Math.max(6, b[1] - pad);
    const x1 = Math.min(994, b[2] + pad), y1 = Math.min(474, b[3] + pad);
    return {
      cx: Math.round((x0 + x1) / 2), cy: Math.round((y0 + y1) / 2),
      markup: `<rect class="tap-ring" id="ring" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="30" opacity="0"/>` +
              `<circle class="hit" id="hit" cx="500" cy="240" r="520"/>`
    };
  }

  function page(cfg) {
    const steps = cfg.steps, rg = ring(cfg.bounds || [80, 100, 920, 440]);
    const states = {};
    steps.forEach((s, i) => {
      const st = { caption: s.caption };
      if (s.footnote) st.footnote = s.footnote;
      if (s.booklet) st.booklet = s.booklet;
      if (i < steps.length - 1) {
        const nx = steps[i + 1];
        st.tap = { hotspot: "hit", to: "s" + (i + 1), sound: nx.sound || "pop", captionAt: nx.captionAt ?? (nx.dur ?? 0.9) * 0.7, play: ctx => forward(ctx, steps, i + 1) };
      } else st.final = true;
      if (i > 0) st.back = { to: "s" + (i - 1), sound: "zwoop-rev", captionAt: 0.3, play: ctx => backward(ctx, steps, i) };
      states["s" + i] = st;
    });
    Book.register({
      id: cfg.id, topic: cfg.topic, title: cfg.title, description: cfg.description,
      svg: cfg.svg + rg.markup, legend: cfg.legend, start: "s0",
      hotspots: [{ id: "hit", selector: "#hit", label: cfg.tapLabel || "Tap to continue", hint: Hint.ring("#ring", rg.cx + " " + rg.cy) }],
      setup(ctx) {
        ctx.$$("[data-x]").forEach(el => gsap.set(el, { x: +el.dataset.x, y: +el.dataset.y }));
        if (cfg.setup) cfg.setup(ctx);
      },
      teardown(ctx) {
        (ctx.data.kitTickers || []).forEach(f => gsap.ticker.remove(f));
        if (cfg.teardown) cfg.teardown(ctx);
      },
      intro: cfg.intro || (ctx => {
        const els = ctx.$$(".fade");
        if (!els.length) return gsap.timeline();
        return gsap.to(els, { opacity: 1, duration: 0.5, stagger: Math.min(0.05, 0.9 / (els.length || 1)) });
      }),
      idle: cfg.idle,
      states
    });
  }

  return { NS, C, t, c, l, r, arrow, g, atom, rng, spawn, bounce, setSpeed, tick, page };
})();
