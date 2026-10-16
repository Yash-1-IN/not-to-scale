// Build a molecule: drag atoms from the tray onto the canvas. Atoms snap together when you drop one near
// another that still has a free bond (its "valence"), tap a bond to make it double or triple, drag an atom
// back to the tray to remove it. Bonded atoms are held together by springs and non-bonded atoms push apart,
// so molecules settle into a sensible flat shape (real molecules are 3D, as the footnote says).
// A finished molecule (every atom's bonds used up) gets its formula, name and shape.
// Keyboard: Tab to a tray atom and press Enter to add it, bonded to the latest atom that has a free bond.

(() => {
  const K = Kit, C = K.C, NS = K.NS;
  const KIND = {
    H: { v: 1, r: 17, fill: "#E7EAF0", text: "#1B1A22" }, C: { v: 4, r: 24, fill: "#6B6672", text: "#fff" },
    N: { v: 3, r: 23, fill: C.electron, text: "#fff" }, O: { v: 2, r: 23, fill: C.proton, text: "#fff" },
    Cl: { v: 1, r: 26, fill: C.product, text: "#fff" }
  };
  const SYMS = Object.keys(KIND);
  const LONE_PAIRS = { H: 0, C: 0, N: 1, O: 2, Cl: 3 };   // on a finished atom; used for the angle each atom prefers
  const AREA = { x0: 235, x1: 770, y0: 70, y1: 445 };
  const TRAY_X = 150, BOND_LEN = 72, REPEL = 118, SNAP = BOND_LEN + 46;
  const sub = s => String(s).replace(/\d/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]);

  // key = Hill-order formula (C first, then H, then the rest alphabetically; with no C, all alphabetical)
  const KNOWN = {
    "H2": ["H₂", "hydrogen", "linear"], "O2": ["O₂", "oxygen", "linear, double bond"], "N2": ["N₂", "nitrogen", "linear, triple bond"],
    "Cl2": ["Cl₂", "chlorine", "linear"], "ClH": ["HCl", "hydrogen chloride", "linear"], "H2O": ["H₂O", "water", "bent"],
    "H3N": ["NH₃", "ammonia", "trigonal pyramidal"], "CH4": ["CH₄", "methane", "tetrahedral"], "CO2": ["CO₂", "carbon dioxide", "linear"],
    "C2H4": ["C₂H₄", "ethene", "trigonal planar at each C"], "C2H2": ["C₂H₂", "ethyne", "linear"], "C2H6": ["C₂H₆", "ethane", "tetrahedral at each C"],
    "CH3Cl": ["CH₃Cl", "chloromethane", "tetrahedral"], "CCl4": ["CCl₄", "tetrachloromethane", "tetrahedral"], "CHN": ["HCN", "hydrogen cyanide", "linear"],
    "CH2O": ["CH₂O", "methanal", "trigonal planar"], "CH4O": ["CH₃OH", "methanol", "tetrahedral C, bent O"], "CH5N": ["CH₃NH₂", "methylamine", "tetrahedral C, pyramidal N"],
    "H2O2": ["H₂O₂", "hydrogen peroxide", "bent at each O"], "H4N2": ["N₂H₄", "hydrazine", "pyramidal at each N"], "CH2Cl2": ["CH₂Cl₂", "dichloromethane", "tetrahedral"],
    "CHCl3": ["CHCl₃", "trichloromethane", "tetrahedral"], "C2H6O": ["C₂H₆O", "ethanol or methoxymethane", "isomers: same atoms, new bonds"]
  };
  const GOALS = [["H2O", "water"], ["H3N", "ammonia"], ["CH4", "methane"], ["CO2", "carbon dioxide"], ["C2H4", "ethene"], ["CHN", "hydrogen cyanide"]];

  const trayY = i => 95 + i * 78;
  const palette = SYMS.map((s, i) => K.g("tray" + s, TRAY_X - 80, trayY(i),
    `<circle r="${KIND[s].r}" fill="${KIND[s].fill}" stroke="var(--ink)" stroke-width="2.5"/><text class="nuc-sym" style="font-size:${s === "Cl" ? 18 : 20}px;fill:${KIND[s].text}">${s}</text>`,
    "tray dragger", `data-sym="${s}" role="button" aria-label="Add a ${s} atom"`)).join("");
  const trayLabels = SYMS.map((s, i) => K.t(TRAY_X - 25, trayY(i) + 6, "bonds: " + KIND[s].v, "graph-label", 'style="text-anchor:start"')).join("");
  const goalRows = GOALS.map(([, name], i) => `<text class="graph-label" id="goal${i}" x="800" y="${270 + i * 26}" style="text-anchor:start">○ ${name}</text>`).join("");

  const svg = `
    <g id="play" opacity="0">
      <rect id="trayBox" x="20" y="64" width="${TRAY_X + 40}" height="${AREA.y1 - 58}" rx="18" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="7 6"/>
      ${K.t(95, 54, "atoms (drag out)", "graph-label")}
      ${trayLabels}
      <rect x="${AREA.x0 - 10}" y="${AREA.y0 - 8}" width="${AREA.x1 - AREA.x0 + 20}" height="${AREA.y1 - AREA.y0 + 16}" rx="18" fill="${C.violet}" fill-opacity="0.04" stroke="${C.pale}" stroke-width="2"/>
      <g id="bondLayer"></g><g id="atomLayer"></g>
      ${palette}
      ${K.t(885, 92, "", "atom-name", 'id="formula" style="font-size:26px"')}
      ${K.t(885, 126, "", "molecule-label", 'id="mname"')}
      ${K.t(885, 156, "", "graph-label", 'id="mshape"')}
      ${K.t(885, 186, "", "graph-label", 'id="mnote"')}
      ${K.t(885, 244, "try making:", "graph-label")}
      ${goalRows}
    </g>`;

  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };

  function build(ctx) {
    const d = ctx.data, svgEl = ctx.svg;
    d.atoms = []; d.bonds = []; d.drag = null; d.done = new Set(); d.nextId = 1;
    const atomLayer = ctx.$("#atomLayer"), bondLayer = ctx.$("#bondLayer");

    const toSvg = e => { const pt = svgEl.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svgEl.getScreenCTM().inverse()); };
    const used = a => d.bonds.reduce((n, b) => n + (b.a === a || b.b === a ? b.order : 0), 0);
    const free = a => KIND[a.sym].v - used(a);
    const bondBetween = (a, b) => d.bonds.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    const neighbours = a => d.bonds.filter(b => b.a === a || b.b === a).map(b => b.a === a ? b.b : b.a);
    const canBond = (a, o) => o !== a && free(o) > 0 && free(a) > 0 && !bondBetween(a, o);

    function place(a) { a.el.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)})`); }
    function placeBond(b) {
      const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, gap = 8;
      b.el.querySelectorAll("line").forEach((ln, i) => {
        const o = i === 0 ? 0 : (i - 1 - (b.order - 1) / 2) * gap;     // line 0 is the wide invisible one you tap
        ln.setAttribute("x1", b.a.x + nx * o); ln.setAttribute("y1", b.a.y + ny * o);
        ln.setAttribute("x2", b.b.x + nx * o); ln.setAttribute("y2", b.b.y + ny * o);
      });
    }
    const render = () => { d.atoms.forEach(place); d.bonds.forEach(placeBond); };

    function newAtom(sym, x, y) {
      const k = KIND[sym];
      const g = el("g", { class: "dragger" }, atomLayer);
      el("circle", { class: "body", r: k.r, fill: k.fill, stroke: "var(--ink)", "stroke-width": 2.5 }, g);
      const t = el("text", { class: "nuc-sym", style: `font-size:${sym === "Cl" ? 18 : 20}px;fill:${k.text}` }, g); t.textContent = sym;
      const a = { id: d.nextId++, sym, x, y, vx: 0, vy: 0, el: g, slots: el("g", {}, g) };
      g.addEventListener("pointerdown", e => { startDrag(a, e); e.preventDefault(); e.stopPropagation(); });
      d.atoms.push(a);
      place(a); refreshSlots(a);
      return a;
    }
    function refreshSlots(a) {   // hollow dots around an atom: one for each bond it can still make
      a.slots.innerHTML = "";
      const n = free(a), r = KIND[a.sym].r + 8;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i + 0.5) / n * Math.PI * 2 + a.id;
        el("circle", { cx: Math.cos(ang) * r, cy: Math.sin(ang) * r, r: 4, fill: "none", stroke: C.heat, "stroke-width": 2 }, a.slots);
      }
    }
    function removeAtom(a) { d.bonds.filter(b => b.a === a || b.b === a).forEach(removeBond); a.el.remove(); d.atoms.splice(d.atoms.indexOf(a), 1); }
    function removeBond(b) { b.el.remove(); d.bonds.splice(d.bonds.indexOf(b), 1); }
    function addBond(a, b) {
      const g = el("g", { class: "bond" }, bondLayer), bd = { a, b, order: 1, el: g };
      g.addEventListener("click", () => cycleBond(bd));
      d.bonds.push(bd);
      a.vy += (Math.random() - 0.5) * 8; b.vy += (Math.random() - 0.5) * 8;   // a nudge, so a perfectly straight chain can still bend
      drawBond(bd); placeBond(bd);
      return bd;
    }
    function drawBond(b) {
      b.el.innerHTML = "";
      el("line", { stroke: "transparent", "stroke-width": 26, "stroke-linecap": "round", style: "cursor:pointer" }, b.el);
      for (let i = 0; i < b.order; i++) el("line", { stroke: "var(--ink)", "stroke-width": 5, "stroke-linecap": "round", style: "pointer-events:none" }, b.el);
    }
    function cycleBond(b) {
      const room = Math.min(free(b.a), free(b.b));
      b.order = room > 0 && b.order < 3 ? b.order + 1 : 1;
      drawBond(b); placeBond(b);
      afterChange();
    }

    // ----- dragging -----
    function startDrag(a, e) {
      const p = toSvg(e);
      d.drag = { a, dx: a.x - p.x, dy: a.y - p.y };
      svgEl.setPointerCapture && svgEl.setPointerCapture(e.pointerId);
      a.el.parentNode.appendChild(a.el);                                // on top of the others while it moves
    }
    const highlight = (a, on) => d.atoms.forEach(o => {
      const cand = on && canBond(a, o) && Math.hypot(o.x - a.x, o.y - a.y) < SNAP;
      const body = o.el.querySelector(".body"); body.setAttribute("stroke", cand ? C.product : "var(--ink)"); body.setAttribute("stroke-width", cand ? 5 : 2.5);
    });
    const onMove = e => {
      if (!d.drag) return;
      const p = toSvg(e), a = d.drag.a;
      a.x = p.x + d.drag.dx; a.y = p.y + d.drag.dy; a.vx = a.vy = 0;
      ctx.$("#trayBox").setAttribute("stroke", a.x < TRAY_X + 40 ? C.proton : "var(--ink)");
      highlight(a, true); render();
    };
    const onUp = e => {
      if (!d.drag) return;
      const a = d.drag.a; d.drag = null;
      highlight(a, false);
      ctx.$("#trayBox").setAttribute("stroke", "var(--ink)");
      try { svgEl.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (a.x < TRAY_X + 40) { removeAtom(a); afterChange(); return; }
      a.x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, a.x)); a.y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, a.y));
      d.atoms.filter(o => canBond(a, o) && Math.hypot(o.x - a.x, o.y - a.y) < SNAP)
        .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))
        .forEach(o => { if (canBond(a, o)) addBond(a, o); });
      afterChange(); render();
    };
    ["pointermove", "pointerup", "pointercancel"].forEach((n, i) => svgEl.addEventListener(n, i ? onUp : onMove));
    d.listeners = [["pointermove", onMove], ["pointerup", onUp], ["pointercancel", onUp]];

    // pulling a new atom out of the tray (pointer), or adding one bonded to the latest unfinished atom (keyboard)
    function keyboardAdd(sym) {
      const open = d.atoms.slice().reverse().find(a => free(a) > 0 && KIND[sym]);
      let x = (AREA.x0 + AREA.x1) / 2, y = (AREA.y0 + AREA.y1) / 2;
      if (open) { const ang = Math.random() * Math.PI * 2; x = open.x + Math.cos(ang) * BOND_LEN; y = open.y + Math.sin(ang) * BOND_LEN; }
      x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, x)); y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, y));
      const a = newAtom(sym, x, y);
      if (open && canBond(a, open)) addBond(a, open);
      afterChange(); render();
    }
    ctx.$$(".tray").forEach(t => {
      t.addEventListener("pointerdown", e => { const p = toSvg(e), a = newAtom(t.dataset.sym, p.x, p.y); startDrag(a, e); e.preventDefault(); e.stopPropagation(); });
      t.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); keyboardAdd(t.dataset.sym); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
      });
      t.setAttribute("tabindex", "-1");
    });

    // ----- results -----
    function components() {
      const seen = new Set(), out = [];
      d.atoms.forEach(a => {
        if (seen.has(a)) return;
        const comp = [], stack = [a];
        while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); comp.push(x); neighbours(x).forEach(n => stack.push(n)); }
        out.push(comp);
      });
      return out;
    }
    function hill(comp) {
      const cnt = {}; comp.forEach(a => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; });
      const syms = Object.keys(cnt), rest = syms.filter(s => s !== "C" && s !== "H").sort();
      const order = cnt.C ? ["C", ...(cnt.H ? ["H"] : []), ...rest] : syms.sort();
      return order.map(s => s + (cnt[s] > 1 ? cnt[s] : "")).join("");
    }
    function afterChange() {
      d.atoms.forEach(refreshSlots);
      const main = components().filter(c => c.length > 1).sort((p, q) => q.length - p.length)[0];
      const f = ctx.$("#formula"), nm = ctx.$("#mname"), sh = ctx.$("#mshape"), nt = ctx.$("#mnote");
      f.textContent = nm.textContent = sh.textContent = nt.textContent = "";
      if (!main) { nt.textContent = d.atoms.length ? "bring two atoms close together" : ""; }
      else {
        const open = main.reduce((n, a) => n + free(a), 0), key = hill(main), known = KNOWN[key];
        if (open > 0) { f.textContent = sub(key); nm.textContent = "not finished"; sh.textContent = open + " open bond" + (open > 1 ? "s" : "") + " left (hollow dots)"; }
        else if (known) { f.textContent = known[0]; nm.textContent = known[1]; sh.textContent = known[2]; GOALS.forEach(([k], i) => { if (k === key) d.done.add(i); }); }
        else { f.textContent = sub(key); nm.textContent = "every bond is used up"; sh.textContent = "stable, but not one I know"; }
      }
      GOALS.forEach((g, i) => { const t = ctx.$("#goal" + i); t.textContent = (d.done.has(i) ? "● " : "○ ") + g[1]; t.style.fill = d.done.has(i) ? C.product : C.ink; });
    }
    d.afterChange = afterChange;

    // ----- physics: springs along bonds, repulsion between the rest, kept inside the canvas -----
    K.tick(ctx, dt => {
      const k = Math.min(dt * 60, 3);
      d.atoms.forEach(a => { a.fx = 0; a.fy = 0; });
      d.bonds.forEach(b => {
        const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, L = Math.hypot(dx, dy) || 1;
        const rest = BOND_LEN - 6 * (b.order - 1) + (KIND[b.a.sym].r + KIND[b.b.sym].r - 40) * 0.5;
        const f = (L - rest) * 0.18, fx = f * dx / L, fy = f * dy / L;
        b.a.fx += fx; b.a.fy += fy; b.b.fx -= fx; b.b.fy -= fy;
      });
      // VSEPR in two dimensions: the neighbours of an atom prefer the angle its electron domains (bonds + lone pairs) give
      const shaped = new Set();
      d.atoms.forEach(x => {
        const nb = neighbours(x);
        if (nb.length < 2) return;
        const domains = Math.min(4, nb.length + LONE_PAIRS[x.sym]), theta = [0, 0, Math.PI, 2 * Math.PI / 3, 105 * Math.PI / 180][domains];
        for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
          const a = nb[i], b = nb[j], ra = Math.hypot(a.x - x.x, a.y - x.y), rb = Math.hypot(b.x - x.x, b.y - x.y);
          const target = Math.sqrt(ra * ra + rb * rb - 2 * ra * rb * Math.cos(theta));
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 0.01, f = (L - target) * 0.1, fx = f * dx / L, fy = f * dy / L;
          a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
          shaped.add(a.id + "-" + b.id); shaped.add(b.id + "-" + a.id);
        }
      });
      for (let i = 0; i < d.atoms.length; i++) for (let j = i + 1; j < d.atoms.length; j++) {
        const a = d.atoms[i], b = d.atoms[j];
        if (d.drag && (d.drag.a === a || d.drag.a === b)) continue;     // so an atom you're holding can reach its target
        if (shaped.has(a.id + "-" + b.id)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 0.01;
        const range = bondBetween(a, b) ? 0 : REPEL + (a.sym === "Cl" || b.sym === "Cl" ? 14 : 0);
        if (L < range) { const f = (range - L) * 0.1, fx = f * dx / L, fy = f * dy / L; a.fx -= fx; a.fy -= fy; b.fx += fx; b.fy += fy; }
      }
      d.atoms.forEach(a => {
        if (d.drag && d.drag.a === a) return;
        a.vx = (a.vx + a.fx * k) * 0.8; a.vy = (a.vy + a.fy * k) * 0.8;
        a.x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, a.x + a.vx * k)); a.y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, a.y + a.vy * k));
      });
      render();
    });
    d.clear = () => { d.atoms.slice().forEach(removeAtom); d.done.clear(); afterChange(); };
  }

  K.page({
    id: "build-molecule",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Build a molecule",
    description: "A toolbox for building molecules. On the left is a tray with five kinds of atom: hydrogen, carbon, nitrogen, oxygen and chlorine, each labelled with how many bonds it can make: 1, 4, 3, 2 and 1. You drag atoms onto the canvas; when you drop an atom close to another that still has a free bond, they join with a line. Hollow orange dots around an atom show its unused bonds. Tapping a bond makes it double or triple when both atoms have a spare bond. Dragging an atom back to the tray removes it. When every bond in a molecule is used up, its formula, name and shape appear on the right, and a checklist ticks off water, ammonia, methane, carbon dioxide, ethene and hydrogen cyanide as you build them.",
    svg, bounds: [20, 50, 980, 465], tapLabel: "Tap to open the atom tray",
    setup(ctx) { build(ctx); ctx.data.afterChange(); },
    teardown(ctx) { (ctx.data.listeners || []).forEach(([n, f]) => ctx.svg.removeEventListener(n, f)); },   // the book's svg outlives this page
    steps: [
      { caption: "Atoms bond to fill their outer shells. How many bonds an atom can make depends on how many electrons it is short of a full shell: hydrogen 1, oxygen 2, nitrogen 3, carbon 4, chlorine 1. That number is its valence.",
        footnote: "On the next page there are no wrong moves: if a bond isn't allowed, it just won't form." },
      { caption: "Your turn. Drag atoms out of the tray and drop them next to each other to bond them. The hollow dots show the bonds an atom can still make. Tap a bond to make it double or triple. Drag an atom back to the tray to remove it. When all the dots are used up, you've made a molecule. Try water, ammonia, methane, carbon dioxide, ethene and hydrogen cyanide.",
        footnote: "Drawn flat to keep things simple. Real methane, for example, is a 3D tetrahedron (see the VSEPR page). With a keyboard: Tab to an atom in the tray and press Enter.",
        to: { "#play": { opacity: 1 } }, dur: 0.7,
        run(ctx, tl, dir) {
          if (dir !== "fwd") tl.call(() => ctx.data.clear(), null, 0);
          tl.call(() => ctx.$$(".tray").forEach(t => t.setAttribute("tabindex", dir === "fwd" ? "0" : "-1")), null, 0.3);
        } }
    ]
  });
})();
