// Easter egg: type the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) while reading the book, and an "unscheduled
// assessment" appears: a research-level question nobody could answer, with a ticking clock, a place to
// "show your working", a cheeky marker, and a mark scheme if you give up. On a phone, tap the page
// counter seven times quickly instead. The questions are real physical chemistry (kinetics, quantum
// tunnelling, electron transfer) and the mark schemes are correct, just very far past the IB syllabus.
// Uses Study.panel (js/study.js) for the overlay, so Escape and the arrow-key guard come for free.

const Egg = (() => {
  const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  const QUESTIONS = [
    { level: "Postdoctoral", marks: 47,
      q: "A hydrogen atom tunnels through a barrier on a Born–Oppenheimer potential energy surface that you may model with an Eckart potential. Using the zero-point-corrected small-curvature tunnelling approximation, calculate the kinetic isotope effect k_H/k_D at 200 K, and explain, with reference to the reaction path Hamiltonian, why conventional transition state theory cannot reproduce it.",
      scheme: "Tunnelling lowers the effective barrier far more for H than for D (shorter de Broglie wavelength for the heavier isotope), so k_H/k_D at 200 K can be many times larger than the semiclassical limit of about 7. Transition state theory treats the barrier crossing classically, so it has no way to represent that." },
    { level: "Nobel shortlist", marks: 52,
      q: "Starting from the Landau–Zener formula for a non-adiabatic crossing of two diabatic surfaces, derive the Marcus expression k_ET ∝ exp[−(ΔG° + λ)² / 4λk_BT] for outer-sphere electron transfer. Hence explain why making a reaction more exergonic can make it slower, and say what the inverted region does to the reorganization energy λ.",
      scheme: "Treat the solvent polarization as the reaction coordinate: the two free-energy parabolas cross at ΔG‡ = (ΔG° + λ)² / 4λ. The rate is largest when −ΔG° = λ. If −ΔG° > λ the crossing point moves to the far side of the product parabola and ΔG‡ rises again: the inverted region. λ itself does not change; the driving force does." },
    { level: "Final-year PhD viva", marks: 38,
      q: "Show that the Lindemann–Hinshelwood mechanism predicts a pressure-dependent unimolecular rate constant that falls from first order at high pressure to second order at low pressure. Then explain why the experimental fall-off curve is broader than the Lindemann prediction, and what the Troe centre-broadening factor F_cent actually corrects for.",
      scheme: "With A + M ⇌ A* + M and A* → P: k_uni = k₁k₂[M] / (k₋₁[M] + k₂). At high [M] this is k₁k₂/k₋₁ (first order); at low [M] it is k₁[M] (second order). Real fall-off is broader because A* is not a single state: the microcanonical rate k(E) rises with energy (RRK, RRKM) and collisions don't deactivate every A* equally. F_cent is a fitted broadening factor that corrects for both." },
    { level: "Beyond the Fields Medal (for chemists)", marks: 61,
      q: "A transition state for a proton transfer has an imaginary frequency of 1200i cm⁻¹. Estimate the Wigner tunnelling correction κ = 1 + (1/24)(hν‡/k_BT)² at 298 K. (Take hc/k_B = 1.4388 cm K. Prove, while you are at it, that a first-order saddle point has exactly one negative eigenvalue of the mass-weighted Hessian.)",
      scheme: "hν‡/k_BT = 1.4388 × 1200 / 298 = 5.79, so κ = 1 + 5.79² / 24 = 1 + 1.40 = about 2.4. The Wigner expansion is only reliable when hν‡/k_BT is small, so at 5.8 it is really an overestimate you shouldn't trust. The saddle point is defined as the stationary point with one negative eigenvalue; the single imaginary frequency is the square root of it." },
    { level: "Hypothetical", marks: 30,
      q: "Solve the electronic Schrödinger equation for H₂⁺ exactly, by separating it in prolate spheroidal coordinates, and give the total energy at an internuclear separation of R = 2.00 a₀. You have three hours and no calculator.",
      scheme: "The equation separates into coupled radial and angular equations in ξ and η, which are solved numerically as a function of R. At R = 2.00 a₀ the electronic energy is about −1.1026 Eh, so with the nuclear repulsion 1/R = 0.5 Eh the total is about −0.6026 Eh: this is the equilibrium geometry, with a dissociation energy of 0.1026 Eh (2.79 eV)." }
  ];
  const VERDICTS = [
    "Marker's comment: \"I admire the confidence.\" Score: 0 / {m}.",
    "1 mark for writing something, 0 for the chemistry. Score: 1 / {m}.",
    "This script has been forwarded to the Nobel committee, who have forwarded it to the bin. 0 / {m}.",
    "Your answer was read aloud to a quantum harmonic oscillator. It was in its ground state and did not react. 0 / {m}.",
    "Marker's comment: \"Units?\" There were no units. Score: 0 / {m}.",
    "The examiner has gone for a lie down. Score: 0 / {m}, pending recovery."
  ];
  const BLANK = "A blank page. Bold, and the only honest answer in the room. 0 / {m}, but with respect.";

  let panel = null, timer = null, last = -1;
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  function open() {
    if (!Book.debug.started()) return;
    if (!panel) {
      panel = Study.panel("egg", "Unscheduled assessment");
      panel.el.classList.add("egg");
      panel.el.setAttribute("role", "dialog");
      panel.el._onClose = () => { clearInterval(timer); timer = null; };
    }
    let i; do { i = Math.floor(Math.random() * QUESTIONS.length); } while (i === last && QUESTIONS.length > 1);
    last = i;
    const Q = QUESTIONS[i], b = panel.body;
    panel.heading.textContent = "⚠ Unscheduled assessment ⚠";
    b.innerHTML = "";
    b.appendChild(make("p", "egg-warn", "Not on the IB syllabus. Not on any syllabus. Proceed at your own risk."));
    const meta = make("p", "egg-meta", "Level: " + Q.level + "  ·  Marks: " + Q.marks + "  ·  Time remaining: ");
    const clock = make("span", "egg-clock", "03:00:00");
    meta.appendChild(clock);
    b.appendChild(meta);
    b.appendChild(make("p", "egg-q", Q.q));
    const ans = make("textarea", "egg-ans"); ans.rows = 5; ans.placeholder = "Show your working…"; ans.setAttribute("aria-label", "Your answer");
    const out = make("p", "egg-out"); out.setAttribute("aria-live", "polite");
    const row = make("div", "quiz-row");
    const submit = make("button", "nav-btn", "Submit"), give = make("button", "nav-btn", "I give up (show mark scheme)"), again = make("button", "nav-btn", "A different question");
    [submit, give, again].forEach(x => { x.type = "button"; row.appendChild(x); });
    submit.addEventListener("click", () => {
      const m = ans.value.trim() ? VERDICTS[Math.floor(Math.random() * VERDICTS.length)] : BLANK;
      out.textContent = m.replace("{m}", Q.marks);
    });
    give.addEventListener("click", () => { out.textContent = "Mark scheme: " + Q.scheme; });
    again.addEventListener("click", open);
    b.append(ans, row, out);

    let secs = 3 * 3600;
    clearInterval(timer);
    timer = setInterval(() => {
      secs--;
      const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
      clock.textContent = [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
    }, 1000);
    try { Sound.tindin(); } catch (e) { /* sound not unlocked: fine */ }
    if (panel.el.hidden) Study.openPanel(panel, ans);
    else ans.focus();
  }

  // ----- triggers -----
  let progress = 0, resetAt = 0, taps = [];
  // Capture phase, so the ← → of the code don't also turn pages once the code is under way.
  document.addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    const now = Date.now();
    if (now > resetAt) progress = 0;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === CODE[progress]) {
      const swallow = progress >= 4 && (key === "ArrowLeft" || key === "ArrowRight");
      progress++; resetAt = now + 2500;
      if (swallow) { e.preventDefault(); e.stopImmediatePropagation(); }
      if (progress === CODE.length) { progress = 0; open(); }
    } else progress = key === CODE[0] ? 1 : 0;
  }, true);
  // Phones: tap the page counter 7 times within 4 seconds.
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#counter")) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 4000); taps.push(now);
    if (taps.length >= 7) { taps = []; open(); }
  });

  return { open, questions: QUESTIONS };
})();
