// Rechargeable (secondary) cells: discharging, the redox reaction is spontaneous and powers a lamp.
// Charging, an external supply pushes the electrons back the other way and reverses the reaction.

(() => {
  const K = Kit, C = K.C;
  const WIRE = [[300, 190], [300, 100], [700, 100], [700, 190]];
  const start = 'style="text-anchor:start"';

  const svg = `
    <rect class="fade" x="322" y="190" width="356" height="200" fill="#EAF3FF"/>
    <rect class="fade" x="290" y="190" width="32" height="200" fill="${C.grey}"/><rect class="fade" x="678" y="190" width="32" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 300 190 L 300 100 L 470 100 M 530 100 L 700 100 L 700 190" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g id="lamp" class="fade"><circle cx="500" cy="100" r="26" fill="#FFF3B0" stroke="var(--ink)" stroke-width="4"/>${K.l(482, 82, 518, 118, "var(--ink)", 3)}${K.l(518, 82, 482, 118, "var(--ink)", 3)}</g>
    <g id="charger" opacity="0">${K.l(470, 100, 486, 100, "var(--ink)", 5)}${K.l(486, 78, 486, 122, "var(--ink)", 5)}${K.l(514, 88, 514, 112, "var(--ink)", 5)}${K.l(514, 100, 530, 100, "var(--ink)", 5)}${K.t(500, 66, "power supply", "graph-label")}</g>
    ${K.t(306, 168, "−", "atom-name fade", 'style="font-size:34px"')}${K.t(694, 168, "+", "atom-name fade", 'style="font-size:34px"')}
    ${K.t(500, 300, "electrolyte", "graph-label fade")}
    <g id="electrons"></g><g id="ions"></g>
    ${K.t(500, 430, "discharging: the cell powers the lamp", "atom-name fade", 'id="mode"')}
    <g id="cmp" opacity="0">
      ${K.t(500, 468, "primary cell: can't be reversed, thrown away  ·  secondary cell: can be recharged", "graph-label")}
    </g>`;

  const kill = d => { (d.flows || []).forEach(f => f.kill()); d.flows = []; };
  function flows(ctx, dir) {
    const d = ctx.data; kill(d);
    if (ctx.reduceMotion) return;
    const el = ctx.$("#electrons"), io = ctx.$("#ions");
    el.innerHTML = ""; io.innerHTML = "";
    const path = dir > 0 ? WIRE : WIRE.slice().reverse();
    for (let i = 0; i < 5; i++) {
      const dot = document.createElementNS(K.NS, "circle");
      dot.setAttribute("r", 7); dot.setAttribute("fill", C.electron); el.appendChild(dot);
      gsap.set(dot, { x: path[0][0], y: path[0][1], opacity: 0 });
      const f = gsap.timeline({ repeat: -1, delay: i * 0.55 });
      f.set(dot, { x: path[0][0], y: path[0][1], opacity: 1 });
      for (let s = 1; s < path.length; s++) f.to(dot, { x: path[s][0], y: path[s][1], duration: 0.7, ease: "none" });
      d.flows.push(f);
      const ion = document.createElementNS(K.NS, "circle");
      ion.setAttribute("r", 9); ion.setAttribute("fill", C.heat); ion.setAttribute("stroke", "#fff"); ion.setAttribute("stroke-width", 2); io.appendChild(ion);
      const y = 215 + i * 34, x0 = dir > 0 ? 340 : 660, x1 = dir > 0 ? 660 : 340;
      gsap.set(ion, { x: x0, y, opacity: 0 });
      const g = gsap.timeline({ repeat: -1, delay: i * 0.5 });
      g.set(ion, { x: x0, y, opacity: 1 }).to(ion, { x: x1, y, duration: 2.2, ease: "none" });
      d.flows.push(g);
    }
  }

  K.page({
    id: "rechargeable",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Rechargeable cells",
    description: "A cell with a negative electrode on the left and a positive electrode on the right in an electrolyte, joined by a wire over the top with a lamp. Electrons flow along the wire from the negative to the positive electrode while ions drift across the electrolyte: the cell is discharging. Tapping swaps the lamp for a power supply and both flows reverse: the cell is charging, and the reaction is being reversed. Tapping again compares primary cells, which can't be recharged, with secondary cells.",
    svg, bounds: [270, 50, 730, 470], tapLabel: "Tap to recharge the cell",
    idle(ctx) { flows(ctx, 1); },
    steps: [
      { caption: "In a cell, a spontaneous redox reaction pushes electrons round a circuit. This cell is discharging: electrons leave the negative electrode, where oxidation happens, and travel round the wire to power the lamp, while ions move through the electrolyte to complete the circuit.",
        footnote: "The arrows of electron flow point from − to + outside the cell." },
      { caption: "In a rechargeable (secondary) cell, the reaction can be reversed. Swap the lamp for a power supply that pushes electrons the opposite way and the chemistry runs backwards: charging turns the products back into reactants, using electrical energy to do it.",
        footnote: "In a lithium-ion cell, charging pushes lithium ions back through the electrolyte from the positive electrode to the negative one.",
        to: { "#lamp": { opacity: 0 }, "#charger": { opacity: 1 } }, text: { "#mode": "charging: electrical energy reverses the reaction" }, dur: 0.8,
        run(ctx, tl, dir) { tl.call(() => flows(ctx, dir === "fwd" ? -1 : 1), null, 0.4); } },
      { caption: "A primary cell has a reaction that can't be reversed in this way, so once the reactants are used up, the cell is thrown away. A secondary cell can go through many discharge and recharge cycles, though not for ever.",
        to: { "#cmp": { opacity: 1 } } }
    ]
  });
})();
