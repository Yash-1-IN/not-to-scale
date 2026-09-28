// Page 4: ionic bonding. Sodium hands its outer electron to chlorine; the ions attract.
// atoms --tap--> transfer --tap--> ions (pulled together, charges shown)
// Back reverses each step (from "atoms", Back turns to the previous page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const NA_X = 280, CL_X = 720, CY = 220;
  const RAD = [38, 74];                 // shell radii (not to scale)
  const FAR_APART = CL_X - NA_X;        // the atoms' starting distance apart, centre to centre
  const CLOSE = RAD[1] * 2 + 16;        // once they're ions: shells nearly touching, centre to centre

  // Where an atom's electrons sit: shell 0 has up to 2, shell 1 up to 8 (sodium) / 7 (chlorine, before the gift)
  function ring(n, k) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(-Math.PI / 2 + i * 2 * Math.PI / n);
    return pts;
  }

  // `shell1` is how many outer electrons are visible; `layout1` is how many slots to lay them out
  // in (chlorine is drawn on an 8-slot ring from the start, with the 8th slot hidden until the gift arrives).
  function atomSVG(id, cx, sym, shell0, shell1, layout1) {
    layout1 = layout1 || shell1;
    const e0 = ring(shell0).map((a, i) =>
      `<circle class="electron fade" id="${id}e0_${i}" cx="${cx + RAD[0] * Math.cos(a)}" cy="${CY + RAD[0] * Math.sin(a)}" r="6"/>`).join("");
    const e1 = ring(layout1).map((a, i) =>
      `<circle class="electron ${i < shell1 ? "fade" : ""}" id="${id}e1_${i}" cx="${cx + RAD[1] * Math.cos(a)}" cy="${CY + RAD[1] * Math.sin(a)}" r="6" ${i >= shell1 ? 'style="opacity:0"' : ""}/>`).join("");
    return `
      <g id="${id}">
        <circle class="orbit fade" cx="${cx}" cy="${CY}" r="${RAD[0]}"/>
        <circle class="orbit fade" cx="${cx}" cy="${CY}" r="${RAD[1]}"/>
        ${e0}${e1}
        <circle class="proton fade" id="${id}nuc" cx="${cx}" cy="${CY}" r="22"/>
        <text class="nuc-sym fade" id="${id}sym" x="${cx}" y="${CY}">${sym}</text>
        <text class="atom-sub fade" id="${id}charge" x="${cx}" y="${CY - 55}" opacity="0"></text>
        <g class="fade" id="${id}lab">
          <text class="atom-name" x="${cx}" y="330">${sym === "Na" ? "sodium" : "chlorine"}</text>
        </g>
      </g>`;
  }

  const svg = `
    ${atomSVG("na", NA_X, "Na", 2, 8)}
    ${atomSVG("cl", CL_X, "Cl", 2, 7, 8)}
    <g id="travelE"></g>
    <path id="pullField" d="M ${NA_X + RAD[1] + 10} ${CY} L ${CL_X - RAD[1] - 10} ${CY}" opacity="0"/>
    <rect class="tap-ring" id="ring" x="${NA_X - RAD[1] - 20}" y="${CY - RAD[1] - 20}" width="${CL_X - NA_X + (RAD[1] + 20) * 2}" height="${(RAD[1] + 20) * 2}" rx="36" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="${CY}" r="480"/>`;

  // The lone electron in sodium's outer shell (the 9th, at index 0 of shell 1) is the one that moves.
  function travelElectron(ctx) {
    const src = ctx.$("#nae1_0");
    const x = +src.getAttribute("cx"), y = +src.getAttribute("cy");
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", 6);
    el.setAttribute("class", "electron");
    el.setAttribute("cx", x);
    el.setAttribute("cy", y);
    ctx.$("#travelE").appendChild(el);
    return el;
  }

  // Move sodium's group in, or chlorine's group in, so the ions sit close together.
  function slide(tl, id, dx, duration) {
    tl.to("#" + id, { x: dx, duration, ease: "power2.inOut" }, 0);
  }

  const doTransfer = {
    hotspot: "hit", to: "transfer", sound: "pop", captionAt: 0.6,
    play(ctx) {
      const tl = gsap.timeline();
      const e = travelElectron(ctx);
      gsap.set("#nae1_0", { opacity: 0 });
      tl.to(e, { attr: { cx: CL_X - RAD[1] * 0.85, cy: CY - RAD[1] * 0.55 }, duration: 1.1, ease: "power2.inOut" }, 0)
        .call(() => Sound.pop(), null, 1.05)
        .call(() => { e.remove(); }, null, 1.1)
        .to("#cle1_7", { opacity: 1, duration: 0.3 }, 1.05) // the 8th chlorine electron, hidden until now
        .to("#nacharge", { opacity: 1, duration: 0.4 }, 1.15)
        .to("#clcharge", { opacity: 1, duration: 0.4 }, 1.15)
        .call(() => {
          ctx.$("#nacharge").textContent = "+";
          ctx.$("#clcharge").textContent = "−";
        }, null, 1.15);
      return tl;
    }
  };

  const bringTogether = {
    hotspot: "hit", to: "ions", sound: "zwoop", captionAt: 1.0,
    play(ctx) {
      const move = (FAR_APART - CLOSE) / 2;
      const tl = gsap.timeline();
      slide(tl, "na", move, 1.6);
      slide(tl, "cl", -move, 1.6);
      tl.to("#pullField", { opacity: 0.5, duration: 0.6 }, 0)
        .to("#pullField", { opacity: 0, duration: 0.6 }, 1.0);
      return tl;
    }
  };

  const pullApart = {
    to: "transfer", sound: "zwoop-rev", captionAt: 0.9,
    play(ctx) {
      const tl = gsap.timeline();
      slide(tl, "na", 0, 1.4);
      slide(tl, "cl", 0, 1.4);
      return tl;
    }
  };

  const giveBack = {
    to: "atoms", sound: "pop", captionAt: 0.6,
    play(ctx) {
      const tl = gsap.timeline();
      const e = travelElectron(ctx);
      gsap.set(e, { attr: { cx: CL_X - RAD[1] * 0.85, cy: CY - RAD[1] * 0.55 } });
      gsap.set("#cle1_7", { opacity: 0 });
      tl.to(["#nacharge", "#clcharge"], { opacity: 0, duration: 0.3 }, 0)
        .to(e, { attr: { cx: +ctx.$("#nae1_0").getAttribute("cx"), cy: +ctx.$("#nae1_0").getAttribute("cy") }, duration: 1.1, ease: "power2.inOut" }, 0.2)
        .call(() => Sound.pop(), null, 1.25)
        .to("#nae1_0", { opacity: 1, duration: 0.3 }, 1.25)
        .call(() => e.remove(), null, 1.3);
      return tl;
    }
  };

  Book.register({
    id: "ionic",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Ionic bonding",
    description: "A sodium atom and a chlorine atom, each with their electron shells drawn as dotted rings. Tapping sends sodium's single outer electron across to chlorine, turning them into a positive sodium ion and a negative chlorine ion. Tapping again pulls the two ions together, held by the attraction between opposite charges.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "atoms",

    hotspots: [{
      id: "hit", selector: "#hit", label: "Tap to see what happens between sodium and chlorine",
      hint: Hint.ring("#ring", "500 " + CY)
    }],

    setup(ctx) {
      gsap.set(["#nacharge", "#clcharge"], { opacity: 0 });
    },

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .to(["#na .fade", "#cl .fade"], { opacity: 1, duration: 0.7, stagger: 0.03 })
        .call(() => Sound.pop());
    },

    idle() {
      gsap.to("#nanuc, #nasym", { scale: 1.06, svgOrigin: NA_X + " " + CY, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to("#clnuc, #clsym", { scale: 1.06, svgOrigin: CL_X + " " + CY, duration: 2.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      atoms: {
        caption: "Sodium has one electron in its outer shell. Chlorine has room for one more. Tap to see what happens.",
        footnote: "Real atoms don't wobble like this, and they're not drawn to scale.",
        tap: doTransfer
      },
      transfer: {
        caption: "Sodium gave its outer electron to chlorine. Now sodium is a positive ion (it has one more proton than electrons) and chlorine is a negative ion (one more electron than protons).",
        footnote: "We write these as Na⁺ and Cl⁻.",
        tap: bringTogether,
        back: giveBack
      },
      ions: {
        caption: "Opposite charges attract, so the ions pull together. This electrical attraction is called an ionic bond.",
        footnote: "In a real crystal of salt, millions of ions stack together this way, not just one pair.",
        back: pullApart,
        final: true
      }
    }
  });
})();
