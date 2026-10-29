// Easter egg: type the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) while reading the book, and an "unscheduled
// assessment" appears: a research-level question nobody could answer, with a ticking clock, a place to
// "show your working", a cheeky marker, and a mark scheme if you give up. It is announced by the Extreme
// Demon (a long cinematic the first time, a short one after; Space skips it). On a phone, tap the page counter
// seven times quickly instead. The questions are real physical chemistry (kinetics, quantum tunnelling, electron
// transfer) and the mark schemes are correct, just very far past the IB syllabus.
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
  // The first time (about 14 s): "Warning. Challenger detected.", a fake background check that prints what the
  // browser reveals about the reader's system, a difficulty bar that overflows into an error, then the Extreme
  // Demon fades in: "Extreme demon chosen". After that, a short version (about 4 s). Space, Enter or a tap skips
  // it (straight to the question); Escape cancels the whole thing. Reduced motion gets just the still demon.
  const TEST = /[?&]test\b/.test(location.search);        // the self-test opens the panel directly, no intro
  const SEEN = "not-to-scale-egg-seen";
  let intro = null, played = false;
  const wasSeen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch (e) { return false; } };
  const rememberSeen = () => { played = true; try { localStorage.setItem(SEEN, "1"); } catch (e) { /* no storage: once per visit */ } };
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // What the "background check" prints. Everything comes from the browser itself and is only shown on this
  // screen: nothing is sent anywhere (no network request, no location prompt; the timezone is as close as it gets).
  function sysInfo(short) {
    const n = navigator, ua = n.userAgent, m = re => (re.exec(ua) || [])[1];
    const browser = m(/Edg\/(\d+)/) ? "Edge " + m(/Edg\/(\d+)/) : m(/OPR\/(\d+)/) ? "Opera " + m(/OPR\/(\d+)/)
      : m(/Firefox\/(\d+)/) ? "Firefox " + m(/Firefox\/(\d+)/) : m(/Chrome\/(\d+)/) ? "Chrome " + m(/Chrome\/(\d+)/)
      : m(/Version\/(\d+).*Safari/) ? "Safari " + m(/Version\/(\d+).*Safari/) : "unidentified";
    const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
      : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "unknown";
    let zone = ""; try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ").replace("/", " / "); } catch (e) { /* ignore */ }
    let pages = 0, right = 0;
    try { const pr = Study.progress(); pages = Object.keys(pr.visited).length; right = Object.values(pr.quiz).filter(v => v === "right").length; } catch (e) { /* ignore */ }
    const conn = n.connection && n.connection.effectiveType ? "online (" + n.connection.effectiveType.toUpperCase() + ")" : n.onLine === false ? "offline (brave)" : "online";
    const all = [
      ["Browser", browser],
      ["System", os],
      ["Pages read", pages + " / " + Book.pages.length],
      ["Processor", n.hardwareConcurrency ? n.hardwareConcurrency + " threads" : ""],
      ["Memory", n.deviceMemory ? "at least " + n.deviceMemory + " GB" : ""],
      ["Display", screen.width + " × " + screen.height + " @ " + (window.devicePixelRatio || 1) + "x"],
      ["Touch screen", n.maxTouchPoints > 0 ? "yes" : "no"],
      ["Language", n.language || ""],
      ["Location", zone ? "somewhere in " + zone : ""],
      ["Local time", new Date().toLocaleTimeString()],
      ["Connection", conn],
      ["Questions right", String(right)],
      ["Examiner's note", "suspiciously confident"]
    ].filter(r => r[1]);
    return short ? all.slice(0, 3) : all;
  }

  // The Extreme Demon picture is images/extreme-demon.png, shown as it is. Around it: a fake "background check"
  // typed out like a terminal, a progress bar that overflows into an error, then the demon fades in.
  function play(done) {
    const mode = reduced() ? "calm" : (!played && !wasSeen()) ? "first" : "quick";
    rememberSeen();
    const prev = document.activeElement;
    const el = make("div", "egg-intro egg-" + mode);
    el.tabIndex = -1; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Something is awakening");
    el.innerHTML = '<div class="egg-cam">' +
      '<p class="egg-line egg-l1">Warning.</p><p class="egg-line egg-l2">Challenger detected.</p>' +
      '<div class="egg-term"></div>' +
      '<img class="egg-demon" src="images/extreme-demon.png" alt="" width="228" height="208">' +
      '<p class="egg-title">Extreme demon chosen</p></div>' +
      '<div class="egg-vig"></div><p class="egg-skip">Press Space to skip</p>';
    document.body.appendChild(el);
    $page().setAttribute("inert", ""); $nav().setAttribute("inert", "");
    el.focus();
    try { Sound.unlock(); } catch (e) { /* sound is optional */ }
    const sfx = (name, ...args) => { try { Sound[name](...args); } catch (e) { /* sound is optional */ } };

    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const term = el.querySelector(".egg-term");
    const say = (cls, key, value) => {
      const p = make("p", "egg-t " + cls);
      if (value === undefined) p.textContent = key;
      else { p.appendChild(make("span", "egg-k", key)); p.appendChild(make("span", "egg-v", value)); }
      term.appendChild(p);
      return p;
    };
    let ticker = null, ending = false;
    const end = openAfter => {
      if (intro !== end || ending) return;
      ending = true; intro = null;
      timers.forEach(clearTimeout); clearInterval(ticker);
      document.removeEventListener("keydown", onKey, true);
      el.removeEventListener("click", onClick);
      sfx("hush");
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

    if (mode === "calm") { at(1600, () => end(true)); return; }       // reduced motion: just the still demon
    const first = mode === "first";
    const P = first ? { gap: 260, calc: 1700, err: 1500, hold: 1900 } : { gap: 140, calc: 600, err: 700, hold: 900 };
    let t = first ? 2900 : 250;                                       // the first time starts with the two big warnings
    at(t, () => say("egg-cmd", first ? "> running background check_" : "> challenger detected, again_"));
    t += 700;
    sysInfo(!first).forEach(r => { at(t, () => say("", r[0], r[1])); t += P.gap; });
    t += 250;
    at(t, () => {
      say("egg-cmd", "> calculating difficulty level…");
      const bar = say("egg-bar", ""), t0 = Date.now();
      ticker = setInterval(() => {
        const f = Math.min(0.99, (Date.now() - t0) / P.calc), n = Math.round(f * 24);
        bar.textContent = "[" + "█".repeat(n) + "░".repeat(24 - n) + "] " + Math.floor(f * 100) + "%";
      }, 50);
      if (first) sfx("rumble", 0, P.calc / 1000);
    });
    t += P.calc;
    at(t, () => {
      clearInterval(ticker);
      say("egg-err", "ERROR: difficulty level out of range");
      say("egg-err", "ERR_DIFFICULTY_OVERFLOW (0xD3M0N)");
      el.classList.add("egg-glitch");
      sfx("zwoop", { reverse: true, dur: 0.5 });
    });
    t += P.err;
    at(t, () => el.classList.add("egg-term-off"));
    t += 600;
    at(t, () => { el.classList.add("egg-reveal"); sfx("boom", 0); });
    t += first ? 1300 : 500;
    at(t, () => el.classList.add("egg-chosen"));
    t += P.hold;
    at(t, () => end(true));
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
