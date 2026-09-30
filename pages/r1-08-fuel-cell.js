// A hydrogen-oxygen fuel cell (HL), acidic electrolyte. Anode: H2 -> 2H+ + 2e-. Cathode:
// O2 + 4H+ + 4e- -> 2H2O. Electrons go round the wire, protons through the membrane.

(() => {
  const K = Kit, C = K.C;
  const WIRE = [[300, 190], [300, 100], [700, 100], [700, 190]];
  const NE = 5;
  const start = 'style="text-anchor:start"';

  const svg = `
    <rect class="fade" x="322" y="190" width="356" height="200" fill="#EAF3FF"/>
    <rect class="fade" x="290" y="190" width="32" height="200" fill="${C.grey}"/><rect class="fade" x="678" y="190" width="32" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 300 190 L 300 100 L 700 100 L 700 190" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="fade"><circle cx="500" cy="100" r="24" fill="#FFF3B0" stroke="var(--ink)" stroke-width="4"/>${K.l(484, 84, 516, 116, "var(--ink)", 3)}${K.l(516, 84, 484, 116, "var(--ink)", 3)}</g>
    <g class="fade">${K.arrow(120, 290, 282, 290, "var(--ink)", 5)}${K.t(120, 268, "H₂ in", "atom-name", start)}</g>
    <g class="fade">${K.arrow(880, 290, 718, 290, "var(--ink)", 5)}${K.t(880, 268, "O₂ in", "atom-name", 'style="text-anchor:end"')}</g>
    <g class="fade">${K.arrow(722, 350, 800, 350, "var(--ink)", 5)}${K.t(812, 356, "H₂O out", "graph-label", start)}</g>
    ${K.t(300, 418, "anode (−)", "atom-name fade", 'style="font-size:20px"')}${K.t(700, 418, "cathode (+)", "atom-name fade", 'style="font-size:20px"')}
    ${K.t(500, 300, "acidic electrolyte / membrane", "graph-label fade")}
    <g id="halfA" opacity="0">${K.t(300, 448, "H₂ → 2H⁺ + 2e⁻", "molecule-label", "")}</g>
    <g id="halfC" opacity="0">${K.t(700, 448, "O₂ + 4H⁺ + 4e⁻ → 2H₂O", "molecule-label")}</g>
    <g id="electrons"></g><g id="protons"></g>
    <g id="volts" opacity="0">${K.t(500, 445, "cell voltage ≈ 1.23 V", "atom-name", "")}</g>`;

  const kill = d => { (d.flows || []).forEach(f => f.kill()); d.flows = []; };

  K.page({
    id: "fuel-cell",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Fuel cells",
    description: "A hydrogen-oxygen fuel cell: two grey electrodes either side of a blue electrolyte, with hydrogen fed in at the left and oxygen at the right, joined by a wire over the top with a lamp. Tapping runs the cell: electrons flow along the wire from the anode to the cathode and hydrogen ions cross the electrolyte, and the half-equations appear under each electrode. Tapping again shows the cell voltage, about 1.23 volts, and that water is the only product.",
    svg, bounds: [100, 70, 900, 470], tapLabel: "Tap to run the fuel cell",
    setup(ctx) { ctx.data.flows = []; },
    steps: [
      { caption: "A fuel cell turns the energy of a fuel reacting with oxygen straight into electrical energy, with no flame. Hydrogen is fed to one electrode and oxygen to the other, separated by an electrolyte that lets hydrogen ions through.",
        footnote: "Unlike a battery, it never runs flat: it keeps working as long as fuel and oxygen keep being supplied." },
      { caption: "At the anode, hydrogen loses electrons (oxidation) and the hydrogen ions cross the electrolyte. The electrons can't follow, so they go round the wire, powering the lamp, to the cathode, where oxygen gains them (reduction) and combines with the ions to make water.",
        to: { "#halfA": { opacity: 1 }, "#halfC": { opacity: 1, delay: 0.3 } }, dur: 0.8,
        run(ctx, tl, dir) {
          const d = ctx.data; kill(d);
          if (dir !== "fwd") { ctx.$("#electrons").innerHTML = ""; ctx.$("#protons").innerHTML = ""; return; }
          tl.call(() => {
            const el = ctx.$("#electrons"), pr = ctx.$("#protons");
            for (let i = 0; i < NE; i++) {
              const dot = document.createElementNS(K.NS, "circle");
              dot.setAttribute("r", 7); dot.setAttribute("fill", C.electron); el.appendChild(dot);
              gsap.set(dot, { x: WIRE[0][0], y: WIRE[0][1], opacity: 0 });
              const f = gsap.timeline({ repeat: -1, delay: i * 0.55 });
              f.set(dot, { x: WIRE[0][0], y: WIRE[0][1], opacity: 1 });
              for (let s = 1; s < WIRE.length; s++) f.to(dot, { x: WIRE[s][0], y: WIRE[s][1], duration: 0.7, ease: "none" });
              d.flows.push(f);
              const p = document.createElementNS(K.NS, "circle");
              p.setAttribute("r", 8); p.setAttribute("fill", "#fff"); p.setAttribute("stroke", "#1B1A22"); p.setAttribute("stroke-width", 2); pr.appendChild(p);
              const y = 220 + i * 32;
              gsap.set(p, { x: 336, y, opacity: 0 });
              const g = gsap.timeline({ repeat: -1, delay: i * 0.5 });
              g.set(p, { x: 336, y, opacity: 1 }).to(p, { x: 664, y, duration: 2.2, ease: "none" });
              d.flows.push(g);
            }
          }, null, 0.3);
        } },
      { caption: "The reaction between hydrogen and oxygen releases a lot of energy, and the cell captures it as a voltage of about 1.23 V. The only product is water. This is the same overall reaction as burning hydrogen, 2H₂ + O₂ → 2H₂O, with the energy going into electricity instead of heat.",
        booklet: "§19 standard reduction potentials: ½O₂ + 2H⁺ + 2e⁻ → H₂O, +1.23 V; H⁺/H₂, 0.00 V.",
        to: { "#volts": { opacity: 1 }, "#halfA": { opacity: 0 }, "#halfC": { opacity: 0 } } }
    ]
  });
})();
