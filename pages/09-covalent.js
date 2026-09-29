// Page 9: covalent bonding. Two hydrogen atoms, neither willing to give its electron away, so instead
// they share a pair between them. Tap brings them together and their electrons form a shared pair.
//
// The two nuclei (with their orbit ring and symbol) are groups that slide via a transform. The two
// electrons are drawn as separate, un-nested circles in absolute scene coordinates, so their position
// never compounds with the nucleus groups' own sliding.

(() => {
  const H1_X = 320, H2_X = 680, CY = 220, RAD = 80, GAP = 210; // GAP: final centre-to-centre distance

  function atomSVG(id, cx) {
    return `
      <g id="${id}">
        <circle class="orbit fade" cx="${cx}" cy="${CY}" r="${RAD}"/>
        <circle class="proton fade" cx="${cx}" cy="${CY}" r="22"/>
        <text class="nuc-sym fade" x="${cx}" y="${CY}">H</text>
      </g>`;
  }

  const svg = `
    ${atomSVG("a", H1_X)}
    ${atomSVG("b", H2_X)}
    <circle class="electron fade" id="ae" cx="${H1_X - RAD}" cy="${CY}" r="7"/>
    <circle class="electron fade" id="be" cx="${H2_X + RAD}" cy="${CY}" r="7"/>
    <text class="molecule-label fade" id="label" x="500" y="380" opacity="0"></text>
    <rect class="tap-ring" id="ring" x="211" y="118" width="578" height="204" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="${CY}" r="420"/>`;

  const bond = {
    hotspot: "hit", to: "bonded", sound: "zwoop", captionAt: 1.3,
    play(ctx) {
      const move = (H2_X - H1_X - GAP) / 2;
      const tl = gsap.timeline();
      tl.to("#a", { x: move, duration: 1.4, ease: "power2.inOut" }, 0)
        .to("#b", { x: -move, duration: 1.4, ease: "power2.inOut" }, 0)
        .to("#ae", { attr: { cx: 500 - 12 }, duration: 1.2, ease: "power2.inOut" }, 0.15)
        .to("#be", { attr: { cx: 500 + 12 }, duration: 1.2, ease: "power2.inOut" }, 0.15)
        .call(() => Sound.pop(), null, 1.3)
        .call(() => { ctx.$("#label").textContent = "H₂, a hydrogen molecule"; }, null, 1.35)
        .to("#label", { opacity: 1, duration: 0.4 }, 1.35);
      return tl;
    }
  };

  const unbond = {
    to: "apart", sound: "zwoop-rev", captionAt: 1.0,
    play() {
      const tl = gsap.timeline();
      tl.to("#a", { x: 0, duration: 1.2, ease: "power2.inOut" }, 0)
        .to("#b", { x: 0, duration: 1.2, ease: "power2.inOut" }, 0)
        .to("#ae", { attr: { cx: H1_X - RAD }, duration: 1.0, ease: "power2.inOut" }, 0)
        .to("#be", { attr: { cx: H2_X + RAD }, duration: 1.0, ease: "power2.inOut" }, 0)
        .to("#label", { opacity: 0, duration: 0.3 }, 0);
      return tl;
    }
  };

  Book.register({
    id: "covalent",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Covalent bonding: sharing electrons",
    description: "Two hydrogen atoms, each with one electron, sitting apart. Tapping brings them together: their electrons meet in the middle and form a shared pair, and a label appears reading 'H2, a hydrogen molecule'.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "apart",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to bring the two hydrogen atoms together", hint: Hint.ring("#ring", "500 220") }],

    intro() {
      return gsap.to(["#a .fade", "#b .fade", "#ae", "#be"], { opacity: 1, duration: 0.6, stagger: 0.05 });
    },

    idle() {
      gsap.to("#ae, #be", { scale: 1.2, transformOrigin: "center", duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      apart: {
        caption: "Neither hydrogen atom will give up its one electron. Instead of transferring it, like sodium and chlorine did, they can share. Tap to bring them together.",
        footnote: "Sharing electrons instead of swapping them is a covalent bond.",
        tap: bond
      },
      bonded: {
        caption: "The two electrons now sit between the nuclei as a shared pair. Both atoms count that pair as part of their own outer shell.",
        footnote: "This shared pair is what holds the two atoms together, an ordinary hydrogen molecule, H₂.",
        back: unbond,
        final: true
      }
    }
  });
})();
