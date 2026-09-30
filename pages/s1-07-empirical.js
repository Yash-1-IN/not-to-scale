// Empirical formulas: from percentage masses to the simplest whole-number ratio. Iron oxide: 69.9 % Fe,
// 30.1 % O gives 1 : 1.5, then 2 : 3, so Fe2O3.

(() => {
  const K = Kit, C = K.C;
  const row = (id, y, label, a, b) => `<g id="${id}" ${id === "row1" ? 'class="fade"' : 'opacity="0"'}>
      ${K.t(60, y + 6, label, "atom-sub", 'style="text-anchor:start"')}
      ${K.t(520, y + 6, a, "molecule-label")}${K.t(790, y + 6, b, "molecule-label")}</g>`;
  const svg = `
    ${K.atom("feAtom", 520, 82, 26, "Fe", C.heat)}${K.atom("oAtom", 790, 82, 26, "O", C.electron)}
    ${row("row1", 150, "mass in 100 g", "69.9 g", "30.1 g")}
    ${row("row2", 218, "÷ molar mass = moles", "69.9 ÷ 55.85 = 1.25 mol", "30.1 ÷ 16.00 = 1.88 mol")}
    ${row("row3", 286, "÷ the smaller number", "1.25 ÷ 1.25 = 1", "1.88 ÷ 1.25 = 1.5")}
    ${row("row4", 354, "× 2 for whole numbers", "1 × 2 = 2", "1.5 × 2 = 3")}
    ${K.t(655, 438, "Fe₂O₃", "atom-name", 'id="formula" opacity="0" style="font-size:44px"')}`;

  K.page({
    id: "empirical",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Empirical formulas: the simplest ratio",
    description: "An iron atom and an oxygen atom sit at the top of two columns. Under them the page fills in row by row: the masses in 100 grams of the compound, 69.9 grams of iron and 30.1 of oxygen; then moles, 1.25 and 1.88; then the ratio 1 to 1.5; then the whole-number ratio 2 to 3, giving the formula Fe2O3.",
    svg, bounds: [50, 50, 930, 470], tapLabel: "Tap for the next step",
    steps: [
      { caption: "A compound of iron and oxygen is 69.9 % iron and 30.1 % oxygen by mass. So 100 g of it holds 69.9 g of iron and 30.1 g of oxygen. What's its formula?",
        footnote: "The empirical formula is the simplest whole-number ratio of atoms. It says what's in the compound, not how many atoms are in each molecule." },
      { caption: "Formulas count atoms, not grams. Divide each mass by its molar mass to turn grams into moles.",
        booklet: "§7 periodic table: A<sub>r</sub> of Fe is 55.85 and of O is 16.00.",
        to: { "#row2": { opacity: 1 } } },
      { caption: "Divide both by the smaller number to get a ratio: 1 iron to 1.5 oxygen.",
        to: { "#row3": { opacity: 1 } } },
      { caption: "Atoms come in whole numbers, so multiply through until they are: 2 iron to 3 oxygen. The formula is Fe₂O₃.",
        footnote: "A molecular formula is a whole-number multiple of the empirical formula: glucose, C₆H₁₂O₆, has the empirical formula CH₂O.",
        to: { "#row4": { opacity: 1 }, "#formula": { opacity: 1, delay: 0.5 } } }
    ]
  });
})();
