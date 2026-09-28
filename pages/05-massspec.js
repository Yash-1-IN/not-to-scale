// Page 5: mass spectrometry. Neon ions curve through a magnetic field on the left; lighter ions bend
// more than heavier ones, so each isotope lands in its own spot on the detector. Tap fires a first,
// easy-to-follow pair of ions, each leaving its own dotted trail so the different curve is obvious —
// then a stream of more ions fires automatically (the same "keep sampling until it settles" idea as
// the electron cloud on the hydrogen page), building up the bar graph on the right hit by hit.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const SRC = { x: 70, y: 240 };
  const FIELD = { x0: 170, y0: 140, x1: 410, y1: 340 };
  const DET_X = 450; // the detector, a dashed line just past the field
  // Two isotopes of neon: [label, mass number, where they enter/exit the field, colour]
  const IONS = [
    { label: "Ne-20", mass: 20, startY: SRC.y - 10, exitY: 130, colour: "var(--proton)" },
    { label: "Ne-22", mass: 22, startY: SRC.y + 10, exitY: 195, colour: "var(--electron)" }
  ];
  const BAR = { x: [620, 760], w: 70, base: 400 }; // graph baseline y=400, bars grow upward
  const HEIGHT = { 20: 100, 22: 20 }; // relative abundance, exaggerated bar heights in px
  const SWARM = { 20: 20, 22: 4 }; // extra ions fired after the first pair, each worth 5px so the bars land exactly on HEIGHT

  // The curved flight path: straight to the field, a curve while inside it, straight on to the detector.
  function trajectory(ion) {
    const entrance = { x: FIELD.x0, y: ion.startY };
    const exit = { x: FIELD.x1, y: ion.exitY };
    const control = { x: (entrance.x + exit.x) / 2, y: entrance.y };
    return `M ${SRC.x} ${ion.startY} L ${entrance.x} ${entrance.y} Q ${control.x} ${control.y} ${exit.x} ${exit.y} L ${DET_X} ${exit.y}`;
  }

  function pointAt(path, t) {
    return path.getPointAtLength(t * path.getTotalLength());
  }

  // Moves `el` along `path` by driving cx/cy from a 0..1 proxy — no extra plugin needed.
  function flyAlong(el, path, duration, ease) {
    const p0 = pointAt(path, 0);
    el.setAttribute("cx", p0.x); el.setAttribute("cy", p0.y);
    const proxy = { t: 0 };
    return gsap.to(proxy, {
      t: 1, duration, ease: ease || "power1.inOut",
      onUpdate() {
        const p = pointAt(path, proxy.t);
        el.setAttribute("cx", p.x); el.setAttribute("cy", p.y);
      }
    });
  }

  // Faint dots, the usual symbol for a field pointing straight out of the page.
  let fieldDots = "";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const fx = FIELD.x0 + 30 + col * 40, fy = FIELD.y0 + 25 + row * 45;
      fieldDots += `<circle cx="${fx}" cy="${fy}" r="2.5" fill="var(--ink)" opacity="0.16"/>`;
    }
  }

  const svg = `
    <text class="graph-label" x="${SRC.x}" y="${SRC.y - 60}">ion source</text>
    <rect x="${FIELD.x0}" y="${FIELD.y0}" width="${FIELD.x1 - FIELD.x0}" height="${FIELD.y1 - FIELD.y0}" rx="16" fill="none" stroke="var(--ink)" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="6 6"/>
    <g aria-hidden="true">${fieldDots}</g>
    <text class="graph-label" x="${(FIELD.x0 + FIELD.x1) / 2}" y="${FIELD.y0 - 14}">magnetic field</text>
    <line class="wire" x1="${DET_X}" y1="80" x2="${DET_X}" y2="400" stroke-dasharray="1 10" stroke-width="3" opacity="0.5"/>
    <text class="graph-label" x="${DET_X + 60}" y="80">detector</text>

    <path id="trailA" d="${trajectory(IONS[0])}" fill="none" stroke="${IONS[0].colour}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1.5 9" opacity="0"/>
    <path id="trailB" d="${trajectory(IONS[1])}" fill="none" stroke="${IONS[1].colour}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1.5 9" opacity="0"/>
    <g id="swarm"></g>
    <circle class="particle fade" id="ionA" cx="${SRC.x}" cy="${IONS[0].startY}" r="10" style="fill:${IONS[0].colour}"/>
    <circle class="particle fade" id="ionB" cx="${SRC.x}" cy="${IONS[1].startY}" r="10" style="fill:${IONS[1].colour}"/>

    <g id="graph" opacity="0">
      <line class="axis-line" x1="${BAR.x[0] - 30}" y1="${BAR.base}" x2="${BAR.x[1] + BAR.w + 30}" y2="${BAR.base}"/>
      <rect id="bar20" x="${BAR.x[0]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" style="fill:${IONS[0].colour}"/>
      <rect id="bar22" x="${BAR.x[1]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" style="fill:${IONS[1].colour}"/>
      <text class="mass-axis-label" x="${BAR.x[0] + BAR.w / 2}" y="${BAR.base + 22}">20</text>
      <text class="mass-axis-label" x="${BAR.x[1] + BAR.w / 2}" y="${BAR.base + 22}">22</text>
      <text class="graph-label" x="${(BAR.x[0] + BAR.x[1] + BAR.w) / 2}" y="${BAR.base + 42}">mass / charge (m/z)</text>
    </g>

    <circle class="tap-ring" id="ring" cx="240" cy="240" r="210" opacity="0"/>
    <circle class="hit" id="hit" cx="450" cy="240" r="500"/>`;

  const fire = {
    hotspot: "hit", to: "result", sound: "zwoop", captionAt: 5.4,
    play(ctx) {
      const tl = gsap.timeline();
      const trailA = ctx.$("#trailA"), trailB = ctx.$("#trailB");
      const ionA = ctx.$("#ionA"), ionB = ctx.$("#ionB");
      const dur = 1.4;

      // The first pair: slow enough to watch the curve, each leaving its own dotted trail.
      tl.to([trailA, trailB], { opacity: 0.55, duration: dur }, 0.15)
        .add(flyAlong(ionA, trailA, dur, "power2.inOut"), 0.15)
        .add(flyAlong(ionB, trailB, dur, "power1.inOut"), 0.15)
        .call(() => Sound.pop(), null, 0.15 + dur * 0.6)
        .to("#graph", { opacity: 1, duration: 0.4 }, dur + 0.3);

      // Then more ions fire on their own, the same idea as the electron cloud: enough single hits
      // build up a reliable picture. Each hit nudges its bar up by a fixed amount (5px), so the bars
      // settle exactly on the target heights once every ion has landed.
      let seed = 11;
      const rand = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const order = [];
      for (let i = 0; i < SWARM[20]; i++) order.push(20);
      for (let i = 0; i < SWARM[22]; i++) order.push(22);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      const bars = { 20: { h: 0, el: ctx.$("#bar20") }, 22: { h: 0, el: ctx.$("#bar22") } };
      const step = HEIGHT[20] / SWARM[20]; // = HEIGHT[22] / SWARM[22] = 5px per hit
      let t = dur + 0.6;
      order.forEach((mass, i) => {
        const ion = IONS.find(x => x.mass === mass);
        const path = mass === 20 ? trailA : trailB;
        const el = document.createElementNS(NS, "circle");
        el.setAttribute("r", 4);
        el.setAttribute("fill", ion.colour);
        el.setAttribute("opacity", 0.85);
        ctx.$("#swarm").appendChild(el);
        tl.add(flyAlong(el, path, 0.35, "power1.in"), t)
          .call(() => {
            bars[mass].h += step;
            gsap.to(bars[mass].el, { attr: { y: BAR.base - bars[mass].h, height: bars[mass].h }, duration: 0.18, ease: "power1.out" });
            el.remove();
            if (i % 3 === 0) Sound.pop();
          }, null, t + 0.35);
        t += 0.11;
      });

      tl.call(() => Sound.tindin(), null, t + 0.3)
        .to("#bar20", { scale: 1.08, svgOrigin: (BAR.x[0] + BAR.w / 2) + " " + BAR.base, duration: 0.25, yoyo: true, repeat: 1 }, t + 0.3)
        .to("#bar22", { scale: 1.08, svgOrigin: (BAR.x[1] + BAR.w / 2) + " " + BAR.base, duration: 0.25, yoyo: true, repeat: 1 }, t + 0.3);
      return tl;
    }
  };

  Book.register({
    id: "massspec",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Mass spectrometry: sorting atoms by mass",
    description: "A beam of neon ions travels from a source on the left, through a dashed region marked 'magnetic field'. Tapping fires a first pair of ions: the lighter one curves more than the heavier one, each leaving its own dotted trail, and both land at their own spot past a detector line. More ions then fire automatically in quick succession, each nudging up a bar on a graph to the right, until the bars settle: a tall one for neon-20 and a short one for neon-22.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>neon-20 <span class="dot dot-e" aria-hidden="true"></span>neon-22',
    start: "ready",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to fire the ion beam", hint: Hint.ring("#ring", "240 240") }],

    intro() {
      return gsap.timeline().to(["#ionA", "#ionB"], { opacity: 1, duration: 0.6, stagger: 0.15 });
    },

    idle() {
      gsap.to(["#ionA", "#ionB"], { y: "+=6", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 });
    },

    states: {
      ready: {
        caption: "Neon atoms are turned into ions and fired through a magnetic field. Tap to fire the beam.",
        footnote: "This machine is a mass spectrometer, AHL content if your course covers it.",
        tap: fire
      },
      result: {
        caption: "Lighter ions are easier to deflect, so neon-20 curves more than neon-22. One pair only tells you where they land — firing many more, and counting the hits, is what actually builds the graph.",
        footnote: "The bar graph is the result: a mass spectrum. Taller bars mean more of that isotope. (A trace of neon-21 exists too, too small to draw here.)",
        final: true
      }
    }
  });
})();
