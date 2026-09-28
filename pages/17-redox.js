// Page 17: redox and electrochemical cells. Electrons flow through the wire from the anode (where
// something loses electrons, oxidation) to the cathode (where something gains them, reduction).

(() => {
  const AX = 300, CX2 = 700, TOP_Y = 140, EL_TOP = 180, EL_BOT = 350;
  const SOL_Y = 350, SOL_H = 50;
  const N_E = 5;

  const svg = `
    <rect class="fade" x="200" y="${SOL_Y}" width="600" height="${SOL_H}" rx="10" fill="#CFE8FF" stroke="var(--ink)" stroke-width="2"/>
    <rect class="fade" x="${AX - 30}" y="${EL_TOP}" width="60" height="${EL_BOT - EL_TOP}" fill="#8A8590"/>
    <rect class="fade" x="${CX2 - 30}" y="${EL_TOP}" width="60" height="${EL_BOT - EL_TOP}" fill="#8A8590"/>
    <path class="wire fade" id="wire" d="M ${AX} ${EL_TOP} L ${AX} ${TOP_Y} L ${CX2} ${TOP_Y} L ${CX2} ${EL_TOP}"/>

    <text class="molecule-label fade" x="${AX}" y="${SOL_Y + SOL_H + 30}">anode</text>
    <text class="atom-sub fade" x="${AX}" y="${SOL_Y + SOL_H + 54}">oxidation — loses electrons</text>
    <text class="molecule-label fade" x="${CX2}" y="${SOL_Y + SOL_H + 30}">cathode</text>
    <text class="atom-sub fade" x="${CX2}" y="${SOL_Y + SOL_H + 54}">reduction — gains electrons</text>

    <g id="electrons"></g>
    <circle class="tap-ring" id="ring" cx="500" cy="260" r="330" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="260" r="420"/>`;

  function makeElectrons(ctx) {
    const layer = ctx.$("#electrons");
    layer.innerHTML = "";
    const els = [];
    for (let i = 0; i < N_E; i++) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = '<circle r="10" fill="var(--electron)"/><text class="h-plus-label" fill="#fff" dominant-baseline="central" text-anchor="middle">−</text>';
      layer.appendChild(g);
      els.push(g);
    }
    return els;
  }

  const PATH = [[AX, EL_TOP], [AX, TOP_Y], [CX2, TOP_Y], [CX2, EL_TOP]];

  const turnOn = {
    hotspot: "hit", to: "on", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      const d = ctx.data;
      const els = makeElectrons(ctx);
      // Position each electron with GSAP itself (never a raw attribute) before animating its x/y,
      // so GSAP's own transform cache starts from the same place it will animate from.
      d.flows = els.map((g, i) => {
        const tl = gsap.timeline({ repeat: -1, delay: i * (2.4 / N_E) });
        tl.set(g, { x: PATH[0][0], y: PATH[0][1] });
        for (let s = 1; s < PATH.length; s++) tl.to(g, { x: PATH[s][0], y: PATH[s][1], duration: 0.6, ease: "none" });
        return tl;
      });
      return gsap.timeline().call(() => Sound.pop());
    }
  };

  const turnOff = {
    to: "off", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      (ctx.data.flows || []).forEach(f => f.kill());
      ctx.$("#electrons").innerHTML = "";
      return gsap.timeline();
    }
  };

  Book.register({
    id: "redox",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Redox and electrochemical cells: following the electrons",
    description: "Two electrode strips standing in a shared solution, joined by a wire over the top. Tapping starts electrons flowing along the wire from the anode to the cathode, on a loop. The anode is labelled oxidation, loses electrons; the cathode is labelled reduction, gains electrons.",
    svg,
    start: "off",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to let the cell run", hint: Hint.ring("#ring", "500 260") }],

    setup(ctx) { ctx.data.flows = []; },
    teardown(ctx) { (ctx.data.flows || []).forEach(f => f.kill()); },

    intro() {
      return gsap.to(["rect.fade", "path.fade", "text.fade"], { opacity: 1, duration: 0.6, stagger: 0.03 });
    },

    states: {
      off: {
        caption: "Here's a simple electrochemical cell: two electrodes in a shared solution, joined by a wire. Tap to let it run.",
        tap: turnOn
      },
      on: {
        caption: "Electrons flow through the wire from the anode to the cathode. The anode loses electrons — oxidation. The cathode gains them — reduction.",
        footnote: "A memory trick: OIL RIG — Oxidation Is Loss, Reduction Is Gain.",
        back: turnOff,
        final: true
      }
    }
  });
})();
