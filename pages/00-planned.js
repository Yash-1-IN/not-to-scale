// The plan for the whole book, following the Grade 12 half-yearly chemistry syllabus (IB Chemistry,
// first assessment 2025): shown on the contents page grouped by IB topic, each line with its syllabus
// code. Pages that don't exist yet appear as "coming soon". When you add a page, give it the same
// `topic` and `title` as its line here and it switches on automatically.
// A line is either "Title" or ["Title", "syllabus code"].

Book.plan([
  { topic: "Structure 1 — Models of the particulate nature of matter", items: [
    ["Particles and the states of matter", "S1.1.1–2"],
    ["Kelvin: a temperature scale that starts at zero", "S1.1.3"],
    ["The hydrogen atom and scale", "S1.2.1"],
    ["Isotopes", "S1.2.2"],
    ["Mass spectrometry: sorting atoms by mass", "S1.2.3 HL"],
    ["Emission spectra: why hydrogen glows in colours", "S1.3.1–3"],
    ["Electron shells and configurations", "S1.3.4–5"],
    ["Orbitals: the shapes of the clouds", "S1.3.4–5"],
    ["The limit of convergence: when an electron escapes", "S1.3.6 HL"],
    ["Successive ionization energies: peeling off electrons", "S1.3.7 HL"],
    ["The mole: counting things too small to count", "S1.4.1"],
    ["Weighing atoms: relative and molar mass", "S1.4.2–3"],
    ["Empirical formulas: the simplest ratio", "S1.4.4"],
    ["Concentration: how crowded a solution is", "S1.4.5"],
    ["Avogadro's law: equal volumes, equal numbers", "S1.4.6"],
    ["Gases: particles bouncing in a box", "S1.5.1"],
    ["Real gases: when particles get in each other's way", "S1.5.2"],
    ["PV = nRT: squeezing, heating and adding gas", "S1.5.3–4"]
  ] },
  { topic: "Structure 2 — Models of bonding and structure", items: [
    ["Ionic bonding", "S2.1.1–2"],
    ["Ionic lattices: why salt makes crystals", "S2.1.3"],
    ["Covalent bonding: sharing electrons", "S2.2.1"],
    ["Double and triple bonds", "S2.2.2"],
    ["Coordination bonds: one atom brings both electrons", "S2.2.3"],
    ["VSEPR: electron pairs pushing apart", "S2.2.4"],
    ["Polar bonds and polar molecules", "S2.2.5–6"],
    ["Giant covalent structures: diamond, graphite and silicon", "S2.2.7"],
    ["Forces between molecules", "S2.2.8–9"],
    ["Chromatography: a race on paper", "S2.2.10"],
    ["Resonance and benzene", "S2.2.11–12 HL"],
    ["Expanded octets and formal charge", "S2.2.13–14 HL"],
    ["Sigma and pi bonds, and hybridization", "S2.2.15–16 HL"],
    ["Metallic bonding: a sea of electrons", "S2.3.1"],
    ["What makes a metallic bond strong", "S2.3.2–3"],
    ["The bonding triangle: ionic, covalent, metallic", "S2.4.1–2"],
    ["Alloys: mixing metals", "S2.4.3"],
    ["Addition polymers: monomers joining hands", "S2.4.4–5"]
  ] },
  { topic: "Structure 3 — Classification of matter", items: [
    ["The periodic table: periods, groups and blocks", "S3.1.1–2"],
    ["Walking across the periodic table: trends in atom size", "S3.1.3–4"],
    ["Hydrogen: the element that doesn't fit", "S3.1.4"],
    ["Metals and non-metals", "S3.1.5"],
    ["Oxidation states: keeping score of electrons", "S3.1.6"],
    ["Dips in ionization energy", "S3.1.7 HL"],
    ["Transition elements: many oxidation states, coloured complexes", "S3.1.8–10 HL"],
    ["Drawing organic molecules: types of formula", "S3.2.1"],
    ["Functional groups as “families”", "S3.2.2"],
    ["Homologous series: one CH₂ at a time", "S3.2.3–4"],
    ["Naming organic compounds", "S3.2.5"],
    ["Structural isomers: same atoms, different shapes", "S3.2.6"]
  ] },
  { topic: "Reactivity 1 — What drives chemical reactions?", items: [
    ["Exothermic vs endothermic: where does the energy go?", "R1.1.1–3"],
    ["Measuring enthalpy changes: Q = mcΔT", "R1.1.4"],
    ["Bond breaking and bond making", "R1.2.1"],
    ["Hess's law: two routes, same total", "R1.2.2"],
    ["Enthalpies of formation and combustion", "R1.2.3–4 HL"],
    ["Born–Haber cycles", "R1.2.5 HL"],
    ["Combustion, complete and incomplete", "R1.3.1–2"],
    ["Fossil fuels and biofuels", "R1.3.3–4"],
    ["Fuel cells", "R1.3.5 HL"],
    ["Entropy and spontaneity", "R1.4 HL"]
  ] },
  { topic: "Reactivity 2 — How much, how fast, how far?", items: [
    ["Rate of reaction: how fast is fast?", "R2.2.1"],
    ["Collision theory: why heating speeds things up", "R2.2.2"],
    ["What changes the rate", "R2.2.3"],
    ["Maxwell–Boltzmann: why a little heat goes a long way", "R2.2.4"],
    ["Catalysts: a lower hump to get over", "R2.2.5"],
    ["Equilibrium: a reaction that runs both ways at once", "R2.3.1–3"],
    ["Le Châtelier's principle: pushing back against a change", "R2.3.4"],
    ["Le Châtelier: pressure and temperature", "R2.3.4"]
  ] },
  { topic: "Reactivity 3 — What are the mechanisms of chemical change?", items: [
    ["Acids and bases: passing a proton", "R3.1.1–2"],
    ["Amphiprotic species: acid or base?", "R3.1.3"],
    ["pH: a scale in powers of ten", "R3.1.4"],
    ["Water's own ions: Kw", "R3.1.5"],
    ["Strong and weak acids", "R3.1.6"],
    ["Neutralization", "R3.1.7"],
    ["pH curves", "R3.1.8"],
    ["Oxidation and reduction: four ways to see it", "R3.2.1"],
    ["Half-equations", "R3.2.2"],
    ["Who gets oxidized? Reactivity down a group", "R3.2.3"],
    ["Metals in acid: where the hydrogen comes from", "R3.2.4"],
    ["Redox and electrochemical cells: following the electrons", "R3.2.5–6"],
    ["Rechargeable cells", "R3.2.7"],
    ["Electrolysis: pushing a reaction uphill", "R3.2.8"],
    ["Oxidizing and reducing organic molecules", "R3.2.9–11"],
    ["Radicals: a lone electron looking for trouble", "R3.3"],
    ["Nucleophilic substitution", "R3.4.1–3"],
    ["Electrophilic addition to alkenes", "R3.4.4–5"]
  ] }
]);
