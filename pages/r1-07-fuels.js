// Fossil fuels and biofuels: burning fossil fuels releases carbon locked away for millions of years, so
// atmospheric CO2 rises. Biofuels only return the CO2 that plants took in recently.

(() => {
  const K = Kit, C = K.C;
  const box = (id, x, y, w, text, fill, cls = "fade") => K.g(id, x, y, `<rect x="${-w / 2}" y="-30" width="${w}" height="60" rx="14" fill="${fill}"/>${K.t(0, 7, text, "molecule-label", 'style="fill:#fff"')}`, cls);
  const gauge = `
    ${K.t(880, 100, "CO₂ in the air", "graph-label fade")}
    <rect class="fade" x="850" y="120" width="60" height="280" rx="8" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <rect id="co2" class="fade" x="853" y="${400 - 100}" width="54" height="100" fill="${C.heat}"/>
    <line id="ghost" x1="840" y1="300" x2="920" y2="300" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 5" opacity="0"/>`;

  const fossil = `${box("fossil", 170, 240, 200, "coal, oil, gas", "#5b4a3f")}${box("burn1", 430, 240, 160, "burned", C.heat)}${box("air1", 690, 240, 190, "CO₂ released", C.grey)}
    ${K.arrow(275, 240, 345, 240, "var(--ink)", 4, 'class="fade"')}${K.arrow(515, 240, 590, 240, "var(--ink)", 4, 'class="fade"')}
    ${K.t(170, 300, "carbon locked underground for", "graph-label fade")}${K.t(170, 322, "millions of years", "graph-label fade")}`;
  const bio = `${box("plants", 170, 240, 200, "plants grow", C.product, "")}${box("fuel", 400, 240, 160, "biofuel", "#8a6d3b", "")}${box("burn2", 610, 240, 130, "burned", C.heat, "")}
    ${K.arrow(275, 240, 315, 240, "var(--ink)", 4, 'class="bio" opacity="0"')}${K.arrow(485, 240, 540, 240, "var(--ink)", 4, 'class="bio" opacity="0"')}
    <path class="bio" opacity="0" d="M 676 240 C 740 300 740 340 660 340 L 260 340 C 170 340 170 300 170 275" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    ${K.t(440, 370, "CO₂ taken up by the plants as they grew", "graph-label bio", 'opacity="0"')}`;

  const svg = `<g id="fossilG">${fossil}</g><g id="bioG" opacity="0">${bio}</g>${gauge}`;

  K.page({
    id: "fuels",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Fossil fuels and biofuels",
    description: "A row of three boxes: coal, oil and gas, then burned, then carbon dioxide released, with a gauge on the right showing carbon dioxide in the air. Tapping burns the fossil fuel and the gauge rises. Tapping again swaps to biofuels, where plants grow into a biofuel that is burned and the carbon dioxide loops back round to the plants, and the gauge stays level with a dashed line.",
    svg, bounds: [60, 90, 940, 400], tapLabel: "Tap to burn the fuel",
    steps: [
      { caption: "Fossil fuels (coal, oil and natural gas) formed from the remains of living things over millions of years. Their carbon has been locked underground all that time.",
        footnote: "They're non-renewable: we're using them far faster than they form." },
      { caption: "Burning them releases that stored carbon as carbon dioxide, a greenhouse gas. There's nothing taking it back out on the same timescale, so the amount of CO₂ in the atmosphere goes up.",
        to: { "#co2": { attr: { y: 260, height: 140 } } }, dur: 1.4 },
      { caption: "Biofuels are made from plants or other recently living things: ethanol by fermenting sugar cane, biodiesel from vegetable oils. When they burn they release CO₂, but the plants took the same carbon in from the air as they grew. In principle the loop is close to carbon-neutral.",
        footnote: "Only in principle: growing, harvesting and processing the crops uses energy (and land) and can release CO₂ too.",
        to: { "#fossilG": { opacity: 0 }, "#bioG": { opacity: 1 }, ".bio": { opacity: 1, stagger: 0.2, delay: 0.5 }, "#co2": { attr: { y: 300, height: 100 } }, "#ghost": { opacity: 1, delay: 0.6 } }, dur: 1.1 }
    ]
  });
})();
