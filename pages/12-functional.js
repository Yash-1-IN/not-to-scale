// Page 12: functional groups. A small carbon chain with one swappable end group. Tapping cycles
// through four example molecules, each named after the "family" its end group puts it in.

(() => {
  const CHAIN = "M 300 300 L 400 240 L 500 300 L 600 240";
  const GX = 600, GY = 240;

  const PILL_H = 40;

  const GROUPS = [
    { label: "OH", family: "alcohols", example: "ethanol", colour: "#2E6FE0", w: 54,
      note: "Alcohols like this one tend to dissolve in water and burn cleanly.",
      booklet: "§20 infrared data: an alcohol's O–H absorbs at 3200–3600 cm⁻¹ (strong, broad) — one way chemists spot this family. As a frequency that is about 9.6 × 10¹³ – 1.1 × 10¹⁴ Hz (ν = c × wavenumber); as energy per photon, about 6.4 × 10⁻²⁰ – 7.2 × 10⁻²⁰ J (E = hν, §2)." },
    { label: "COOH", family: "carboxylic acids", example: "ethanoic acid", colour: "#E05A2B", w: 98,
      note: "The acid in vinegar (ethanoic acid) is a carboxylic acid, this same family.",
      booklet: "§20 infrared data: a carboxylic acid shows C=O at 1700–1750 cm⁻¹ (5.1 × 10¹³ – 5.3 × 10¹³ Hz, about 3.4 × 10⁻²⁰ – 3.5 × 10⁻²⁰ J) and a very broad O–H at 2500–3000 cm⁻¹ (7.5 × 10¹³ – 9.0 × 10¹³ Hz, about 5.0 × 10⁻²⁰ – 6.0 × 10⁻²⁰ J)." },
    { label: "Cl", family: "halogenoalkanes", example: "chloroethane", colour: "#2E9E63", w: 48,
      note: "Swap in a halogen atom like this and you get a halogenoalkane instead.",
      booklet: "§20 infrared data: C–Cl absorbs at 600–800 cm⁻¹ (1.8 × 10¹³ – 2.4 × 10¹³ Hz, about 1.2 × 10⁻²⁰ – 1.6 × 10⁻²⁰ J)." },
    { label: "NH₂", family: "amines", example: "ethylamine", colour: "#6A2BD9", w: 68,
      note: "Amines like this one often smell fishy, and turn up in a lot of biology.",
      booklet: "§20 infrared data: a primary amine's N–H shows two bands at 3300–3500 cm⁻¹ (9.9 × 10¹³ – 1.05 × 10¹⁴ Hz, about 6.6 × 10⁻²⁰ – 7.0 × 10⁻²⁰ J)." }
  ];

  const svg = `
    <path class="fade" d="${CHAIN}" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="fade" cx="300" cy="300" r="7" fill="var(--ink)"/>
    <circle class="fade" cx="400" cy="240" r="7" fill="var(--ink)"/>
    <circle class="fade" cx="500" cy="300" r="7" fill="var(--ink)"/>
    <rect class="fade" id="groupDot" x="${GX - GROUPS[0].w / 2}" y="${GY - PILL_H / 2}" width="${GROUPS[0].w}" height="${PILL_H}" rx="${PILL_H / 2}"/>
    <text class="nuc-sym fade" id="groupLabel" x="${GX}" y="${GY}"></text>
    <text class="molecule-label fade" id="name" x="450" y="150"></text>
    <rect class="tap-ring" id="ring" x="271" y="109" width="378" height="220" rx="30" opacity="0"/>
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
      booklet: g.booklet,
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

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to try a different functional group", hint: Hint.ring("#ring", "460 219") }],

    setup(ctx) { ctx.$("#groupDot").setAttribute("fill", GROUPS[0].colour); ctx.$("#groupLabel").textContent = GROUPS[0].label; ctx.$("#name").textContent = "part of " + GROUPS[0].example; },

    intro() {
      return gsap.to(["path.fade", "circle.fade", "#groupDot", "#groupLabel", "#name"], { opacity: 1, duration: 0.6, stagger: 0.06 });
    },

    states
  });
})();
