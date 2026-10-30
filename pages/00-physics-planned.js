// The plan for the Physics half of the book (IB Physics HL, first assessment 2025): the school's Grade 12
// half-yearly list, grouped by IB theme (A–D), in the order of PHYSICS_PLAN.md §3. It works exactly like
// pages/00-planned.js: a page switches its line on when its `title` and `topic` match exactly, and lines
// with no page yet show as "coming soon". Physics page ids start with "p-" (so #links never clash with
// chemistry ids). The code beside each title is the IB topic; "HL" marks higher-level content.

Book.plan([
  { subject: "physics", topic: "A — Space, time and motion", items: [
    ["Motion graphs: a car journey in three graphs", "A.1"],
    ["SUVAT: four equations, one motion", "A.1"],
    ["Projectiles: two motions at once", "A.1"],
    ["Free-body diagrams and Newton's laws", "A.2"],
    ["Drag and terminal speed", "A.2"],
    ["Collisions: momentum is always conserved", "A.2"],
    ["Impulse: the area under a force–time graph", "A.2"],
    ["Circular motion: always turning inward", "A.2"],
    ["Roller coaster: kinetic, potential, thermal", "A.3"],
    ["Power, efficiency and Sankey diagrams", "A.3"],
    ["Torque: why handles are far from hinges", "A.4 HL"],
    ["The rolling race: hoop vs disc vs sphere", "A.4 HL"],
    ["The spinning skater", "A.4 HL"]
  ] },
  { subject: "physics", topic: "B — The particulate nature of matter", items: [
    ["Heating ice: why the line goes flat", "B.1"],
    ["Conduction, convection, radiation", "B.1"],
    ["Black bodies: why hot stars are blue", "B.1"],
    ["Gas pressure: particles hitting walls", "B.3"],
    ["pV = NkT: three dials, one gas", "B.3"],
    ["First law: Q = ΔU + W", "B.4 HL"],
    ["A heat engine on a p–V diagram", "B.4 HL"],
    ["Entropy: why heat flows hot to cold", "B.4 HL"],
    ["Current: drifting electrons", "B.5"],
    ["Resistance, resistivity and I–V graphs", "B.5"],
    ["Build a circuit: series and parallel", "B.5"],
    ["EMF and internal resistance", "B.5"],
    ["Potential divider: a night-light", "B.5"]
  ] },
  { subject: "physics", topic: "C — Wave behaviour", items: [
    ["Simple harmonic motion: mass on a spring", "C.1"],
    ["SHM is the shadow of a circle", "C.1 HL"],
    ["The pendulum: period ignores mass", "C.1"],
    ["Waves carry energy, not stuff", "C.2"],
    ["The electromagnetic spectrum, zoomed", "C.2"],
    ["Refraction and total internal reflection", "C.3"],
    ["Two slits: ripples that cancel", "C.3"],
    ["Single slits and gratings", "C.3 HL"],
    ["Standing waves on a string", "C.4"],
    ["Pipes: open, closed and missing harmonics", "C.4"],
    ["Resonance and damping", "C.4"],
    ["The Doppler effect: squashed and stretched", "C.5 (equations HL)"],
    ["Redshift: galaxies running away", "C.5"]
  ] },
  { subject: "physics", topic: "D — Fields", items: [
    ["Newton's cannon: from falling to orbiting", "D.1 (orbital speed HL)"],
    ["Gravitational field strength: g = GM ÷ r²", "D.1"],
    ["Kepler's third law: T² ∝ r³", "D.1"],
    ["Gravitational potential and escape speed", "D.1 HL"],
    ["Charge and Coulomb's law", "D.2"],
    ["Electric field lines: drag the charges", "D.2 HL"],
    ["Magnetic fields: wires, coils and magnets", "D.2"],
    ["Charged particles in fields", "D.3"],
    ["The motor effect: force on a wire", "D.3"],
    ["Induction: push a magnet into a coil", "D.4 HL"],
    ["The generator: a spinning coil", "D.4 HL"]
  ] }
]);
