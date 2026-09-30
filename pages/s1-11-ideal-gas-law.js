// PV = nRT: 0.10 mol of gas in a cylinder. Halve the volume: pressure doubles. Double the temperature:
// pressure doubles again. Let the piston go: it settles where the pressure is back to 100 kPa.
// P (kPa) = n R T / V (dm³), with n = 0.10 mol and R = 8.31 J K⁻¹ mol⁻¹.

(() => {
  const K = Kit, C = K.C;
  const N_MOL = 0.10, R_GAS = 8.31, X0 = 100, TOP = 140, BOT = 340, PXV = 96;
  const STATES = [
    { V: 2.5, T: 300 },
    { V: 1.25, T: 300 },
    { V: 1.25, T: 600 },
    { V: 5.0, T: 600 }
  ];
  STATES.forEach(s => { s.P = N_MOL * R_GAS * s.T / s.V; s.x = X0 + PXV * s.V; });
  const pbar = P => ({ attr: { y: 400 - 0.6 * P, height: 0.6 * P } });
  const texts = s => ({ "#rT": "T = " + s.T + " K", "#rV": "V = " + s.V.toFixed(2) + " dm³", "#rP": "P ≈ " + Math.round(s.P) + " kPa" });
  const s0 = STATES[0];
  const start = 'style="text-anchor:start"';

  const svg = `
    <path class="fade" d="M 600 ${TOP} L ${X0} ${TOP} L ${X0} ${BOT} L 600 ${BOT}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="ps"></g>
    ${K.g("piston", s0.x, 0, `<line x1="0" y1="${TOP}" x2="0" y2="${BOT}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="240" x2="46" y2="240" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(X0, 400, "n = 0.10 mol", "molecule-label fade", start)}
    ${K.t(660, 190, "T = " + s0.T + " K", "molecule-label fade", 'id="rT" ' + start)}
    ${K.t(660, 228, "V = " + s0.V.toFixed(2) + " dm³", "molecule-label fade", 'id="rV" ' + start)}
    ${K.t(660, 266, "P ≈ " + Math.round(s0.P) + " kPa", "molecule-label fade", 'id="rP" ' + start)}
    ${K.t(877, 428, "pressure", "graph-label fade")}
    <rect id="pbar" class="fade" x="860" y="${400 - 0.6 * s0.P}" width="34" height="${0.6 * s0.P}" rx="3" fill="${C.heat}"/>
    <line class="fade" x1="850" y1="400" x2="904" y2="400" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`;

  const stepTo = (i, caption, extra = {}) => ({
    caption, ...extra,
    to: { "#piston": { x: STATES[i].x }, "#pbar": pbar(STATES[i].P) }, text: texts(STATES[i]), dur: 1.3,
    run(ctx, tl, dir) {
      const s = STATES[dir === "fwd" ? i : i - 1], d = ctx.data;
      tl.to(d.box, { x1: s.x, duration: 1.3, ease: "power2.inOut" }, 0).to(d, { T: s.T, duration: 1.3 }, 0);
    }
  });

  K.page({
    id: "ideal-gas-law",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "PV = nRT: squeezing, heating and adding gas",
    description: "A cylinder with a piston holds 0.10 moles of gas at 300 kelvin, 2.5 cubic decimetres, and about 100 kilopascals, shown as a red pressure bar. Tapping halves the volume and the pressure bar doubles. Tapping again doubles the temperature to 600 kelvin and the particles speed up and the pressure doubles again. Tapping a last time lets the piston move freely and it settles at 5.0 cubic decimetres and 100 kilopascals.",
    svg, bounds: [90, 120, 920, 420], tapLabel: "Tap to change the gas",

    setup(ctx) {
      const d = ctx.data;
      d.box = { x0: X0, y0: TOP, x1: s0.x, y1: BOT };
      d.T = s0.T;
      d.list = K.spawn(ctx, "#ps", 12, { r: 7, fill: C.ion, cls: "fade" }, d.box, K.rng(31), 60);
      K.tick(ctx, dt => {
        K.setSpeed(d.list, 60 * Math.sqrt(d.T / 300), Math.min(1, dt * 3));
        K.bounce(d.list, d.box, dt);
      });
    },

    steps: [
      { caption: "A sealed cylinder holds 0.10 mol of gas at 300 K. It takes up 2.5 dm³ and pushes on the walls with about 100 kPa. The ideal gas equation ties all four quantities together: PV = nRT.",
        footnote: "Real gases only follow it roughly, but for most school problems it's spot on.",
        booklet: "§1 equations: PV = nRT. §2: R = 8.31 J K⁻¹ mol⁻¹. (With P in kPa and V in dm³, the product PV is in joules.)" },
      stepTo(1, "Halve the volume at constant temperature and the same particles hit the walls twice as often: the pressure doubles. (P ∝ 1 ÷ V)"),
      stepTo(2, "Now double the temperature in kelvin, 300 K to 600 K, at constant volume. The particles move faster, so they hit harder as well as more often: the pressure doubles again. (P ∝ T)"),
      stepTo(3, "Let the piston go, with 100 kPa pushing back from outside. The gas pushes it out until the pressure is back to 100 kPa: V = nRT ÷ P = 5.0 dm³. Twice the temperature at the same pressure means twice the volume. (V ∝ T)",
        { footnote: "The gas laws you may have met separately (Boyle's, Charles's) are all special cases of PV = nRT." })
    ]
  });
})();
