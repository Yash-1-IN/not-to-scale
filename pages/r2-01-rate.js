// Rate of reaction: how quickly reactant is used up or product forms. The rate is the slope of a
// concentration-time graph, steepest at the start and flattening as the reactant runs out.
// Illustrative first-order reaction: [A] = 1.0 e^(-0.03 t), so rate = 0.03 [A].

(() => {
  const K = Kit, C = K.C;
  const KRATE = 0.03, PXS = 6, PXC = 260;
  const X = t => 160 + t * PXS, Y = c => 400 - c * PXC, A = t => Math.exp(-KRATE * t);
  const path = f => { let d = ""; for (let t = 0; t <= 100; t += 2) d += (t ? " L " : "M ") + X(t).toFixed(1) + " " + Y(f(t)).toFixed(1); return d; };
  const tangent = (t0, half, id) => {
    const a = A(t0), slope = PXC * KRATE * a;      // canvas px of fall per second
    const t1 = Math.max(0, t0 - half), t2 = t0 + half;
    return `<line id="${id}" x1="${X(t1)}" y1="${Y(a) - (t0 - t1) * slope}" x2="${X(t2)}" y2="${Y(a) + (t2 - t0) * slope}" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round" opacity="0"/>`;
  };
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.arrow(150, 400, 780, 400, "var(--ink)", 3, 'class="fade"')}${K.arrow(160, 410, 160, 112, "var(--ink)", 3, 'class="fade"')}
    ${[0, 50, 100].map(t => K.t(X(t), 424, t, "graph-label fade")).join("")}${[0, 0.5, 1].map(c => K.t(148, Y(c) + 5, c.toFixed(1), "graph-label fade", 'style="text-anchor:end"')).join("")}
    ${K.t(790, 424, "time / s", "graph-label fade", start)}${K.t(172, 102, "concentration / mol dm⁻³", "graph-label fade", start)}
    <path class="fade" d="${path(A)}" fill="none" stroke="${C.electron}" stroke-width="5" stroke-linecap="round"/>
    <path class="fade" d="${path(t => 1 - A(t))}" fill="none" stroke="${C.heat}" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 7"/>
    ${K.t(X(14), Y(A(14)) - 14, "reactant: used up", "molecule-label fade", start)}${K.t(X(52), Y(1 - A(52)) - 14, "product: made", "molecule-label fade", start)}
    ${tangent(0, 28, "tan0")}${tangent(50, 15, "tan50")}
    <g id="r0" opacity="0">${K.t(800, 210, "rate at 0 s", "molecule-label", start)}${K.t(800, 240, "0.030", "atom-name", start)}${K.t(800, 266, "mol dm⁻³ s⁻¹", "graph-label", start)}</g>
    <g id="r50" opacity="0">${K.t(800, 330, "rate at 50 s", "molecule-label", start)}${K.t(800, 360, "0.0067", "atom-name", start)}${K.t(800, 386, "mol dm⁻³ s⁻¹", "graph-label", start)}</g>`;

  K.page({
    id: "rate",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Rate of reaction: how fast is fast?",
    description: "A graph of concentration against time. A blue curve for the reactant falls steeply at first and then flattens out, and a dashed orange curve for the product rises the same way in mirror image. Tapping draws a steep straight tangent to the reactant curve at the start, labelled with a rate of 0.030 mol per cubic decimetre per second. Tapping again moves the tangent to 50 seconds where it is much shallower: 0.0067.",
    svg, bounds: [130, 90, 990, 440], tapLabel: "Tap to measure the rate",
    steps: [
      { caption: "The rate of a reaction is how fast reactants are used up or products are formed: the change in concentration divided by the time taken. On a graph of concentration against time, the rate is the slope of the curve.",
        footnote: "In practice you can follow a reaction by collecting the gas given off, measuring loss of mass, or watching a colour change." },
      { caption: "At the start the reactant curve is steep: reactant is being used up quickly, at 0.030 mol dm⁻³ s⁻¹. The steepness at one moment is the slope of the tangent to the curve at that point.",
        to: { "#tan0": { opacity: 1 }, "#r0": { opacity: 1 } } },
      { caption: "By 50 seconds the curve has flattened, and the tangent is far shallower: the rate has dropped to 0.0067 mol dm⁻³ s⁻¹. Reactions slow down as the reactants get used up, because there are fewer of them left to collide.",
        to: { "#tan0": { opacity: 0 }, "#r0": { opacity: 0.35 }, "#tan50": { opacity: 1 }, "#r50": { opacity: 1 } } }
    ]
  });
})();
