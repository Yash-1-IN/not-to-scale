// Page 7: the mole. A jar of specks, too many to count one by one. Tap to see the number chemists
// use instead: Avogadro's constant.

(() => {
  const CX = 500, CY = 230;

  // A loose scatter of dots inside a jar outline, just to suggest "far too many to count".
  let seed = 3;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dots = [];
  for (let i = 0; i < 55; i++) {
    const x = CX - 130 + rand() * 260, y = CY - 30 + rand() * 180;
    dots.push(`<circle class="particle fade" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${3 + rand() * 3}"/>`);
  }

  const svg = `
    <path d="M ${CX - 150} ${CY - 120} L ${CX - 150} ${CY + 170} Q ${CX - 150} ${CY + 200} ${CX - 120} ${CY + 200}
             L ${CX + 120} ${CY + 200} Q ${CX + 150} ${CY + 200} ${CX + 150} ${CY + 170} L ${CX + 150} ${CY - 120}"
          class="fade" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
    <g id="dots">${dots.join("")}</g>

    <text id="counter" class="atom-name" x="${CX}" y="400" opacity="0">0</text>
    <text id="caption2b" class="atom-sub" x="${CX}" y="432" opacity="0"></text>

    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY + 20}" r="185" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY + 20}" r="230"/>`;

  const AVOGADRO = "6.02 × 10²³";
  const SCRAMBLE = ["1.4 × 10³", "8.8 × 10¹⁰", "3.1 × 10¹⁷", "5.9 × 10²¹"];

  const reveal = {
    hotspot: "hit", to: "revealed", sound: "pop", captionAt: 2.0,
    play(ctx) {
      const label = ctx.$("#counter");
      const sub = ctx.$("#caption2b");
      const tl = gsap.timeline();
      tl.to("#dots circle", { opacity: 0.35, duration: 0.3, stagger: 0.005 }, 0)
        .to(label, { opacity: 1, duration: 0.2 }, 0.3);
      SCRAMBLE.forEach((v, i) => tl.call(() => { label.textContent = v; Sound.pop(); }, null, 0.35 + i * 0.18));
      tl.call(() => { label.textContent = AVOGADRO; }, null, 1.25)
        .call(() => Sound.tindin(), null, 1.3)
        .fromTo(label, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: "back.out(3)", svgOrigin: CX + " 400" }, 1.25)
        .call(() => { sub.textContent = "particles in one mole"; }, null, 1.4)
        .to(sub, { opacity: 1, duration: 0.4 }, 1.4);
      return tl;
    }
  };

  Book.register({
    id: "mole",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The mole: counting things too small to count",
    description: "A jar full of tiny specks, far too many to count one at a time. Tapping starts a number flickering rapidly upward before settling on 6.02 times ten to the twenty-three, Avogadro's constant, with the label 'particles in one mole'.",
    svg,
    start: "ready",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to see how chemists count this many particles", hint: Hint.ring("#ring", CX + " " + (CY + 20)) }],

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .to("path.fade", { opacity: 1, duration: 0.6 })
        .to("#dots circle", { opacity: 1, duration: 0.5, stagger: 0.01 }, "-=0.3");
    },

    idle() {
      gsap.to("#dots", { y: "+=4", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      ready: {
        caption: "This jar has far too many specks to count one by one. Tap to see how chemists count them anyway.",
        tap: reveal
      },
      revealed: {
        caption: "Chemists count in groups of 6.02 × 10²³, called a mole. It's a number, the same way “a dozen” means 12.",
        footnote: "It's so big that there are probably more molecules in a single glass of water than there are glasses of water in all the world's oceans put together.",
        final: true
      }
    }
  });
})();
