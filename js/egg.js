// Easter egg: type the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) while reading the book, and an "unscheduled
// assessment" appears: a research-level question nobody could answer, with a ticking clock, a place to
// "show your working", a cheeky marker, and a mark scheme if you give up. It is announced by the Extreme
// Demon rising out of blue flames (a full cinematic the first time, a short sting after; Space skips it).
// On a phone, tap the page counter seven times quickly instead. The questions are real physical chemistry (kinetics, quantum
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

  // ----- the awakening: plays before the assessment -----
  // The first time it is a full cinematic (about 7 s: a warning, a rumble, the Extreme Demon rising out of
  // blue flames, a title slam). After that, a quick 1.7 s sting. Space, Enter or a tap skips it (straight to
  // the question); Escape cancels the whole thing. Reduced motion gets a calm still face.
  const TEST = /[?&]test\b/.test(location.search);        // the self-test opens the panel directly, no intro
  const SEEN = "not-to-scale-egg-seen";
  const LENGTH = { first: 7500, quick: 1700, calm: 1400 };
  let intro = null, played = false;
  const wasSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch (e) { return false; } };
  const rememberSeen = () => { played = true; try { localStorage.setItem(SEEN, "1"); } catch (e) { /* no storage: once per visit */ } };
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // The face is drawn here (nothing to download): flames, horns, a red face, slanted yellow eyes, teeth.
  const FLAMES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((a, i) =>
    '<g transform="rotate(' + a + ' 120 128)"><path class="egg-tongue" d="' +
    (i % 2 ? "M92,86 Q98,50 120,6 Q142,50 148,86 Z" : "M88,86 Q94,30 120,-22 Q146,30 152,86 Z") + '" fill="url(#egd-fl)"/></g>').join("");
  const TEETH = (y, h, x0, n) => Array.from({ length: n }, (_, i) => '<rect x="' + (x0 + i * 13.5) + '" y="' + y + '" width="12" height="' + h + '" rx="2.5"/>').join("");
  const MOUTH = "M68,150 Q120,138 172,150 Q168,188 120,193 Q72,188 68,150 Z";
  const FACE = '<svg class="egg-face" viewBox="0 0 240 240" aria-hidden="true"><defs>' +
    '<linearGradient id="egd-fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#EAFBFF"/><stop offset="0.55" stop-color="#5CC6FF"/><stop offset="1" stop-color="#2A6BFF" stop-opacity="0.15"/></linearGradient>' +
    '<radialGradient id="egd-skin" cx="50%" cy="36%" r="68%"><stop offset="0" stop-color="#F23C30"/><stop offset="0.6" stop-color="#C41717"/><stop offset="1" stop-color="#6B0707"/></radialGradient>' +
    '<radialGradient id="egd-eye" cx="50%" cy="55%" r="62%"><stop offset="0" stop-color="#FFF27A"/><stop offset="0.6" stop-color="#FFB400"/><stop offset="1" stop-color="#E06A00"/></radialGradient>' +
    '<filter id="egd-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
    '<clipPath id="egd-mouth"><path d="' + MOUTH + '"/></clipPath>' +
    '<g id="egd-eye-l"><path d="M74,104 L116,124 L110,142 Q90,148 76,128 Z" fill="url(#egd-eye)" stroke="#1A0000" stroke-width="4" stroke-linejoin="round"/>' +
    '<ellipse cx="99" cy="131" rx="6" ry="9" fill="#1A0000"/><path d="M66,97 L121,122" stroke="#1A0000" stroke-width="8" stroke-linecap="round"/></g></defs>' +
    '<g class="egg-flames" filter="url(#egd-glow)">' + FLAMES + '</g>' +
    '<g fill="#F2F0EA" stroke="#2A0606" stroke-width="4" stroke-linejoin="round">' +
    '<path d="M62,92 L36,48 L80,72 Z"/><path d="M82,70 L76,32 L102,60 Z"/><path d="M158,70 L164,32 L138,60 Z"/><path d="M178,92 L204,48 L160,72 Z"/>' +
    '<path d="M54,112 L24,102 L52,134 Z"/><path d="M186,112 L216,102 L188,134 Z"/></g>' +
    '<circle cx="120" cy="128" r="72" fill="url(#egd-skin)" stroke="#2A0606" stroke-width="5"/>' +
    '<g class="egg-eyes"><use href="#egd-eye-l"/><use href="#egd-eye-l" transform="translate(240 0) scale(-1 1)"/></g>' +
    '<path d="' + MOUTH + '" fill="#2A0005"/>' +
    '<g clip-path="url(#egd-mouth)" fill="#F4EDE0" stroke="#1A0000" stroke-width="2">' + TEETH(138, 20, 74, 7) + TEETH(172, 22, 80, 6) + '</g>' +
    '<path d="' + MOUTH + '" fill="none" stroke="#1A0000" stroke-width="4" stroke-linejoin="round"/></svg>';

  function play(done) {
    const mode = reduced() ? "calm" : (!played && !wasSeen()) ? "first" : "quick";
    rememberSeen();
    const prev = document.activeElement;
    const el = make("div", "egg-intro egg-" + mode);
    el.tabIndex = -1; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Something is awakening");
    el.innerHTML = '<div class="egg-cam">' +
      '<p class="egg-line egg-l1">Warning.</p><p class="egg-line egg-l2">You were not supposed to find this.</p>' +
      '<div class="egg-stage">' + FACE + '</div>' +
      '<p class="egg-title">EXTREME DEMON</p>' +
      '<p class="egg-sub egg-s1">' + (mode === "first" ? "Mythic difficulty. Chemistry edition." : "Back so soon?") + '</p>' +
      (mode === "first" ? '<p class="egg-sub egg-s2">Good luck.</p>' : "") + '</div>' +
      '<div class="egg-vig"></div><div class="egg-flash"></div><p class="egg-skip">Press Space to skip</p>';
    document.body.appendChild(el);
    $page().setAttribute("inert", ""); $nav().setAttribute("inert", "");
    el.focus();
    try { Sound.unlock(); if (mode === "first") { Sound.rumble(3.0, 1.9); Sound.boom(4.9); } else if (mode === "quick") Sound.boom(0.05); } catch (e) { /* sound is optional */ }

    let timer = null;
    const end = openAfter => {
      if (intro !== end) return;
      intro = null; clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
      el.removeEventListener("click", onClick);
      try { Sound.hush(); } catch (e) { /* ignore */ }
      $page().removeAttribute("inert"); $nav().removeAttribute("inert");
      if (prev && document.contains(prev)) prev.focus();
      el.classList.add("egg-leaving");
      setTimeout(() => el.remove(), 350);
      if (openAfter) done();
    };
    const onKey = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") end(true);
      else if (e.key === "Escape") end(false);
    };
    const onClick = () => end(true);
    intro = end;
    document.addEventListener("keydown", onKey, true);
    el.addEventListener("click", onClick);
    timer = setTimeout(() => end(true), LENGTH[mode]);
  }
  const $page = () => document.getElementById("page"), $nav = () => document.getElementById("nav");

  function open() {
    if (!Book.debug.started() || intro) return;
    if (TEST || (panel && !panel.el.hidden)) showPanel();
    else play(showPanel);
  }

  function showPanel() {
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
    again.addEventListener("click", showPanel);
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
