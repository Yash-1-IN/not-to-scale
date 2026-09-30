// Page 1: the hydrogen atom.
// atom --tap--> zoomed --back--> cloud --next--> world (a person in a park, the atom far too small to see)
// Everything the engine needs to know about this page is in the object at the bottom.

(() => {
  const CENTER = "470 240";   // the proton / the hand, in scene coordinates
  const NS = "http://www.w3.org/2000/svg";

  // ---------- Drawing ----------
  const svg = `
    <defs>
      <clipPath id="worldClip"><rect x="0" y="0" width="1000" height="480" rx="22"/></clipPath>
    </defs>

    <!-- The real world: starts hugely magnified on the hand, zooms out to normal -->
    <g clip-path="url(#worldClip)">
      <g id="world">
        <rect x="-500" y="-500" width="2000" height="1000" fill="#CFE8FF"/>
        <circle cx="880" cy="80" r="42" fill="#FFD75E"/>
        <ellipse cx="200" cy="90" rx="70" ry="22" fill="#fff"/>
        <ellipse cx="245" cy="78" rx="45" ry="20" fill="#fff"/>
        <ellipse cx="640" cy="60" rx="60" ry="18" fill="#fff"/>
        <ellipse cx="260" cy="440" rx="380" ry="120" fill="#A9D98C"/>
        <ellipse cx="760" cy="450" rx="330" ry="100" fill="#8CCB74"/>
        <rect x="-500" y="435" width="2000" height="500" fill="#6DB35A"/>
        <!-- tree -->
        <rect x="815" y="230" width="30" height="210" fill="#8A5A3B"/>
        <circle cx="830" cy="170" r="115" fill="#3E9B57"/>
        <circle cx="770" cy="215" r="70" fill="#3E9B57"/>
        <!-- person (bald, on purpose) -->
        <rect x="360" y="290" width="22" height="145" rx="8" fill="#2B2F4A"/>
        <rect x="388" y="290" width="22" height="145" rx="8" fill="#2B2F4A"/>
        <rect x="352" y="424" width="34" height="14" rx="7" fill="#1B1A22"/>
        <rect x="384" y="424" width="34" height="14" rx="7" fill="#1B1A22"/>
        <rect x="350" y="160" width="70" height="145" rx="24" fill="#8B5CF6"/>
        <circle cx="385" cy="118" r="32" fill="#F1B98A"/>
        <path d="M405 178 Q440 205 470 240" fill="none" stroke="#8B5CF6" stroke-width="26" stroke-linecap="round"/>
        <circle cx="470" cy="240" r="14" fill="#F1B98A"/>
      </g>
    </g>

    <!-- The atom (#atomLayer zooms out to the world, #cam zooms in to the proton) -->
    <g id="atomLayer">
      <g id="cam">
        <circle class="orbit fade" id="orbit" cx="470" cy="240" r="160"/>
        <g id="cloud"></g>
        <circle class="proton fade" id="proton" cx="470" cy="240" r="34"/>
        <g id="electronArm">
          <circle class="electron fade" id="electron" cx="630" cy="240" r="8"/>
        </g>
        <circle class="tap-ring" id="tapRing" cx="470" cy="240" r="56" opacity="0"/>
        <circle class="hit" id="atomHit" cx="470" cy="240" r="185"/>
      </g>
      <g id="cloudArrows"></g>
    </g>

    <!-- The "it's really small" arrow -->
    <g id="pointer">
      <text class="pointer-label fade" id="pointerLabel" x="600" y="128" text-anchor="middle">it's really small</text>
      <path class="pointer-line fade" id="pointerLine" d="M 560 145 Q 545 200 496 224"/>
      <polygon class="pointer-head fade" id="pointerHead" points="486,229 503.5,228.3 497.3,215.7"/>
    </g>`;

  // ---------- The electron cloud: dots scattered like a 1s orbital, seen flat ----------
  // Distance from the proton follows r^2 * e^(-2r/a); the direction is random in 3D, then squashed to 2D.
  function buildCloud(ctx) {
    let seed = 7; // fixed seed so the cloud always looks the same
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = 80; // cloud size (the dotted orbit is a bit bigger, on purpose)
    const layer = ctx.$("#cloud");
    const dots = [];
    while (dots.length < 420) {
      const r = -(a / 2) * (Math.log(1 - rand()) + Math.log(1 - rand()) + Math.log(1 - rand()));
      const cosT = 2 * rand() - 1, sinT = Math.sqrt(1 - cosT * cosT), phi = 2 * Math.PI * rand();
      const x = r * sinT * Math.cos(phi), y = r * sinT * Math.sin(phi);
      if (Math.abs(y) > 225 || Math.abs(x) > 440) continue;
      const dot = document.createElementNS(NS, "circle");
      const startAngle = rand() * Math.PI * 2;
      const sx = 470 + 160 * Math.cos(startAngle), sy = 240 + 160 * Math.sin(startAngle);
      dot.setAttribute("class", "cloud-dot");
      dot.setAttribute("r", (1.6 + rand() * 1.8).toFixed(2));
      dot.setAttribute("cx", sx); // starts on the orbit ring
      dot.setAttribute("cy", sy);
      dot.style.opacity = 0;
      layer.appendChild(dot);
      dots.push({ dot, sx, sy, x: 470 + x, y: 240 + y, alpha: 0.3 + rand() * 0.35 });
    }
    ctx.data.cloudDots = dots;
  }

  // ---------- "It could be here... or here..." arrows ----------
  // Arrows point at real dots in the cloud, one at a time, faster and faster.
  const SPOTS = [ // [angle in degrees, distance from the proton, label]
    [200, 120, "it could be here"],
    [330, 130, "or here"],
    [110, 95, "or here"],
    [20, 150, "or here"],
    [250, 100, "or here"],
    [160, 170, "or here"]
  ];
  const GAPS = [1.6, 1.2, 0.9, 0.7, 0.5, 0.4]; // seconds before each arrow

  function buildArrows(ctx) {
    const d = ctx.data;
    const layer = ctx.$("#cloudArrows");
    layer.innerHTML = "";
    gsap.set(layer, { opacity: 1 });

    const tl = gsap.timeline({ paused: true });
    let time = 0, prev = null;
    SPOTS.forEach(([deg, dist, text], i) => {
      const rad = deg * Math.PI / 180;
      const wx = 470 + dist * Math.cos(rad), wy = 240 + dist * Math.sin(rad);
      // pick the real cloud dot closest to where we want to point
      const best = d.cloudDots.reduce((b, c) => (Math.hypot(c.x - wx, c.y - wy) < Math.hypot(b.x - wx, b.y - wy) ? c : b));
      const tx = best.x, ty = best.y;
      const len = Math.hypot(tx - 470, ty - 240) || 1;
      const ux = (tx - 470) / len, uy = (ty - 240) / len;         // direction pointing away from the proton
      const sx = tx + ux * 88, sy = ty + uy * 88;                  // where the arrow starts (label end)
      const ex = tx + ux * 10, ey = ty + uy * 10;                  // the tip, just short of the dot
      const bx = ex + ux * 14, by = ey + uy * 14;                  // base of the arrowhead
      const px = -uy * 6.5, py = ux * 6.5;

      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "cloud-arrow");
      g.style.opacity = 0;
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", sx); line.setAttribute("y1", sy);
      line.setAttribute("x2", bx); line.setAttribute("y2", by);
      const lineLen = Math.hypot(bx - sx, by - sy);
      line.setAttribute("stroke-dasharray", lineLen);
      line.setAttribute("stroke-dashoffset", lineLen);
      const head = document.createElementNS(NS, "polygon");
      head.setAttribute("points", ex + "," + ey + " " + (bx + px) + "," + (by + py) + " " + (bx - px) + "," + (by - py));
      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "arrow-label");
      label.setAttribute("x", sx + ux * 12);
      label.setAttribute("y", sy + uy * 12 + (uy > 0.4 ? 18 : uy < -0.4 ? -4 : 7));
      label.setAttribute("text-anchor", ux < -0.4 ? "end" : ux > 0.4 ? "start" : "middle");
      label.textContent = text;
      g.append(line, head, label);

      const blink = document.createElementNS(NS, "circle"); // the electron, "found" here for a moment
      blink.setAttribute("class", "cloud-blink");
      blink.setAttribute("cx", tx); blink.setAttribute("cy", ty); blink.setAttribute("r", 7);
      blink.style.opacity = 0;
      layer.append(blink, g);

      time += GAPS[i];
      tl.call(() => { if (!d.arrowsSkipping) Sound.pop(); }, null, time)
        .to(g, { opacity: 1, duration: 0.25 }, time)
        .to(line, { strokeDashoffset: 0, duration: 0.3, ease: "power1.out" }, time)
        .fromTo(blink, { opacity: 0, scale: 0, svgOrigin: tx + " " + ty }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, time + 0.1);
      if (prev) {
        tl.to(prev.g, { opacity: 0.5, duration: 0.3 }, time)
          .to(prev.blink, { opacity: 0, duration: 0.3 }, time);
      }
      prev = { g, blink };
    });
    tl.to(prev.blink, { opacity: 0, duration: 0.5 }, time + 1.2);
    d.arrowsTl = ctx.track(tl);
  }

  function finishArrows(ctx) {
    const d = ctx.data;
    if (!d.arrowsTl) return;
    d.arrowsSkipping = true;
    d.arrowsTl.totalProgress(1);
    d.arrowsSkipping = false;
  }

  // ---------- Transitions ----------
  const tapAtom = {
    hotspot: "atom", to: "zoomed", sound: "zwoop", captionOut: 0, captionAt: 1.3,
    before: ctx => { ctx.data.tapped = true; },
    play: () => Camera.zoomTo("#cam", { scale: 5, origin: CENTER, duration: 1.8 })
  };

  // Zoom back out. The electron doesn't return to its orbit: it smears into a cloud.
  const smearIntoCloud = {
    to: "cloud", sound: "zwoop-rev", captionOut: 0, captionAt: 2.6,
    play(ctx) {
      const tl = gsap.timeline();
      tl.add(Camera.zoomTo("#cam", { scale: 1, origin: CENTER, duration: 1.8 }), 0)
        .to("#electron", { opacity: 0, duration: 0.6 }, 1.0)
        .to("#orbit", { opacity: 0, duration: 1.6 }, 1.0);
      ctx.data.cloudDots.forEach(c => {
        tl.to(c.dot, { attr: { cx: c.x, cy: c.y }, opacity: c.alpha, duration: 1.6, ease: "power2.out" }, 1.0 + Math.random() * 0.7);
      });
      return tl;
    }
  };

  // Zoom way out into the real world: the atom shrinks to nothing, an arrow says "it's really small".
  const toWorld = {
    to: "world", sound: "zwoop", captionOut: 0, captionAt: 4.0,
    before: ctx => finishArrows(ctx),
    play(ctx) {
      const d = ctx.data;
      gsap.set("#pointerLine", { strokeDashoffset: d.arrowLen });
      const tl = gsap.timeline();
      tl.add(d.zoom.to(1, 4.5), 0)
        .to("#pointerLabel", { opacity: 1, duration: 0.4 }, 4.6)
        .to("#pointerLine", { opacity: 1, duration: 0.05 }, 4.6)
        .to("#pointerLine", { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 4.6)
        .to("#pointerHead", { opacity: 1, duration: 0.2 }, 5.25)
        .call(() => Sound.pop(), null, 4.6);
      return tl;
    }
  };

  const fromWorld = {
    to: ctx => (ctx.data.tapped ? "cloud" : "atom"), sound: "zwoop-rev", captionOut: 0.6, captionAt: 4.9,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to(["#pointerLabel", "#pointerLine", "#pointerHead"], { opacity: 0, duration: 0.5 }, 0)
        .add(ctx.data.zoom.to(0, 4.5), 0);
      return tl;
    }
  };

  // Start over: the cloud fades, the orbiting electron comes back.
  const replay = {
    to: "atom", sound: "pop", captionOut: 0, captionAt: 0.5,
    before: ctx => { if (ctx.data.arrowsTl) ctx.data.arrowsTl.pause(); },
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline({
        onComplete: () => {
          d.cloudDots.forEach(c => gsap.set(c.dot, { attr: { cx: c.sx, cy: c.sy }, opacity: 0 }));
          ctx.$("#cloudArrows").innerHTML = "";
          d.arrowsTl = null;
          d.tapped = false;
        }
      });
      tl.to(d.cloudDots.map(c => c.dot), { opacity: 0, duration: 0.6 }, 0)
        .to("#cloudArrows", { opacity: 0, duration: 0.4 }, 0)
        .to(["#electron", "#orbit"], { opacity: 1, duration: 0.6 }, 0.2);
      return tl;
    }
  };

  // ---------- The page ----------
  Book.register({
    id: "hydrogen",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The hydrogen atom and scale",
    description: "A red circle, the proton, with a much smaller blue dot, the electron, circling it. Tapping the atom zooms in on the proton, then the electron turns into a fuzzy cloud. Next, the view zooms out to a person standing in a park, with an arrow pointing at their hand, where a hydrogen atom would be too small to see.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>proton <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "atom",

    hotspots: [{
      id: "atom", selector: "#atomHit", label: "Tap the atom to zoom in",
      hint: { // the gold ring: "you can tap this"
        start(ctx, strong) {
          const d = ctx.data;
          if (d.ring) d.ring.kill();
          gsap.set("#tapRing", { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: CENTER });
          if (ctx.reduceMotion) return; // a still outline instead of a pulse
          d.ring = gsap.to("#tapRing", {
            scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: CENTER,
            duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
          });
        },
        stop(ctx) {
          if (ctx.data.ring) ctx.data.ring.kill();
          ctx.data.ring = null;
          gsap.to("#tapRing", { opacity: 0, duration: 0.3 });
        }
      }
    }],

    setup(ctx) {
      const d = ctx.data;
      d.tapped = false;
      d.zoom = Camera.crossZoom({ inner: "#atomLayer", outer: "#world", origin: CENTER, factor: 4000 });
      const line = ctx.$("#pointerLine");
      d.arrowLen = line.getTotalLength();
      gsap.set(line, { strokeDasharray: d.arrowLen, strokeDashoffset: d.arrowLen });
      gsap.set(["#pointerLabel", "#pointerHead", "#pointerLine"], { opacity: 0 });
      buildCloud(ctx);
    },

    // First appearance: proton pops in, the orbit and electron follow.
    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("#proton", { opacity: 0, scale: 0.6, svgOrigin: CENTER }, { opacity: 1, scale: 1, svgOrigin: CENTER, duration: 0.7, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to("#orbit", { opacity: 1, duration: 0.6 }, "-=0.2")
        .to("#electron", { opacity: 1, duration: 0.5 }, "-=0.3");
    },

    // Idle motion: electron orbits, proton breathes.
    idle() {
      gsap.to("#electronArm", { rotation: 360, svgOrigin: CENTER, duration: 9, ease: "none", repeat: -1 });
      gsap.to("#proton", { scale: 1.07, svgOrigin: CENTER, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      atom: {
        caption: "This is a hydrogen atom, not to scale of course",
        tap: tapAtom,
        next: toWorld
      },
      zoomed: {
        caption: "Remember, not to scale. If the proton were the size of a marble, the electron would be about half a kilometre away.",
        booklet: "§2 physical constants: a proton (1.672622 × 10⁻²⁷ kg) is about 1836 times heavier than an electron (9.109384 × 10⁻³¹ kg).",
        footnote: "Also, protons aren't really red. Colour is a light thing, and a proton is far smaller than the wavelength of light.",
        back: smearIntoCloud
      },
      cloud: {
        caption: "Actually, electrons don't orbit like little planets. We only know where one is <em>likely</em> to be, so it's more like a fuzzy cloud.",
        footnote: "Denser dots mean more likely. This cloud is called an orbital. More on that later.",
        next: toWorld,
        replay,
        onEnter(ctx) {
          if (ctx.data.arrowsTl) return; // already shown (we came back from the world)
          buildArrows(ctx);
          if (ctx.reduceMotion) finishArrows(ctx);
          else ctx.data.arrowsTl.play();
        }
      },
      world: {
        caption: "Zoom out far enough and the atom disappears. Next to a person, it's too small to draw.",
        footnote: "About 0.1 nanometres wide, roughly a billion times narrower than a hand. The arrow is doing all the work.",
        legend: false,
        final: true,
        back: fromWorld
      }
    }
  });
})();
