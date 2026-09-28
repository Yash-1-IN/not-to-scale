// Page 12: functional groups. A small carbon chain with one swappable end group. Tapping cycles
// through four example molecules, each named after the "family" its end group puts it in.

(() => {
  const CHAIN = "M 300 300 L 400 240 L 500 300 L 600 240";
  const GX = 600, GY = 240;

  const PILL_H = 40;

  const GROUPS = [
    { label: "OH", family: "alcohols", example: "ethanol", colour: "#2E6FE0", w: 54,
      note: "Alcohols like this one tend to dissolve in water and burn cleanly." },
    { label: "COOH", family: "carboxylic acids", example: "ethanoic acid", colour: "#E05A2B", w: 98,
      note: "The acid in vinegar (ethanoic acid) is a carboxylic acid, this same family." },
    { label: "Cl", family: "halogenoalkanes", example: "chloroethane", colour: "#2E9E63", w: 48,
      note: "Swap in a halogen atom like this and you get a halogenoalkane instead." },
    { label: "NH₂", family: "amines", example: "ethylamine", colour: "#6A2BD9", w: 68,
      note: "Amines like this one often smell fishy, and turn up in a lot of biology." }
  ];

  const svg = `
    <path class="fade" d="${CHAIN}" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="fade" cx="300" cy="300" r="7" fill="var(--ink)"/>
    <circle class="fade" cx="400" cy="240" r="7" fill="var(--ink)"/>
    <circle class="fade" cx="500" cy="300" r="7" fill="var(--ink)"/>
    <rect class="fade" id="groupDot" x="${GX - GROUPS[0].w / 2}" y="${GY - PILL_H / 2}" width="${GROUPS[0].w}" height="${PILL_H}" rx="${PILL_H / 2}"/>
    <text class="nuc-sym fade" id="groupLabel" x="${GX}" y="${GY}"></text>
    <text class="molecule-label fade" id="name" x="450" y="150"></text>
    <circle class="tap-ring" id="ring" cx="450" cy="240" r="270" opacity="0"/>
    <circle class="hit" id="hit" cx="450" cy="240" r="420"/>`;

  // The badge is a pill sized to fit each label (a fixed-size circle hid "COOH"/"NH₂" past its edge).
  // Animated purely via x/y/width/height attributes, never CSS scale — a scale+svgOrigin tween on this
  // same element repeatedly left a residual transform offset that silently pushed the badge away from
  // the label sitting on top of it (see BUILDLOG).
  function setGroup(ctx, i) {
    const g = GROUPS[i];
    const dot = ctx.$("#groupDot");
    dot.setAttribute("fill", g.colour);
    ctx.$("#groupLabel").textContent = g.label;
    ctx.$("#name").textContent = "part of " + g.example;
    const wSmall = g.w * 0.6, hSmall = PILL_H * 0.6;
    return gsap.timeline()
      .fromTo(dot,
        { attr: { x: GX - wSmall / 2, y: GY - hSmall / 2, width: wSmall, height: hSmall, rx: hSmall / 2 } },
        { attr: { x: GX - g.w / 2, y: GY - PILL_H / 2, width: g.w, height: PILL_H, rx: PILL_H / 2 }, duration: 0.5, ease: "back.out(3)" })
      .call(() => Sound.pop(), null, 0.05)
      .fromTo("#name", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.1);
  }

  const goTo = i => ({
    hotspot: "hit", to: "m" + i, sound: "pop", captionAt: 0.3,
    play(ctx) { return setGroup(ctx, i); }
  });
  const backTo = i => ({
    to: "m" + i, sound: "pop", captionAt: 0.3,
    play(ctx) { return setGroup(ctx, i); }
  });

  const states = {};
  GROUPS.forEach((g, i) => {
    const next = (i + 1) % GROUPS.length;
    states["m" + i] = {
      caption: "This is " + g.example + ". The –" + g.label + " group makes it one of the " + g.family + " — tap to see another family.",
      footnote: g.note,
      tap: goTo(next),
      final: i === GROUPS.length - 1
    };
    if (i > 0) states["m" + i].back = backTo(i - 1);
  });

  Book.register({
    id: "functional",
    topic: "Structure 3 — Classification of matter",
    title: "Functional groups as “families”",
    description: "A short carbon chain with one swappable group at the end. Tapping cycles the end group through four examples: an alcohol, a carboxylic acid, a halogenoalkane and an amine, each named as its own family.",
    svg,
    start: "m0",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to try a different functional group", hint: Hint.ring("#ring", "450 240") }],

    setup(ctx) { ctx.$("#groupDot").setAttribute("fill", GROUPS[0].colour); ctx.$("#groupLabel").textContent = GROUPS[0].label; ctx.$("#name").textContent = "part of " + GROUPS[0].example; },

    intro() {
      return gsap.to(["path.fade", "circle.fade", "#groupDot", "#groupLabel", "#name"], { opacity: 1, duration: 0.6, stagger: 0.06 });
    },

    states
  });
})();
