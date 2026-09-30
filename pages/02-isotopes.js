// Page 2: isotopes. Three kinds of hydrogen side by side; tap one to zoom into its nucleus and count.
// all --tap an atom--> z1 / z2 / z3 --back--> all (or "summary" once all three have been looked at)

(() => {
  const CY = 215;                       // height of the atoms in the scene
  const X = { 1: 200, 2: 500, 3: 800 }; // where each atom sits
  const ORBIT = 100;                    // dotted orbit radius (not to scale, on purpose)
  const R = 15;                         // radius of a proton or neutron, drawn oversized

  // Nucleon positions relative to the atom's centre: [x, y, "p" or "n"]
  const NUCLEI = {
    1: [[0, 0, "p"]],
    2: [[-15, 0, "p"], [15, 0, "n"]],
    3: [[0, -16, "p"], [-15, 10, "n"], [15, 10, "n"]]
  };
  const NAMES = {
    1: ["hydrogen-1", "the common one"],
    2: ["hydrogen-2", "deuterium"],
    3: ["hydrogen-3", "tritium"]
  };

  function atomMarkup(n) {
    const cx = X[n];
    const nucleons = NUCLEI[n].map(([dx, dy, kind]) =>
      `<circle cx="${cx + dx}" cy="${CY + dy}" r="${R}" fill="${kind === "p" ? "var(--proton)" : "#B8BEC6"}"/>` +
      `<text class="nucleon-label" x="${cx + dx}" y="${CY + dy}" fill="${kind === "p" ? "#fff" : "#1B1A22"}">${kind}</text>`
    ).join("");
    return `
      <g id="atom${n}">
        <circle class="orbit fade" id="orb${n}" cx="${cx}" cy="${CY}" r="${ORBIT}"/>
        <g class="fade" id="nuc${n}">${nucleons}</g>
        <g id="arm${n}"><circle class="electron fade" id="e${n}" cx="${cx + ORBIT}" cy="${CY}" r="7"/></g>
        <g class="fade" id="lab${n}">
          <text class="atom-name" x="${cx}" y="365">${NAMES[n][0]}</text>
          <text class="atom-sub" x="${cx}" y="393">${NAMES[n][1]}</text>
        </g>
        <circle class="tap-ring" id="ring${n}" cx="${cx}" cy="${CY}" r="${R * 2.2}" opacity="0"/>
        <circle class="hit" id="hit${n}" cx="${cx}" cy="${CY}" r="120"/>
      </g>`;
  }

  const svg = `<g id="cam">${atomMarkup(1)}${atomMarkup(2)}${atomMarkup(3)}</g>`;

  const others = n => [1, 2, 3].filter(m => m !== n);

  // Tap an atom: everything else fades, the camera slides and zooms into that nucleus.
  const tapAtom = n => ({
    hotspot: "atom" + n, to: "z" + n, sound: "zwoop", captionOut: 0, captionAt: 1.1,
    before: ctx => { ctx.data.visited.add(n); ctx.data.current = n; },
    play() {
      const tl = gsap.timeline();
      tl.to(others(n).map(m => "#atom" + m), { opacity: 0, duration: 0.6 }, 0)
        .to(["#orb" + n, "#e" + n, "#lab" + n], { opacity: 0, duration: 0.6 }, 0)
        .add(Camera.zoomTo("#cam", { scale: 5.5, origin: X[n] + " " + CY, center: [500, 240], duration: 1.6 }), 0);
      return tl;
    }
  });

  // Zoom back out to the three atoms. After all three have been looked at, we get the summary.
  const backOut = {
    to: ctx => (ctx.data.visited.size === 3 ? "summary" : "all"),
    sound: "zwoop-rev", captionOut: 0, captionAt: 1.0,
    play(ctx) {
      const n = ctx.data.current;
      const tl = gsap.timeline();
      tl.add(Camera.zoomTo("#cam", { scale: 1, origin: X[n] + " " + CY, duration: 1.6 }), 0)
        .to(["#atom1", "#atom2", "#atom3"], { opacity: 1, duration: 0.6 }, 0.9)
        .to(["#orb" + n, "#e" + n, "#lab" + n], { opacity: 1, duration: 0.6 }, 0.9);
      return tl;
    }
  };

  const allTaps = [tapAtom(1), tapAtom(2), tapAtom(3)];

  // The gold ring: "you can tap this".
  const hotspot = n => ({
    id: "atom" + n, selector: "#hit" + n, label: "Tap " + NAMES[n][0] + " to look inside its nucleus",
    hint: {
      start(ctx, strong) {
        const d = ctx.data;
        if (d["ring" + n]) d["ring" + n].kill();
        const o = X[n] + " " + CY;
        gsap.set("#ring" + n, { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 5 : 3, scale: 1, svgOrigin: o });
        if (ctx.reduceMotion) return; // a still outline instead of a pulse
        d["ring" + n] = gsap.to("#ring" + n, {
          scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: o,
          duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
        });
      },
      stop(ctx) {
        const d = ctx.data;
        if (d["ring" + n]) d["ring" + n].kill();
        d["ring" + n] = null;
        gsap.to("#ring" + n, { opacity: 0, duration: 0.3 });
      }
    }
  });

  Book.register({
    id: "isotopes",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Isotopes",
    description: "Three hydrogen atoms side by side, each with one electron circling. Hydrogen-1 has a nucleus of one proton. Hydrogen-2, deuterium, has one proton and one neutron. Hydrogen-3, tritium, has one proton and two neutrons. Tapping an atom zooms in on its nucleus.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>proton <span class="dot dot-n" aria-hidden="true"></span>neutron <span class="dot dot-e" aria-hidden="true"></span>electron',
    hotspots: [hotspot(1), hotspot(2), hotspot(3)],
    start: "all",

    setup(ctx) { ctx.data.visited = new Set(); },

    // The atoms pop in one after another.
    intro() {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      [1, 2, 3].forEach((n, i) => {
        const o = X[n] + " " + CY;
        tl.fromTo("#nuc" + n, { opacity: 0, scale: 0.5, svgOrigin: o }, { opacity: 1, scale: 1, svgOrigin: o, duration: 0.6, ease: "back.out(2)" }, i * 0.45)
          .call(() => Sound.pop(), null, i * 0.45 + 0.1)
          .to("#orb" + n, { opacity: 1, duration: 0.5 }, i * 0.45 + 0.3)
          .to("#e" + n, { opacity: 1, duration: 0.4 }, i * 0.45 + 0.4)
          .to("#lab" + n, { opacity: 1, duration: 0.5 }, i * 0.45 + 0.5);
      });
      return tl;
    },

    // Idle: the three electrons orbit, each starting at a different point on its orbit.
    idle() {
      [1, 2, 3].forEach((n, i) => {
        const start = i * 120;
        gsap.fromTo("#arm" + n, { rotation: start, svgOrigin: X[n] + " " + CY },
          { rotation: start + 360, svgOrigin: X[n] + " " + CY, duration: 9, ease: "none", repeat: -1 });
      });
    },

    states: {
      all: {
        caption: "Three kinds of hydrogen atom. Tap one to look inside its nucleus.",
        footnote: "The nuclei are hugely oversized here, and the electrons don't really orbit. Not to scale, of course.",
        tap: allTaps,
        final: true
      },
      z1: {
        caption: "Hydrogen-1: 1 proton and 0 neutrons. This is the most common kind of hydrogen.",
        back: backOut
      },
      z2: {
        caption: "Hydrogen-2, also called deuterium: 1 proton and 1 neutron.",
        back: backOut
      },
      z3: {
        caption: "Hydrogen-3, also called tritium: 1 proton and 2 neutrons.",
        footnote: "Tritium is radioactive, so it slowly decays.",
        back: backOut
      },
      summary: {
        caption: "Same number of protons, so all three are hydrogen. Different numbers of neutrons, so they are isotopes of each other.",
        booklet: "§2 physical constants: a proton is 1.672622 × 10⁻²⁷ kg and a neutron 1.674927 × 10⁻²⁷ kg — nearly the same, so each extra neutron adds about one unit of mass.",
        footnote: "Neutrons have no charge, so the electron doesn't care. Isotopes have the same chemical properties, but different masses.",
        tap: allTaps,
        final: true
      }
    }
  });
})();
