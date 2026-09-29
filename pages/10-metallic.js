// Page 10: metallic bonding. Positive metal ions sit in a grid, with electrons free to drift between
// all of them, not tied to any one ion. Tap "hammers" the lattice: the layers slip sideways, and
// because the electron sea doesn't care whose layer it's near, the metal bends instead of shattering.

(() => {
  const COLS = [300, 400, 500, 600, 700];
  const ROWS = [150, 230, 310, 390];
  const BOX = { x0: 250, y0: 110, x1: 750, y1: 430 };
  const SHIFT = 90; // how far the bottom rows slide on tap

  let seed = 9;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ions = [];
  ROWS.forEach((y, r) => COLS.forEach((x, c) => ions.push({ x, y, row: r })));
  const ionSVG = ions.map((ion, i) => `
    <g class="fade" id="ion${i}">
      <circle cx="${ion.x}" cy="${ion.y}" r="20" fill="var(--pos-ion)"/>
      <text class="nuc-sym" x="${ion.x}" y="${ion.y}" font-size="16">+</text>
    </g>`).join("");

  const svg = `
    <g id="lattice">${ionSVG}</g>
    <g id="sea"></g>
    <rect class="tap-ring" id="ring" x="230" y="108" width="538" height="334" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="270" r="420"/>`;

  const hammer = {
    hotspot: "hit", to: "bent", sound: "pop", captionAt: 0.6,
    play() {
      const tl = gsap.timeline();
      [2, 3].forEach(row => {
        ions.forEach((ion, i) => { if (ion.row === row) tl.to("#ion" + i, { x: SHIFT, duration: 0.9, ease: "power2.out" }, 0); });
      });
      return tl;
    }
  };

  const unhammer = {
    to: "solid", sound: "pop", captionAt: 0.5,
    play() {
      const tl = gsap.timeline();
      [2, 3].forEach(row => {
        ions.forEach((ion, i) => { if (ion.row === row) tl.to("#ion" + i, { x: 0, duration: 0.7, ease: "power2.inOut" }, 0); });
      });
      return tl;
    }
  };

  Book.register({
    id: "metallic",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Metallic bonding: a sea of electrons",
    description: "A grid of positive metal ions with small electrons drifting freely between all of them. Tapping shifts the bottom two rows of ions sideways, like a hammer blow, while the electrons keep drifting around all of them just the same.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>metal ion (+) <span class="dot dot-e" aria-hidden="true"></span>delocalised electron',
    start: "solid",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to hammer the metal", hint: Hint.ring("#ring", "499 275") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.electrons = [];
      const layer = ctx.$("#sea");
      for (let i = 0; i < 26; i++) {
        const x = BOX.x0 + rand() * (BOX.x1 - BOX.x0);
        const y = BOX.y0 + rand() * (BOX.y1 - BOX.y0);
        const angle = rand() * Math.PI * 2, speed = 18 + rand() * 22;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "electron fade");
        el.setAttribute("r", 5);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        d.electrons.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 5, el });
      }
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.electrons, Math.min(dt, 50) / 1000);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#lattice .fade", "#sea circle"], { opacity: 1, duration: 0.6, stagger: 0.01 });
    },

    states: {
      solid: {
        caption: "Metal atoms give up their outer electrons to a shared ‘sea’ that drifts freely between all of them. Tap to hammer this piece of metal.",
        footnote: "The ions left behind are positive; the sea of electrons holds the whole structure together.",
        tap: hammer
      },
      bent: {
        caption: "The layers of ions slid past each other — but the electron sea doesn't care whose layer it's near, so the metal bends instead of breaking.",
        footnote: "That's why metals can be hammered and bent into shape. An ionic solid struck this way would shatter instead.",
        back: unhammer,
        final: true
      }
    }
  });
})();
