// Metals in acid: magnesium fizzes fast, zinc slower, copper not at all. Metals with a negative standard
// electrode potential (below hydrogen) reduce H+ to H2: Mg + 2H+ -> Mg2+ + H2.

(() => {
  const K = Kit, C = K.C;
  const TUBES = [
    { x: 250, name: "magnesium", e: "−2.37 V", metal: "#B9BCC2", n: 12, dur: [0.7, 1.2] },
    { x: 500, name: "zinc", e: "−0.76 V", metal: "#9AA3AE", n: 5, dur: [1.6, 2.4] },
    { x: 750, name: "copper", e: "+0.34 V", metal: "#C97B4A", n: 0, dur: [1, 1] }
  ];
  const TOP = 190, BOT = 350;
  const rand = K.rng(51);
  const tube = t => `<path class="fade" d="M ${t.x - 50} 120 L ${t.x - 50} 320 Q ${t.x - 50} ${BOT + 4} ${t.x} ${BOT + 4} Q ${t.x + 50} ${BOT + 4} ${t.x + 50} 320 L ${t.x + 50} 120" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path class="fade" d="M ${t.x - 48} ${TOP} L ${t.x - 48} 320 Q ${t.x - 48} ${BOT} ${t.x} ${BOT} Q ${t.x + 48} ${BOT} ${t.x + 48} 320 L ${t.x + 48} ${TOP} Z" fill="#DCEBFA"/>
    <rect class="fade" x="${t.x - 10}" y="${TOP + 30}" width="20" height="120" rx="3" fill="${t.metal}"/>
    ${K.t(t.x, 400, t.name, "atom-name fade", 'style="font-size:22px"')}${K.t(t.x, 428, "E° = " + t.e, "graph-label fade")}`;
  let bubbles = "";
  TUBES.forEach((t, ti) => { for (let i = 0; i < t.n; i++) bubbles += `<circle class="bub b${ti}" cx="${(t.x - 30 + rand() * 60).toFixed(1)}" cy="${(BOT - 20 - rand() * 100).toFixed(1)}" r="${(3 + rand() * 3).toFixed(1)}" fill="#fff" stroke="var(--ink)" stroke-width="1.5" opacity="0"/>`; });

  const svg = `${TUBES.map(tube).join("")}${bubbles}
    ${K.t(500, 100, "dilute hydrochloric acid", "molecule-label fade")}
    <g id="eqn" opacity="0">${K.t(500, 462, "Mg + 2H⁺ → Mg²⁺ + H₂   (H⁺: 0.00 V)", "molecule-label")}</g>`;

  K.page({
    id: "metals-in-acid",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Metals in acid: where the hydrogen comes from",
    description: "Three test tubes of dilute hydrochloric acid, each with a strip of metal in it: magnesium, zinc and copper, labelled with their standard electrode potentials, minus 2.37, minus 0.76 and plus 0.34 volts. Tapping makes bubbles rise: a stream from the magnesium, fewer from the zinc, and none from the copper. Tapping again shows the ionic equation: magnesium reduces hydrogen ions to hydrogen gas.",
    svg, bounds: [190, 90, 810, 470], tapLabel: "Tap to add the acid",
    setup(ctx) {
      const d = ctx.data, rand2 = K.rng(52);
      d.bub = [];
      ctx.$$(".bub").forEach(b => {
        const ti = +b.getAttribute("class").match(/b(\d)/)[1], t = TUBES[ti];
        const tl = gsap.timeline({ repeat: -1, paused: true, delay: rand2() * 1.5 });
        tl.fromTo(b, { attr: { cy: BOT - 14 } }, { attr: { cy: TOP + 6 }, duration: t.dur[0] + rand2() * (t.dur[1] - t.dur[0]), ease: "none" });
        d.bub.push(tl);
      });
    },
    steps: [
      { caption: "Drop strips of three metals into dilute acid. Will they react? The answer depends on where each metal sits relative to hydrogen in the electrochemical series.",
        booklet: "§19 standard reduction potentials: Mg²⁺/Mg −2.37 V, Zn²⁺/Zn −0.76 V, Cu²⁺/Cu +0.34 V, H⁺/H₂ 0.00 V." },
      { caption: "Magnesium fizzes furiously, zinc more slowly, and copper doesn't react at all. The bubbles are hydrogen gas.",
        to: { ".bub": { opacity: 1 } }, dur: 0.6,
        run(ctx, tl, dir) { ctx.data.bub.forEach(t => { if (dir === "fwd" && !ctx.reduceMotion) t.play(); else t.pause(0); }); } },
      { caption: "Metals with a negative electrode potential are easier to oxidize than hydrogen, so they push electrons onto H⁺ ions: the metal is oxidized and the hydrogen ions are reduced to H₂. Copper, with a positive potential, isn't a strong enough reducing agent.",
        footnote: "The more negative the potential, the stronger the reducing agent, and the faster the fizzing.",
        to: { "#eqn": { opacity: 1 } } }
    ]
  });
})();
