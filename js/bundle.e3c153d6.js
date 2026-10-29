/* ---- js/selftest.js ---- */
// Automated self-test. Open index.html?test and the book opens itself, turns to every page, and taps
// through every state it can reach (hotspots, Next, Replay, Back), with animations sped up 20×.
// A panel in the corner shows the result. On a normal visit this file does nothing.
//
// Checked on every page: it opens and the URL names it, every state is reachable, each transition
// lands on the state it says it goes to, the right caption shows, tap targets are switched on when they
// should be, final states offer Next, nothing (text or tap outline) is drawn outside the 1000×480
// canvas, particles stay inside their box, and no errors or warnings appear in the console.
// Then it checks links: going to #ionic opens that page and the browser's Back button returns.

(() => {
  if (!/[?&]test\b/.test(location.search)) return;

  const errors = [];
  const wrap = (name, tag) => {
    const orig = console[name];
    console[name] = (...a) => { errors.push(tag + a.map(String).join(" ")); orig.apply(console, a); };
  };
  wrap("error", "");
  wrap("warn", "warning: ");
  window.addEventListener("error", e => errors.push("error: " + e.message));
  window.addEventListener("unhandledrejection", e => errors.push("unhandled: " + e.reason));

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms = 10000) {
    const t0 = Date.now();
    while (!fn()) { if (Date.now() - t0 > ms) return false; await sleep(25); }
    return true;
  }
  const $ = id => document.getElementById(id);

  const transitionsOf = s => {
    const out = [];
    (s.tap ? [].concat(s.tap) : []).forEach(t => out.push({ kind: "tap", key: "tap:" + t.hotspot, tr: t }));
    ["next", "replay", "back"].forEach(k => { if (s[k]) out.push({ kind: k, key: k, tr: s[k] }); });
    return out;
  };
  const targetOf = o => (typeof o.tr.to === "function" ? o.tr.to(Book.debug.ctx()) : o.tr.to);

  function press(o, r, from) {
    if (o.kind === "tap") {
      const el = Book.debug.ctx().hotspotEls[o.tr.hotspot];
      if (!el) { r.problems.push(`${from}: hotspot '${o.tr.hotspot}' doesn't exist`); return false; }
      if (el.getAttribute("tabindex") !== "0") r.problems.push(`${from}: hotspot '${o.tr.hotspot}' isn't switched on`);
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }
    const btn = $({ next: "nextBtn", back: "backBtn", replay: "replayBtn" }[o.kind]);
    if (btn.hidden) r.problems.push(`${from}: the ${o.kind} button is hidden`);
    btn.click();
    return true;
  }

  function check(p, r) {
    const name = Book.debug.stateName();
    const s = p.states[name];
    const root = $("pageRoot");

    // Hint outlines are measured as drawn (their pulse scales them, which is fine). Text is measured
    // after its groups' translation, so labels inside moving groups count too. Text the camera has
    // scaled is skipped (zooming is meant to push things off-screen), and rotated labels use their
    // unrotated box, which is close enough.
    const toCanvas = root.getCTM().inverse();
    root.querySelectorAll(".tap-ring, text").forEach(el => {
      const b = el.getBBox();
      if (!b.width && !b.height) return;
      let x = b.x, y = b.y;
      if (el.tagName === "text") {
        const m = toCanvas.multiply(el.getCTM());
        if (Math.abs(Math.hypot(m.a, m.b) - 1) > 0.01) return;
        if (Math.abs(m.b) < 0.01) { x += m.e; y += m.f; }
      }
      if (x < -2 || y < -2 || x + b.width > 1002 || y + b.height > 482) {
        const what = el.id ? "#" + el.id : '"' + el.textContent.trim().slice(0, 30) + '"';
        r.problems.push(`${el.tagName} ${what} is drawn outside the canvas`);
      }
    });

    // No two visible labels should sit on top of each other.
    const shownOpacity = el => { let o = 1; for (let n = el; n && n !== root.parentNode; n = n.parentNode) if (n.nodeType === 1) o *= +getComputedStyle(n).opacity; return o; };
    const labels = Array.from(root.querySelectorAll("text")).filter(el => el.textContent.trim() && shownOpacity(el) > 0.4).map(el => ({ el, b: el.getBoundingClientRect() }));
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i].b, c = labels[j].b;
      const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (w > 6 && h > 6) r.problems.push(`${name}: labels overlap: "${labels[i].el.textContent.trim().slice(0, 24)}" and "${labels[j].el.textContent.trim().slice(0, 24)}"`);
    }

    const d = Book.debug.ctx().data;
    const box = root.querySelector('rect.fade[fill="none"]');
    if (d.particles && box) {
      const x0 = +box.getAttribute("x"), y0 = +box.getAttribute("y");
      const x1 = x0 + +box.getAttribute("width"), y1 = y0 + +box.getAttribute("height");
      d.particles.forEach(q => {
        if (q.x - q.r < x0 - 0.5 || q.x + q.r > x1 + 0.5 || q.y - q.r < y0 - 0.5 || q.y + q.r > y1 + 0.5)
          r.problems.push(`${name}: a particle is outside its box`);
      });
    }

    const layers = Array.from(document.querySelectorAll("#captions .caption"));
    const shown = layers.find(c => c.getAttribute("aria-hidden") === "false");
    const want = document.createElement("p");
    want.innerHTML = s.caption;
    if (!shown || !shown.textContent.includes(want.textContent.trim())) r.problems.push(`${name}: its caption isn't the one showing`);
    const old = layers.find(c => c !== shown);
    if (old && old.textContent.trim() && +getComputedStyle(old).opacity > 0.05) r.problems.push(`${name}: the previous caption is still visible underneath`);

    const last = Book.pages.indexOf(p) === Book.pages.length - 1;
    if (s.final && !last && $("nextBtn").hidden) r.problems.push(`${name}: final state but no Next button`);
  }

  // Keep taking a transition not tried yet from the current state; when there's none, step to a
  // neighbouring state that still has one. Stops when nothing is left to try.
  async function walk(p, r) {
    const B = Book.debug;
    const tried = new Set();
    const untried = st => transitionsOf(p.states[st]).filter(o => !tried.has(st + ">" + o.key));
    check(p, r);
    r.visited.push(B.stateName());
    for (let step = 0; step < 60; step++) {
      const from = B.stateName();
      const options = transitionsOf(p.states[from]);
      const pick = untried(from)[0] || options.find(o => { const t = targetOf(o); return p.states[t] && untried(t).length; });
      if (!pick) break;
      tried.add(from + ">" + pick.key);
      const expected = targetOf(pick);
      if (!press(pick, r, from)) break;
      r.transitions++;
      if (!(await until(() => !B.busy(), 15000))) { r.problems.push(`${from}: stuck after ${pick.key}`); return; }
      if (B.stateName() !== expected) r.problems.push(`${from} → ${pick.key} landed on '${B.stateName()}', expected '${expected}'`);
      r.visited.push(B.stateName());
      check(p, r);
    }
    Object.keys(p.states).forEach(st => { if (!r.visited.includes(st)) r.problems.push(`state '${st}' was never reached`); });
  }

  function makePanel() {
    const box = document.createElement("div");
    box.setAttribute("role", "status");
    box.style.cssText = "position:fixed;right:12px;top:60px;z-index:100;width:min(420px,calc(100vw - 24px));max-height:70vh;overflow:auto;" +
      "background:var(--paper);border:2px solid var(--ink);border-radius:12px;padding:10px 14px;font:13px/1.45 Nunito,sans-serif";
    document.body.appendChild(box);
    return {
      update(report, done) {
        box.innerHTML = "";
        const add = (tag, text, style) => { const e = document.createElement(tag); e.textContent = text; if (style) e.style.cssText = style; box.appendChild(e); return e; };
        const bad = report.pages.filter(p => p.problems.length);
        const total = report.pages.reduce((n, p) => n + p.transitions, 0);
        const linkOk = report.deepLink && report.deepLink.opened && report.deepLink.returned;
        if (!done) add("strong", `Self-test running… page ${report.pages.length} of ${Book.pages.length}`);
        else add("strong", bad.length || !linkOk ? "Self-test: FAIL" : "Self-test: PASS", `font-size:16px;color:${bad.length || !linkOk ? "#C62828" : "#2E7D32"}`);
        add("div", `${report.pages.length} pages, ${total} transitions`);
        if (report.deepLink) add("div", `Links (#ionic, then browser Back): ${linkOk ? "ok" : "BROKEN"}`);
        report.pages.forEach(p => {
          add("div", `${p.problems.length ? "✗" : "✓"} ${p.title} — ${new Set(p.visited).size} states`, "margin-top:4px");
          [...new Set(p.problems)].forEach(msg => add("div", "   " + msg, "color:#C62828;padding-left:14px"));
        });
      }
    };
  }


  // The study tools (js/study.js): every page has one good question, glossary links point at real pages,
  // every "§N" note has a section in the booklet panel, and the panels open and close.
  async function studyChecks(report) {
    const problems = [];
    if (typeof Study === "undefined") return ["js/study.js did not load"];
    const ids = Book.pages.map(p => p.id);
    Object.keys(QuizData).forEach(id => { if (!ids.includes(id)) problems.push("question for unknown page '" + id + "'"); });
    ids.forEach(id => {
      const q = QuizData[id];
      if (!q) { problems.push("no question for '" + id + "'"); return; }
      if (!q.q || !Array.isArray(q.o) || q.o.length !== 4 || new Set(q.o).size !== 4) problems.push("question for '" + id + "' needs four different options");
      if (!(q.a >= 0 && q.a < 4) || !q.why) problems.push("question for '" + id + "' needs an answer 0–3 and an explanation");
    });
    GlossaryData.forEach(([term, def, links]) => links.forEach(id => { if (!ids.includes(id)) problems.push("glossary '" + term + "' links to unknown page '" + id + "'"); }));
    Book.pages.forEach(p => Object.values(p.states || {}).forEach(st => {
      (st.booklet || "").replace(/§(\d+)/g, (m, n) => { if (!BookletData.sections[n] && !BookletData.notShown[n]) problems.push("'" + p.id + "' cites §" + n + ", which the booklet panel doesn't have"); });
    }));
    // the panels
    const visible = id => { const e = $(id); return !!e && !e.hidden; };
    const B = Book.debug;
    if (!(await until(() => !B.busy()))) problems.push("book still busy");
    if (B.isFinal() && ($("quizBtn") || {}).hidden) problems.push("no 'Check yourself' button on a last step");
    if ($("quizBtn") && !$("quizBtn").hidden) {
      $("quizBtn").click();
      if (!visible("quiz")) problems.push("the question panel didn't open");
      else {
        document.querySelector("#quiz .quiz-opt").click();
        if (!document.querySelector("#quiz .quiz-feedback p")) problems.push("answering gave no feedback");
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        if (visible("quiz")) problems.push("Escape didn't close the question panel");
      }
    }
    Egg.open();      // the Konami easter egg: it should open with a question, then close with Escape
    if (!visible("egg") || !document.querySelector("#egg .egg-q")) problems.push("the easter egg didn't open");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (visible("egg")) problems.push("Escape didn't close the easter egg");
    Study.openGlossary();
    if (!visible("glossary") || document.querySelectorAll("#glossary dt").length < 50) problems.push("the glossary didn't open with its terms");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    for (const k of Object.keys(BookletData.sections).concat(Object.keys(BookletData.notShown))) {
      Study.openBooklet(k);
      if (!visible("booklet") || !document.querySelector("#booklet .bk-view h3")) problems.push("booklet §" + k + " didn't draw");
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    if (visible("booklet")) problems.push("Escape didn't close the booklet");
    return problems;
  }

  async function run() {
    const B = Book.debug;
    const wasMuted = Sound.isMuted();
    Sound.setMuted(true);
    const pump = setInterval(() => gsap.ticker.tick(), 16); // keep ticking even when the tab isn't painting
    gsap.globalTimeline.timeScale(20);  // every animation 20× faster
    const report = { pages: [], deepLink: null, errors };
    const panel = makePanel();

    $("openBook").click();
    await until(() => B.started() && !B.busy());

    for (let i = 0; i < Book.pages.length; i++) {
      const p = Book.pages[i];
      const r = { id: p.id, title: p.title, visited: [], problems: [], transitions: 0 };
      report.pages.push(r);
      panel.update(report);
      const errBefore = errors.length;
      if (B.index() !== i) {
        B.turnPage(i);
        if (!(await until(() => B.index() === i && !B.busy()))) { r.problems.push("the page didn't open"); continue; }
      }
      if (i > 0 && location.hash !== "#" + p.id) r.problems.push(`the URL says ${location.hash || "(nothing)"}, expected #${p.id}`);
      await walk(p, r);
      errors.slice(errBefore).forEach(e => r.problems.push(e));
    }

    const target = Book.pages.findIndex(p => p.id === "ionic");
    const before = B.index();
    location.hash = "ionic";
    const opened = await until(() => B.index() === target && !B.busy(), 5000);
    history.back();
    const returned = await until(() => B.index() === before && !B.busy(), 5000);
    report.deepLink = { opened, returned };

    report.study = await studyChecks(report);

    gsap.globalTimeline.timeScale(1);
    clearInterval(pump);
    Sound.setMuted(wasMuted);
    report.pass = report.pages.every(p => !p.problems.length) && opened && returned && !report.study.length;
    window.__selftest = report;
    panel.update(report, true);
    console.log("Self-test " + (report.pass ? "PASS" : "FAIL"), report);
  }

  window.addEventListener("load", () => setTimeout(run, 100));
})();
;
/* ---- js/sound.js ---- */
// Four small sounds, synthesised with the Web Audio API (no audio files).
// Every number you might want to tweak is in `defaults` below, or use the
// "sound lab" panel on the page to tune by ear and then copy the numbers here.

const Sound = (() => {
  const defaults = {
    master: 0.15,                                   // overall volume (keep low)
    zwoop:  { f0: 300,  f1: 900,  dur: 1 }   ,      // camera zoom: pitch sweep in Hz, seconds
    tindin: { hi: 1570, lo: 1175, gap: 0.15, decay: 0.65 }, // attention chime: G6 then D6
    pop:    { f: 600, dur: 0.09 },                  // something appears / tapped
    page:   { f0: 800, f1: 2600, dur: 0.35 }        // page turn: filtered-noise sweep
  };
  const params = JSON.parse(JSON.stringify(defaults));

  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;
  try { muted = sessionStorage.getItem("muted") === "1"; } catch (e) {}

  // Browsers block audio until the user interacts, so this is called from a click.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : params.master;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function applyVolume() {
    if (master) master.gain.value = muted ? 0 : params.master;
  }

  function setMuted(value) {
    muted = value;
    try { sessionStorage.setItem("muted", value ? "1" : "0"); } catch (e) {}
    applyVolume();
  }

  const isMuted = () => muted;
  const canPlay = () => ctx && !muted;

  // A gain node that rises to `peak` quickly, then fades to silence.
  function envelope(t, attack, peak, total) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + total);
    g.connect(master);
    return g;
  }

  function tone(type, f0, f1, t, dur, peak, attack) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    osc.connect(envelope(t, attack, peak, dur));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Camera zoom. Zooming out plays the sweep backwards (falling pitch).
  function zwoop(opts = {}) {
    if (!canPlay()) return;
    const p = params.zwoop;
    const dur = opts.dur || p.dur;
    const [a, b] = opts.reverse ? [p.f1, p.f0] : [p.f0, p.f1];
    tone("sine", a, b, ctx.currentTime, dur, 0.9, Math.min(0.03, dur / 4));
  }

  // Two soft chimes: high note, then lower note.
  function tindin() {
    if (!canPlay()) return;
    const p = params.tindin;
    const t = ctx.currentTime;
    tone("triangle", p.hi, p.hi, t, p.decay, 0.7, 0.01);
    tone("triangle", p.lo, p.lo, t + p.gap, p.decay, 0.7, 0.01);
  }

  // Tiny blip.
  function pop() {
    if (!canPlay()) return;
    const p = params.pop;
    tone("sine", p.f, p.f * 0.5, ctx.currentTime, p.dur, 0.9, 0.005);
  }

  // Paper-like whoosh: noise through a band-pass filter that sweeps upward.
  function page() {
    if (!canPlay()) return;
    const p = params.page;
    const t = ctx.currentTime;
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(p.f0, t);
    filter.frequency.exponentialRampToValueAtTime(p.f1, t + p.dur);
    src.connect(filter);
    filter.connect(envelope(t, p.dur * 0.3, 0.8, p.dur));
    src.start(t);
    src.stop(t + p.dur + 0.05);
  }

  // The easter egg's cinematic: a low rumble that swells for `dur` seconds, then a boom. Both go through one
  // bus so hush() can cut them off the moment the intro is skipped.
  let bus = null;
  function fxBus() {
    if (!bus) { bus = ctx.createGain(); bus.connect(master); }
    return bus;
  }
  function rumble(delay, dur) {
    if (!canPlay()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), low = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(34, t);
    osc.frequency.exponentialRampToValueAtTime(72, t + dur);
    low.type = "lowpass";
    low.frequency.setValueAtTime(90, t);
    low.frequency.exponentialRampToValueAtTime(420, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + dur);
    osc.connect(low); low.connect(g); g.connect(fxBus());
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function boom(delay) {
    if (!canPlay()) return;
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(g); g.connect(fxBus());
    osc.start(t); osc.stop(t + 1.15);
    tone("square", 180, 60, t, 0.25, 0.25, 0.005);
  }
  function hush() {
    if (!bus) return;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    bus = null;
  }

  return { params, defaults, unlock, applyVolume, setMuted, isMuted, zwoop, tindin, pop, page, rumble, boom, hush };
})();
;
/* ---- js/lab.js ---- */
// The sound lab: a button per sound and sliders for the key numbers.
// Hidden behind the small "sound lab" link. Remove or hide it once the sounds are tuned.

(() => {
  const groups = [
    { name: "Volume", play: null, sliders: [
      ["master", "Master volume", 0, 0.5, 0.01] ] },
    { name: "zwoop (zoom)", play: () => Sound.zwoop(), sliders: [
      ["zwoop.f0", "Start pitch (Hz)", 100, 1500, 10],
      ["zwoop.f1", "End pitch (Hz)", 100, 2000, 10],
      ["zwoop.dur", "Length (s)", 0.1, 1, 0.01] ] },
    { name: "tin-din (attention)", play: () => Sound.tindin(), sliders: [
      ["tindin.hi", "High note (Hz)", 600, 2500, 5],
      ["tindin.lo", "Low note (Hz)", 600, 2500, 5],
      ["tindin.gap", "Gap (s)", 0.05, 0.4, 0.01],
      ["tindin.decay", "Fade-out (s)", 0.1, 1, 0.01] ] },
    { name: "pop", play: () => Sound.pop(), sliders: [
      ["pop.f", "Pitch (Hz)", 200, 1500, 10],
      ["pop.dur", "Length (s)", 0.03, 0.3, 0.01] ] },
    { name: "page turn", play: () => Sound.page(), sliders: [
      ["page.f0", "Sweep start (Hz)", 200, 3000, 50],
      ["page.f1", "Sweep end (Hz)", 500, 6000, 50],
      ["page.dur", "Length (s)", 0.1, 1, 0.01] ] }
  ];

  const body = document.getElementById("labBody");
  const out = document.getElementById("labOut");

  const getVal = path => path.split(".").reduce((o, k) => o[k], Sound.params);
  const setVal = (path, v) => {
    const keys = path.split(".");
    const last = keys.pop();
    keys.reduce((o, k) => o[k], Sound.params)[last] = v;
  };
  const refreshOut = () => { out.value = JSON.stringify(Sound.params, null, 1); };

  groups.forEach(g => {
    const fs = document.createElement("fieldset");
    const lg = document.createElement("legend");
    lg.textContent = g.name;
    fs.appendChild(lg);

    if (g.play) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nav-btn lab-play";
      b.textContent = "Play";
      b.addEventListener("click", () => { Sound.unlock(); g.play(); });
      fs.appendChild(b);
    }

    g.sliders.forEach(([path, label, min, max, step]) => {
      const row = document.createElement("label");
      const name = document.createElement("span");
      name.textContent = label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = min; input.max = max; input.step = step;
      input.value = getVal(path);
      const num = document.createElement("output");
      num.textContent = input.value;
      input.addEventListener("input", () => {
        setVal(path, parseFloat(input.value));
        num.textContent = input.value;
        if (path === "master") Sound.applyVolume();
        refreshOut();
      });
      row.append(name, input, num);
      fs.appendChild(row);
    });
    body.appendChild(fs);
  });

  refreshOut();
})();
;
/* ---- js/camera.js ---- */
// The "camera": zooms are just scale transforms on SVG groups, so every page zooms the same way.

const Camera = (() => {
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // Zoom a group in or out around a point. Returns the tween.
  //   Camera.zoomTo("#cam", { scale: 5, origin: "470 240" })
  // Give `center: [x, y]` to also slide the zoom point to that spot on screen; leave it out to zoom in place.
  // The group's transform is written directly ("translate scale"), so any zoom can follow any other.
  function zoomTo(target, { scale = 1, origin = "470 240", center = null, duration = 1.8, ease = "power2.inOut" } = {}) {
    const el = gsap.utils.toArray(target)[0];
    const [ox, oy] = origin.split(" ").map(Number);
    const [cx, cy] = center || [ox, oy];
    if (!el._camera) el._camera = { s: 1, x: 0, y: 0 };
    const cam = el._camera;
    return gsap.to(cam, {
      s: scale, x: cx - scale * ox, y: cy - scale * oy, duration, ease,
      onUpdate: () => el.setAttribute("transform", "translate(" + cam.x + " " + cam.y + ") scale(" + cam.s + ")")
    });
  }

  // Zoom out from a small scene (`inner`) into a much bigger one (`outer`) drawn around the same point.
  // Both shrink together; the inner one fades out once it is tiny, the outer fades in once it is
  // small enough to see. Returns a controller: .to(1, seconds) zooms out, .to(0, seconds) zooms back in.
  function crossZoom({ inner, outer, origin = "470 240", factor = 4000, innerFade = [0.03, 0.13], outerFade = [150, 60] }) {
    const K = Math.log(factor);
    const state = { p: 0 };
    const apply = () => {
      const innerScale = Math.exp(-K * state.p);
      const outerScale = Math.exp(K * (1 - state.p));
      gsap.set(inner, {
        scale: innerScale, svgOrigin: origin,
        opacity: clamp01((innerScale - innerFade[0]) / (innerFade[1] - innerFade[0]))
      });
      gsap.set(outer, {
        scale: outerScale, svgOrigin: origin,
        opacity: clamp01((Math.log(outerFade[0]) - Math.log(outerScale)) / (Math.log(outerFade[0]) - Math.log(outerFade[1])))
      });
    };
    apply();
    return {
      state, apply,
      to: (p, duration, ease = "power2.inOut") => gsap.to(state, { p, duration, ease, onUpdate: apply })
    };
  }

  return { zoomTo, crossZoom };
})();
;
/* ---- js/hint.js ---- */
// A reusable "you can tap this" ring: a gold circle that pulses gently, and pulses harder once the
// attention chime fires. Used as a hotspot's `hint`. Give it the selector of a <circle> already in the
// page's SVG (class="tap-ring") and its centre.
//   hotspots: [{ id: "atom", selector: "#hit", hint: Hint.ring("#ring", "470 240") }]
const Hint = {
  ring(selector, origin) {
    const key = "_ring" + selector;
    return {
      start(ctx, strong) {
        const d = ctx.data;
        if (d[key]) d[key].kill();
        gsap.set(selector, { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: origin });
        if (ctx.reduceMotion) return; // a still outline instead of a pulse
        d[key] = gsap.to(selector, {
          scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: origin,
          duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
        });
      },
      stop(ctx) {
        const d = ctx.data;
        if (d[key]) d[key].kill();
        d[key] = null;
        gsap.to(selector, { opacity: 0, duration: 0.3 });
      }
    };
  }
};
;
/* ---- js/particles.js ---- */
// A tiny bouncing-particle box, shared by a few pages (gases, collision theory, equilibrium).
// Particles are plain objects {x, y, vx, vy, r, el} where el is the SVG circle to draw them with.
// ParticleBox(box).step(particles, dt, onCollide) moves them, bounces them off the box walls, and
// (if given) calls onCollide(a, b) once per pair that is touching this frame.
const ParticleBox = (box) => {
  const { x0, y0, x1, y1 } = box;
  function step(particles, dt, onCollide) {
    particles.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x - p.r < x0) { p.x = x0 + p.r; p.vx = Math.abs(p.vx); }
      if (p.x + p.r > x1) { p.x = x1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y - p.r < y0) { p.y = y0 + p.r; p.vy = Math.abs(p.vy); }
      if (p.y + p.r > y1) { p.y = y1 - p.r; p.vy = -Math.abs(p.vy); }
      p.el.setAttribute("cx", p.x.toFixed(1));
      p.el.setAttribute("cy", p.y.toFixed(1));
    });
    if (!onCollide) return;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01 && dist < a.r + b.r) {
          // Elastic-ish bounce: swap the velocity component along the line joining the two centres.
          const nx = dx / dist, ny = dy / dist;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          const speed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
          if (rel < 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; }
          onCollide(a, b, speed);
        }
      }
    }
  }
  return { step };
};
;
/* ---- js/engine.js ---- */
// The engine: reads page objects (see pages/) and runs the book.
// It handles page turns, Back/Next/Replay, keyboard arrows, the page counter, the contents page,
// captions, the attention chime and hotspots. Pages only describe themselves.
//
// A page is an object with:
//   id, topic, title, description, svg (markup string), legend (optional html),
//   start (name of the first state), states { name: {...} },
//   hotspots (optional), setup(ctx), intro(ctx), idle(ctx), teardown(ctx) (all optional).
// A state is: { caption, footnote?, legend?, final?, onEnter?, next?, back?, tap?, replay? }.
// next / back / tap / replay are "transitions": { to, sound, play(ctx), before(ctx), captionOut, captionAt }.

const Book = (() => {
  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pages = [];
  let plan = [];
  let pageIndex = -1;
  let stateName = null;
  let ctx = null;
  let started = false;
  let busy = false;
  let idleTimer = null;
  // The words come first: a page's drawing starts moving only after its caption has begun to appear, and a
  // tap's animation starts a beat after the new caption starts fading in, so there is time to read first.
  const INTRO_DELAY = 1.0, ANIM_DELAY = 0.35;
  let capCur = 0;                   // which of the two caption layers is showing
  const chimed = new Set();
  const el = {};
  // Tiny event hook so the study tools (js/study.js) can follow the book: ready, show, ui, contents.
  const listeners = {};
  const on = (name, fn) => { (listeners[name] ||= []).push(fn); };
  const emit = (name, ...args) => (listeners[name] || []).forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } });

  const taps = s => (s.tap ? [].concat(s.tap) : []); // a state may have one tap transition or a list
  const page = () => pages[pageIndex];
  const state = () => page().states[stateName];

  function register(p) {
    if (pages.some(x => x.id === p.id)) console.warn("Two pages share the id '" + p.id + "'. Give each page its own id.");
    pages.push(p);
  }
  function setPlan(list) { plan = list; }

  // ---------- Sound ----------
  function playSound(name) {
    const quick = reduceMotion ? { dur: 0.25 } : {};
    if (name === "zwoop") Sound.zwoop(quick);
    else if (name === "zwoop-rev") Sound.zwoop({ ...quick, reverse: true });
    else if (name === "pop") Sound.pop();
    else if (name === "page") Sound.page();
    else if (name === "tindin") Sound.tindin();
  }

  // ---------- Captions: two stacked layers that crossfade ----------
  const layers = () => [el.capA, el.capB];
  // A state's optional `booklet` is a pointer into the IB Chemistry data booklet, shown under the caption.
  const captionHTML = s => "<p>" + s.caption + "</p>" +
    (s.footnote ? '<p class="footnote">' + s.footnote + "</p>" : "") +
    (s.booklet ? '<p class="booklet"><span>Data booklet</span> ' + bookletLinks(s.booklet) + "</p>" : "");
  // Each "§N" in a booklet note becomes a button that opens that section of the booklet panel.
  const bookletLinks = text => text.replace(/§(\d+)/g, '<button type="button" class="bk-link" data-sec="$1">§$1</button>');

  function setCaptionInstant(s) {
    const [a, b] = layers();
    a.innerHTML = captionHTML(s);
    b.innerHTML = "";
    capCur = 0;
    gsap.set([a, b], { opacity: 0 });
    a.setAttribute("aria-hidden", "false");
    b.setAttribute("aria-hidden", "true");
  }
  function addCaptionSwap(tl, s, out, at) {
    const cur = layers()[capCur];
    const nxt = layers()[1 - capCur];
    nxt.innerHTML = captionHTML(s);
    nxt.setAttribute("aria-hidden", "false");
    cur.setAttribute("aria-hidden", "true");
    tl.to(cur, { opacity: 0, duration: 0.5 }, out)
      .to(nxt, { opacity: 1, duration: 0.7 }, at);
    capCur = 1 - capCur;
  }

  // ---------- Loading and unloading a page ----------
  function loadPage(i) {
    pageIndex = i;
    const p = pages[i];
    $("pageRoot").innerHTML = p.svg;
    $("sceneTitle").textContent = p.title;
    $("sceneDesc").textContent = p.description || "";

    ctx = {
      svg: el.scene,
      $: sel => el.scene.querySelector(sel),
      $$: sel => Array.from(el.scene.querySelectorAll(sel)),
      gsap, Sound, Camera, reduceMotion,
      data: {},
      hotspotEls: {},
      tracked: [],
      track(t) { this.tracked.push(t); return t; }
    };
    if (p.setup) p.setup(ctx);

    (p.hotspots || []).forEach(h => {
      const e = el.scene.querySelector(h.selector);
      if (!e) { console.warn("Hotspot '" + h.id + "' not found: " + h.selector); return; }
      ctx.hotspotEls[h.id] = e;
      e.setAttribute("role", "button");
      e.setAttribute("aria-label", h.label || h.id);
      e.setAttribute("tabindex", "-1");
      e.style.pointerEvents = "none";
      e.addEventListener("click", () => go("tap", h.id));
      e.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go("tap", h.id); }
      });
    });

    stateName = p.start;
    setCaptionInstant(state());
    el.legend.innerHTML = p.legend || "";
    el.legend.hidden = !p.legend;
    updateUI();
  }

  function unloadPage() {
    if (!ctx) return;
    const p = page();
    if (p.teardown) p.teardown(ctx);
    ctx.tracked.forEach(t => t.kill());
    gsap.killTweensOf(el.scene.querySelectorAll("*"));
  }

  // ---------- UI state ----------
  const canNext = () => !!state().next || (!!state().final && pageIndex < pages.length - 1);
  const canBack = () => !!state().back || pageIndex > 0; // no `back` defined: Back turns to the previous page

  function updateUI() {
    const s = started ? state() : null;
    el.nextBtn.hidden = !started || !canNext();
    el.backBtn.hidden = !started || !canBack();
    el.replayBtn.hidden = !started || !s.replay;
    [el.nextBtn, el.backBtn, el.replayBtn].forEach(b => { b.disabled = busy; });
    el.topbar.hidden = !started;
    el.counter.textContent = pageIndex + 1 + " / " + pages.length;
    emit("ui");

    (page().hotspots || []).forEach(h => {
      const e = ctx.hotspotEls[h.id];
      if (!e) return;
      const on = started && !busy && taps(s).some(t => t.hotspot === h.id);
      e.setAttribute("tabindex", on ? "0" : "-1");
      e.style.pointerEvents = on ? "auto" : "none";
    });
  }

  function startHints() {
    const s = state();
    (page().hotspots || []).forEach(h => {
      if (taps(s).some(t => t.hotspot === h.id) && h.hint) h.hint.start(ctx, false);
    });
  }
  function stopHints() {
    (page().hotspots || []).forEach(h => { if (h.hint) h.hint.stop(ctx); });
  }

  function enterState(name) {
    stateName = name;
    updateUI();
    startHints();
    const s = state();
    if (s.onEnter) s.onEnter(ctx);
    armAttention();
  }

  // ---------- Transitions (next / back / tap / replay) ----------
  function go(kind, hotspotId) {
    if (busy || !started) return;
    const p = page();
    const s = state();
    const tr = kind === "tap" ? taps(s).find(t => t.hotspot === hotspotId) : s[kind];

    if (!tr) {
      if (kind === "next" && s.final) turnPage(pageIndex + 1);
      else if (kind === "back") turnPage(pageIndex - 1);
      return;
    }

    busy = true;
    clearAttention();
    stopHints();
    updateUI();
    if (tr.before) tr.before(ctx);

    const targetName = typeof tr.to === "function" ? tr.to(ctx) : tr.to;
    const target = p.states[targetName];
    const out = tr.captionOut ?? 0;
    const at = tr.captionAt ?? 0.3;

    const tl = gsap.timeline({ onComplete: () => { busy = false; enterState(targetName); } });
    ctx.track(tl);
    tl.call(() => playSound(tr.sound), null, reduceMotion ? 0 : ANIM_DELAY);
    if (tr.play) tl.add(tr.play(ctx), reduceMotion ? 0 : ANIM_DELAY);
    addCaptionSwap(tl, target, out, at);

    const hadLegend = s.legend !== false && !!p.legend;
    const wantLegend = target.legend !== false && !!p.legend;
    if (hadLegend !== wantLegend) tl.to(el.legend, { opacity: wantLegend ? 1 : 0, duration: 0.5 }, wantLegend ? at : 0);

    if (reduceMotion) tl.timeScale(12); // zooms become quick crossfades
  }

  // ---------- Links to a page (index.html#ionic) ----------
  // The URL names the page, so a link can open a specific one and the browser's Back/Forward buttons
  // turn pages. Plain hash assignment (not history.pushState) because pushState throws on file://.
  let hashTarget = -1; // the page the URL names, as far as the book knows

  function indexFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const i = pages.findIndex(p => p.id === id);
    return i >= 0 ? i : 0;
  }
  function writeHash(i) {
    hashTarget = i;
    if (i === 0 && !location.hash) return; // the first page needs no hash
    if (location.hash.slice(1) !== pages[i].id) location.hash = pages[i].id;
  }
  function onHashChange() {
    const i = indexFromHash();
    if (i === hashTarget) return;
    hashTarget = i;
    if (!started) { unloadPage(); loadPage(i); return; }
    if (!el.contents.hidden) closeContents();
    followHash();
  }
  function followHash() {
    if (hashTarget === pageIndex) return;
    if (busy) { setTimeout(followHash, 150); return; }
    turnPage(hashTarget);
  }

  // ---------- Page turns ----------
  function turnPage(index) {
    if (busy || !started || index < 0 || index >= pages.length || index === pageIndex) return;
    writeHash(index);
    busy = true;
    clearAttention();
    stopHints();
    updateUI();
    playSound("page");
    gsap.to([el.scene, el.captions, el.legend], {
      opacity: 0, duration: reduceMotion ? 0.05 : 0.35,
      onComplete: () => {
        unloadPage();
        loadPage(index);
        const p = page();
        gsap.set(el.scene, { opacity: 1 });
        gsap.set(el.captions, { opacity: 1 });
        gsap.set(el.legend, { opacity: 0 });
        emit("show", pageIndex);
        const tl = gsap.timeline({ onComplete: () => { busy = false; if (p.idle && !reduceMotion) p.idle(ctx); enterState(p.start); } });
        tl.to(el.capA, { opacity: 1, duration: 0.7 }, 0);
        tl.add(p.intro ? p.intro(ctx) : defaultIntro(), INTRO_DELAY);
        if (p.legend && state().legend !== false) tl.to(el.legend, { opacity: 1, duration: 0.5 }, "-=0.2");
        if (reduceMotion) tl.timeScale(12);
      }
    });
  }

  // Pages with no intro of their own: everything marked class="fade" fades in.
  function defaultIntro() {
    return gsap.to(ctx.$$(".fade"), { opacity: 1, duration: 0.6, stagger: 0.15 });
  }

  // ---------- Attention chime ----------
  // After ~8 s with no interaction, once per page state: chime, and the thing to tap glows.
  function clearAttention() {
    clearTimeout(idleTimer);
    el.nextBtn.classList.remove("attn");
  }
  function armAttention() {
    clearTimeout(idleTimer);
    if (!started || busy) return;
    const s = state();
    const kind = taps(s).length ? "tap" : canNext() ? "next" : null;
    const key = page().id + ":" + stateName;
    if (!kind || chimed.has(key)) return;
    idleTimer = setTimeout(() => {
      chimed.add(key);
      Sound.tindin();
      if (kind === "tap") {
        (page().hotspots || []).forEach(h => {
          if (h.hint && taps(s).some(t => t.hotspot === h.id)) h.hint.start(ctx, true);
        });
      } else {
        el.nextBtn.classList.add("attn");
      }
    }, 8000);
  }

  // ---------- Contents page ----------
  // Book order follows the plan (the syllabus), whatever order the page files load in. Pages that
  // aren't in the plan go last, in the order they registered.
  function sortByPlan() {
    const order = [];
    plan.forEach(t => t.items.forEach(item => order.push([].concat(item)[0] + "|" + t.topic)));
    const rank = p => { const i = order.indexOf(p.title + "|" + p.topic); return i < 0 ? 1e6 : i; };
    const first = new Map(pages.map((p, i) => [p, i]));
    pages.sort((a, b) => rank(a) - rank(b) || first.get(a) - first.get(b));
  }

  // A plan item is a title, or [title, syllabus code] — the code is shown beside it.
  function buildContents() {
    const topics = plan.map(t => ({
      name: t.topic,
      items: t.items.map(item => {
        const [title, code] = [].concat(item);
        return { title, code, index: pages.findIndex(p => p.title === title && p.topic === t.topic) };
      })
    }));
    pages.forEach((p, i) => {
      if (topics.some(t => t.items.some(it => it.index === i))) return;
      let t = topics.find(x => x.name === p.topic);
      if (!t) { t = { name: p.topic || "Other", items: [] }; topics.push(t); }
      t.items.push({ title: p.title, index: i });
    });

    el.tocBody.innerHTML = "";
    topics.forEach(t => {
      const h = document.createElement("h3");
      h.textContent = t.name;
      const ul = document.createElement("ul");
      t.items.forEach(it => {
        const li = document.createElement("li");
        if (it.index >= 0) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "toc-item";
          b.textContent = it.index + 1 + ". " + it.title;
          b.dataset.index = it.index;
          li.dataset.search = (it.title + " " + (it.code || "") + " " + t.name).toLowerCase();
          b.addEventListener("click", () => { closeContents(); turnPage(it.index); });
          li.appendChild(b);
        } else {
          li.className = "toc-soon";
          li.textContent = it.title;
          const tag = document.createElement("span");
          tag.textContent = " coming soon";
          li.appendChild(tag);
        }
        if (it.code) {
          const code = document.createElement("span");
          code.className = "toc-code";
          code.textContent = it.code;
          li.appendChild(code);
        }
        ul.appendChild(li);
      });
      el.tocBody.append(h, ul);
    });
  }
  function openContents() {
    el.contents.hidden = false;
    emit("contents");
    el.page.setAttribute("inert", "");
    el.nav.setAttribute("inert", "");
    const first = el.tocBody.querySelector("button");
    if (first) first.focus();
  }
  function closeContents() {
    el.contents.hidden = true;
    el.page.removeAttribute("inert");
    el.nav.removeAttribute("inert");
    el.contentsBtn.focus();
  }

  // ---------- About (reachable from the cover, and from the topbar once the book is open) ----------
  function openAbout(returnFocusTo) {
    el.about.hidden = false;
    el.page.setAttribute("inert", "");
    el.nav.setAttribute("inert", "");
    el.about.dataset.returnTo = returnFocusTo;
    el.aboutClose.focus();
  }
  function closeAbout() {
    el.about.hidden = true;
    if (started) { el.page.removeAttribute("inert"); el.nav.removeAttribute("inert"); }
    const back = el.about.dataset.returnTo === "cover" ? el.aboutLinkCover : el.aboutBtn;
    back.focus();
  }

  // ---------- Opening the book ----------
  function startBook() {
    el.page.removeAttribute("inert");
    const p = page();

    const finish = () => {
      started = true;
      emit("show", pageIndex);
      if (p.idle && !reduceMotion) p.idle(ctx);
      enterState(p.start);
    };

    if (reduceMotion) {
      document.documentElement.className = "";
      gsap.set(el.capA, { opacity: 1 });
      if (p.legend && state().legend === false) gsap.set(el.legend, { opacity: 0 });
      finish();
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: finish });
    tl.to(".rule .line", { scaleX: 1, duration: 1.1, ease: "power2.inOut" })
      .to(".rule .cap", { opacity: 1, duration: 0.3 }, "-=0.2")
      .fromTo(el.title, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.6")
      .fromTo(el.capA, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.2")
      .add(p.intro ? p.intro(ctx) : defaultIntro(), "+=0.3");
    if (p.legend) tl.to(el.legend, { opacity: 1, duration: 0.5 }, "-=0.2");
  }

  // ---------- Setup ----------
  function boot() {
    ["scene", "page", "title", "captions", "capA", "capB", "legend", "nav", "backBtn", "nextBtn", "replayBtn",
      "topbar", "counter", "contentsBtn", "contents", "tocBody", "mute", "cover", "openBook", "lab", "labLink", "labClose",
      "aboutBtn", "about", "aboutClose", "aboutLinkCover"
    ].forEach(id => { el[id] = $(id); });

    // Mute button
    const showMute = () => {
      el.mute.textContent = Sound.isMuted() ? "Sound: off" : "Sound: on";
      el.mute.setAttribute("aria-pressed", Sound.isMuted());
    };
    el.mute.addEventListener("click", () => { Sound.unlock(); Sound.setMuted(!Sound.isMuted()); showMute(); });
    showMute();

    // Sound lab
    el.labLink.addEventListener("click", () => { Sound.unlock(); el.lab.hidden = false; });
    el.labClose.addEventListener("click", () => { el.lab.hidden = true; });

    // Navigation
    el.nextBtn.addEventListener("click", () => go("next"));
    el.backBtn.addEventListener("click", () => go("back"));
    el.replayBtn.addEventListener("click", () => go("replay"));
    el.contentsBtn.addEventListener("click", () => (el.contents.hidden ? openContents() : closeContents()));
    el.aboutBtn.addEventListener("click", () => openAbout("topbar"));
    el.aboutLinkCover.addEventListener("click", () => openAbout("cover"));
    el.aboutClose.addEventListener("click", closeAbout);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !el.about.hidden) { closeAbout(); return; }
      if (!started) return;
      if (e.key === "Escape") { if (!el.contents.hidden) closeContents(); return; }
      if (!el.lab.hidden || !el.contents.hidden || !el.about.hidden) return;
      if (e.key === "ArrowRight") go("next");
      else if (e.key === "ArrowLeft") go("back");
    });
    ["pointerdown", "keydown"].forEach(evt => document.addEventListener(evt, armAttention));

    if (!pages.length) { console.warn("No pages registered."); return; }
    sortByPlan();
    buildContents();
    emit("ready");
    loadPage(indexFromHash());
    hashTarget = pageIndex;
    window.addEventListener("hashchange", onHashChange);

    el.openBook.addEventListener("click", () => {
      Sound.unlock();
      if (reduceMotion) { el.cover.hidden = true; startBook(); return; }
      playSound("page");
      gsap.to(el.cover, { opacity: 0, duration: 0.6, onComplete: () => { el.cover.hidden = true; startBook(); } });
    });
  }

  // Read-only peek at the running book, for js/selftest.js.
  const debug = {
    turnPage,
    index: () => pageIndex,
    stateName: () => stateName,
    busy: () => busy,
    started: () => started,
    isFinal: () => !!(ctx && state().final),
    ctx: () => ctx
  };

  // Turn to a page by id (the study tools use this for glossary and quiz links).
  function goTo(id) {
    const i = pages.findIndex(p => p.id === id);
    if (i >= 0) turnPage(i);
    return i >= 0;
  }

  return { register, plan: setPlan, boot, pages, debug, on, goTo };
})();
;
/* ---- js/kit.js ---- */
// Kit: building blocks for "tap to step through" pages, so a page is mostly its drawing and captions.
//
//   Kit.page({
//     id, topic, title, description, svg, bounds: [x0, y0, x1, y1], tapLabel,
//     legend?, setup?(ctx), teardown?(ctx), intro?(ctx), idle?(ctx),
//     steps: [
//       { caption, footnote?, booklet? },                                   // step 0: how the page starts
//       { caption, footnote?, booklet?, sound?, dur?,                       // step 1: tap in step 0 to get here
//         to:   { "#selector": { opacity: 1, attr: { cx: 300 }, x: 20, fill: "#abc", delay: .2, stagger: .1 } },
//         text: { "#label": "new text" },                                   // swapped part-way through
//         run(ctx, tl, dir) { ... }                                          // optional extra animation; dir is "fwd" or "back"
//       }, ...
//     ]
//   })
//
// Tapping in step i plays step i+1's `to`/`text`/`run`. Back plays them in reverse: before each step
// runs, the current values of everything it touches are recorded, and Back tweens straight to those, so
// the reverse is exact and no undo code is needed. Colours must be hex (use Kit.C), not var(--x).
// Elements with class="fade" fade in at the start; give things that appear later opacity="0".
// A <g> with data-x/data-y is placed there by GSAP (never write a transform attribute by hand).

const Kit = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = {
    proton: "#FF3131", electron: "#0B44A8", heat: "#E05A2B", product: "#2E9E63", ion: "#4C6E9E",
    ink: "#1B1A22", frame: "#8B5CF6", grey: "#8B8590", pale: "#B8BEC6", violet: "#6A2BD9",
    cyan: "#22B6A5", blue: "#2E6FE0", paper: "#FFFDF8"
  };

  // ----- little SVG string helpers -----
  const t = (x, y, text, cls = "graph-label", extra = "") => `<text class="${cls}" x="${x}" y="${y}" ${extra}>${text}</text>`;
  const c = (x, y, r, fill, extra = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const l = (x1, y1, x2, y2, stroke = "var(--ink)", w = 3, extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const r = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  // A line with an arrowhead at (x2, y2).
  function arrow(x1, y1, x2, y2, stroke = "var(--ink)", w = 3, extra = "") {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 6 + w * 1.6;
    const px = x2 - Math.cos(a) * h * 0.6, py = y2 - Math.sin(a) * h * 0.6;
    const p = (ang, d) => (x2 - Math.cos(a + ang) * d).toFixed(1) + "," + (y2 - Math.sin(a + ang) * d).toFixed(1);
    return `<g ${extra}>${l(x1, y1, px, py, stroke, w)}<polygon points="${x2},${y2} ${p(0.45, h)} ${p(-0.45, h)}" fill="${stroke}"/></g>`;
  }
  // A group centred on (0, 0), moved to (x, y) by GSAP when the page loads.
  const g = (id, x, y, inner, cls = "fade", extra = "") =>
    `<g ${id ? `id="${id}"` : ""} class="${cls}" data-x="${x}" data-y="${y}" ${extra}>${inner}</g>`;
  // An atom-style disc with a white symbol, as a movable group.
  const atom = (id, x, y, rad, sym, fill = C.proton, cls = "fade") =>
    g(id, x, y, `<circle r="${rad}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.max(11, Math.min(22, rad * 0.9))}px">${sym}</text>`, cls);

  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ----- particles bouncing in a box that may change size -----
  function spawn(ctx, layerSel, n, spec, box, rand, speed = 60) {
    const layer = ctx.$(layerSel), list = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("r", spec.r);
      el.setAttribute("fill", spec.fill);
      if (spec.stroke) { el.setAttribute("stroke", spec.stroke); el.setAttribute("stroke-width", spec.sw || 2); }
      if (spec.fade) el.setAttribute("opacity", 0);
      if (spec.cls) el.setAttribute("class", spec.cls);
      const x = box.x0 + spec.r + rand() * (box.x1 - box.x0 - 2 * spec.r);
      const y = box.y0 + spec.r + rand() * (box.y1 - box.y0 - 2 * spec.r);
      const a = rand() * Math.PI * 2, s = speed * (0.7 + rand() * 0.6);
      el.setAttribute("cx", x); el.setAttribute("cy", y);
      layer.appendChild(el);
      list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: spec.r, el });
    }
    return list;
  }
  function bounce(list, box, dt) {
    list.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x - p.r < box.x0) { p.x = box.x0 + p.r; p.vx = Math.abs(p.vx); }
      if (p.x + p.r > box.x1) { p.x = box.x1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y - p.r < box.y0) { p.y = box.y0 + p.r; p.vy = Math.abs(p.vy); }
      if (p.y + p.r > box.y1) { p.y = box.y1 - p.r; p.vy = -Math.abs(p.vy); }
      p.el.setAttribute("cx", p.x.toFixed(1));
      p.el.setAttribute("cy", p.y.toFixed(1));
    });
  }
  // Rescale every particle's speed to `s` (keeping its direction).
  function setSpeed(list, s, ease = 1) {
    list.forEach(p => {
      const cur = Math.hypot(p.vx, p.vy) || 1, k = 1 + (s / cur - 1) * ease;
      p.vx *= k; p.vy *= k;
    });
  }
  // Run fn(dtSeconds) every frame while the page is showing (skipped under reduced motion).
  function tick(ctx, fn) {
    const f = (time, dt) => { if (!ctx.reduceMotion) fn(Math.min(dt, 50) / 1000); };
    gsap.ticker.add(f);
    (ctx.data.kitTickers ||= []).push(f);
  }


  // ----- a draggable slider, for pages with a "now you try" step -----
  // Put sliderMarkup() in the page's svg (hidden with opacity="0" until the interactive step), then call
  // slider(ctx, id, { min, max, value, step, onInput(v) }) from setup. Pointer, touch and keyboard all work
  // (arrow keys, Home, End); the arrow keys don't leak to the book, so they won't turn the page.
  const sliderMarkup = (id, x0, x1, y, label, extra = "") =>
    `<g id="${id}" class="sl" role="slider" tabindex="0" aria-label="${label}" ${extra}>
      <line class="sl-track" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>
      <line class="sl-fill" x1="${x0}" y1="${y}" x2="${x0}" y2="${y}"/>
      <circle class="sl-knob" cx="${x0}" cy="${y}" r="14"/>
      <rect class="sl-grab" x="${x0 - 24}" y="${y - 28}" width="${x1 - x0 + 48}" height="56" fill="transparent" style="touch-action:none"/>
    </g>`;
  function slider(ctx, id, o) {
    const g = ctx.$("#" + id), track = g.querySelector(".sl-track"), fill = g.querySelector(".sl-fill"), knob = g.querySelector(".sl-knob");
    const x0 = +track.getAttribute("x1"), x1 = +track.getAttribute("x2"), y = +track.getAttribute("y1");
    const step = o.step || 0;
    let value = o.value;
    const clamp = v => Math.min(o.max, Math.max(o.min, step ? Math.round(v / step) * step : v));
    function set(v, silent) {
      value = clamp(v);
      const x = x0 + (value - o.min) / (o.max - o.min) * (x1 - x0);
      knob.setAttribute("cx", x); fill.setAttribute("x2", x);
      g.setAttribute("aria-valuemin", o.min); g.setAttribute("aria-valuemax", o.max); g.setAttribute("aria-valuenow", +value.toFixed(3));
      if (!silent && o.onInput) o.onInput(value);
    }
    const fromEvent = e => {
      const pt = ctx.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(ctx.svg.getScreenCTM().inverse());
      return o.min + Math.min(1, Math.max(0, (p.x - x0) / (x1 - x0))) * (o.max - o.min);
    };
    let dragging = false;
    g.addEventListener("pointerdown", e => { dragging = true; g.setPointerCapture(e.pointerId); set(fromEvent(e)); g.focus({ preventScroll: true }); e.preventDefault(); });
    g.addEventListener("pointermove", e => { if (dragging) set(fromEvent(e)); });
    const stop = e => { dragging = false; try { g.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } };
    g.addEventListener("pointerup", stop); g.addEventListener("pointercancel", stop);
    g.addEventListener("keydown", e => {
      const big = (o.max - o.min) / 10, small = step || (o.max - o.min) / 50;
      const d = { ArrowRight: small, ArrowUp: small, ArrowLeft: -small, ArrowDown: -small, PageUp: big, PageDown: -big }[e.key];
      if (d !== undefined) set(value + d);
      else if (e.key === "Home") set(o.min); else if (e.key === "End") set(o.max); else return;
      e.preventDefault(); e.stopPropagation();
    });
    set(value, true);
    return { set, get: () => value };
  }

  // ----- steps -> states -----
  const CONTROL = new Set(["delay", "dur", "ease", "stagger", "at"]);
  const num = v => { const f = Number(v); return v !== null && v !== "" && !isNaN(f) ? f : v; };

  function snapshot(el, spec) {
    const out = {};
    Object.keys(spec).forEach(k => {
      if (CONTROL.has(k)) return;
      if (k === "attr") {
        out.attr = {};
        Object.keys(spec.attr).forEach(a => { const v = num(el.getAttribute(a)); if (v !== null) out.attr[a] = v; });
      } else out[k] = gsap.getProperty(el, k);
    });
    return out;
  }

  function forward(ctx, steps, i) {
    const kd = (ctx.data.kit ||= { undo: [] });
    const s = steps[i], tl = gsap.timeline(), dur = s.dur ?? 0.9, undo = [];
    Object.entries(s.to || {}).forEach(([sel, spec]) => {
      const els = ctx.$$(sel);
      if (!els.length) console.warn("Kit: nothing matches " + sel);
      els.forEach(el => undo.push([el, snapshot(el, spec)]));
      const vars = { ...spec, duration: spec.dur ?? dur, ease: spec.ease ?? "power2.inOut" };
      delete vars.dur; delete vars.at;
      tl.to(els, vars, spec.at ?? 0);
    });
    const texts = [];
    Object.entries(s.text || {}).forEach(([sel, val]) => {
      ctx.$$(sel).forEach(el => texts.push([el, el.textContent]));
      tl.call(() => ctx.$$(sel).forEach(el => { el.textContent = val; }), null, s.textAt ?? dur * 0.5);
    });
    kd.undo[i] = { undo, texts };
    if (s.run) s.run(ctx, tl, "fwd");
    return tl;
  }

  function backward(ctx, steps, i) {
    const u = ctx.data.kit.undo[i], tl = gsap.timeline(), dur = (steps[i].dur ?? 0.9) * 0.6;
    u.undo.forEach(([el, vals]) => tl.to(el, { ...vals, duration: dur, ease: "power2.inOut" }, 0));
    u.texts.forEach(([el, old]) => tl.call(() => { el.textContent = old; }, null, 0));
    if (steps[i].run) steps[i].run(ctx, tl, "back");
    return tl;
  }

  // The squircle tap hint, fitted around the bounds [x0, y0, x1, y1] and kept on the canvas.
  function ring(b) {
    const pad = 24, x0 = Math.max(6, b[0] - pad), y0 = Math.max(6, b[1] - pad);
    const x1 = Math.min(994, b[2] + pad), y1 = Math.min(474, b[3] + pad);
    return {
      cx: Math.round((x0 + x1) / 2), cy: Math.round((y0 + y1) / 2),
      markup: `<rect class="tap-ring" id="ring" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="30" opacity="0"/>` +
              `<circle class="hit" id="hit" cx="500" cy="240" r="520"/>`
    };
  }

  function page(cfg) {
    const steps = cfg.steps, rg = ring(cfg.bounds || [80, 100, 920, 440]);
    const states = {};
    steps.forEach((s, i) => {
      const st = { caption: s.caption };
      if (s.footnote) st.footnote = s.footnote;
      if (s.booklet) st.booklet = s.booklet;
      if (i < steps.length - 1) {
        const nx = steps[i + 1];
        st.tap = { hotspot: "hit", to: "s" + (i + 1), sound: nx.sound || "pop", captionAt: nx.captionAt ?? 0.15, play: ctx => forward(ctx, steps, i + 1) };
      } else st.final = true;
      if (i > 0) st.back = { to: "s" + (i - 1), sound: "zwoop-rev", captionAt: 0.3, play: ctx => backward(ctx, steps, i) };
      states["s" + i] = st;
    });
    Book.register({
      id: cfg.id, topic: cfg.topic, title: cfg.title, description: cfg.description,
      svg: cfg.svg + rg.markup, legend: cfg.legend, start: "s0",
      hotspots: [{ id: "hit", selector: "#hit", label: cfg.tapLabel || "Tap to continue", hint: Hint.ring("#ring", rg.cx + " " + rg.cy) }],
      setup(ctx) {
        ctx.$$("[data-x]").forEach(el => gsap.set(el, { x: +el.dataset.x, y: +el.dataset.y }));
        if (cfg.setup) cfg.setup(ctx);
      },
      teardown(ctx) {
        (ctx.data.kitTickers || []).forEach(f => gsap.ticker.remove(f));
        if (cfg.teardown) cfg.teardown(ctx);
      },
      intro: cfg.intro || (ctx => {
        const els = ctx.$$(".fade");
        if (!els.length) return gsap.timeline();
        return gsap.to(els, { opacity: 1, duration: 0.5, stagger: Math.min(0.05, 0.9 / (els.length || 1)) });
      }),
      idle: cfg.idle,
      states
    });
  }

  return { NS, C, t, c, l, r, arrow, g, atom, rng, spawn, bounce, setSpeed, tick, sliderMarkup, slider, page };
})();
;
/* ---- js/data-quiz.js ---- */
// "Check yourself" questions, one per page, in the style of IB paper 1 (multiple choice, four options).
// QuizData[pageId] = { q: question, o: [four options], a: index of the right option (0–3), why: explanation shown after answering }.
// js/study.js shows them; the self-test checks that every page has exactly one, with four options.
const QuizData = {
  "redox-four-ways": { q: "In the reaction Mg + Cl₂ → MgCl₂, which statement is correct?", o: ["Magnesium is reduced because it gains electrons.", "Magnesium is oxidized because it loses electrons.", "Chlorine is oxidized because it gains electrons.", "The oxidation state of magnesium decreases."], a: 1, why: "Mg goes from 0 to +2: it loses two electrons, so it is oxidized. Chlorine gains them (0 to −1) and is reduced." },
  "states": { q: "Which description fits the particles in a liquid?", o: ["Fixed positions, vibrating on the spot.", "Far apart and moving randomly at high speed.", "Close together but able to slide past each other.", "Far apart but fixed in a regular pattern."], a: 2, why: "In a liquid the particles touch but are not held in fixed places, so a liquid flows and takes the shape of its container." },
  "kelvin": { q: "What is 25 °C on the kelvin scale?", o: ["248.15 K", "273.15 K", "25 K", "298.15 K"], a: 3, why: "T(K) = T(°C) + 273.15 = 25 + 273.15 = 298.15 K." },
  "hydrogen": { q: "Roughly how many times wider is a hydrogen atom than its nucleus?", o: ["About 10 times", "About 100 times", "About 100 000 times", "About 10 000 000 000 times"], a: 2, why: "An atom is about 10⁻¹⁰ m across and a nucleus about 10⁻¹⁵ m, so the atom is roughly 10⁵ times wider. Atoms are mostly empty space." },
  "isotopes": { q: "Isotopes of the same element have the same number of ______ but different numbers of ______.", o: ["neutrons; protons", "protons; neutrons", "electrons; protons", "protons; electrons"], a: 1, why: "The number of protons (atomic number) defines the element. Isotopes differ in neutrons, so they have different mass numbers." },
  "massspec": { q: "A sample of chlorine is 75 % ³⁵Cl and 25 % ³⁷Cl. What is its relative atomic mass?", o: ["35.0", "36.0", "35.5", "37.0"], a: 2, why: "(0.75 × 35) + (0.25 × 37) = 26.25 + 9.25 = 35.5." },
  "emission": { q: "Which electron transition in a hydrogen atom produces lines in the ultraviolet region?", o: ["From higher levels down to n = 1", "From higher levels down to n = 2", "From higher levels down to n = 3", "From n = 1 up to higher levels"], a: 0, why: "Transitions down to n = 1 release the largest energy differences, which fall in the UV. Those down to n = 2 give visible light, and down to n = 3 give infrared." },
  "shells": { q: "What is the full electron configuration of a chlorine atom (Z = 17)?", o: ["1s² 2s² 2p⁶ 3s² 3p⁴", "1s² 2s² 2p⁶ 3s² 3p⁵", "1s² 2s² 2p⁶ 3s² 3p⁶", "1s² 2s² 2p⁶ 3s¹ 3p⁶"], a: 1, why: "17 electrons: 2 + 2 + 6 + 2 + 5. The five 3p electrons mean one electron short of a full outer shell." },
  "orbitals": { q: "How many orbitals are there in a p sub-level?", o: ["1", "2", "3", "5"], a: 2, why: "A p sub-level has three orbitals (p_x, p_y, p_z), each holding up to two electrons: six in all." },
  "convergence": { q: "What can be worked out from the convergence limit of a series of lines in the hydrogen emission spectrum?", o: ["The first ionization energy", "The neutron number", "The speed of light", "The mass of an electron"], a: 0, why: "At the limit the electron has been lifted to n = ∞, which means it has left the atom. The frequency there gives the ionization energy." },
  "successive-ie": { q: "An element has a very large jump between its third and fourth ionization energies. In which group is it?", o: ["Group 1", "Group 2", "Group 13", "Group 14"], a: 2, why: "Three easy removals then a big jump means three outer electrons, with the fourth coming from a full inner shell: group 13." },
  "mole": { q: "How many molecules are in 0.50 mol of water? (Avogadro constant = 6.02 × 10²³ mol⁻¹)", o: ["6.02 × 10²³", "9.03 × 10²³", "1.20 × 10²⁴", "3.01 × 10²³"], a: 3, why: "N = n × N_A = 0.50 × 6.02 × 10²³ = 3.01 × 10²³ molecules. (9.03 × 10²³ would be the number of atoms.)" },
  "molar-mass": { q: "What is the mass of 0.250 mol of calcium carbonate, CaCO₃ (M = 100 g mol⁻¹)?", o: ["25.0 g", "100 g", "0.0025 g", "400 g"], a: 0, why: "m = n × M = 0.250 × 100 = 25.0 g." },
  "empirical": { q: "A compound is 40.0 % carbon, 6.7 % hydrogen and 53.3 % oxygen by mass. What is its empirical formula?", o: ["C₂H₄O", "CHO", "CH₂O", "C₂H₂O₂"], a: 2, why: "Divide by molar masses: C 3.33, H 6.7, O 3.33. Divide by the smallest (3.33): 1 : 2 : 1, so CH₂O." },
  "concentration": { q: "What mass of NaOH (M = 40.0 g mol⁻¹) is needed to make 250 cm³ of a 0.100 mol dm⁻³ solution?", o: ["1.00 g", "4.00 g", "10.0 g", "0.100 g"], a: 0, why: "n = c × V = 0.100 × 0.250 = 0.0250 mol; m = 0.0250 × 40.0 = 1.00 g." },
  "avogadros-law": { q: "At the same temperature and pressure, which sample contains the same number of molecules as 2.0 dm³ of nitrogen?", o: ["1.0 dm³ of oxygen", "2.0 dm³ of oxygen", "4.0 dm³ of hydrogen", "2.0 g of oxygen"], a: 1, why: "Avogadro's law: equal volumes of gases at the same T and P contain equal numbers of particles, whatever the gas." },
  "gases": { q: "Why does the pressure of a gas in a rigid container rise when it is heated?", o: ["The particles get bigger.", "The particles collide with the walls more often and with more force.", "There are more particles in the container.", "The particles attract each other more strongly."], a: 1, why: "Higher temperature means a higher average kinetic energy: particles move faster, so they hit the walls more often and harder." },
  "real-gases": { q: "Under which conditions does a real gas behave most like an ideal gas?", o: ["Low temperature and high pressure", "Low temperature and low pressure", "High temperature and high pressure", "High temperature and low pressure"], a: 3, why: "At high temperature the particles move too fast for attractions to matter; at low pressure they are far apart so their own volume is negligible." },
  "ideal-gas-law": { q: "What is the volume of 0.100 mol of an ideal gas at 300 K and 100 kPa? (R = 8.31 J K⁻¹ mol⁻¹)", o: ["24.9 dm³", "2.49 dm³", "0.249 dm³", "8.31 dm³"], a: 1, why: "V = nRT/P = (0.100 × 8.31 × 300) / 100 000 = 2.49 × 10⁻³ m³ = 2.49 dm³." },
  "ionic": { q: "What is the formula of the compound formed by Al³⁺ and O²⁻ ions?", o: ["AlO", "Al₂O₃", "Al₃O₂", "AlO₃"], a: 1, why: "Charges must balance: 2 × (+3) = +6 and 3 × (−2) = −6, so Al₂O₃." },
  "ionic-lattice": { q: "Why does solid sodium chloride not conduct electricity, but molten sodium chloride does?", o: ["Its electrons are free to move only when molten.", "Its ions are held in fixed positions in the solid but are free to move when molten.", "Molten NaCl has covalent bonds.", "The solid has no ions."], a: 1, why: "A lattice holds the ions in place, so they cannot carry charge. When molten (or dissolved) they can move." },
  "covalent": { q: "What is a covalent bond?", o: ["The attraction between oppositely charged ions", "The attraction between positive ions and delocalized electrons", "The electrostatic attraction between a shared pair of electrons and the two nuclei", "The attraction between two dipoles"], a: 2, why: "Each nucleus is attracted to the shared electron pair, which holds the atoms together." },
  "multiple-bonds": { q: "Which carbon–carbon bond is the shortest?", o: ["C–C", "C=C", "C≡C", "They are all the same length"], a: 2, why: "More shared electron pairs pull the nuclei closer: C≡C is 120 pm, C=C 134 pm and C–C 154 pm (data booklet §11)." },
  "build-molecule": { q: "Nitrogen can form three bonds. What is the formula of the simplest stable molecule made of nitrogen and hydrogen only, with every bond used?", o: ["NH", "NH₂", "NH₃", "NH₄"], a: 2, why: "Each hydrogen forms one bond and nitrogen forms three, so one nitrogen bonds to three hydrogens: ammonia, NH₃." },
  "coordination-bond": { q: "How is the coordinate (dative) bond formed when NH₃ reacts with H⁺ to make NH₄⁺?", o: ["H⁺ donates a pair of electrons to nitrogen.", "Each atom supplies one electron.", "Nitrogen donates its lone pair to H⁺.", "An electron moves from nitrogen to hydrogen."], a: 2, why: "H⁺ has no electrons. The lone pair on nitrogen supplies both electrons of the new N–H bond." },
  "vsepr": { q: "What is the shape of an ammonia molecule, NH₃?", o: ["Trigonal planar", "Tetrahedral", "Trigonal pyramidal", "Linear"], a: 2, why: "Nitrogen has three bonding pairs and one lone pair. The four pairs point to the corners of a tetrahedron, but the shape of the atoms is a pyramid (about 107°)." },
  "polarity": { q: "Which molecule is non-polar even though it contains polar bonds?", o: ["H₂O", "NH₃", "CO₂", "CHCl₃"], a: 2, why: "CO₂ is linear, so the two bond dipoles point in opposite directions and cancel." },
  "giant-covalent": { q: "Why can graphite conduct electricity?", o: ["It contains free ions.", "Each carbon has a delocalized electron that can move between the layers.", "It is a metal.", "Its carbon atoms have no electrons."], a: 1, why: "Each carbon uses three electrons for bonds in its layer; the fourth is delocalized along the layer and can carry charge." },
  "imf": { q: "Which compound has hydrogen bonding between its molecules?", o: ["CH₄", "HCl", "H₂S", "HF"], a: 3, why: "Hydrogen bonds need H bonded to N, O or F, plus a lone pair on N, O or F in a neighbouring molecule. HF fits." },
  "chromatography": { q: "In a chromatography experiment a spot moves 3.0 cm while the solvent front moves 6.0 cm. What is the Rf value?", o: ["0.50", "2.0", "3.0", "0.30"], a: 0, why: "Rf = distance moved by the spot ÷ distance moved by the solvent = 3.0 / 6.0 = 0.50. It never has units." },
  "benzene": { q: "Why are all the carbon–carbon bonds in benzene the same length?", o: ["Benzene has three single and three double bonds that swap quickly.", "The electrons of the pi system are delocalized over the whole ring.", "Benzene has only single bonds.", "Hydrogen atoms make the ring symmetrical."], a: 1, why: "Delocalized pi electrons give every C–C bond a bond order between one and two (about 140 pm), not alternating bonds." },
  "formal-charge": { q: "An oxygen atom has one bond and three lone pairs in an ion. What is its formal charge?", o: ["0", "+1", "−1", "−2"], a: 2, why: "Formal charge = valence electrons − sticks − stones = 6 − 1 − 6 = −1." },
  "hybridization": { q: "What is the hybridization of each carbon atom in ethene, C₂H₄?", o: ["sp", "sp²", "sp³", "sp³d"], a: 1, why: "Each carbon forms three sigma bonds (two C–H, one C–C) at 120°, so it uses sp² orbitals; the leftover p orbital makes the pi bond." },
  "metallic": { q: "Why are metals malleable?", o: ["Layers of ions can slide over each other while the delocalized electrons keep holding them together.", "The ions are held in rigid positions by covalent bonds.", "Their electrons are localized in bonds.", "Metals have weak intermolecular forces."], a: 0, why: "The metallic bond is non-directional, so shifting a layer does not break it." },
  "metallic-strength": { q: "Why does magnesium have a higher melting point than sodium?", o: ["Magnesium atoms are heavier.", "Magnesium has a lattice of 2+ ions in a sea of two electrons per atom, and a smaller radius, so a stronger metallic bond.", "Magnesium is a transition metal.", "Sodium has more electrons."], a: 1, why: "A larger ion charge and more delocalized electrons per atom, with a smaller ion, make the attraction stronger and the melting point higher." },
  "bonding-triangle": { q: "Which compound would lie closest to the ionic corner of the bonding triangle?", o: ["Cl₂", "HCl", "Na", "NaCl"], a: 3, why: "NaCl has a large electronegativity difference (Δχ = 3.2 − 0.9 = 2.3), so it plots high up near the ionic corner." },
  "alloys": { q: "Why is an alloy usually harder than the pure metal?", o: ["Atoms of different sizes disrupt the regular layers so they slide less easily.", "Alloys have covalent bonds.", "The electrons are no longer delocalized.", "Alloys are always denser."], a: 0, why: "Different-sized atoms stop the layers of ions from sliding past each other as easily." },
  "addition-polymers": { q: "Which monomer forms poly(propene)?", o: ["CH₃CH₂CH₃", "CH₃CH=CH₂", "CH₂=CH₂", "CH₃CH₂CH₂OH"], a: 1, why: "Addition polymers form from alkenes: the C=C of propene opens and the units join into a chain." },
  "periodic-table": { q: "An element has the electron configuration 1s² 2s² 2p⁶ 3s² 3p⁴. Where is it in the periodic table?", o: ["Period 3, group 14", "Period 4, group 16", "Period 3, group 16", "Period 2, group 6"], a: 2, why: "Three shells means period 3; six outer electrons (3s² 3p⁴) means group 16. It is sulfur." },
  "periodic": { q: "Why does the atomic radius decrease from sodium to chlorine?", o: ["Electrons are being removed.", "The nuclear charge increases while shielding stays about the same.", "The number of shells increases.", "Electron repulsion increases."], a: 1, why: "More protons pull the same number of shells in closer, because the extra electrons are added to the same shell." },
  "hydrogen-element": { q: "Why is hydrogen often placed above group 1 in the periodic table?", o: ["It has one valence electron.", "It is a metal.", "It forms 2+ ions.", "It has full outer shell."], a: 0, why: "Like group 1 it has one electron in its outer shell. In other ways, such as being a gas that forms covalent bonds, it does not fit." },
  "metals-nonmetals": { q: "Which period 3 oxide is amphoteric?", o: ["Na₂O", "MgO", "SiO₂", "Al₂O₃"], a: 3, why: "Al₂O₃ reacts with both acids and bases. Metal oxides on the left are basic and non-metal oxides on the right are acidic." },
  "oxidation-states": { q: "What is the oxidation state of manganese in KMnO₄?", o: ["+7", "+4", "+2", "+5"], a: 0, why: "K is +1 and four O are −8 in total, so Mn must be +7 to make the compound neutral." },
  "ionization-dips": { q: "Why is the first ionization energy of aluminium lower than that of magnesium?", o: ["Aluminium has a larger nuclear charge.", "The outer electron is in a 3p orbital, which is higher in energy and slightly shielded by the 3s electrons.", "Aluminium is a non-metal.", "Magnesium has more shells."], a: 1, why: "Mg loses a 3s electron; Al loses a 3p electron, which is further out and higher in energy, so it comes off more easily." },
  "transition-elements": { q: "Which is a typical property of transition elements?", o: ["They form colourless compounds.", "They only have one oxidation state.", "They form coloured compounds and can have variable oxidation states.", "They are in the s-block."], a: 2, why: "Partly filled d sub-levels let them form ions of several charges and absorb visible light, giving coloured complexes." },
  "organic-formulas": { q: "What is the empirical formula of butane, C₄H₁₀?", o: ["CH₃", "C₂H₅", "C₄H₁₀", "CH₂"], a: 1, why: "Divide each subscript by the highest common factor, 2: C₂H₅." },
  "functional": { q: "What is the functional group in ethanal, CH₃CHO?", o: ["Ketone", "Carboxylic acid", "Aldehyde", "Alcohol"], a: 2, why: "The C=O at the end of the carbon chain, with an H attached, is an aldehyde group." },
  "homologous-series": { q: "Members of a homologous series differ from each other by:", o: ["one –CH₂– unit", "one double bond", "one functional group", "one carbon atom replaced by oxygen"], a: 0, why: "Each member has one more CH₂ than the last, giving a gradual change in physical properties with similar chemical properties." },
  "naming": { q: "What is the IUPAC name of CH₃CH(CH₃)CH₂CH₃?", o: ["2-methylbutane", "3-methylbutane", "Pentane", "2-ethylpropane"], a: 0, why: "The longest chain has four carbons (butane), with a methyl on carbon 2. Numbering from the other end would give 3, and the lowest number wins." },
  "isomers": { q: "How many structural isomers does C₄H₁₀ have?", o: ["1", "2", "3", "4"], a: 1, why: "Butane (straight chain) and 2-methylpropane (branched)." },
  "energy": { q: "Which is true for an exothermic reaction?", o: ["The products have more enthalpy than the reactants and ΔH is positive.", "The products have less enthalpy than the reactants and ΔH is negative.", "The surroundings get colder.", "The reaction needs a continuous supply of heat."], a: 1, why: "Energy is given out to the surroundings, so the surroundings warm up and ΔH is negative." },
  "calorimetry": { q: "50 g of water is heated and its temperature rises by 5.0 K. How much heat does the water gain? (c = 4.18 J g⁻¹ K⁻¹)", o: ["250 J", "1045 J", "42 J", "4180 J"], a: 1, why: "Q = mcΔT = 50 × 4.18 × 5.0 = 1045 J (about 1.0 kJ)." },
  "bond-energies": { q: "Which statement about bond enthalpies is correct?", o: ["Breaking bonds releases energy and making bonds absorbs it.", "Both breaking and making bonds absorb energy.", "Breaking bonds absorbs energy and making bonds releases it.", "Both breaking and making bonds release energy."], a: 2, why: "Energy must be put in to pull atoms apart (endothermic) and is given out when new bonds form (exothermic)." },
  "hess": { q: "ΔH for A → B is +50 kJ and for B → C is −80 kJ. What is ΔH for A → C?", o: ["+130 kJ", "−130 kJ", "+30 kJ", "−30 kJ"], a: 3, why: "Hess's law: add the steps. +50 + (−80) = −30 kJ." },
  "formation-combustion": { q: "What is the standard enthalpy of formation of an element in its standard state, such as O₂(g)?", o: ["Zero", "Positive", "Negative", "It depends on the element"], a: 0, why: "Forming an element from itself involves no change, so ΔHf° = 0 by definition." },
  "born-haber": { q: "Why is the lattice enthalpy of MgO much greater than that of NaCl?", o: ["Mg is heavier than Na.", "Magnesium oxide has 2+ and 2− ions, which are smaller and have higher charges, so attract more strongly.", "MgO is covalent.", "NaCl has bigger ions only."], a: 1, why: "Lattice enthalpy grows with the ions' charges and falls with their size. MgO: 3791 kJ mol⁻¹, NaCl: 790 (data booklet §16)." },
  "combustion": { q: "Which products may form in the incomplete combustion of a hydrocarbon?", o: ["Only carbon dioxide and water", "Carbon monoxide and/or carbon, and water", "Hydrogen and carbon dioxide", "Oxygen and water"], a: 1, why: "With too little oxygen the carbon is not fully oxidized: CO (toxic) or soot (C) forms along with water." },
  "fuels": { q: "Which fuel is renewable?", o: ["Coal", "Natural gas", "Bioethanol made by fermenting sugar cane", "Crude oil"], a: 2, why: "Biofuels come from plants that can be regrown. Coal, oil and gas took millions of years to form." },
  "fuel-cell": { q: "What is the only product of a hydrogen–oxygen fuel cell?", o: ["Water", "Carbon dioxide", "Hydrogen peroxide", "Methane"], a: 0, why: "2H₂ + O₂ → 2H₂O. Hydrogen is oxidized at the anode and oxygen reduced at the cathode." },
  "entropy": { q: "Which change has the largest positive entropy change?", o: ["H₂O(g) → H₂O(l)", "H₂O(l) → H₂O(s)", "H₂O(l) → H₂O(g)", "2H₂(g) + O₂(g) → 2H₂O(l)"], a: 2, why: "Going from liquid to gas spreads the particles out far more, so entropy increases greatly." },
  "rate": { q: "How is the rate of a reaction measured?", o: ["The total amount of product made", "The activation energy", "The change in concentration of a reactant or product per unit time", "The temperature change"], a: 2, why: "Rate = change in concentration ÷ time, in units such as mol dm⁻³ s⁻¹." },
  "collision": { q: "Which two conditions must be met for a collision between particles to lead to a reaction?", o: ["Enough energy (at least Ea) and the correct orientation", "Enough particles and a high pressure", "The right temperature and a catalyst", "High concentration and a large volume"], a: 0, why: "Collision theory: particles must collide with energy at least equal to the activation energy and with a suitable orientation." },
  "rate-factors": { q: "Which change will increase the rate of reaction between marble chips and hydrochloric acid?", o: ["Using larger marble chips", "Crushing the marble into a powder", "Using a lower temperature", "Diluting the acid"], a: 1, why: "A powder has a larger surface area, so more collisions happen per second at the surface." },
  "maxwell": { q: "What happens to the Maxwell–Boltzmann curve when the temperature is increased?", o: ["The peak moves to the left and becomes taller.", "The area under the curve increases.", "The peak moves to the right and becomes lower and wider, with more particles above Ea.", "Nothing changes."], a: 2, why: "The total number of particles is the same (equal area), but the distribution spreads to higher energies, so a bigger fraction can react." },
  "catalysts": { q: "How does a catalyst increase the rate of a reaction?", o: ["It increases the temperature.", "It provides an alternative route with a lower activation energy.", "It increases the concentration of reactants.", "It makes the reaction more exothermic."], a: 1, why: "A lower Ea means a larger fraction of collisions are successful. The catalyst is not used up." },
  "equilibrium": { q: "What is true of a reversible reaction at equilibrium in a closed system?", o: ["The rates of the forward and reverse reactions are equal.", "The concentrations of reactants and products are equal.", "The forward reaction has stopped.", "The reactants are all used up."], a: 0, why: "Both reactions continue (dynamic equilibrium), at equal rates, so the concentrations stay constant. They need not be equal." },
  "lechatelier": { q: "For N₂(g) + 3H₂(g) ⇌ 2NH₃(g), what happens if more N₂ is added at constant temperature?", o: ["The position of equilibrium shifts to the right.", "The position shifts to the left.", "The value of K increases.", "Nothing changes."], a: 0, why: "The system shifts to use up the added N₂, forming more NH₃. K is unchanged because the temperature is unchanged." },
  "lechatelier-pt": { q: "For N₂O₄(g) ⇌ 2NO₂(g), what happens if the pressure is increased at constant temperature?", o: ["The equilibrium shifts to the right.", "The equilibrium shifts to the left.", "The value of K increases.", "The equilibrium is unaffected."], a: 1, why: "The system opposes the change by moving to the side with fewer moles of gas: one N₂O₄ instead of two NO₂." },
  "acids": { q: "In the Brønsted–Lowry theory, an acid is:", o: ["a proton acceptor", "a proton donor", "an electron-pair donor", "a substance with pH above 7"], a: 1, why: "A Brønsted–Lowry acid donates H⁺ and a base accepts it." },
  "amphiprotic": { q: "Which species is amphiprotic?", o: ["NH₄⁺", "Cl⁻", "HCO₃⁻", "CH₄"], a: 2, why: "HCO₃⁻ can donate a proton (to become CO₃²⁻) or accept one (to become H₂CO₃)." },
  "ph-scale": { q: "What is the pH of a 1.0 × 10⁻³ mol dm⁻³ solution of hydrochloric acid?", o: ["1", "3", "11", "0.001"], a: 1, why: "HCl is a strong acid, so [H⁺] = 1.0 × 10⁻³, and pH = −log(10⁻³) = 3." },
  "kw": { q: "What is [OH⁻] in a solution of pH 12 at 298 K? (Kw = 1.00 × 10⁻¹⁴)", o: ["1.0 × 10⁻¹² mol dm⁻³", "1.0 × 10⁻² mol dm⁻³", "12 mol dm⁻³", "1.0 × 10⁻¹⁴ mol dm⁻³"], a: 1, why: "[H⁺] = 10⁻¹², so [OH⁻] = Kw / [H⁺] = 10⁻¹⁴ / 10⁻¹² = 1.0 × 10⁻² mol dm⁻³." },
  "strong-weak": { q: "Which of the following is a weak acid?", o: ["HCl", "HNO₃", "H₂SO₄", "CH₃COOH"], a: 3, why: "Ethanoic acid only partly ionizes in water. HCl, HNO₃ and H₂SO₄ (first ionization) are strong acids." },
  "acid-picker": { q: "A strong acid and a weak acid are both 0.10 mol dm⁻³. Which statement is correct?", o: ["They have the same pH because their concentrations are equal.", "The weak acid has the lower pH because it is more concentrated.", "The strong acid has the lower pH because it is fully ionized and so has more H⁺.", "The strong acid has the higher pH because it is stronger."], a: 2, why: "Strong means fully ionized, so [H⁺] = 0.10 and pH = 1.0. A weak acid only partly ionizes, so [H⁺] is much smaller and the pH is higher (about 2.9 for ethanoic acid)." },
  "neutralization": { q: "What is the ionic equation for the reaction of HCl(aq) with NaOH(aq)?", o: ["HCl + NaOH → NaCl + H₂O", "H⁺ + OH⁻ → H₂O", "Na⁺ + Cl⁻ → NaCl", "H⁺ + Cl⁻ → HCl"], a: 1, why: "Na⁺ and Cl⁻ are spectator ions, unchanged, so they are left out of the ionic equation." },
  "ph-curves": { q: "A weak acid is titrated with a strong base. What is the pH at the equivalence point?", o: ["Exactly 7", "Less than 7", "Greater than 7", "Equal to the pKa"], a: 2, why: "At equivalence the solution contains the salt of a weak acid, whose anion is a weak base, so the pH is above 7." },
  "half-equations": { q: "Which is the oxidation half-equation when zinc reacts with copper(II) ions?", o: ["Zn²⁺ + 2e⁻ → Zn", "Zn → Zn²⁺ + 2e⁻", "Cu²⁺ + 2e⁻ → Cu", "Cu → Cu²⁺ + 2e⁻"], a: 1, why: "Oxidation is loss of electrons, so electrons appear on the right: zinc is oxidized." },
  "group-reactivity": { q: "Why does reactivity increase down group 1?", o: ["The nuclear charge decreases.", "The outer electron is further from the nucleus and more shielded, so it is lost more easily.", "The atoms get lighter.", "More electrons are gained."], a: 1, why: "A larger atom holds its outer electron less tightly, so the first ionization energy falls (Li 520, Cs 376 kJ mol⁻¹)." },
  "metals-in-acid": { q: "Which metal does not react with dilute hydrochloric acid?", o: ["Zinc", "Magnesium", "Iron", "Copper"], a: 3, why: "Copper's E° (+0.34 V) is more positive than that of hydrogen (0.00 V), so it cannot reduce H⁺ to H₂." },
  "redox": { q: "In a voltaic cell, in which direction do electrons flow in the external circuit?", o: ["From the cathode to the anode", "From the anode to the cathode", "From the salt bridge to the anode", "They flow through the salt bridge"], a: 1, why: "Oxidation at the anode releases electrons, which travel through the wire to the cathode where reduction happens. The salt bridge carries ions." },
  "rechargeable": { q: "What happens when a rechargeable cell is being charged?", o: ["The discharge reactions are run in reverse using an external source of electricity.", "The cell makes electricity by the same reactions as discharge.", "The electrodes are replaced.", "The electrolyte is used up."], a: 0, why: "A power supply forces electrons backwards, undoing the discharge reactions and restoring the reactants." },
  "electrolysis": { q: "What is formed at the cathode in the electrolysis of molten sodium chloride?", o: ["Chlorine gas", "Sodium metal", "Hydrogen gas", "Oxygen gas"], a: 1, why: "Positive Na⁺ ions go to the negative cathode and are reduced: Na⁺ + e⁻ → Na. Chlorine forms at the anode." },
  "organic-redox": { q: "Heating a primary alcohol under reflux with acidified potassium dichromate(VI) gives:", o: ["An alkene", "A ketone", "A carboxylic acid", "An alkane"], a: 2, why: "Reflux means complete oxidation: alcohol to aldehyde and then on to carboxylic acid. The orange dichromate turns green." },
  "radicals": { q: "Which equation shows a propagation step in the chlorination of methane?", o: ["Cl₂ → 2Cl•", "Cl• + CH₄ → HCl + •CH₃", "2Cl• → Cl₂", "•CH₃ + •CH₃ → C₂H₆"], a: 1, why: "In propagation a radical reacts and another radical is made, so the chain continues. The others are initiation and termination steps." },
  "nucleophilic-substitution": { q: "Which species is a nucleophile?", o: ["H⁺", "OH⁻", "CH₃⁺", "BF₃"], a: 1, why: "A nucleophile has a lone pair to donate to an electron-poor carbon. OH⁻ does; the others are electron-pair acceptors." },
  "electrophilic-addition": { q: "What is the product of the reaction of ethene with bromine?", o: ["Bromoethane", "1,2-dibromoethane", "1,1-dibromoethane", "Ethanol"], a: 1, why: "Br₂ adds across the C=C: CH₂=CH₂ + Br₂ → CH₂BrCH₂Br. This is why bromine water is decolourized by alkenes." }
};
;
/* ---- js/data-glossary.js ---- */
// Glossary for the "Glossary" panel (js/study.js): [term, plain-language definition, [ids of the pages that explain it]].
// Page ids are checked by the self-test (index.html?test), so a typo shows up there.
const GlossaryData = [
  ["Activation energy (Ea)", "The minimum energy colliding particles need for a collision to lead to a reaction. It is the height of the hump on an energy profile.", ["collision", "maxwell", "catalysts"]],
  ["Addition polymer", "A long chain made by joining many small unsaturated molecules (monomers) together with nothing lost, by opening their C=C double bonds.", ["addition-polymers"]],
  ["Alloy", "A mixture of a metal with other elements (usually other metals). The different-sized atoms stop the layers sliding, so alloys are usually harder than the pure metal.", ["alloys"]],
  ["Amphiprotic", "Able to donate a proton and also to accept one. Water and hydrogencarbonate ions are amphiprotic.", ["amphiprotic"]],
  ["Anode", "The electrode where oxidation happens (in both cells and electrolysis).", ["redox", "electrolysis"]],
  ["Atomic number (Z)", "The number of protons in the nucleus of an atom. It decides which element it is.", ["hydrogen", "isotopes"]],
  ["Avogadro constant", "6.02 × 10²³ mol⁻¹: the number of particles in one mole.", ["mole", "molar-mass"]],
  ["Avogadro's law", "Equal volumes of gases at the same temperature and pressure contain equal numbers of particles.", ["avogadros-law"]],
  ["Base", "A proton (H⁺) acceptor.", ["acids"]],
  ["Bond enthalpy", "The energy needed to break one mole of a particular bond in gaseous molecules. Breaking bonds takes energy; making bonds releases it.", ["bond-energies"]],
  ["Born–Haber cycle", "An energy cycle that uses Hess's law to work out the lattice enthalpy of an ionic compound from other enthalpy changes.", ["born-haber"]],
  ["Calorimetry", "Measuring the heat energy of a reaction from the temperature change it causes in a known mass of water, using Q = mcΔT.", ["calorimetry"]],
  ["Carbocation", "An organic ion with a positively charged carbon that has only three bonds. It forms as an intermediate in electrophilic addition.", ["electrophilic-addition"]],
  ["Catalyst", "A substance that speeds up a reaction by giving it a route with a lower activation energy, without being used up.", ["catalysts"]],
  ["Cathode", "The electrode where reduction happens.", ["redox", "electrolysis"]],
  ["Chromatography", "Separating a mixture by letting a mobile phase carry its parts different distances through a stationary phase.", ["chromatography"]],
  ["Collision theory", "Particles can only react when they collide, with at least the activation energy and the right orientation.", ["collision"]],
  ["Combustion", "Burning: reacting with oxygen and releasing energy as heat. Complete combustion of a hydrocarbon gives carbon dioxide and water.", ["combustion", "fuels"]],
  ["Concentration", "The amount of solute (in mol) per dm³ of solution: c = n / V.", ["concentration"]],
  ["Coordination bond", "A covalent bond in which one atom supplies both of the shared electrons (also called a dative bond).", ["coordination-bond"]],
  ["Covalent bond", "The electrostatic attraction between two nuclei and a shared pair of electrons.", ["covalent", "multiple-bonds", "build-molecule"]],
  ["Delocalized electrons", "Electrons that are not tied to one atom or bond but spread over several atoms, as in benzene or a metal.", ["benzene", "metallic"]],
  ["Electrolysis", "Using electrical energy to drive a reaction that would not happen by itself, such as splitting a molten ionic compound.", ["electrolysis"]],
  ["Electronegativity", "How strongly an atom pulls on the shared electrons in a bond.", ["polarity", "bonding-triangle"]],
  ["Electrophile", "An electron-pair acceptor: a species attracted to regions of high electron density, such as a C=C double bond.", ["electrophilic-addition"]],
  ["Empirical formula", "The simplest whole-number ratio of the atoms of each element in a compound.", ["empirical"]],
  ["Endothermic", "A change that takes in heat from the surroundings (ΔH is positive).", ["energy"]],
  ["Enthalpy change (ΔH)", "The heat energy change of a reaction at constant pressure.", ["energy", "calorimetry", "hess"]],
  ["Entropy (S)", "A measure of how spread out the energy and particles of a system are. It tends to increase (more disorder).", ["entropy"]],
  ["Equilibrium", "The state of a reversible reaction in a closed system where the forward and reverse rates are equal, so the amounts stop changing.", ["equilibrium"]],
  ["Exothermic", "A change that gives out heat to the surroundings (ΔH is negative).", ["energy"]],
  ["Fission, heterolytic", "Breaking a covalent bond so that one atom takes both electrons, forming ions.", ["nucleophilic-substitution"]],
  ["Fission, homolytic", "Breaking a covalent bond so that each atom takes one electron, forming two radicals.", ["radicals"]],
  ["Formal charge", "A bookkeeping charge for an atom in a molecule: valence electrons − sticks (bonds) − stones (lone-pair electrons).", ["formal-charge"]],
  ["Fuel cell", "A cell that makes electricity from a fuel (such as hydrogen) and oxygen supplied continuously.", ["fuel-cell"]],
  ["Functional group", "The atom or group of atoms that gives an organic molecule its characteristic reactions, such as –OH in alcohols.", ["functional"]],
  ["Group", "A vertical column of the periodic table. Its elements have the same number of outer-shell electrons.", ["periodic-table"]],
  ["Half-equation", "An equation showing only the oxidation or only the reduction part of a redox reaction, with the electrons included.", ["half-equations"]],
  ["Hess's law", "The enthalpy change of a reaction is the same whichever route is taken, as long as the start and end are the same.", ["hess"]],
  ["Homologous series", "A family of compounds with the same functional group whose members differ by one CH₂ each.", ["homologous-series"]],
  ["Hybridization", "Mixing atomic orbitals (such as one s and three p) to make new equal orbitals (sp³) that explain bond angles.", ["hybridization"]],
  ["Hydrogen bond", "A strong intermolecular force between a hydrogen attached to N, O or F and a lone pair on another N, O or F.", ["imf"]],
  ["Ideal gas", "A model gas whose particles have no volume and no attractions. Real gases behave this way best at high temperature and low pressure.", ["gases", "real-gases", "ideal-gas-law"]],
  ["Intermolecular forces", "The attractions between separate molecules: London dispersion forces, dipole–dipole attractions and hydrogen bonds.", ["imf"]],
  ["Ion", "An atom or group of atoms with an overall charge because it has gained or lost electrons.", ["ionic"]],
  ["Ionic bond", "The electrostatic attraction between oppositely charged ions.", ["ionic", "ionic-lattice"]],
  ["Ionization energy", "The energy needed to remove one mole of electrons from one mole of gaseous atoms (first), or from each ion in turn (successive).", ["successive-ie", "ionization-dips"]],
  ["Isomers, structural", "Compounds with the same molecular formula but different arrangements of atoms.", ["isomers"]],
  ["Isotopes", "Atoms of the same element with different numbers of neutrons.", ["isotopes"]],
  ["Kelvin", "The SI unit of temperature. 0 K is absolute zero; T(K) = T(°C) + 273.15.", ["kelvin"]],
  ["Kw", "The ionic product of water: [H⁺][OH⁻] = 1.00 × 10⁻¹⁴ mol² dm⁻⁶ at 298 K.", ["kw"]],
  ["Lattice enthalpy", "The energy needed to separate one mole of an ionic solid into gaseous ions. It is endothermic.", ["born-haber", "ionic-lattice"]],
  ["Le Châtelier's principle", "If a change is made to a system at equilibrium, the position of equilibrium shifts to partly oppose that change.", ["lechatelier", "lechatelier-pt"]],
  ["Lone pair", "A pair of outer electrons that is not used in bonding.", ["vsepr", "coordination-bond"]],
  ["Mass number (A)", "The number of protons plus neutrons in an atom.", ["isotopes"]],
  ["Maxwell–Boltzmann distribution", "A graph showing how the kinetic energies of the particles in a gas are spread out at a given temperature.", ["maxwell"]],
  ["Metallic bond", "The attraction between positive metal ions and the sea of delocalized electrons around them.", ["metallic", "metallic-strength"]],
  ["Mole", "The amount of substance containing 6.02 × 10²³ particles.", ["mole"]],
  ["Molar mass", "The mass of one mole of a substance, in g mol⁻¹.", ["molar-mass"]],
  ["Molar volume", "The volume of one mole of an ideal gas: 22.7 dm³ at STP.", ["avogadros-law", "ideal-gas-law"]],
  ["Neutralization", "The reaction of an acid with a base to form a salt and water: H⁺ + OH⁻ → H₂O.", ["neutralization"]],
  ["Nucleophile", "An electron-pair donor: a species with a lone pair that attacks an electron-poor (δ+) atom.", ["nucleophilic-substitution"]],
  ["Orbital", "A region of space where there is a high probability of finding an electron. Each holds up to two electrons.", ["orbitals"]],
  ["Oxidation", "Loss of electrons, an increase in oxidation state, (in organic chemistry) gain of oxygen or loss of hydrogen.", ["redox-four-ways", "oxidation-states"]],
  ["Oxidation state", "The charge an atom would have if all its bonds were completely ionic. It keeps track of electrons in redox.", ["oxidation-states"]],
  ["Oxidizing agent", "A substance that oxidizes another by taking its electrons, and is itself reduced.", ["redox", "group-reactivity"]],
  ["Period", "A horizontal row of the periodic table. Elements in a period have the same number of electron shells.", ["periodic-table"]],
  ["pH", "−log₁₀[H⁺]. Each pH unit is a factor of ten in hydrogen ion concentration.", ["ph-scale", "kw"]],
  ["Polar bond", "A covalent bond where the electrons are shared unequally because of a difference in electronegativity.", ["polarity"]],
  ["Polymer", "A very long molecule made of many repeating units (monomers).", ["addition-polymers"]],
  ["Radical", "A species with an unpaired electron, very reactive. Made by homolytic fission, often with UV light.", ["radicals"]],
  ["Rate of reaction", "How fast reactants are used up or products formed: the change in concentration per unit time.", ["rate", "rate-factors"]],
  ["Redox", "A reaction in which both reduction and oxidation happen: electrons are transferred.", ["redox-four-ways", "redox"]],
  ["Reducing agent", "A substance that reduces another by giving it electrons, and is itself oxidized.", ["group-reactivity", "half-equations"]],
  ["Reduction", "Gain of electrons, a decrease in oxidation state, (in organic chemistry) loss of oxygen or gain of hydrogen.", ["redox-four-ways", "half-equations"]],
  ["Relative atomic mass (Ar)", "The weighted average mass of an element's atoms (across its isotopes) compared with 1/12 of the mass of a carbon-12 atom.", ["massspec", "molar-mass"]],
  ["Resonance", "When a molecule is best described as a hybrid of several Lewis structures, with electrons delocalized, as in benzene or ozone.", ["benzene"]],
  ["Rf value", "In chromatography: the distance moved by a spot divided by the distance moved by the solvent front.", ["chromatography"]],
  ["Sigma bond (σ)", "A bond formed by head-on overlap of orbitals, along the line between the nuclei.", ["hybridization"]],
  ["Pi bond (π)", "A bond formed by sideways overlap of p orbitals, above and below the bond axis.", ["hybridization", "multiple-bonds"]],
  ["Spectator ion", "An ion present in a reaction that does not take part in it and is left out of the ionic equation.", ["neutralization"]],
  ["Spectrum, emission", "A set of coloured lines produced when excited electrons fall back to lower energy levels and release light.", ["emission", "convergence"]],
  ["Standard conditions", "STP: 273.15 K and 100 kPa. SATP: 298.15 K and 100 kPa. (Check which one a question uses.)", ["ideal-gas-law"]],
  ["Strong acid", "An acid that ionizes (dissociates) completely in water, such as HCl.", ["strong-weak", "acid-picker"]],
  ["Weak acid", "An acid that only partly ionizes in water, so an equilibrium is set up, such as ethanoic acid.", ["strong-weak", "acid-picker"]],
  ["Titration", "Adding a solution of known concentration to a measured volume of another until the reaction is just complete (the equivalence point).", ["ph-curves"]],
  ["Transition element", "A d-block element that forms at least one ion with a partially filled d sub-level. They have variable oxidation states and coloured compounds.", ["transition-elements"]],
  ["Unsaturated", "Containing at least one C=C or C≡C multiple bond.", ["organic-formulas", "addition-polymers"]],
  ["VSEPR", "Valence shell electron pair repulsion: electron pairs around a central atom repel and spread as far apart as possible, giving the molecule's shape.", ["vsepr"]],
  ["Valence electrons", "The electrons in the outermost shell of an atom. They are the ones involved in bonding.", ["shells", "periodic-table"]]
];
;
/* ---- js/data-booklet.js ---- */
// The IB Chemistry data booklet (first assessment 2025), the sections this book cites, as tables for the
// "Data booklet" panel (js/study.js). Values were read from the booklet PDF; sections 6, 7, 8, 21 and 23
// are listed but not reproduced here (see the booklet itself). Sections 9 and 10 are shortened.
const BookletData = {
  title: "Data booklet",
  sections: {
"1": { title: "Some relevant equations", type: "list", rows: [
["Wave speed", "c = fλ"],
["Photon energy", "E = hf"],
["Amount", "n = m / M"],
["Concentration", "c = n / V"],
["Ideal gas", "PV = nRT"],
["Combined gas law", "P₁V₁/T₁ = P₂V₂/T₂"],
["Heat", "Q = mcΔT"],
["Atom economy", "% atom economy = (molar mass of desired product ÷ molar mass of all reactants) × 100"],
["Enthalpy change (formation)", "ΔH° = Σ(ΔHf° products) − Σ(ΔHf° reactants)"],
["Enthalpy change (combustion)", "ΔH° = Σ(ΔHc° reactants) − Σ(ΔHc° products)"],
["Gibbs energy", "ΔG° = ΔH° − TΔS°"],
["Gibbs energy and Q", "ΔG = ΔG° + RT ln Q"],
["Gibbs energy and K", "ΔG° = −RT ln K"],
["Gibbs energy and cell potential", "ΔG° = −nFE°"],
["Arrhenius", "k = Ae^(−Ea/RT)"],
["Arrhenius (log form)", "ln k = ln A − Ea/RT"],
["pH", "pH = −log₁₀[H₃O⁺]  or  pH = −log₁₀[H⁺]"],
["Ionic product of water", "Kw = [H⁺][OH⁻]"],
["pOH", "pOH = −log₁₀[OH⁻]"]
] },
"2": { title: "Physical constants", type: "table", columns: ["Quantity", "Symbol", "Approximate value"], rows: [
["Elementary charge", "e", "1.602177 × 10⁻¹⁹ C"],
["Electron rest mass", "mₑ", "9.109384 × 10⁻³¹ kg"],
["Proton rest mass", "mₚ", "1.672622 × 10⁻²⁷ kg"],
["Neutron rest mass", "mₙ", "1.674927 × 10⁻²⁷ kg"],
["Speed of light in vacuum", "c", "3.00 × 10⁸ m s⁻¹"],
["Planck constant", "h", "6.63 × 10⁻³⁴ J s"],
["Avogadro constant", "N_A", "6.02 × 10²³ mol⁻¹"],
["Gas constant", "R", "8.31 J K⁻¹ mol⁻¹"],
["Molar volume of an ideal gas at STP", "Vm", "2.27 × 10⁻² m³ mol⁻¹ = 22.7 dm³ mol⁻¹"],
["Specific heat capacity of water", "c_w", "4.18 kJ kg⁻¹ K⁻¹ = 4.18 J g⁻¹ K⁻¹"],
["Ionic product constant for water at 298.15 K", "Kw", "1.00 × 10⁻¹⁴ mol² dm⁻⁶"],
["Faraday constant", "F", "9.65 × 10⁴ C mol⁻¹"]
] },
"3": { title: "Metric (SI) multipliers", type: "table", columns: ["Prefix", "Abbreviation", "Value"], rows: [
["peta", "P", "10¹⁵"],
["tera", "T", "10¹²"],
["giga", "G", "10⁹"],
["mega", "M", "10⁶"],
["kilo", "k", "10³"],
["hecto", "h", "10²"],
["deca", "da", "10¹"],
["deci", "d", "10⁻¹"],
["centi", "c", "10⁻²"],
["milli", "m", "10⁻³"],
["micro", "μ", "10⁻⁶"],
["nano", "n", "10⁻⁹"],
["pico", "p", "10⁻¹²"],
["femto", "f", "10⁻¹⁵"]
] },
"4": { title: "Unit conversions and standard conditions", type: "list", rows: [
["Temperature", "temperature (K) = temperature (°C) + 273.15"],
["Volume", "1 dm³ = 1 litre = 1 × 10⁻³ m³ = 1 × 10³ cm³"],
["STP", "273.15 K and 100 kPa"],
["SATP", "298.15 K and 100 kPa"]
] },
"5": { title: "The electromagnetic spectrum", type: "list", rows: [
["Order, increasing energy", "radio waves, microwaves, infrared (IR), visible, ultraviolet (UV), X-rays, γ-rays (wavelength decreases the same way)"],
["Visible light", "about 400 nm (violet) to 700 nm (red)"]
] },
"9": { title: "First ionization energy, electron affinity and electronegativity", note: "Hydrogen to krypton only; the booklet covers all the elements. A blank electron affinity means the booklet gives none.", type: "table", filter: true, columns: ["Element", "First ionization energy / kJ mol⁻¹", "Electron affinity / kJ mol⁻¹", "Electronegativity"], rows: [
["H", 1312, "−73", "2.2"],
["He", 2372, "", "–"],
["Li", 520, "−60", "1.0"],
["Be", 900, "", "1.6"],
["B", 801, "−27", "2.0"],
["C", 1086, "−122", "2.6"],
["N", 1402, "", "3.0"],
["O", 1314, "−141", "3.4"],
["F", 1681, "−328", "4.0"],
["Ne", 2081, "", "–"],
["Na", 496, "−53", "0.9"],
["Mg", 738, "", "1.3"],
["Al", 578, "−42", "1.6"],
["Si", 787, "−134", "1.9"],
["P", 1012, "−72", "2.2"],
["S", 1000, "−200", "2.6"],
["Cl", 1251, "−349", "3.2"],
["Ar", 1520, "", "–"],
["K", 419, "−48", "0.8"],
["Ca", 590, "−2", "1.0"],
["Sc", 633, "−18", "1.4"],
["Ti", 659, "−8", "1.5"],
["V", 651, "−51", "1.6"],
["Cr", 653, "−64", "1.7"],
["Mn", 717, "", "1.6"],
["Fe", 762, "−15", "1.8"],
["Co", 760, "−64", "1.9"],
["Ni", 737, "−112", "1.9"],
["Cu", 745, "−119", "1.9"],
["Zn", 906, "", "1.6"],
["Ga", 579, "−41", "1.8"],
["Ge", 762, "−119", "2.0"],
["As", 944, "−78", "2.2"],
["Se", 941, "−195", "2.6"],
["Br", 1140, "−325", "3.0"],
["Kr", 1351, "", "–"]
] },
"10": { title: "Atomic and ionic radii", note: "Hydrogen to calcium, plus rubidium and strontium. Atomic radii are covalent radii; the booklet gives more ionic radii.", type: "table", filter: true, columns: ["Element", "Atomic radius / 10⁻¹² m", "Ionic radius / 10⁻¹² m (charge)"], rows: [
["H", 32, ""],
["He", 37, ""],
["Li", 130, "76 (1+)"],
["Be", 99, "45 (2+)"],
["B", 84, "27 (3+)"],
["C", 75, "16 (4+)"],
["N", 71, "146 (3−)"],
["O", 64, "140 (2−)"],
["F", 60, "133 (1−)"],
["Ne", 62, ""],
["Na", 160, "102 (1+)"],
["Mg", 140, "72 (2+)"],
["Al", 124, "54 (3+)"],
["Si", 114, "40 (4+)"],
["P", 109, "38 (5+)"],
["S", 104, "184 (2−)"],
["Cl", 100, "181 (1−)"],
["Ar", 101, ""],
["K", 200, "138 (1+)"],
["Ca", 174, "100 (2+)"],
["Rb", 215, ""],
["Sr", 190, ""]
] },
"11": { title: "Covalent or average covalent bond lengths", type: "bonds", unit: "10⁻¹² m", filter: true, rows: [
["H–H", 74],
["N–H", 101],
["Si–H", 148],
["S–H", 134],
["H–F", 92],
["N–N", 146],
["Si–Si", 232],
["S–S", 205],
["H–Cl", 128],
["N–O", 136],
["Si–S", 215],
["S–F", 158],
["H–Br", 141],
["N–Si", 174],
["Si–F", 156],
["S–Cl", 199],
["H–I", 160],
["N–S", 175],
["Si–Cl", 202],
["S–Br", 227],
["N–F", 136],
["Si–Br", 216],
["C–H", 108],
["N–Cl", 197],
["Si–I", 243],
["F–F", 142],
["C–C", 154],
["N–Br", 214],
["F–Cl", 163],
["C–N", 147],
["P–H", 142],
["F–Br", 176],
["C–O", 143],
["O–H", 97],
["P–P", 221],
["F–I", 191],
["C–Si", 185],
["O–O", 148],
["P–S", 210],
["C–P", 184],
["O–Si", 163],
["P–F", 154],
["Cl–Cl", 199],
["C–S", 182],
["O–P", 154],
["P–Cl", 203],
["Cl–Br", 214],
["C–F", 138],
["O–S", 161],
["P–Br", 220],
["Cl–I", 232],
["C–Cl", 177],
["O–F", 142],
["P–I", 247],
["C–Br", 194],
["O–Cl", 170],
["Br–Br", 228],
["C–I", 214],
["Br–I", 247],
["I–I", 267],
["C=C", 134],
["N=N", 125],
["O=O", 121],
["C=N", 130],
["N=O", 114],
["O=S", 143],
["C=O", 122],
["C=S", 156],
["S=S", 189],
["C≡C", 120],
["N≡N", 110],
["C≡N", 116],
["C≡O", 113]
] },
"12": { title: "Bond enthalpies or average bond enthalpies at 298.15 K", type: "bonds", unit: "kJ mol⁻¹", filter: true, rows: [
["H–H", 436],
["N–H", 391],
["Si–H", 323],
["S–H", 364],
["H–F", 567],
["N–N", 158],
["Si–Si", 226],
["S–S", 266],
["H–Cl", 431],
["N–O", 214],
["Si–S", 293],
["S–F", 327],
["H–Br", 366],
["N–F", 278],
["Si–F", 597],
["S–Cl", 271],
["H–I", 298],
["N–Cl", 192],
["Si–Cl", 400],
["S–Br", 218],
["Si–Br", 330],
["C–H", 414],
["O–H", 463],
["Si–I", 234],
["F–F", 159],
["C–C", 346],
["O–O", 144],
["F–Cl", 255],
["C–N", 286],
["O–Si", 466],
["P–H", 322],
["F–Br", 249],
["C–O", 358],
["O–P", 363],
["P–P", 198],
["F–I", 280],
["C–Si", 307],
["O–F", 191],
["P–F", 490],
["C–P", 264],
["O–Cl", 206],
["P–Cl", 322],
["Cl–Cl", 242],
["C–S", 289],
["O–Br", 201],
["P–Br", 264],
["Cl–Br", 219],
["C–F", 492],
["O–I", 201],
["P–I", 184],
["Cl–I", 211],
["C–Cl", 324],
["C–Br", 285],
["Br–Br", 193],
["C–I", 228],
["Br–I", 178],
["I–I", 151],
["C=C", 614],
["N=N", 470],
["O=O", 498],
["C=N", 615],
["N=O", 587],
["O=S", 522],
["C=O", 804],
["C=S", 536],
["S=S", 429],
["C≡C", 839],
["N≡N", 945],
["C≡N", 890],
["C≡O", 1077]
] },
"13": { title: "Thermodynamic data (selected compounds)", note: "Enthalpy of formation only; the booklet also gives ΔGf° and S° for most of these.", type: "table", filter: true, columns: ["Substance", "Formula", "State", "ΔHf° / kJ mol⁻¹"], rows: [
["methane", "CH₄", "g", "−74"],
["ethane", "C₂H₆", "g", "−84"],
["propane", "C₃H₈", "g", "−105"],
["butane", "C₄H₁₀", "g", "−126"],
["pentane", "C₅H₁₂", "l", "−173"],
["hexane", "C₆H₁₄", "l", "−199"],
["ethene", "C₂H₄", "g", "+52"],
["propene", "C₃H₆", "g", "+20"],
["but-1-ene", "C₄H₈", "g", "+0.1"],
["cis-but-2-ene", "C₄H₈", "g", "−7"],
["trans-but-2-ene", "C₄H₈", "g", "−11"],
["ethyne", "C₂H₂", "g", "+228"],
["propyne", "C₃H₄", "g", "+185"],
["buta-1,3-diene", "C₄H₆", "g", "+110"],
["cyclohexane", "C₆H₁₂", "l", "−156"],
["benzene", "C₆H₆", "l", "+49"],
["methylbenzene", "C₆H₅CH₃", "l", "+12"],
["ethylbenzene", "C₆H₅CH₂CH₃", "l", "−12"],
["phenylethene", "C₆H₅CHCH₂", "l", "+104"],
["chloromethane", "CH₃Cl", "g", "−82"],
["dichloromethane", "CH₂Cl₂", "l", "−124"],
["trichloromethane", "CHCl₃", "l", "−134"],
["bromomethane", "CH₃Br", "g", "−36"],
["iodomethane", "CH₃I", "l", "−14"],
["chloroethane", "C₂H₅Cl", "g", "−137"],
["bromoethane", "C₂H₅Br", "l", "−90"],
["chlorobenzene", "C₆H₅Cl", "l", "+11"],
["methanol", "CH₃OH", "l", "−239"],
["ethanol", "C₂H₅OH", "l", "−278"],
["phenol", "C₆H₅OH", "s", "−165"],
["methanal", "HCHO", "g", "−109"],
["ethanal", "CH₃CHO", "g", "−166"],
["propanone", "(CH₃)₂CO", "l", "−248"],
["methanoic acid", "HCOOH", "l", "−425"],
["ethanoic acid", "CH₃COOH", "l", "−484"],
["benzoic acid", "C₆H₅COOH", "s", "−385"],
["methylamine", "CH₃NH₂", "g", "−23"],
["water", "H₂O", "l", "−286"],
["steam", "H₂O", "g", "−242"],
["carbon monoxide", "CO", "g", "−111"],
["carbon dioxide", "CO₂", "g", "−394"],
["hydrogen bromide", "HBr", "g", "−36"],
["hydrogen chloride", "HCl", "g", "−92"],
["hydrogen fluoride", "HF", "g", "−273"],
["hydrogen iodide", "HI", "g", "+26"]
] },
"14": { title: "Enthalpies of combustion", note: "At 298.15 K and 100 kPa.", type: "table", filter: true, columns: ["Substance", "Formula", "State", "ΔHc° / kJ mol⁻¹"], rows: [
["benzaldehyde", "C₆H₅CHO", "l", "−3525"],
["benzene", "C₆H₆", "l", "−3268"],
["benzoic acid", "C₆H₅COOH", "s", "−3228"],
["buta-1,3-diene", "C₄H₆", "g", "−2541"],
["butan-1-ol", "C₄H₉OH", "l", "−2676"],
["butane", "C₄H₁₀", "g", "−2878"],
["carbon (graphite)", "C", "s", "−394"],
["carbon monoxide", "CO", "g", "−283"],
["chloroethane", "C₂H₅Cl", "g", "−1413"],
["cyclohexane", "C₆H₁₂", "l", "−3920"],
["cyclohexanol", "C₆H₁₁OH", "s", "−3728"],
["ethanal", "CH₃CHO", "g", "−1167"],
["ethanamide", "CH₃CONH₂", "s", "−1186"],
["ethane", "C₂H₆", "g", "−1561"],
["ethanedioic acid", "(COOH)₂", "s", "−243"],
["ethanoic acid", "CH₃COOH", "l", "−874"],
["ethanol", "C₂H₅OH", "l", "−1367"],
["ethene", "C₂H₄", "g", "−1411"],
["ethoxyethane", "(C₂H₅)₂O", "l", "−2724"],
["ethyl ethanoate", "CH₃COOC₂H₅", "l", "−2238"],
["ethyne", "C₂H₂", "g", "−1301"],
["glucose", "C₆H₁₂O₆", "s", "−2803"],
["hexane", "C₆H₁₄", "l", "−4163"],
["hydrogen", "H₂", "g", "−286"],
["iodoethane", "C₂H₅I", "l", "−1463"],
["methanal", "HCHO", "g", "−571"],
["methane", "CH₄", "g", "−891"],
["methanoic acid", "HCOOH", "l", "−255"],
["methanol", "CH₃OH", "l", "−726"],
["methylamine", "CH₃NH₂", "g", "−1086"],
["methylbenzene", "C₆H₅CH₃", "l", "−3910"],
["naphthalene", "C₁₀H₈", "s", "−5156"],
["nitrobenzene", "C₆H₅NO₂", "l", "−3088"],
["octane", "C₈H₁₈", "l", "−5470"],
["pentan-3-one", "(C₂H₅)₂CO", "l", "−3100"],
["pentane", "C₅H₁₂", "l", "−3509"],
["phenol", "C₆H₅OH", "s", "−3053"],
["phenylamine", "C₆H₅NH₂", "l", "−3393"],
["phenylethanone", "CH₃COC₆H₅", "l", "−4149"],
["propan-1-ol", "C₃H₇OH", "l", "−2021"],
["propane", "C₃H₈", "g", "−2219"],
["propanone", "(CH₃)₂CO", "l", "−1790"],
["sucrose", "C₁₂H₂₂O₁₁", "s", "−5640"],
["sulfur", "S", "s", "−297"],
["trichloromethane", "CHCl₃", "l", "−473"],
["urea", "CO(NH₂)₂", "s", "−633"]
] },
"15": { title: "Colour wheel with wavelengths of the visible spectrum", type: "table", columns: ["Colour", "Wavelength / nm"], rows: [
["violet", "400–424"],
["blue", "424–491"],
["green", "491–575"],
["yellow", "575–585"],
["orange", "585–647"],
["red", "647–700"]
] },
"16": { title: "Lattice enthalpies at 298.15 K (experimental values)", note: "ΔH°lattice for MX(s) → M⁺(g) + X⁻(g), an endothermic process, in kJ mol⁻¹.", type: "table", filter: true, columns: ["Substance", "ΔH°lattice / kJ mol⁻¹"], rows: [
["LiF", 1049],
["LiCl", 864],
["LiBr", 820],
["LiI", 764],
["NaF", 930],
["NaCl", 790],
["NaBr", 754],
["NaI", 705],
["KF", 829],
["KCl", 720],
["KBr", 691],
["KI", 650],
["RbF", 795],
["RbCl", 695],
["RbBr", 668],
["RbI", 632],
["CsF", 759],
["CsCl", 670],
["CsBr", 647],
["CsI", 613],
["CaF₂", 2651],
["BeCl₂", 3033],
["MgCl₂", 2540],
["CaCl₂", 2271],
["SrCl₂", 2170],
["BaCl₂", 2069],
["MgO", 3791],
["CaO", 3401],
["SrO", 3223],
["BaO", 3054],
["CuCl₂", 2824],
["AgF", 974],
["AgCl", 918],
["AgBr", 905],
["AgI", 892]
] },
"17": { title: "Triangular bonding diagram (van Arkel–Ketelaar triangle)", type: "list", page: "bonding-triangle", rows: [
["Axes", "average electronegativity (χa + χb)/2 along the bottom, from 0.79 to 4.0; electronegativity difference Δχ = |χa − χb| up the side"],
["Corners", "ionic (top), metallic (bottom left), covalent (bottom right); polar covalent in between"],
["Scale", "% covalent / % ionic character: 100/0, 75/25, 50/50, 25/75, 8/92"]
] },
"18": { title: "Acid–base indicators", type: "table", columns: ["Indicator", "pKa", "pH range", "Colour in acid", "Colour in alkali"], rows: [
["methyl orange", "3.7", "3.1–4.4", "red", "yellow"],
["bromophenol blue", "4.2", "3.0–4.6", "yellow", "blue"],
["bromocresol green", "4.7", "4.0–5.6", "yellow", "blue"],
["methyl red", "5.1", "4.4–6.2", "red", "yellow"],
["bromothymol blue", "7.0", "6.0–7.6", "yellow", "blue"],
["phenol red", "7.9", "6.4–8.0", "yellow", "red"],
["phenolphthalein", "9.6", "8.0–10.0", "colourless", "pink"]
] },
"19": { title: "Standard reduction potentials at 298.15 K", note: "Oxidized species + electrons ⇌ reduced species. The more positive E°, the stronger the oxidizing agent on the left.", type: "table", filter: true, columns: ["Half-equation", "E° / V"], rows: [
["Li⁺(aq) + e⁻ ⇌ Li(s)", "−3.04"],
["K⁺(aq) + e⁻ ⇌ K(s)", "−2.93"],
["Ca²⁺(aq) + 2e⁻ ⇌ Ca(s)", "−2.87"],
["Na⁺(aq) + e⁻ ⇌ Na(s)", "−2.71"],
["Mg²⁺(aq) + 2e⁻ ⇌ Mg(s)", "−2.37"],
["Al³⁺(aq) + 3e⁻ ⇌ Al(s)", "−1.66"],
["Mn²⁺(aq) + 2e⁻ ⇌ Mn(s)", "−1.18"],
["H₂O(l) + e⁻ ⇌ ½H₂(g) + OH⁻(aq)", "−0.83"],
["Zn²⁺(aq) + 2e⁻ ⇌ Zn(s)", "−0.76"],
["Fe²⁺(aq) + 2e⁻ ⇌ Fe(s)", "−0.45"],
["Ni²⁺(aq) + 2e⁻ ⇌ Ni(s)", "−0.26"],
["Sn²⁺(aq) + 2e⁻ ⇌ Sn(s)", "−0.14"],
["Pb²⁺(aq) + 2e⁻ ⇌ Pb(s)", "−0.13"],
["H⁺(aq) + e⁻ ⇌ ½H₂(g)", "0.00"],
["Cu²⁺(aq) + e⁻ ⇌ Cu⁺(aq)", "+0.15"],
["SO₄²⁻(aq) + 4H⁺(aq) + 2e⁻ ⇌ H₂SO₃(aq) + H₂O(l)", "+0.17"],
["Cu²⁺(aq) + 2e⁻ ⇌ Cu(s)", "+0.34"],
["½O₂(g) + H₂O(l) + 2e⁻ ⇌ 2OH⁻(aq)", "+0.40"],
["Cu⁺(aq) + e⁻ ⇌ Cu(s)", "+0.52"],
["½I₂(s) + e⁻ ⇌ I⁻(aq)", "+0.54"],
["Fe³⁺(aq) + e⁻ ⇌ Fe²⁺(aq)", "+0.77"],
["Ag⁺(aq) + e⁻ ⇌ Ag(s)", "+0.80"],
["½Br₂(l) + e⁻ ⇌ Br⁻(aq)", "+1.09"],
["½O₂(g) + 2H⁺(aq) + 2e⁻ ⇌ H₂O(l)", "+1.23"],
["Cr₂O₇²⁻(aq) + 14H⁺(aq) + 6e⁻ ⇌ 2Cr³⁺(aq) + 7H₂O(l)", "+1.36"],
["½Cl₂(g) + e⁻ ⇌ Cl⁻(aq)", "+1.36"],
["MnO₄⁻(aq) + 8H⁺(aq) + 5e⁻ ⇌ Mn²⁺(aq) + 4H₂O(l)", "+1.51"],
["½F₂(g) + e⁻ ⇌ F⁻(aq)", "+2.87"]
] },
"20": { title: "Infrared data", note: "Characteristic ranges for infrared absorption due to stretching vibrations in organic molecules.", type: "table", filter: true, columns: ["Bond", "Types of organic molecules", "Wavenumber / cm⁻¹", "Intensity"], rows: [
["C–I", "iodoalkanes", "490–620", "strong"],
["C–Br", "bromoalkanes", "500–600", "strong"],
["C–Cl", "chloroalkanes", "600–800", "strong"],
["C–F", "fluoroalkanes", "1000–1400", "strong"],
["C–O", "alcohols, esters, ethers", "1050–1410", "strong"],
["C=C", "alkenes", "1620–1680", "medium-weak; multiple bands"],
["C=O", "aldehydes, ketones, carboxylic acids and esters", "1700–1750", "strong"],
["C≡C", "alkynes", "2100–2260", "variable"],
["O–H", "carboxylic acids (with hydrogen bonding)", "2500–3000", "strong, very broad"],
["C–H", "alkanes, alkenes, arenes", "2850–3090", "strong"],
["O–H", "alcohols and phenols (with hydrogen bonding)", "3200–3600", "strong, broad"],
["N–H", "primary amines", "3300–3500", "medium; two bands"]
] },
"22": { title: "Mass spectral fragments lost", type: "table", columns: ["Mass lost (Mr)", "Possible neutral fragment lost"], rows: [
["15", "•CH₃"],
["17", "•OH"],
["18", "H₂O"],
["28", "CH₂=CH₂, CO"],
["29", "•CH₂CH₃, •CHO"],
["31", "•OCH₃"],
["45", "•COOH"]
] }
  },
  // sections of the booklet this panel doesn't reproduce
  notShown: { "6": "Names of the elements", "7": "The periodic table", "8": "Melting points and boiling points of the elements", "21": "¹H NMR data", "23": "Uncertainties" }
};
;
/* ---- js/study.js ---- */
// Study tools, on top of the book: a "Check yourself" question for each page, a glossary, search and progress
// marks on the contents page, and a Data booklet panel that opens from the "§N" links under captions.
// Data lives in js/data-quiz.js, js/data-glossary.js and js/data-booklet.js. Loaded after js/engine.js and
// before Book.boot(); it follows the book through Book.on("ready" | "show" | "ui" | "contents").
// Progress (pages visited, question results) is kept in localStorage when it is available, and is simply
// forgotten for the session when it isn't (private windows, file:// in some browsers).

const Study = (() => {
  const $ = id => document.getElementById(id);
  const TEST = /[?&]test\b/.test(location.search);          // the self-test must not touch or read saved progress
  const KEY = "not-to-scale-progress-v1";
  let progress = { visited: {}, quiz: {} };
  if (!TEST) {
    try { const saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && saved.visited && saved.quiz) progress = saved; } catch (e) { /* no storage: keep it in memory */ }
  }
  const save = () => { if (TEST) return; try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ } };

  const pages = () => Book.pages;
  const pageById = id => pages().find(p => p.id === id);
  const currentPage = () => pages()[Book.debug.index()];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------- panels (full-screen overlays like Contents and About) ----------
  function panel(id, title) {
    const s = make("section", "contents study-panel");
    s.id = id; s.hidden = true; s.setAttribute("aria-label", title);
    const inner = make("div", "contents-inner");
    inner.appendChild(make("h2", "", title));
    const body = make("div", "sp-body");
    const close = make("button", "nav-btn sp-close", "Close");
    close.type = "button";
    close.addEventListener("click", () => closePanel(s));
    inner.append(body, close);
    s.appendChild(inner);
    document.body.appendChild(s);
    return { el: s, body, heading: inner.firstChild };
  }
  function openPanel(p, focusEl) {
    p.el._ret = document.activeElement;
    p.el.hidden = false;
    $("page").setAttribute("inert", ""); $("nav").setAttribute("inert", "");
    p.el.scrollTop = 0;
    (focusEl || p.el.querySelector("button, input")).focus();
  }
  function closePanel(p) {
    const s = p.el || p;
    s.hidden = true;
    if (s._onClose) s._onClose();
    if (!document.querySelector(".contents:not([hidden])") && Book.debug.started()) { $("page").removeAttribute("inert"); $("nav").removeAttribute("inert"); }
    const r = s._ret;
    if (r && document.contains(r) && !r.closest("[inert]")) r.focus();
  }
  // Leave every overlay (including Contents and About) and turn to a page.
  function goToPage(id) {
    document.querySelectorAll(".contents").forEach(s => { s.hidden = true; });
    $("page").removeAttribute("inert"); $("nav").removeAttribute("inert");
    Book.goTo(id);
  }
  const pageLink = (id, label) => {
    const p = pageById(id), b = make("button", "sp-link", label || (p ? p.title : id));
    b.type = "button";
    b.addEventListener("click", () => goToPage(id));
    return b;
  };

  // Escape closes the top study panel; the arrow keys must not turn pages behind an open panel.
  document.addEventListener("keydown", e => {
    const open = document.querySelectorAll(".study-panel:not([hidden])");
    if (!open.length) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closePanel(open[open.length - 1]); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopImmediatePropagation();
  }, true);

  // ---------- Check yourself ----------
  let quiz = null;
  function openQuiz() {
    const p = currentPage(), item = QuizData[p.id];
    if (!item) return;
    quiz = quiz || panel("quiz", "Check yourself");
    const b = quiz.body;
    b.innerHTML = "";
    b.appendChild(make("p", "sp-sub", p.title));
    b.appendChild(make("p", "quiz-q", item.q));
    const opts = make("div", "quiz-opts");
    const feedback = make("div", "quiz-feedback");
    feedback.setAttribute("aria-live", "polite");
    let done = false;
    const buttons = item.o.map((text, i) => {
      const btn = make("button", "quiz-opt");
      btn.type = "button";
      btn.innerHTML = '<span class="quiz-letter">' + "ABCD"[i] + "</span><span>" + esc(text) + "</span>";
      btn.addEventListener("click", () => answer(i));
      opts.appendChild(btn);
      return btn;
    });
    function answer(i) {
      if (done) return;
      done = true;
      const right = i === item.a;
      buttons.forEach((btn, k) => { btn.disabled = true; if (k === item.a) btn.classList.add("right"); else if (k === i) btn.classList.add("wrong"); });
      if (right) progress.quiz[p.id] = "right"; else if (progress.quiz[p.id] !== "right") progress.quiz[p.id] = "wrong";
      save(); refreshMarks();
      feedback.innerHTML = "<p><strong>" + (right ? "Correct." : "Not quite. The answer is " + "ABCD"[item.a] + ".") + "</strong> " + esc(item.why) + "</p>";
      const row = make("div", "quiz-row");
      const retry = make("button", "nav-btn", "Try it again");
      retry.type = "button"; retry.addEventListener("click", openQuiz);
      row.appendChild(retry);
      const idx = Book.debug.index();
      if (idx + 1 < pages().length) {
        const next = make("button", "nav-btn", "Next page →");
        next.type = "button"; next.addEventListener("click", () => goToPage(pages()[idx + 1].id));
        row.appendChild(next);
      }
      feedback.appendChild(row);
    }
    b.append(opts, feedback);
    if (quiz.el.hidden) openPanel(quiz, buttons[0]); else buttons[0].focus();
  }
  document.addEventListener("keydown", e => {   // a–d or 1–4 pick an option while the question is open
    if (!quiz || quiz.el.hidden || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input")) return;
    const i = "abcd".indexOf(e.key.toLowerCase()), j = "1234".indexOf(e.key);
    const k = i >= 0 ? i : j;
    if (k >= 0) { const btn = quiz.body.querySelectorAll(".quiz-opt")[k]; if (btn && !btn.disabled) btn.click(); }
  });

  // ---------- Glossary ----------
  let glossary = null;
  function openGlossary() {
    if (!glossary) {
      glossary = panel("glossary", "Glossary");
      const search = make("input", "sp-search"); search.type = "search"; search.placeholder = "Search terms…"; search.setAttribute("aria-label", "Search the glossary");
      const count = make("p", "sp-sub");
      const list = make("dl", "gl-list");
      const items = GlossaryData.slice().sort((a, b) => a[0].localeCompare(b[0])).map(([term, def, ids]) => {
        const dt = make("dt", "", term), dd = make("dd", "", def);
        const links = make("div", "gl-links");
        ids.filter(pageById).forEach(id => links.appendChild(pageLink(id)));
        dd.appendChild(links);
        list.append(dt, dd);
        return { dt, dd, text: (term + " " + def).toLowerCase() };
      });
      const filter = () => {
        const q = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let n = 0;
        items.forEach(it => { const show = q.every(w => it.text.includes(w)); it.dt.hidden = it.dd.hidden = !show; if (show) n++; });
        count.textContent = n === items.length ? items.length + " terms" : n + " of " + items.length + " terms";
      };
      search.addEventListener("input", filter);
      glossary.body.append(search, count, list);
      filter();
      glossary.search = search;
    }
    openPanel(glossary, glossary.search);
  }

  // ---------- Data booklet ----------
  let booklet = null, bookletView = null;
  const sectionKeys = () => [...Object.keys(BookletData.sections), ...Object.keys(BookletData.notShown)].sort((a, b) => a - b);
  function openBooklet(sec) {
    if (!booklet) {
      booklet = panel("booklet", "Data booklet");
      const intro = make("p", "sp-sub", "The IB Chemistry data booklet (first assessment 2025). Pick a section; the numbers match the § notes under the captions.");
      const chips = make("div", "bk-chips");
      sectionKeys().forEach(k => {
        const have = !!BookletData.sections[k], b = make("button", "bk-chip" + (have ? "" : " missing"), "§" + k);
        b.type = "button"; b.dataset.sec = k;
        b.title = have ? BookletData.sections[k].title : BookletData.notShown[k] + " (not reproduced here)";
        b.addEventListener("click", () => showSection(k));
        chips.appendChild(b);
      });
      bookletView = make("div", "bk-view");
      booklet.body.append(intro, chips, bookletView);
    }
    showSection(String(sec || booklet.last || 1));
    openPanel(booklet, booklet.el.querySelector(".bk-chip.active") || undefined);
  }
  function showSection(k) {
    booklet.last = k;
    booklet.body.querySelectorAll(".bk-chip").forEach(c => c.classList.toggle("active", c.dataset.sec === k));
    const v = bookletView, s = BookletData.sections[k];
    v.innerHTML = "";
    if (!s) {
      v.appendChild(make("h3", "", "§" + k + " " + (BookletData.notShown[k] || "")));
      v.appendChild(make("p", "", "This section of the booklet isn't reproduced here. Look it up in your copy of the data booklet."));
      return;
    }
    v.appendChild(make("h3", "", "§" + k + " " + s.title));
    if (s.note) v.appendChild(make("p", "sp-sub", s.note));
    if (s.page && pageById(s.page)) v.appendChild(pageLink(s.page, "See the page: " + pageById(s.page).title));
    let filterInput = null, holder = make("div", "bk-holder");
    if (s.filter) {
      filterInput = make("input", "sp-search"); filterInput.type = "search"; filterInput.placeholder = "Filter this table…"; filterInput.setAttribute("aria-label", "Filter this table");
      v.appendChild(filterInput);
    }
    v.appendChild(holder);
    const draw = () => {
      const q = filterInput ? filterInput.value.trim().toLowerCase() : "";
      const rows = s.rows.filter(r => !q || r.join(" ").toLowerCase().includes(q));
      holder.innerHTML = "";
      if (s.type === "list") {
        const dl = make("dl", "bk-list");
        rows.forEach(([a, b]) => { dl.append(make("dt", "", a), make("dd", "", b)); });
        holder.appendChild(dl);
      } else {
        const per = s.type === "bonds" ? 3 : 1, cols = s.type === "bonds" ? ["Bond", s.unit] : s.columns;
        const t = make("table", "bk-table"), head = t.createTHead().insertRow();
        for (let g = 0; g < per; g++) cols.forEach(c => head.appendChild(make("th", "", c)));
        const body = t.createTBody();
        for (let i = 0; i < rows.length; i += per) {
          const tr = body.insertRow();
          for (let g = 0; g < per; g++) {
            const r = rows[i + g];
            cols.forEach((_, c) => tr.insertCell().textContent = r ? r[c] : "");
          }
        }
        const wrap = make("div", "bk-scroll"); wrap.appendChild(t);
        holder.appendChild(wrap);
        if (!rows.length) holder.appendChild(make("p", "sp-sub", "Nothing matches."));
      }
    };
    if (filterInput) filterInput.addEventListener("input", draw);
    draw();
  }
  // "§N" links in captions
  document.addEventListener("click", e => {
    const link = e.target.closest && e.target.closest(".bk-link");
    if (link) openBooklet(link.dataset.sec);
  });

  // ---------- Contents: search, progress marks, shortcuts ----------
  function refreshMarks() {
    const items = document.querySelectorAll("#tocBody .toc-item");
    let visited = 0, right = 0;
    items.forEach(b => {
      const p = pages()[+b.dataset.index];
      if (!p) return;
      const li = b.parentNode;
      let mark = li.querySelector(".toc-mark");
      if (!mark) { mark = make("span", "toc-mark"); li.insertBefore(mark, b); }
      const q = progress.quiz[p.id], v = !!progress.visited[p.id];
      mark.textContent = q === "right" ? "✓" : v ? "●" : "";
      mark.className = "toc-mark" + (q === "right" ? " right" : v ? " seen" : "");
      mark.title = q === "right" ? "Visited, question answered correctly" : v ? "Visited" : "";
      if (v) visited++; if (q === "right") right++;
    });
    const sum = $("tocSummary");
    if (sum) sum.textContent = visited + " of " + pages().length + " pages visited · " + right + " questions answered correctly";
  }
  function buildContentsTools() {
    const tools = make("div", "toc-tools");
    const search = make("input", "sp-search"); search.type = "search"; search.placeholder = "Search topics or syllabus codes (e.g. R2.3 or acid)…"; search.setAttribute("aria-label", "Search the contents");
    const row = make("div", "toc-buttons");
    const g = make("button", "nav-btn", "Glossary"), d = make("button", "nav-btn", "Data booklet");
    g.type = d.type = "button";
    g.addEventListener("click", openGlossary); d.addEventListener("click", () => openBooklet());
    row.append(g, d);
    const sum = make("p", "sp-sub"); sum.id = "tocSummary";
    const reset = make("button", "sp-link", "Clear my progress"); reset.type = "button";
    reset.addEventListener("click", () => { if (confirm("Forget which pages you've visited and your question results?")) { progress = { visited: {}, quiz: {} }; save(); refreshMarks(); } });
    sum.appendChild(document.createTextNode(""));
    tools.append(search, row, sum, reset);
    const body = $("tocBody");
    body.parentNode.insertBefore(tools, body);
    search.addEventListener("input", () => {
      const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      body.querySelectorAll("li").forEach(li => { li.hidden = !words.every(w => (li.dataset.search || li.textContent.toLowerCase()).includes(w)); });
      body.querySelectorAll("h3").forEach(h => { const ul = h.nextElementSibling; h.hidden = ul.hidden = ![...ul.children].some(li => !li.hidden); });
    });
  }

  // ---------- wiring ----------
  let quizBtn = null;
  Book.on("ready", () => {
    quizBtn = make("button", "nav-btn", "Check yourself");
    quizBtn.id = "quizBtn"; quizBtn.type = "button"; quizBtn.hidden = true;
    quizBtn.addEventListener("click", openQuiz);
    $("nav").insertBefore(quizBtn, $("nextBtn"));
    buildContentsTools();
    refreshMarks();
  });
  Book.on("show", i => { const p = pages()[i]; if (p) { progress.visited[p.id] = 1; save(); refreshMarks(); } });
  Book.on("ui", () => {
    if (!quizBtn) return;
    const p = currentPage();
    quizBtn.hidden = !(Book.debug.started() && Book.debug.isFinal() && p && QuizData[p.id]);
    quizBtn.disabled = Book.debug.busy();
  });
  Book.on("contents", refreshMarks);

  return { openQuiz, openGlossary, openBooklet, panel, openPanel, closePanel, progress: () => progress };
})();
;
/* ---- js/egg.js ---- */
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
;
/* ---- pages/00-planned.js ---- */
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
    ["Build a molecule", "S2.2.1–4"],
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
    ["Pick an acid: see its pH", "R3.1.4–6"],
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
;
/* ---- pages/01-hydrogen.js ---- */
// Page 1: the hydrogen atom.
// atom --tap--> zoomed --back--> cloud --next--> world (a person in a park, the atom far too small to see)
// Everything the engine needs to know about this page is in the object at the bottom.

(() => {
  const CENTER = "470 240";   // the proton / the hand, in scene coordinates
  const NS = "http://www.w3.org/2000/svg";

  // ---------- Drawing ----------
  const svg = `
    <defs>
      <clipPath id="worldClip"><rect x="0" y="0" width="1000" height="480" rx="22"/></clipPath>
    </defs>

    <!-- The real world: starts hugely magnified on the hand, zooms out to normal -->
    <g clip-path="url(#worldClip)">
      <g id="world">
        <rect x="-500" y="-500" width="2000" height="1000" fill="#CFE8FF"/>
        <circle cx="880" cy="80" r="42" fill="#FFD75E"/>
        <ellipse cx="200" cy="90" rx="70" ry="22" fill="#fff"/>
        <ellipse cx="245" cy="78" rx="45" ry="20" fill="#fff"/>
        <ellipse cx="640" cy="60" rx="60" ry="18" fill="#fff"/>
        <ellipse cx="260" cy="440" rx="380" ry="120" fill="#A9D98C"/>
        <ellipse cx="760" cy="450" rx="330" ry="100" fill="#8CCB74"/>
        <rect x="-500" y="435" width="2000" height="500" fill="#6DB35A"/>
        <!-- tree -->
        <rect x="815" y="230" width="30" height="210" fill="#8A5A3B"/>
        <circle cx="830" cy="170" r="115" fill="#3E9B57"/>
        <circle cx="770" cy="215" r="70" fill="#3E9B57"/>
        <!-- person (bald, on purpose) -->
        <rect x="360" y="290" width="22" height="145" rx="8" fill="#2B2F4A"/>
        <rect x="388" y="290" width="22" height="145" rx="8" fill="#2B2F4A"/>
        <rect x="352" y="424" width="34" height="14" rx="7" fill="#1B1A22"/>
        <rect x="384" y="424" width="34" height="14" rx="7" fill="#1B1A22"/>
        <rect x="350" y="160" width="70" height="145" rx="24" fill="#8B5CF6"/>
        <circle cx="385" cy="118" r="32" fill="#F1B98A"/>
        <path d="M405 178 Q440 205 470 240" fill="none" stroke="#8B5CF6" stroke-width="26" stroke-linecap="round"/>
        <circle cx="470" cy="240" r="14" fill="#F1B98A"/>
      </g>
    </g>

    <!-- The atom (#atomLayer zooms out to the world, #cam zooms in to the proton) -->
    <g id="atomLayer">
      <g id="cam">
        <circle class="orbit fade" id="orbit" cx="470" cy="240" r="160"/>
        <g id="cloud"></g>
        <circle class="proton fade" id="proton" cx="470" cy="240" r="34"/>
        <g id="electronArm">
          <circle class="electron fade" id="electron" cx="630" cy="240" r="8"/>
        </g>
        <circle class="tap-ring" id="tapRing" cx="470" cy="240" r="56" opacity="0"/>
        <circle class="hit" id="atomHit" cx="470" cy="240" r="185"/>
      </g>
      <g id="cloudArrows"></g>
    </g>

    <!-- The "it's really small" arrow -->
    <g id="pointer">
      <text class="pointer-label fade" id="pointerLabel" x="600" y="128" text-anchor="middle">it's really small</text>
      <path class="pointer-line fade" id="pointerLine" d="M 560 145 Q 545 200 496 224"/>
      <polygon class="pointer-head fade" id="pointerHead" points="486,229 503.5,228.3 497.3,215.7"/>
    </g>`;

  // ---------- The electron cloud: dots scattered like a 1s orbital, seen flat ----------
  // Distance from the proton follows r^2 * e^(-2r/a); the direction is random in 3D, then squashed to 2D.
  function buildCloud(ctx) {
    let seed = 7; // fixed seed so the cloud always looks the same
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = 80; // cloud size (the dotted orbit is a bit bigger, on purpose)
    const layer = ctx.$("#cloud");
    const dots = [];
    while (dots.length < 420) {
      const r = -(a / 2) * (Math.log(1 - rand()) + Math.log(1 - rand()) + Math.log(1 - rand()));
      const cosT = 2 * rand() - 1, sinT = Math.sqrt(1 - cosT * cosT), phi = 2 * Math.PI * rand();
      const x = r * sinT * Math.cos(phi), y = r * sinT * Math.sin(phi);
      if (Math.abs(y) > 225 || Math.abs(x) > 440) continue;
      const dot = document.createElementNS(NS, "circle");
      const startAngle = rand() * Math.PI * 2;
      const sx = 470 + 160 * Math.cos(startAngle), sy = 240 + 160 * Math.sin(startAngle);
      dot.setAttribute("class", "cloud-dot");
      dot.setAttribute("r", (1.6 + rand() * 1.8).toFixed(2));
      dot.setAttribute("cx", sx); // starts on the orbit ring
      dot.setAttribute("cy", sy);
      dot.style.opacity = 0;
      layer.appendChild(dot);
      dots.push({ dot, sx, sy, x: 470 + x, y: 240 + y, alpha: 0.3 + rand() * 0.35 });
    }
    ctx.data.cloudDots = dots;
  }

  // ---------- "It could be here... or here..." arrows ----------
  // Arrows point at real dots in the cloud, one at a time, faster and faster.
  const SPOTS = [ // [angle in degrees, distance from the proton, label]
    [200, 120, "it could be here"],
    [330, 130, "or here"],
    [110, 95, "or here"],
    [20, 150, "or here"],
    [250, 100, "or here"],
    [160, 170, "or here"]
  ];
  const GAPS = [1.6, 1.2, 0.9, 0.7, 0.5, 0.4]; // seconds before each arrow

  function buildArrows(ctx) {
    const d = ctx.data;
    const layer = ctx.$("#cloudArrows");
    layer.innerHTML = "";
    gsap.set(layer, { opacity: 1 });

    const tl = gsap.timeline({ paused: true });
    let time = 0, prev = null;
    SPOTS.forEach(([deg, dist, text], i) => {
      const rad = deg * Math.PI / 180;
      const wx = 470 + dist * Math.cos(rad), wy = 240 + dist * Math.sin(rad);
      // pick the real cloud dot closest to where we want to point
      const best = d.cloudDots.reduce((b, c) => (Math.hypot(c.x - wx, c.y - wy) < Math.hypot(b.x - wx, b.y - wy) ? c : b));
      const tx = best.x, ty = best.y;
      const len = Math.hypot(tx - 470, ty - 240) || 1;
      const ux = (tx - 470) / len, uy = (ty - 240) / len;         // direction pointing away from the proton
      const sx = tx + ux * 88, sy = ty + uy * 88;                  // where the arrow starts (label end)
      const ex = tx + ux * 10, ey = ty + uy * 10;                  // the tip, just short of the dot
      const bx = ex + ux * 14, by = ey + uy * 14;                  // base of the arrowhead
      const px = -uy * 6.5, py = ux * 6.5;

      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "cloud-arrow");
      g.style.opacity = 0;
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", sx); line.setAttribute("y1", sy);
      line.setAttribute("x2", bx); line.setAttribute("y2", by);
      const lineLen = Math.hypot(bx - sx, by - sy);
      line.setAttribute("stroke-dasharray", lineLen);
      line.setAttribute("stroke-dashoffset", lineLen);
      const head = document.createElementNS(NS, "polygon");
      head.setAttribute("points", ex + "," + ey + " " + (bx + px) + "," + (by + py) + " " + (bx - px) + "," + (by - py));
      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "arrow-label");
      label.setAttribute("x", sx + ux * 12);
      label.setAttribute("y", sy + uy * 12 + (uy > 0.4 ? 18 : uy < -0.4 ? -4 : 7));
      label.setAttribute("text-anchor", ux < -0.4 ? "end" : ux > 0.4 ? "start" : "middle");
      label.textContent = text;
      g.append(line, head, label);

      const blink = document.createElementNS(NS, "circle"); // the electron, "found" here for a moment
      blink.setAttribute("class", "cloud-blink");
      blink.setAttribute("cx", tx); blink.setAttribute("cy", ty); blink.setAttribute("r", 7);
      blink.style.opacity = 0;
      layer.append(blink, g);

      time += GAPS[i];
      tl.call(() => { if (!d.arrowsSkipping) Sound.pop(); }, null, time)
        .to(g, { opacity: 1, duration: 0.25 }, time)
        .to(line, { strokeDashoffset: 0, duration: 0.3, ease: "power1.out" }, time)
        .fromTo(blink, { opacity: 0, scale: 0, svgOrigin: tx + " " + ty }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, time + 0.1);
      if (prev) {
        tl.to(prev.g, { opacity: 0.5, duration: 0.3 }, time)
          .to(prev.blink, { opacity: 0, duration: 0.3 }, time);
      }
      prev = { g, blink };
    });
    tl.to(prev.blink, { opacity: 0, duration: 0.5 }, time + 1.2);
    d.arrowsTl = ctx.track(tl);
  }

  function finishArrows(ctx) {
    const d = ctx.data;
    if (!d.arrowsTl) return;
    d.arrowsSkipping = true;
    d.arrowsTl.totalProgress(1);
    d.arrowsSkipping = false;
  }

  // ---------- Transitions ----------
  const tapAtom = {
    hotspot: "atom", to: "zoomed", sound: "zwoop", captionOut: 0, captionAt: 1.3,
    before: ctx => { ctx.data.tapped = true; },
    play: () => Camera.zoomTo("#cam", { scale: 5, origin: CENTER, duration: 1.8 })
  };

  // Zoom back out. The electron doesn't return to its orbit: it smears into a cloud.
  const smearIntoCloud = {
    to: "cloud", sound: "zwoop-rev", captionOut: 0, captionAt: 2.6,
    play(ctx) {
      const tl = gsap.timeline();
      tl.add(Camera.zoomTo("#cam", { scale: 1, origin: CENTER, duration: 1.8 }), 0)
        .to("#electron", { opacity: 0, duration: 0.6 }, 1.0)
        .to("#orbit", { opacity: 0, duration: 1.6 }, 1.0);
      ctx.data.cloudDots.forEach(c => {
        tl.to(c.dot, { attr: { cx: c.x, cy: c.y }, opacity: c.alpha, duration: 1.6, ease: "power2.out" }, 1.0 + Math.random() * 0.7);
      });
      return tl;
    }
  };

  // Zoom way out into the real world: the atom shrinks to nothing, an arrow says "it's really small".
  const toWorld = {
    to: "world", sound: "zwoop", captionOut: 0, captionAt: 4.0,
    before: ctx => finishArrows(ctx),
    play(ctx) {
      const d = ctx.data;
      gsap.set("#pointerLine", { strokeDashoffset: d.arrowLen });
      const tl = gsap.timeline();
      tl.add(d.zoom.to(1, 4.5), 0)
        .to("#pointerLabel", { opacity: 1, duration: 0.4 }, 4.6)
        .to("#pointerLine", { opacity: 1, duration: 0.05 }, 4.6)
        .to("#pointerLine", { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, 4.6)
        .to("#pointerHead", { opacity: 1, duration: 0.2 }, 5.25)
        .call(() => Sound.pop(), null, 4.6);
      return tl;
    }
  };

  const fromWorld = {
    to: ctx => (ctx.data.tapped ? "cloud" : "atom"), sound: "zwoop-rev", captionOut: 0.6, captionAt: 4.9,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to(["#pointerLabel", "#pointerLine", "#pointerHead"], { opacity: 0, duration: 0.5 }, 0)
        .add(ctx.data.zoom.to(0, 4.5), 0);
      return tl;
    }
  };

  // Start over: the cloud fades, the orbiting electron comes back.
  const replay = {
    to: "atom", sound: "pop", captionOut: 0, captionAt: 0.5,
    before: ctx => { if (ctx.data.arrowsTl) ctx.data.arrowsTl.pause(); },
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline({
        onComplete: () => {
          d.cloudDots.forEach(c => gsap.set(c.dot, { attr: { cx: c.sx, cy: c.sy }, opacity: 0 }));
          ctx.$("#cloudArrows").innerHTML = "";
          d.arrowsTl = null;
          d.tapped = false;
        }
      });
      tl.to(d.cloudDots.map(c => c.dot), { opacity: 0, duration: 0.6 }, 0)
        .to("#cloudArrows", { opacity: 0, duration: 0.4 }, 0)
        .to(["#electron", "#orbit"], { opacity: 1, duration: 0.6 }, 0.2);
      return tl;
    }
  };

  // ---------- The page ----------
  Book.register({
    id: "hydrogen",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The hydrogen atom and scale",
    description: "A red circle, the proton, with a much smaller blue dot, the electron, circling it. Tapping the atom zooms in on the proton, then the electron turns into a fuzzy cloud. Next, the view zooms out to a person standing in a park, with an arrow pointing at their hand, where a hydrogen atom would be too small to see.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>proton <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "atom",

    hotspots: [{
      id: "atom", selector: "#atomHit", label: "Tap the atom to zoom in",
      hint: { // the gold ring: "you can tap this"
        start(ctx, strong) {
          const d = ctx.data;
          if (d.ring) d.ring.kill();
          gsap.set("#tapRing", { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: CENTER });
          if (ctx.reduceMotion) return; // a still outline instead of a pulse
          d.ring = gsap.to("#tapRing", {
            scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: CENTER,
            duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
          });
        },
        stop(ctx) {
          if (ctx.data.ring) ctx.data.ring.kill();
          ctx.data.ring = null;
          gsap.to("#tapRing", { opacity: 0, duration: 0.3 });
        }
      }
    }],

    setup(ctx) {
      const d = ctx.data;
      d.tapped = false;
      d.zoom = Camera.crossZoom({ inner: "#atomLayer", outer: "#world", origin: CENTER, factor: 4000 });
      const line = ctx.$("#pointerLine");
      d.arrowLen = line.getTotalLength();
      gsap.set(line, { strokeDasharray: d.arrowLen, strokeDashoffset: d.arrowLen });
      gsap.set(["#pointerLabel", "#pointerHead", "#pointerLine"], { opacity: 0 });
      buildCloud(ctx);
    },

    // First appearance: proton pops in, the orbit and electron follow.
    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("#proton", { opacity: 0, scale: 0.6, svgOrigin: CENTER }, { opacity: 1, scale: 1, svgOrigin: CENTER, duration: 0.7, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to("#orbit", { opacity: 1, duration: 0.6 }, "-=0.2")
        .to("#electron", { opacity: 1, duration: 0.5 }, "-=0.3");
    },

    // Idle motion: electron orbits, proton breathes.
    idle() {
      gsap.to("#electronArm", { rotation: 360, svgOrigin: CENTER, duration: 9, ease: "none", repeat: -1 });
      gsap.to("#proton", { scale: 1.07, svgOrigin: CENTER, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      atom: {
        caption: "This is a hydrogen atom, not to scale of course",
        tap: tapAtom,
        next: toWorld
      },
      zoomed: {
        caption: "Remember, not to scale. If the proton were the size of a marble, the electron would be about half a kilometre away.",
        booklet: "§2 physical constants: a proton (1.672622 × 10⁻²⁷ kg) is about 1836 times heavier than an electron (9.109384 × 10⁻³¹ kg).",
        footnote: "Also, protons aren't really red. Colour is a light thing, and a proton is far smaller than the wavelength of light.",
        back: smearIntoCloud
      },
      cloud: {
        caption: "Actually, electrons don't orbit like little planets. We only know where one is <em>likely</em> to be, so it's more like a fuzzy cloud.",
        footnote: "Denser dots mean more likely. This cloud is called an orbital. More on that later.",
        next: toWorld,
        replay,
        onEnter(ctx) {
          if (ctx.data.arrowsTl) return; // already shown (we came back from the world)
          buildArrows(ctx);
          if (ctx.reduceMotion) finishArrows(ctx);
          else ctx.data.arrowsTl.play();
        }
      },
      world: {
        caption: "Zoom out far enough and the atom disappears. Next to a person, it's too small to draw.",
        footnote: "About 0.1 nanometres wide, roughly a billion times narrower than a hand. The arrow is doing all the work.",
        legend: false,
        final: true,
        back: fromWorld
      }
    }
  });
})();
;
/* ---- pages/02-isotopes.js ---- */
// Page 2: isotopes. Three kinds of hydrogen side by side; tap one to zoom into its nucleus and count.
// all --tap an atom--> z1 / z2 / z3 --back--> all (or "summary" once all three have been looked at)

(() => {
  const CY = 215;                       // height of the atoms in the scene
  const X = { 1: 200, 2: 500, 3: 800 }; // where each atom sits
  const ORBIT = 100;                    // dotted orbit radius (not to scale, on purpose)
  const R = 15;                         // radius of a proton or neutron, drawn oversized

  // Nucleon positions relative to the atom's centre: [x, y, "p" or "n"]
  const NUCLEI = {
    1: [[0, 0, "p"]],
    2: [[-15, 0, "p"], [15, 0, "n"]],
    3: [[0, -16, "p"], [-15, 10, "n"], [15, 10, "n"]]
  };
  const NAMES = {
    1: ["hydrogen-1", "the common one"],
    2: ["hydrogen-2", "deuterium"],
    3: ["hydrogen-3", "tritium"]
  };

  function atomMarkup(n) {
    const cx = X[n];
    const nucleons = NUCLEI[n].map(([dx, dy, kind]) =>
      `<circle cx="${cx + dx}" cy="${CY + dy}" r="${R}" fill="${kind === "p" ? "var(--proton)" : "#B8BEC6"}"/>` +
      `<text class="nucleon-label" x="${cx + dx}" y="${CY + dy}" fill="${kind === "p" ? "#fff" : "#1B1A22"}">${kind}</text>`
    ).join("");
    return `
      <g id="atom${n}">
        <circle class="orbit fade" id="orb${n}" cx="${cx}" cy="${CY}" r="${ORBIT}"/>
        <g class="fade" id="nuc${n}">${nucleons}</g>
        <g id="arm${n}"><circle class="electron fade" id="e${n}" cx="${cx + ORBIT}" cy="${CY}" r="7"/></g>
        <g class="fade" id="lab${n}">
          <text class="atom-name" x="${cx}" y="365">${NAMES[n][0]}</text>
          <text class="atom-sub" x="${cx}" y="393">${NAMES[n][1]}</text>
        </g>
        <circle class="tap-ring" id="ring${n}" cx="${cx}" cy="${CY}" r="${R * 2.2}" opacity="0"/>
        <circle class="hit" id="hit${n}" cx="${cx}" cy="${CY}" r="120"/>
      </g>`;
  }

  const svg = `<g id="cam">${atomMarkup(1)}${atomMarkup(2)}${atomMarkup(3)}</g>`;

  const others = n => [1, 2, 3].filter(m => m !== n);

  // Tap an atom: everything else fades, the camera slides and zooms into that nucleus.
  const tapAtom = n => ({
    hotspot: "atom" + n, to: "z" + n, sound: "zwoop", captionOut: 0, captionAt: 1.1,
    before: ctx => { ctx.data.visited.add(n); ctx.data.current = n; },
    play() {
      const tl = gsap.timeline();
      tl.to(others(n).map(m => "#atom" + m), { opacity: 0, duration: 0.6 }, 0)
        .to(["#orb" + n, "#e" + n, "#lab" + n], { opacity: 0, duration: 0.6 }, 0)
        .add(Camera.zoomTo("#cam", { scale: 5.5, origin: X[n] + " " + CY, center: [500, 240], duration: 1.6 }), 0);
      return tl;
    }
  });

  // Zoom back out to the three atoms. After all three have been looked at, we get the summary.
  const backOut = {
    to: ctx => (ctx.data.visited.size === 3 ? "summary" : "all"),
    sound: "zwoop-rev", captionOut: 0, captionAt: 1.0,
    play(ctx) {
      const n = ctx.data.current;
      const tl = gsap.timeline();
      tl.add(Camera.zoomTo("#cam", { scale: 1, origin: X[n] + " " + CY, duration: 1.6 }), 0)
        .to(["#atom1", "#atom2", "#atom3"], { opacity: 1, duration: 0.6 }, 0.9)
        .to(["#orb" + n, "#e" + n, "#lab" + n], { opacity: 1, duration: 0.6 }, 0.9);
      return tl;
    }
  };

  const allTaps = [tapAtom(1), tapAtom(2), tapAtom(3)];

  // The gold ring: "you can tap this".
  const hotspot = n => ({
    id: "atom" + n, selector: "#hit" + n, label: "Tap " + NAMES[n][0] + " to look inside its nucleus",
    hint: {
      start(ctx, strong) {
        const d = ctx.data;
        if (d["ring" + n]) d["ring" + n].kill();
        const o = X[n] + " " + CY;
        gsap.set("#ring" + n, { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 5 : 3, scale: 1, svgOrigin: o });
        if (ctx.reduceMotion) return; // a still outline instead of a pulse
        d["ring" + n] = gsap.to("#ring" + n, {
          scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: o,
          duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
        });
      },
      stop(ctx) {
        const d = ctx.data;
        if (d["ring" + n]) d["ring" + n].kill();
        d["ring" + n] = null;
        gsap.to("#ring" + n, { opacity: 0, duration: 0.3 });
      }
    }
  });

  Book.register({
    id: "isotopes",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Isotopes",
    description: "Three hydrogen atoms side by side, each with one electron circling. Hydrogen-1 has a nucleus of one proton. Hydrogen-2, deuterium, has one proton and one neutron. Hydrogen-3, tritium, has one proton and two neutrons. Tapping an atom zooms in on its nucleus.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>proton <span class="dot dot-n" aria-hidden="true"></span>neutron <span class="dot dot-e" aria-hidden="true"></span>electron',
    hotspots: [hotspot(1), hotspot(2), hotspot(3)],
    start: "all",

    setup(ctx) { ctx.data.visited = new Set(); },

    // The atoms pop in one after another.
    intro() {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      [1, 2, 3].forEach((n, i) => {
        const o = X[n] + " " + CY;
        tl.fromTo("#nuc" + n, { opacity: 0, scale: 0.5, svgOrigin: o }, { opacity: 1, scale: 1, svgOrigin: o, duration: 0.6, ease: "back.out(2)" }, i * 0.45)
          .call(() => Sound.pop(), null, i * 0.45 + 0.1)
          .to("#orb" + n, { opacity: 1, duration: 0.5 }, i * 0.45 + 0.3)
          .to("#e" + n, { opacity: 1, duration: 0.4 }, i * 0.45 + 0.4)
          .to("#lab" + n, { opacity: 1, duration: 0.5 }, i * 0.45 + 0.5);
      });
      return tl;
    },

    // Idle: the three electrons orbit, each starting at a different point on its orbit.
    idle() {
      [1, 2, 3].forEach((n, i) => {
        const start = i * 120;
        gsap.fromTo("#arm" + n, { rotation: start, svgOrigin: X[n] + " " + CY },
          { rotation: start + 360, svgOrigin: X[n] + " " + CY, duration: 9, ease: "none", repeat: -1 });
      });
    },

    states: {
      all: {
        caption: "Three kinds of hydrogen atom. Tap one to look inside its nucleus.",
        footnote: "The nuclei are hugely oversized here, and the electrons don't really orbit. Not to scale, of course.",
        tap: allTaps,
        final: true
      },
      z1: {
        caption: "Hydrogen-1: 1 proton and 0 neutrons. This is the most common kind of hydrogen.",
        back: backOut
      },
      z2: {
        caption: "Hydrogen-2, also called deuterium: 1 proton and 1 neutron.",
        back: backOut
      },
      z3: {
        caption: "Hydrogen-3, also called tritium: 1 proton and 2 neutrons.",
        footnote: "Tritium is radioactive, so it slowly decays.",
        back: backOut
      },
      summary: {
        caption: "Same number of protons, so all three are hydrogen. Different numbers of neutrons, so they are isotopes of each other.",
        booklet: "§2 physical constants: a proton is 1.672622 × 10⁻²⁷ kg and a neutron 1.674927 × 10⁻²⁷ kg — nearly the same, so each extra neutron adds about one unit of mass.",
        footnote: "Neutrons have no charge, so the electron doesn't care. Isotopes have the same chemical properties, but different masses.",
        tap: allTaps,
        final: true
      }
    }
  });
})();
;
/* ---- pages/05-massspec.js ---- */
// Page 5: mass spectrometry. Neon ions curve through a magnetic field on the left; lighter ions bend
// more than heavier ones, so each isotope lands in its own spot on the detector. Tap fires a first,
// easy-to-follow pair of ions, each leaving its own dotted trail so the different curve is obvious —
// then a stream of more ions fires automatically (the same "keep sampling until it settles" idea as
// the electron cloud on the hydrogen page), building up the bar graph on the right hit by hit.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const SRC = { x: 70, y: 240 };
  const FIELD = { x0: 170, y0: 140, x1: 410, y1: 340 };
  const DET_X = 450; // the detector, a dashed line just past the field
  // Two isotopes of neon: [label, mass number, where they enter/exit the field, colour]
  const IONS = [
    { label: "Ne-20", mass: 20, startY: SRC.y - 10, exitY: 130, colour: "var(--proton)" },
    { label: "Ne-22", mass: 22, startY: SRC.y + 10, exitY: 195, colour: "var(--electron)" }
  ];
  const BAR = { x: [620, 760], w: 70, base: 400 }; // graph baseline y=400, bars grow upward
  const HEIGHT = { 20: 100, 22: 20 }; // relative abundance, exaggerated bar heights in px
  const SWARM = { 20: 20, 22: 4 }; // extra ions fired after the first pair, each worth 5px so the bars land exactly on HEIGHT

  // The curved flight path: straight to the field, a curve while inside it, straight on to the detector.
  function trajectory(ion) {
    const entrance = { x: FIELD.x0, y: ion.startY };
    const exit = { x: FIELD.x1, y: ion.exitY };
    const control = { x: (entrance.x + exit.x) / 2, y: entrance.y };
    return `M ${SRC.x} ${ion.startY} L ${entrance.x} ${entrance.y} Q ${control.x} ${control.y} ${exit.x} ${exit.y} L ${DET_X} ${exit.y}`;
  }

  function pointAt(path, t) {
    return path.getPointAtLength(t * path.getTotalLength());
  }

  // Moves `el` along `path` by driving cx/cy from a 0..1 proxy — no extra plugin needed.
  function flyAlong(el, path, duration, ease) {
    const p0 = pointAt(path, 0);
    el.setAttribute("cx", p0.x); el.setAttribute("cy", p0.y);
    const proxy = { t: 0 };
    return gsap.to(proxy, {
      t: 1, duration, ease: ease || "power1.inOut",
      onUpdate() {
        const p = pointAt(path, proxy.t);
        el.setAttribute("cx", p.x); el.setAttribute("cy", p.y);
      }
    });
  }

  // Faint dots, the usual symbol for a field pointing straight out of the page.
  let fieldDots = "";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const fx = FIELD.x0 + 30 + col * 40, fy = FIELD.y0 + 25 + row * 45;
      fieldDots += `<circle cx="${fx}" cy="${fy}" r="2.5" fill="var(--ink)" opacity="0.16"/>`;
    }
  }

  const svg = `
    <text class="graph-label" x="${SRC.x}" y="${SRC.y - 60}">ion source</text>
    <rect x="${FIELD.x0}" y="${FIELD.y0}" width="${FIELD.x1 - FIELD.x0}" height="${FIELD.y1 - FIELD.y0}" rx="16" fill="none" stroke="var(--ink)" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="6 6"/>
    <g aria-hidden="true">${fieldDots}</g>
    <text class="graph-label" x="${(FIELD.x0 + FIELD.x1) / 2}" y="${FIELD.y0 - 14}">magnetic field</text>
    <line class="wire" x1="${DET_X}" y1="80" x2="${DET_X}" y2="400" stroke-dasharray="1 10" stroke-width="3" opacity="0.5"/>
    <text class="graph-label" x="${DET_X + 60}" y="80">detector</text>

    <path id="trailA" d="${trajectory(IONS[0])}" fill="none" stroke="${IONS[0].colour}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1.5 9" opacity="0"/>
    <path id="trailB" d="${trajectory(IONS[1])}" fill="none" stroke="${IONS[1].colour}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1.5 9" opacity="0"/>
    <g id="swarm"></g>
    <circle class="particle fade" id="ionA" cx="${SRC.x}" cy="${IONS[0].startY}" r="10" style="fill:${IONS[0].colour}"/>
    <circle class="particle fade" id="ionB" cx="${SRC.x}" cy="${IONS[1].startY}" r="10" style="fill:${IONS[1].colour}"/>

    <g id="graph" opacity="0">
      <line class="axis-line" x1="${BAR.x[0] - 30}" y1="${BAR.base}" x2="${BAR.x[1] + BAR.w + 30}" y2="${BAR.base}"/>
      <rect id="bar20" x="${BAR.x[0]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" style="fill:${IONS[0].colour}"/>
      <rect id="bar22" x="${BAR.x[1]}" y="${BAR.base}" width="${BAR.w}" height="0" class="mass-bar" style="fill:${IONS[1].colour}"/>
      <text class="mass-axis-label" x="${BAR.x[0] + BAR.w / 2}" y="${BAR.base + 22}">20</text>
      <text class="mass-axis-label" x="${BAR.x[1] + BAR.w / 2}" y="${BAR.base + 22}">22</text>
      <text class="graph-label" x="${(BAR.x[0] + BAR.x[1] + BAR.w) / 2}" y="${BAR.base + 42}">mass / charge (m/z)</text>
    </g>

    <circle class="tap-ring" id="ring" cx="240" cy="240" r="210" opacity="0"/>
    <circle class="hit" id="hit" cx="450" cy="240" r="500"/>`;

  const fire = {
    hotspot: "hit", to: "result", sound: "zwoop", captionAt: 5.4,
    play(ctx) {
      const tl = gsap.timeline();
      const trailA = ctx.$("#trailA"), trailB = ctx.$("#trailB");
      const ionA = ctx.$("#ionA"), ionB = ctx.$("#ionB");
      const dur = 1.4;

      // The first pair: slow enough to watch the curve, each leaving its own dotted trail.
      tl.to([trailA, trailB], { opacity: 0.55, duration: dur }, 0.15)
        .add(flyAlong(ionA, trailA, dur, "power2.inOut"), 0.15)
        .add(flyAlong(ionB, trailB, dur, "power1.inOut"), 0.15)
        .call(() => Sound.pop(), null, 0.15 + dur * 0.6)
        .to("#graph", { opacity: 1, duration: 0.4 }, dur + 0.3);

      // Then more ions fire on their own, the same idea as the electron cloud: enough single hits
      // build up a reliable picture. Each hit nudges its bar up by a fixed amount (5px), so the bars
      // settle exactly on the target heights once every ion has landed.
      let seed = 11;
      const rand = () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const order = [];
      for (let i = 0; i < SWARM[20]; i++) order.push(20);
      for (let i = 0; i < SWARM[22]; i++) order.push(22);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      const bars = { 20: { h: 0, el: ctx.$("#bar20") }, 22: { h: 0, el: ctx.$("#bar22") } };
      const step = HEIGHT[20] / SWARM[20]; // = HEIGHT[22] / SWARM[22] = 5px per hit
      let t = dur + 0.6;
      order.forEach((mass, i) => {
        const ion = IONS.find(x => x.mass === mass);
        const path = mass === 20 ? trailA : trailB;
        const el = document.createElementNS(NS, "circle");
        el.setAttribute("r", 4);
        el.setAttribute("fill", ion.colour);
        el.setAttribute("opacity", 0.85);
        ctx.$("#swarm").appendChild(el);
        tl.add(flyAlong(el, path, 0.35, "power1.in"), t)
          .call(() => {
            bars[mass].h += step;
            gsap.to(bars[mass].el, { attr: { y: BAR.base - bars[mass].h, height: bars[mass].h }, duration: 0.18, ease: "power1.out" });
            el.remove();
            if (i % 3 === 0) Sound.pop();
          }, null, t + 0.35);
        t += 0.11;
      });

      tl.call(() => Sound.tindin(), null, t + 0.3)
        .to("#bar20", { scale: 1.08, svgOrigin: (BAR.x[0] + BAR.w / 2) + " " + BAR.base, duration: 0.25, yoyo: true, repeat: 1 }, t + 0.3)
        .to("#bar22", { scale: 1.08, svgOrigin: (BAR.x[1] + BAR.w / 2) + " " + BAR.base, duration: 0.25, yoyo: true, repeat: 1 }, t + 0.3);
      return tl;
    }
  };

  Book.register({
    id: "massspec",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Mass spectrometry: sorting atoms by mass",
    description: "A beam of neon ions travels from a source on the left, through a dashed region marked 'magnetic field'. Tapping fires a first pair of ions: the lighter one curves more than the heavier one, each leaving its own dotted trail, and both land at their own spot past a detector line. More ions then fire automatically in quick succession, each nudging up a bar on a graph to the right, until the bars settle: a tall one for neon-20 and a short one for neon-22.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>neon-20 <span class="dot dot-e" aria-hidden="true"></span>neon-22',
    start: "ready",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to fire the ion beam", hint: Hint.ring("#ring", "240 240") }],

    intro() {
      return gsap.timeline().to(["#ionA", "#ionB"], { opacity: 1, duration: 0.6, stagger: 0.15 });
    },

    idle() {
      gsap.to(["#ionA", "#ionB"], { y: "+=6", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 });
    },

    states: {
      ready: {
        caption: "Neon atoms are turned into ions and fired through a magnetic field. Tap to fire the beam.",
        footnote: "This machine is a mass spectrometer, AHL content if your course covers it.",
        tap: fire
      },
      result: {
        caption: "Lighter ions are easier to deflect, so neon-20 curves more than neon-22. One pair only tells you where they land — firing many more, and counting the hits, is what actually builds the graph.",
        booklet: "§7 periodic table: neon's relative atomic mass is 20.18 — just above 20, because almost all neon is neon-20.",
        footnote: "The bar graph is the result: a mass spectrum. Taller bars mean more of that isotope. (A trace of neon-21 exists too, too small to draw here.)",
        final: true
      }
    }
  });
})();
;
/* ---- pages/06-emission.js ---- */
// Page 6: emission spectra. An excited electron falls back to the second shell, releasing a photon
// each time. Bigger falls release more energetic, bluer light. Four taps build up hydrogen's four
// visible lines on a spectrum strip. Back removes the last line (from the first tap, Back turns the page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CX = 500, CY = 210, HOME_R = 70;
  const STRIP = { x0: 260, x1: 740, y: 400, h: 26 };
  const GAUGE = { x0: 830, base: 335, w: 20, gap: 28, scale: 0.55 }; // a little bar per fall, height ~ how big the jump was

  // [how far out the electron jumps, the photon's colour, where it lands on the strip (0=violet end, 1=red end), name]
  const FALLS = [
    { out: 145, colour: "#E5382B", pos: 0.86, name: "red" },
    { out: 178, colour: "#22B6A5", pos: 0.6, name: "cyan" },
    { out: 206, colour: "#2E6FE0", pos: 0.36, name: "blue" },
    { out: 230, colour: "#6A2BD9", pos: 0.12, name: "violet" }
  ];

  const svg = `
    <circle class="orbit fade" cx="${CX}" cy="${CY}" r="${HOME_R}"/>
    <circle class="proton fade" cx="${CX}" cy="${CY}" r="22"/>
    <text class="nuc-sym fade" x="${CX}" y="${CY}">H</text>
    <circle class="electron fade" id="e" cx="${CX + HOME_R}" cy="${CY}" r="7"/>

    <g id="strip">
      <rect class="spectrum-strip" x="${STRIP.x0}" y="${STRIP.y}" width="${STRIP.x1 - STRIP.x0}" height="${STRIP.h}" rx="4"/>
      ${FALLS.map((f, i) => `<line class="spectrum-line" id="ln${i}" x1="${STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0)}" x2="${STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0)}" y1="${STRIP.y + 2}" y2="${STRIP.y + STRIP.h - 2}" stroke="${f.colour}" opacity="0"/>`).join("")}
    </g>
    <text class="graph-label fade" x="500" y="${STRIP.y + STRIP.h + 24}">hydrogen's emission spectrum</text>

    <g id="gauge" opacity="0">
      <text class="graph-label" x="${GAUGE.x0 + GAUGE.gap * 1.5}" y="${GAUGE.base - FALLS[3].out * GAUGE.scale - 20}">size of the jump</text>
      <line class="axis-line" x1="${GAUGE.x0 - 14}" y1="${GAUGE.base}" x2="${GAUGE.x0 + GAUGE.gap * 3 + GAUGE.w + 14}" y2="${GAUGE.base}"/>
      ${FALLS.map((f, i) => `<rect id="gbar${i}" x="${GAUGE.x0 + i * GAUGE.gap}" y="${GAUGE.base}" width="${GAUGE.w}" height="0" rx="4" fill="${f.colour}"/>`).join("")}
    </g>
    <g id="connectors"></g>

    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY}" r="48" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY}" r="270"/>`;

  // After the last fall: send a little dot from the top of each gauge bar down to the matching line
  // on the spectrum, so the size of the jump and its position in the spectrum line up visually.
  function compareGauge(ctx, tl, atTime) {
    FALLS.forEach((f, i) => {
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("r", 5);
      dot.setAttribute("fill", f.colour);
      const bx = GAUGE.x0 + i * GAUGE.gap + GAUGE.w / 2;
      const by = GAUGE.base - f.out * GAUGE.scale;
      dot.setAttribute("cx", bx); dot.setAttribute("cy", by);
      ctx.$("#connectors").appendChild(dot);
      const lx = STRIP.x0 + f.pos * (STRIP.x1 - STRIP.x0);
      const ly = STRIP.y - 14;
      tl.to(dot, { attr: { cx: lx, cy: ly }, duration: 0.6, ease: "power1.inOut" }, atTime + i * 0.15)
        .to(dot, { scale: 1.6, svgOrigin: lx + " " + ly, duration: 0.2, yoyo: true, repeat: 1 }, atTime + i * 0.15 + 0.6)
        .to(dot, { opacity: 0, duration: 0.4, onComplete: () => dot.remove() }, atTime + i * 0.15 + 1.0);
    });
    tl.call(() => Sound.tindin(), null, atTime + FALLS.length * 0.15 + 0.6);
  }

  const fall = i => ({
    hotspot: "hit", to: "e" + (i + 2), sound: "zwoop", captionAt: i === FALLS.length - 1 ? 3.4 : 1.4,
    play(ctx) {
      const f = FALLS[i];
      const line = ctx.$("#ln" + i);
      const bar = ctx.$("#gbar" + i);
      const tl = gsap.timeline();
      tl.to("#e", { attr: { cx: CX + f.out, cy: CY }, fill: f.colour, duration: 0.6, ease: "power2.out" }, 0)
        .to("#e", { attr: { cx: CX + HOME_R, cy: CY }, duration: 0.7, ease: "power2.in" }, 0.75)
        .call(() => Sound.pop(), null, 1.45)
        .set("#e", { fill: "" }, 1.45)
        .to(line, { opacity: 1, duration: 0.3 }, 1.5)
        .to("#gauge", { opacity: 1, duration: 0.3 }, 1.5)
        .to(bar, { attr: { y: GAUGE.base - f.out * GAUGE.scale, height: f.out * GAUGE.scale }, duration: 0.5, ease: "power2.out" }, 1.5);
      if (i === FALLS.length - 1) compareGauge(ctx, tl, 2.3);
      return tl;
    }
  });

  const unfall = i => ({
    to: "e" + (i + 1), sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      ctx.$("#connectors").innerHTML = "";
      const tl = gsap.timeline();
      tl.to(ctx.$("#ln" + i), { opacity: 0, duration: 0.5 }, 0)
        .to(ctx.$("#gbar" + i), { attr: { y: GAUGE.base, height: 0 }, duration: 0.4 }, 0);
      return tl;
    }
  });

  const states = {};
  for (let i = 0; i < FALLS.length; i++) {
    states["e" + (i + 1)] = {
      caption: i === 0
        ? "Give this hydrogen atom some energy (heat, or a spark) and its electron jumps up, then falls back down. Tap to try it."
        : i === FALLS.length - 1
          ? "One more fall. Watch the little bar on the right grow with it — its height stands for how big this jump was."
          : "Falling from further out releases more energy — and more energy means a bluer photon. The bar on the right grows to match. Tap for another fall.",
      footnote: i === 0 ? "We're starting from the second shell, not the very first, to keep the colours the ones you'd actually see." : undefined,
      tap: fall(i)
    };
    if (i > 0) states["e" + (i + 1)].back = unfall(i - 1);
  }
  states["e" + (FALLS.length + 1)] = {
    caption: "Four falls, four coloured lines. This pattern is hydrogen's emission spectrum — like a fingerprint for the element. Watch the dots: the biggest jump lands closest to the violet end.",
    footnote: "Every element has its own pattern of lines, because its electrons sit at their own particular energies.",
    booklet: "§1 equations: E = hf and c = fλ — more energy means a higher frequency and a shorter wavelength. §5: visible light runs from about 400 nm (violet) to 700 nm (red).",
    back: unfall(FALLS.length - 1),
    final: true
  };

  Book.register({
    id: "emission",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Emission spectra: why hydrogen glows in colours",
    description: "A hydrogen atom with one electron on a ring around it. Tapping the atom sends the electron jumping outward and falling back, releasing a coloured flash of light each time, which lands as a line on a dark strip below. A small bar to the right grows with each fall, showing how big that jump was. Four taps build up hydrogen's four visible spectral lines: red, cyan, blue and violet, and a final animation sends a dot from each bar down to its matching line to compare the two.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "e1",

    hotspots: [{ id: "hit", selector: "#hit", label: "Give the atom energy and watch it fall back", hint: Hint.ring("#ring", CX + " " + CY) }],

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("circle.proton", { opacity: 0, scale: 0.6, svgOrigin: CX + " " + CY }, { opacity: 1, scale: 1, svgOrigin: CX + " " + CY, duration: 0.6, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to(["text.nuc-sym", ".orbit", "#e", ".graph-label"], { opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.2");
    },

    idle() {
      gsap.to("#e", { scale: 1.15, svgOrigin: CX + " " + CY, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states
  });
})();
;
/* ---- pages/03-shells.js ---- */
// Page 3: electron shells. Tap the atom to add a proton and an electron: hydrogen up to sodium.
// e1 --tap--> e2 --tap--> ... --tap--> e11 --tap--> reveal (the neat rings dissolve into clouds)
// Back removes the last electron (from e1, Back turns to the previous page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const CX = 500, CY = 215;          // the atom's centre in the scene
  const RAD = [65, 125, 180];        // shell radii (not to scale, on purpose)
  const FAR = 330;                   // where new electrons arrive from
  const BASE = [-Math.PI / 2, -Math.PI / 2 + 0.6, -Math.PI / 2 + 1.2]; // where each shell's first electron sits
  const SPEED = [0.35, -0.22, 0.15]; // slow drift of each shell, radians per second
  const LAST = 11;                   // sodium

  const ELEMENTS = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na"];
  const shellOf = z => (z <= 2 ? 0 : z <= 10 ? 1 : 2);       // z = which electron (1 to 11)
  const arrangement = n => [Math.min(n, 2), Math.max(0, Math.min(n - 2, 8)), Math.max(0, n - 10)].filter(x => x > 0).join(",");

  const CAPTIONS = [
    "Hydrogen: 1 proton, so 1 electron. It sits in the first shell, the one closest to the nucleus. Tap the atom to add a proton and an electron.",
    "Helium: 2 electrons. The first shell holds a maximum of 2, so it's now full.",
    "Lithium: 3 electrons. The first shell is full, so the third electron starts the second shell.",
    "Beryllium: 4 electrons, 2 in the first shell and 2 in the second.",
    "Boron: 5 electrons. The second shell is filling up.",
    "Carbon: 6 electrons, 2 in the first shell and 4 in the second.",
    "Nitrogen: 7 electrons, 5 of them in the second shell.",
    "Oxygen: 8 electrons, 6 of them in the second shell.",
    "Fluorine: 9 electrons. The second shell has 7, one short of full.",
    "Neon: 10 electrons. The second shell holds a maximum of 8, so it's full too.",
    "Sodium: 11 electrons. The first two shells are full, so the eleventh electron starts the third shell."
  ];

  const svg = `
    <circle class="orbit fade" id="sh0" cx="${CX}" cy="${CY}" r="${RAD[0]}"/>
    <circle class="orbit fade" id="sh1" cx="${CX}" cy="${CY}" r="${RAD[1]}"/>
    <circle class="orbit fade" id="sh2" cx="${CX}" cy="${CY}" r="${RAD[2]}"/>
    <g id="cloud"></g>
    <g id="electrons"></g>
    <circle class="proton fade" id="nucleus" cx="${CX}" cy="${CY}" r="24"/>
    <text class="nuc-sym fade" id="sym" x="${CX}" y="${CY}">H</text>
    <g class="fade" id="cfgBox">
      <text class="atom-name" id="cfg" x="${CX}" y="428">1</text>
      <text class="atom-sub" x="${CX}" y="454">electron arrangement</text>
    </g>
    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY}" r="42" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY}" r="200"/>`;

  // ---------- Electrons ----------
  // Each electron is a plain object {k: shell, slot: angle, r: distance, op: opacity, el: the circle}.
  // A small loop draws them every frame, so shells can drift and electrons can fly in smoothly.
  function makeElectron(ctx, k) {
    const d = ctx.data;
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", 7);
    el.setAttribute("class", "electron");
    ctx.$("#electrons").appendChild(el);
    const e = { k, slot: BASE[k], r: FAR, op: 0, el };
    d.electrons.push(e);
    return e;
  }

  // Spread a shell's electrons evenly around it. Existing ones slide to their new spots.
  function spread(ctx, tl, k, duration) {
    const members = ctx.data.electrons.filter(e => e.k === k);
    members.forEach((m, i) => {
      const target = BASE[k] + i * 2 * Math.PI / members.length;
      if (m.fresh) { m.slot = target; m.fresh = false; }
      else tl.to(m, { slot: target, duration, ease: "power2.inOut" }, 0);
    });
  }

  function showText(tl, n, at) {
    tl.call(() => {
      document.getElementById("sym").textContent = ELEMENTS[n - 1];
      document.getElementById("cfg").textContent = arrangement(n);
    }, null, at)
      .fromTo(["#sym", "#cfg"], { opacity: 0 }, { opacity: 1, duration: 0.35 }, at);
  }

  function syncRings(ctx, tl) {
    const counts = [0, 0, 0];
    ctx.data.electrons.forEach(e => counts[e.k]++);
    counts.forEach((c, k) => tl.to("#sh" + k, { opacity: c > 0 ? 1 : 0, duration: 0.5 }, 0));
  }

  // ---------- Transitions ----------
  const addElectron = z => ({          // from e{z} to e{z+1}
    hotspot: "hit", to: "e" + (z + 1), sound: "pop", captionAt: 0.5,
    play(ctx) {
      const tl = gsap.timeline();
      const e = makeElectron(ctx, shellOf(z + 1));
      e.fresh = true;
      spread(ctx, tl, e.k, 0.9);
      tl.to(e, { r: RAD[e.k], op: 1, duration: 0.9, ease: "power2.out" }, 0);
      syncRings(ctx, tl);
      showText(tl, z + 1, 0.4);
      return tl;
    }
  });

  const removeElectron = z => ({       // from e{z} back to e{z-1}
    to: "e" + (z - 1), sound: "pop", captionAt: 0.5,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline();
      const e = d.electrons.pop();
      d.leaving.push(e);
      tl.to(e, { r: FAR, op: 0, duration: 0.8, ease: "power2.in" }, 0)
        .call(() => { e.el.remove(); d.leaving = d.leaving.filter(x => x !== e); }, null, 0.85);
      spread(ctx, tl, e.k, 0.8);
      syncRings(ctx, tl);
      showText(tl, z - 1, 0.4);
      return tl;
    }
  });

  // The reveal: the neat rings dissolve into fuzzy clouds, one for each shell.
  const toReveal = {
    hotspot: "hit", to: "reveal", sound: "zwoop", captionAt: 1.0,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline();
      tl.to(d.electrons, { op: 0, duration: 0.6 }, 0.6)
        .to(["#sh0", "#sh1", "#sh2"], { opacity: 0, duration: 1.2 }, 0.6);
      d.cloudDots.forEach(c => {
        tl.to(c.dot, { attr: { cx: c.x, cy: c.y }, opacity: c.alpha, duration: 1.6, ease: "power2.out" }, 0.4 + Math.random() * 0.7);
      });
      return tl;
    }
  };

  const fromReveal = {
    to: "e" + LAST, sound: "pop", captionAt: 0.7,
    play(ctx) {
      const d = ctx.data;
      const tl = gsap.timeline({
        onComplete: () => d.cloudDots.forEach(c => gsap.set(c.dot, { attr: { cx: c.sx, cy: c.sy }, opacity: 0 }))
      });
      tl.to(d.cloudDots.map(c => c.dot), { opacity: 0, duration: 0.6 }, 0)
        .to(d.electrons, { op: 1, duration: 0.6 }, 0.3)
        .to(["#sh0", "#sh1", "#sh2"], { opacity: 1, duration: 0.6 }, 0.3);
      return tl;
    }
  };

  // ---------- The cloud dots (built once, hidden until the reveal) ----------
  function buildCloud(ctx) {
    let seed = 11;
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const plan = [[0, 70, 12], [1, 130, 20], [2, 50, 26]]; // [shell, number of dots, spread]
    const layer = ctx.$("#cloud");
    const dots = [];
    plan.forEach(([k, count, spreadPx]) => {
      for (let i = 0; i < count; i++) {
        const r = Math.max(8, RAD[k] + gauss() * spreadPx);
        const a = rand() * Math.PI * 2, sa = rand() * Math.PI * 2;
        const dot = document.createElementNS(NS, "circle");
        const sx = CX + RAD[k] * Math.cos(sa), sy = CY + RAD[k] * Math.sin(sa);
        dot.setAttribute("class", "cloud-dot");
        dot.setAttribute("r", (1.6 + rand() * 1.6).toFixed(2));
        dot.setAttribute("cx", sx);
        dot.setAttribute("cy", sy);
        dot.style.opacity = 0;
        layer.appendChild(dot);
        dots.push({ dot, sx, sy, x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), alpha: 0.3 + rand() * 0.35 });
      }
    });
    ctx.data.cloudDots = dots;
  }

  // ---------- States: e1 ... e11, then the reveal ----------
  const states = {};
  for (let z = 1; z <= LAST; z++) {
    states["e" + z] = {
      caption: CAPTIONS[z - 1],
      footnote: z === 1 ? "We're leaving out the neutrons, and the shells are hugely not to scale." : undefined,
      tap: z < LAST ? addElectron(z) : toReveal
    };
    if (z > 1) states["e" + z].back = removeElectron(z);
  }
  states.reveal = {
    caption: "Really, electrons don't travel on neat rings. Each shell is an energy level, and its electrons are spread out in a cloud-like region.",
    footnote: "So the shells are a handy simplification. Not to scale, of course.",
    back: fromReveal,
    final: true
  };

  Book.register({
    id: "shells",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Electron shells and configurations",
    description: "An atom with a red nucleus in the middle and blue electrons on dotted rings around it. Each tap adds a proton and an electron, building from hydrogen up to sodium: the first shell fills with 2 electrons, the second with 8, and sodium's eleventh electron starts the third. At the end the rings dissolve into fuzzy clouds.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "e1",

    hotspots: [{
      id: "hit", selector: "#hit", label: "Tap the atom to add a proton and an electron",
      hint: { // the gold ring: "you can tap this"
        start(ctx, strong) {
          const d = ctx.data;
          if (d.ring) d.ring.kill();
          const o = CX + " " + CY;
          gsap.set("#ring", { opacity: strong ? 1 : 0.55, strokeWidth: strong ? 6 : 3, scale: 1, svgOrigin: o });
          if (ctx.reduceMotion) return;
          d.ring = gsap.to("#ring", {
            scale: strong ? 1.3 : 1.15, opacity: strong ? 0.35 : 0.15, svgOrigin: o,
            duration: strong ? 0.8 : 1.4, ease: "sine.inOut", yoyo: true, repeat: -1
          });
        },
        stop(ctx) {
          if (ctx.data.ring) ctx.data.ring.kill();
          ctx.data.ring = null;
          gsap.to("#ring", { opacity: 0, duration: 0.3 });
        }
      }
    }],

    setup(ctx) {
      const d = ctx.data;
      d.electrons = [];
      d.leaving = [];
      d.rot = [0, 0, 0];
      gsap.set(["#sh1", "#sh2"], { opacity: 0 });
      buildCloud(ctx);
      makeElectron(ctx, 0);            // the hydrogen electron; it flies in during the intro
      d.electrons[0].fresh = false;
      // Draw every electron each frame. Shells drift slowly (not when the reader prefers reduced motion).
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.rot.forEach((_, k) => { d.rot[k] += SPEED[k] * dt / 1000; });
        d.electrons.concat(d.leaving).forEach(e => {
          const a = e.slot + d.rot[e.k];
          e.el.setAttribute("cx", CX + e.r * Math.cos(a));
          e.el.setAttribute("cy", CY + e.r * Math.sin(a));
          e.el.style.opacity = e.op;
        });
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro(ctx) {
      const o = CX + " " + CY;
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .fromTo("#nucleus", { opacity: 0, scale: 0.5, svgOrigin: o }, { opacity: 1, scale: 1, svgOrigin: o, duration: 0.7, ease: "back.out(2)" })
        .call(() => Sound.pop(), null, "<0.2")
        .to("#sym", { opacity: 1, duration: 0.4 }, "<0.2")
        .to("#sh0", { opacity: 1, duration: 0.5 }, "-=0.2")
        .to("#cfgBox", { opacity: 1, duration: 0.5 }, "<")
        .to(ctx.data.electrons[0], { r: RAD[0], op: 1, duration: 0.9 });
    },

    states
  });
})();
;
/* ---- pages/07-mole.js ---- */
// Page 7: the mole. A jar of specks, too many to count one by one. Tap to see the number chemists
// use instead: Avogadro's constant.

(() => {
  const CX = 500, CY = 230;

  // A loose scatter of dots inside a jar outline, just to suggest "far too many to count".
  let seed = 3;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dots = [];
  for (let i = 0; i < 55; i++) {
    const x = CX - 130 + rand() * 260, y = CY - 30 + rand() * 140;
    dots.push(`<circle class="particle fade" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${3 + rand() * 3}"/>`);
  }

  const svg = `
    <path d="M ${CX - 150} ${CY - 120} L ${CX - 150} ${CY + 100} Q ${CX - 150} ${CY + 130} ${CX - 120} ${CY + 130}
             L ${CX + 120} ${CY + 130} Q ${CX + 150} ${CY + 130} ${CX + 150} ${CY + 100} L ${CX + 150} ${CY - 120}"
          class="fade" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
    <g id="dots">${dots.join("")}</g>

    <text id="counter" class="atom-name" x="${CX}" y="400" opacity="0">0</text>
    <text id="caption2b" class="atom-sub" x="${CX}" y="428" opacity="0"></text>

    <circle class="tap-ring" id="ring" cx="${CX}" cy="${CY + 20}" r="185" opacity="0"/>
    <circle class="hit" id="hit" cx="${CX}" cy="${CY + 20}" r="230"/>`;

  const AVOGADRO = "6.02 × 10²³";
  const SCRAMBLE = ["1.4 × 10³", "8.8 × 10¹⁰", "3.1 × 10¹⁷", "5.9 × 10²¹"];

  const reveal = {
    hotspot: "hit", to: "revealed", sound: "pop", captionAt: 2.0,
    play(ctx) {
      const label = ctx.$("#counter");
      const sub = ctx.$("#caption2b");
      const tl = gsap.timeline();
      tl.to("#dots circle", { opacity: 0.35, duration: 0.3, stagger: 0.005 }, 0)
        .to(label, { opacity: 1, duration: 0.2 }, 0.3);
      SCRAMBLE.forEach((v, i) => tl.call(() => { label.textContent = v; Sound.pop(); }, null, 0.35 + i * 0.18));
      tl.call(() => { label.textContent = AVOGADRO; }, null, 1.25)
        .call(() => Sound.tindin(), null, 1.3)
        .fromTo(label, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: "back.out(3)", svgOrigin: CX + " 400" }, 1.25)
        .call(() => { sub.textContent = "particles in one mole"; }, null, 1.4)
        .to(sub, { opacity: 1, duration: 0.4 }, 1.4);
      return tl;
    }
  };

  Book.register({
    id: "mole",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The mole: counting things too small to count",
    description: "A jar full of tiny specks, far too many to count one at a time. Tapping starts a number flickering rapidly upward before settling on 6.02 times ten to the twenty-three, Avogadro's constant, with the label 'particles in one mole'.",
    svg,
    start: "ready",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to see how chemists count this many particles", hint: Hint.ring("#ring", CX + " " + (CY + 20)) }],

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .to("path.fade", { opacity: 1, duration: 0.6 })
        .to("#dots circle", { opacity: 1, duration: 0.5, stagger: 0.01 }, "-=0.3");
    },

    idle() {
      gsap.to("#dots", { y: "+=4", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      ready: {
        caption: "This jar has far too many specks to count one by one. Tap to see how chemists count them anyway.",
        tap: reveal
      },
      revealed: {
        caption: "Chemists count in groups of 6.02 × 10²³, called a mole. It's a number, the same way “a dozen” means 12.",
        booklet: "§2 physical constants: Avogadro constant, N<sub>A</sub> = 6.02 × 10²³ mol⁻¹.",
        footnote: "It's so big that there are probably more molecules in a single glass of water than there are glasses of water in all the world's oceans put together.",
        final: true
      }
    }
  });
})();
;
/* ---- pages/08-gases.js ---- */
// Page 8: gases. Particles bounce around a sealed box. Tapping heats them: faster particles hit the
// walls more often and harder, which is what pressure actually is.

(() => {
  const BOX = { x0: 190, y0: 110, x1: 810, y1: 390 };
  const N = 16;

  let seed = 5;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <rect class="tap-ring" id="ring" x="168" y="88" width="664" height="324" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { p.vx *= 1.9; p.vy *= 1.9; });
      return gsap.timeline()
        .to("#particles circle", { attr: { r: 9 }, duration: 0.4, ease: "power2.out" }, 0)
        .to("#particles circle", { attr: { r: 7 }, duration: 0.4, ease: "power2.in" }, 0.4);
    }
  };

  const cool = {
    to: "cool", sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { p.vx /= 1.9; p.vy /= 1.9; });
      return gsap.timeline();
    }
  };

  Book.register({
    id: "gases",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Gases: particles bouncing in a box",
    description: "A sealed box with sixteen particles bouncing around inside it and off the walls. Tapping heats the gas: the particles speed up and strike the walls more often and harder.",
    svg,
    start: "cool",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to heat the gas", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      const layer = ctx.$("#particles");
      for (let i = 0; i < N; i++) {
        const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
        const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
        const angle = rand() * Math.PI * 2, speed = 70 + rand() * 40;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "particle fade");
        el.setAttribute("r", 7);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        d.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 7, el });
      }
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.particles, Math.min(dt, 50) / 1000);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to("#particles circle, rect.fade", { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      cool: {
        caption: "These particles are bouncing around a sealed box, the way gas particles really do. Tap to heat them up.",
        footnote: "Real gas particles also bump into each other; we're only showing wall bounces here to keep it clear.",
        tap: heat
      },
      hot: {
        caption: "Heating a gas makes its particles move faster. Faster particles hit the walls more often, and harder — that's what pressure is.",
        booklet: "§1 equations: PV = nRT — at fixed volume, a hotter gas has a higher pressure. §2: R = 8.31 J K⁻¹ mol⁻¹.",
        back: cool,
        final: true
      }
    }
  });
})();
;
/* ---- pages/04-ionic.js ---- */
// Page 4: ionic bonding. Sodium hands its outer electron to chlorine; the ions attract.
// atoms --tap--> transfer --tap--> ions (pulled together, charges shown)
// Back reverses each step (from "atoms", Back turns to the previous page).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const NA_X = 280, CL_X = 720, CY = 220;
  const RAD = [38, 74];                 // shell radii (not to scale)
  const FAR_APART = CL_X - NA_X;        // the atoms' starting distance apart, centre to centre
  const CLOSE = RAD[1] * 2 + 16;        // once they're ions: shells nearly touching, centre to centre

  // Where an atom's electrons sit: shell 0 has up to 2, shell 1 up to 8 (sodium) / 7 (chlorine, before the gift)
  function ring(n, k) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(-Math.PI / 2 + i * 2 * Math.PI / n);
    return pts;
  }

  // `shell1` is how many outer electrons are visible; `layout1` is how many slots to lay them out
  // in (chlorine is drawn on an 8-slot ring from the start, with the 8th slot hidden until the gift arrives).
  function atomSVG(id, cx, sym, shell0, shell1, layout1) {
    layout1 = layout1 || shell1;
    const e0 = ring(shell0).map((a, i) =>
      `<circle class="electron fade" id="${id}e0_${i}" cx="${cx + RAD[0] * Math.cos(a)}" cy="${CY + RAD[0] * Math.sin(a)}" r="6"/>`).join("");
    const e1 = ring(layout1).map((a, i) =>
      `<circle class="electron ${i < shell1 ? "fade" : ""}" id="${id}e1_${i}" cx="${cx + RAD[1] * Math.cos(a)}" cy="${CY + RAD[1] * Math.sin(a)}" r="6" ${i >= shell1 ? 'style="opacity:0"' : ""}/>`).join("");
    return `
      <g id="${id}">
        <circle class="orbit fade" cx="${cx}" cy="${CY}" r="${RAD[0]}"/>
        <circle class="orbit fade" cx="${cx}" cy="${CY}" r="${RAD[1]}"/>
        ${e0}${e1}
        <circle class="proton fade" id="${id}nuc" cx="${cx}" cy="${CY}" r="22"/>
        <text class="nuc-sym fade" id="${id}sym" x="${cx}" y="${CY}">${sym}</text>
        <text class="atom-sub fade" id="${id}charge" x="${cx}" y="${CY - 55}" opacity="0"></text>
        <g class="fade" id="${id}lab">
          <text class="atom-name" x="${cx}" y="330">${sym === "Na" ? "sodium" : "chlorine"}</text>
        </g>
      </g>`;
  }

  const svg = `
    ${atomSVG("na", NA_X, "Na", 2, 8)}
    ${atomSVG("cl", CL_X, "Cl", 2, 7, 8)}
    <g id="travelE"></g>
    <path id="pullField" d="M ${NA_X + RAD[1] + 10} ${CY} L ${CL_X - RAD[1] - 10} ${CY}" opacity="0"/>
    <rect class="tap-ring" id="ring" x="${NA_X - RAD[1] - 20}" y="${CY - RAD[1] - 20}" width="${CL_X - NA_X + (RAD[1] + 20) * 2}" height="${(RAD[1] + 20) * 2}" rx="36" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="${CY}" r="480"/>`;

  // The lone electron in sodium's outer shell (the 9th, at index 0 of shell 1) is the one that moves.
  function travelElectron(ctx) {
    const src = ctx.$("#nae1_0");
    const x = +src.getAttribute("cx"), y = +src.getAttribute("cy");
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", 6);
    el.setAttribute("class", "electron");
    el.setAttribute("cx", x);
    el.setAttribute("cy", y);
    ctx.$("#travelE").appendChild(el);
    return el;
  }

  // Move sodium's group in, or chlorine's group in, so the ions sit close together.
  function slide(tl, id, dx, duration) {
    tl.to("#" + id, { x: dx, duration, ease: "power2.inOut" }, 0);
  }

  const doTransfer = {
    hotspot: "hit", to: "transfer", sound: "pop", captionAt: 0.6,
    play(ctx) {
      const tl = gsap.timeline();
      const e = travelElectron(ctx);
      gsap.set("#nae1_0", { opacity: 0 });
      tl.to(e, { attr: { cx: CL_X - RAD[1] * 0.85, cy: CY - RAD[1] * 0.55 }, duration: 1.1, ease: "power2.inOut" }, 0)
        .call(() => Sound.pop(), null, 1.05)
        .call(() => { e.remove(); }, null, 1.1)
        .to("#cle1_7", { opacity: 1, duration: 0.3 }, 1.05) // the 8th chlorine electron, hidden until now
        .to("#nacharge", { opacity: 1, duration: 0.4 }, 1.15)
        .to("#clcharge", { opacity: 1, duration: 0.4 }, 1.15)
        .call(() => {
          ctx.$("#nacharge").textContent = "+";
          ctx.$("#clcharge").textContent = "−";
        }, null, 1.15);
      return tl;
    }
  };

  const bringTogether = {
    hotspot: "hit", to: "ions", sound: "zwoop", captionAt: 1.0,
    play(ctx) {
      const move = (FAR_APART - CLOSE) / 2;
      const tl = gsap.timeline();
      slide(tl, "na", move, 1.6);
      slide(tl, "cl", -move, 1.6);
      tl.to("#pullField", { opacity: 0.5, duration: 0.6 }, 0)
        .to("#pullField", { opacity: 0, duration: 0.6 }, 1.0);
      return tl;
    }
  };

  const pullApart = {
    to: "transfer", sound: "zwoop-rev", captionAt: 0.9,
    play(ctx) {
      const tl = gsap.timeline();
      slide(tl, "na", 0, 1.4);
      slide(tl, "cl", 0, 1.4);
      return tl;
    }
  };

  const giveBack = {
    to: "atoms", sound: "pop", captionAt: 0.6,
    play(ctx) {
      const tl = gsap.timeline();
      const e = travelElectron(ctx);
      gsap.set(e, { attr: { cx: CL_X - RAD[1] * 0.85, cy: CY - RAD[1] * 0.55 } });
      gsap.set("#cle1_7", { opacity: 0 });
      tl.to(["#nacharge", "#clcharge"], { opacity: 0, duration: 0.3 }, 0)
        .to(e, { attr: { cx: +ctx.$("#nae1_0").getAttribute("cx"), cy: +ctx.$("#nae1_0").getAttribute("cy") }, duration: 1.1, ease: "power2.inOut" }, 0.2)
        .call(() => Sound.pop(), null, 1.25)
        .to("#nae1_0", { opacity: 1, duration: 0.3 }, 1.25)
        .call(() => e.remove(), null, 1.3);
      return tl;
    }
  };

  Book.register({
    id: "ionic",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Ionic bonding",
    description: "A sodium atom and a chlorine atom, each with their electron shells drawn as dotted rings. Tapping sends sodium's single outer electron across to chlorine, turning them into a positive sodium ion and a negative chlorine ion. Tapping again pulls the two ions together, held by the attraction between opposite charges.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>nucleus <span class="dot dot-e" aria-hidden="true"></span>electron',
    start: "atoms",

    hotspots: [{
      id: "hit", selector: "#hit", label: "Tap to see what happens between sodium and chlorine",
      hint: Hint.ring("#ring", "500 " + CY)
    }],

    setup(ctx) {
      gsap.set(["#nacharge", "#clcharge"], { opacity: 0 });
    },

    intro() {
      return gsap.timeline({ defaults: { ease: "power2.out" } })
        .to(["#na .fade", "#cl .fade"], { opacity: 1, duration: 0.7, stagger: 0.03 })
        .call(() => Sound.pop());
    },

    idle() {
      gsap.to("#nanuc, #nasym", { scale: 1.06, svgOrigin: NA_X + " " + CY, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to("#clnuc, #clsym", { scale: 1.06, svgOrigin: CL_X + " " + CY, duration: 2.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      atoms: {
        caption: "Sodium has one electron in its outer shell. Chlorine has room for one more. Tap to see what happens.",
        footnote: "Real atoms don't wobble like this, and they're not drawn to scale.",
        tap: doTransfer
      },
      transfer: {
        caption: "Sodium gave its outer electron to chlorine. Now sodium is a positive ion (it has one more proton than electrons) and chlorine is a negative ion (one more electron than protons).",
        footnote: "We write these as Na⁺ and Cl⁻.",
        tap: bringTogether,
        back: giveBack
      },
      ions: {
        caption: "Opposite charges attract, so the ions pull together. This electrical attraction is called an ionic bond.",
        booklet: "§10 ionic radii: Na⁺ 102 pm, Cl⁻ 181 pm. §16 lattice enthalpies: pulling a mole of NaCl apart into ions takes 790 kJ.",
        footnote: "In a real crystal of salt, millions of ions stack together this way, not just one pair.",
        back: pullApart,
        final: true
      }
    }
  });
})();
;
/* ---- pages/09-covalent.js ---- */
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
        booklet: "§11 bond lengths: H–H is 74 pm. §12 bond enthalpies: breaking it takes 436 kJ mol⁻¹.",
        footnote: "This shared pair is what holds the two atoms together, an ordinary hydrogen molecule, H₂.",
        back: unbond,
        final: true
      }
    }
  });
})();
;
/* ---- pages/10-metallic.js ---- */
// Page 10: metallic bonding. Positive metal ions sit in a grid, with electrons free to drift between
// all of them, not tied to any one ion. Tap "hammers" the lattice: the layers slip sideways, and
// because the electron sea doesn't care whose layer it's near, the metal bends instead of shattering.

(() => {
  const COLS = [300, 400, 500, 600, 700];
  const ROWS = [150, 230, 310, 390];
  const BOX = { x0: 250, y0: 110, x1: 750, y1: 430 };
  const SHIFT = 90; // how far the bottom rows slide on tap

  let seed = 9;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ions = [];
  ROWS.forEach((y, r) => COLS.forEach((x, c) => ions.push({ x, y, row: r })));
  const ionSVG = ions.map((ion, i) => `
    <g class="fade" id="ion${i}">
      <circle cx="${ion.x}" cy="${ion.y}" r="20" fill="var(--pos-ion)"/>
      <text class="nuc-sym" x="${ion.x}" y="${ion.y}" font-size="16">+</text>
    </g>`).join("");

  const svg = `
    <g id="lattice">${ionSVG}</g>
    <g id="sea"></g>
    <rect class="tap-ring" id="ring" x="230" y="108" width="538" height="334" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="270" r="420"/>`;

  const hammer = {
    hotspot: "hit", to: "bent", sound: "pop", captionAt: 0.6,
    play() {
      const tl = gsap.timeline();
      [2, 3].forEach(row => {
        ions.forEach((ion, i) => { if (ion.row === row) tl.to("#ion" + i, { x: SHIFT, duration: 0.9, ease: "power2.out" }, 0); });
      });
      return tl;
    }
  };

  const unhammer = {
    to: "solid", sound: "pop", captionAt: 0.5,
    play() {
      const tl = gsap.timeline();
      [2, 3].forEach(row => {
        ions.forEach((ion, i) => { if (ion.row === row) tl.to("#ion" + i, { x: 0, duration: 0.7, ease: "power2.inOut" }, 0); });
      });
      return tl;
    }
  };

  Book.register({
    id: "metallic",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Metallic bonding: a sea of electrons",
    description: "A grid of positive metal ions with small electrons drifting freely between all of them. Tapping shifts the bottom two rows of ions sideways, like a hammer blow, while the electrons keep drifting around all of them just the same.",
    svg,
    legend: '<span class="dot dot-p" aria-hidden="true"></span>metal ion (+) <span class="dot dot-e" aria-hidden="true"></span>delocalised electron',
    start: "solid",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to hammer the metal", hint: Hint.ring("#ring", "499 275") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.electrons = [];
      const layer = ctx.$("#sea");
      for (let i = 0; i < 26; i++) {
        const x = BOX.x0 + rand() * (BOX.x1 - BOX.x0);
        const y = BOX.y0 + rand() * (BOX.y1 - BOX.y0);
        const angle = rand() * Math.PI * 2, speed = 18 + rand() * 22;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "electron fade");
        el.setAttribute("r", 5);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        d.electrons.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 5, el });
      }
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.electrons, Math.min(dt, 50) / 1000);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#lattice .fade", "#sea circle"], { opacity: 1, duration: 0.6, stagger: 0.01 });
    },

    states: {
      solid: {
        caption: "Metal atoms give up their outer electrons to a shared ‘sea’ that drifts freely between all of them. Tap to hammer this piece of metal.",
        footnote: "The ions left behind are positive; the sea of electrons holds the whole structure together.",
        tap: hammer
      },
      bent: {
        caption: "The layers of ions slid past each other — but the electron sea doesn't care whose layer it's near, so the metal bends instead of breaking.",
        footnote: "That's why metals can be hammered and bent into shape. An ionic solid struck this way would shatter instead.",
        back: unhammer,
        final: true
      }
    }
  });
})();
;
/* ---- pages/11-periodic.js ---- */
// Page 11: walking across the periodic table. Atomic radius shrinks across period 3: each element
// has one more proton than the last, pulling the same outer shell in a little tighter.

(() => {
  const BASE_Y = 340; // every atom's bottom edge sits on this line
  const START_R = 46; // all atoms start this size, then shrink to their real relative size
  // Atomic (covalent) radii in pm from the IB data booklet, section 10, drawn in proportion
  // (sodium, the biggest, keeps START_R). Argon's 101 pm is a hair bigger than chlorine's 100 pm.
  const PM = { Na: 160, Mg: 140, Al: 124, Si: 114, P: 109, S: 104, Cl: 100, Ar: 101 };
  const ELEMENTS = Object.entries(PM).map(([sym, pm]) => ({ sym, pm, r: START_R * pm / PM.Na }));
  const X0 = 140, DX = 100;

  const atoms = ELEMENTS.map((e, i) => ({ ...e, x: X0 + i * DX }));

  const svg = `
    <line class="axis-line fade" x1="${X0 - 40}" y1="${BASE_Y}" x2="${X0 + (ELEMENTS.length - 1) * DX + 40}" y2="${BASE_Y}"/>
    ${atoms.map((a, i) => `
      <circle class="proton fade" id="atom${i}" cx="${a.x}" cy="${BASE_Y - START_R}" r="${START_R}"/>
      <text class="nuc-sym fade" id="sym${i}" x="${a.x}" y="${BASE_Y - START_R}">${a.sym}</text>`).join("")}
    <rect class="tap-ring" id="ring" x="72" y="226" width="836" height="136" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="240" r="480"/>`;

  const shrink = {
    hotspot: "hit", to: "shown", sound: "zwoop", captionAt: 1.6,
    play(ctx) {
      const tl = gsap.timeline();
      atoms.forEach((a, i) => {
        tl.to("#atom" + i, { attr: { r: a.r, cy: BASE_Y - a.r }, duration: 0.6, ease: "power2.out" }, i * 0.12)
          .to("#sym" + i, { attr: { y: BASE_Y - a.r }, duration: 0.6, ease: "power2.out" }, i * 0.12)
          .call(() => Sound.pop(), null, i * 0.12 + 0.5);
      });
      return tl;
    }
  };

  Book.register({
    id: "periodic",
    topic: "Structure 3 — Classification of matter",
    title: "Walking across the periodic table: trends in atom size",
    description: "Eight atoms in a row, sodium to argon, all starting the same size. Tapping shrinks them one after another from left to right to their sizes in proportion to the IB data booklet's radii: sodium the largest, getting steadily smaller to chlorine, with argon a hair bigger than chlorine, all sitting on the same baseline.",
    svg,
    start: "same",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to see how atom size changes across a period", hint: Hint.ring("#ring", "490 294") }],

    intro() {
      return gsap.to(["circle.proton.fade", "text.nuc-sym.fade", "line.fade"], { opacity: 1, duration: 0.6, stagger: 0.05 });
    },

    idle() {
      atoms.forEach((a, i) => {
        gsap.to("#atom" + i, { scale: 1.04, svgOrigin: a.x + " " + BASE_Y, duration: 2 + i * 0.15, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },

    states: {
      same: {
        caption: "Here are eight atoms, sodium through to argon, drawn the same size to start. Tap to see how they really compare.",
        tap: shrink
      },
      shown: {
        caption: "Each atom has one more proton than the last, pulling the very same outer shell in a little tighter. So atoms get smaller as you move across a period.",
        footnote: "Argon breaks the pattern by a whisker: noble gases hardly ever bond, so their radii are estimated differently and don't compare neatly. The sizes are in proportion to each other; the atoms themselves are, of course, not to scale.",
        booklet: "§10 atomic radii (pm): Na 160, Mg 140, Al 124, Si 114, P 109, S 104, Cl 100, Ar 101.",
        final: true
      }
    }
  });
})();
;
/* ---- pages/12-functional.js ---- */
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
;
/* ---- pages/13-energy.js ---- */
// Page 13: exothermic vs endothermic. A ball rolls along an energy profile. Roll downhill and energy
// is released to the surroundings (exothermic); roll uphill and energy is taken in (endothermic).

(() => {
  const X0 = 230, XHUMP = 500, X1 = 770;
  const REACT_Y = 290, HUMP_Y = 120;
  const EXO_PROD_Y = 360, ENDO_PROD_Y = 190;
  const BALL_R = 16;
  const BRACKET_X = 195;

  // A single quadratic actually peaks well below its control point (at t=0.5 the curve only reaches
  // a quarter/half/quarter blend of the three points), which is why the original curve looked so
  // flat: it used HUMP_Y as the control height and never actually rose that far. XHUMP sits exactly
  // midway between X0 and X1, so the curve's highest point always falls at x=XHUMP — solving that
  // blend backwards for the control height makes the curve actually pass through (XHUMP, HUMP_Y).
  const path = (py) => {
    const cy = 2 * HUMP_Y - 0.5 * (REACT_Y + py);
    return `M ${X0} ${REACT_Y} Q ${XHUMP} ${cy} ${X1} ${py}`;
  };

  const svg = `
    <path class="axis-line fade" d="M 160 400 L 160 130 M 155 140 L 160 128 L 165 140" />
    <text class="graph-label fade" x="150" y="120" text-anchor="end">energy</text>
    <path class="axis-line fade" d="M 160 400 L 850 400 M 838 395 L 850 400 L 838 405" />
    <text class="graph-label fade" x="500" y="430">reaction progress</text>

    <g id="eaBracket" class="fade">
      <line class="axis-line" x1="${BRACKET_X}" y1="${REACT_Y}" x2="${BRACKET_X}" y2="${HUMP_Y}" stroke-width="2" opacity="0.55"/>
      <path d="M ${BRACKET_X - 5} ${REACT_Y - 9} L ${BRACKET_X} ${REACT_Y} L ${BRACKET_X + 5} ${REACT_Y - 9}" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M ${BRACKET_X - 5} ${HUMP_Y + 9} L ${BRACKET_X} ${HUMP_Y} L ${BRACKET_X + 5} ${HUMP_Y + 9}" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>
      <text class="graph-label" x="${BRACKET_X - 14}" y="${(REACT_Y + HUMP_Y) / 2}" transform="rotate(-90 ${BRACKET_X - 14} ${(REACT_Y + HUMP_Y) / 2})">activation energy</text>
    </g>

    <path id="pathExo" d="${path(EXO_PROD_Y)}" fill="none" stroke="var(--heat)" stroke-width="4" opacity="0"/>
    <path id="pathEndo" d="${path(ENDO_PROD_Y)}" fill="none" stroke="var(--electron)" stroke-width="4" opacity="0"/>

    <text class="graph-label fade" x="${X0}" y="${REACT_Y + 26}">reactants</text>
    <text class="graph-label" id="prodLabel" x="${X1}" y="${EXO_PROD_Y + 26}" opacity="0">products</text>

    <circle class="ball fade" id="ball" cx="${X0}" cy="${REACT_Y}" r="${BALL_R}"/>
    <rect class="tap-ring" id="ring" x="160" y="95" width="690" height="335" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="270" r="420"/>`;

  // Moves the ball along a drawn curve by reading points off it (the same method as the catalysts
  // page), so it follows the line exactly. `from`/`to` are fractions of the way along: 0 → 1 rolls
  // forwards, 1 → 0 rolls back.
  function rollAlong(ctx, curveId, duration, from, to) {
    const ball = ctx.$("#ball"), curve = ctx.$("#" + curveId);
    const len = curve.getTotalLength();
    const proxy = { t: from };
    return gsap.to(proxy, {
      t: to, duration, ease: "power1.inOut",
      onUpdate() {
        const p = curve.getPointAtLength(proxy.t * len);
        ball.setAttribute("cx", p.x);
        ball.setAttribute("cy", p.y);
      }
    });
  }

  function roll(ctx, curveId, py, glowColour) {
    const tl = gsap.timeline();
    tl.to("#" + curveId, { opacity: 1, duration: 0.3 }, 0)
      .add(rollAlong(ctx, curveId, 1.4, 0, 1), 0.1)
      .call(() => Sound.pop(), null, 1.5)
      .fromTo("#ball", { fill: glowColour }, { fill: "", duration: 0.8 }, 1.5)
      .to("#prodLabel", { attr: { y: py + 26 }, opacity: 1, duration: 0.3 }, 1.5);
    return tl;
  }

  const toExo = {
    hotspot: "hit", to: "exo", sound: "zwoop", captionAt: 1.7,
    play(ctx) { return roll(ctx, "pathExo", EXO_PROD_Y, "var(--heat)"); }
  };
  const toEndo = {
    hotspot: "hit", to: "endo", sound: "zwoop", captionAt: 1.7,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to("#pathExo", { opacity: 0, duration: 0.3 }, 0)
        .set("#ball", { attr: { cx: X0, cy: REACT_Y } }, 0.3)
        .set("#prodLabel", { opacity: 0 }, 0.3)
        .add(roll(ctx, "pathEndo", ENDO_PROD_Y, "var(--electron)"), 0.4);
      return tl;
    }
  };
  const backToStart = {
    to: "start", sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      return gsap.timeline()
        .to("#prodLabel", { opacity: 0, duration: 0.3 }, 0)
        .set("#ball", { fill: "" }, 0)
        .add(rollAlong(ctx, "pathExo", 1.0, 1, 0), 0)
        .to("#pathExo", { opacity: 0, duration: 0.4 }, 0.9);
    }
  };
  // Back from endothermic: roll back down the endo curve to the reactants, swap curves, then roll
  // forwards along the exo curve, so the ball never cuts across the graph.
  const backToExo = {
    to: "exo", sound: "zwoop-rev", captionAt: 0.5,
    play(ctx) {
      return gsap.timeline()
        .to("#prodLabel", { opacity: 0, duration: 0.3 }, 0)
        .set("#ball", { fill: "" }, 0)
        .add(rollAlong(ctx, "pathEndo", 1.0, 1, 0), 0)
        .to("#pathEndo", { opacity: 0, duration: 0.3 }, 1.0)
        .to("#pathExo", { opacity: 1, duration: 0.3 }, 1.0)
        .add(rollAlong(ctx, "pathExo", 1.0, 0, 1), 1.2)
        .to("#prodLabel", { attr: { y: EXO_PROD_Y + 26 }, opacity: 1, duration: 0.3 }, 2.2);
    }
  };

  Book.register({
    id: "energy",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Exothermic vs endothermic: where does the energy go?",
    description: "A ball sitting at the reactants' energy level on a graph of energy against reaction progress. Tapping rolls it up over a small hump and down to the products' level, which is lower for an exothermic reaction and higher for an endothermic one.",
    svg,
    start: "start",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to run the reaction", hint: Hint.ring("#ring", "505 262") }],

    intro() {
      return gsap.to(["path.axis-line.fade", "text.fade", "#ball", "#eaBracket"], { opacity: 1, duration: 0.6, stagger: 0.05 });
    },

    // Pulses the ball's radius rather than a CSS scale: a scale+svgOrigin tween repeated on an
    // element whose position is separately driven by attribute tweens (the roll) is exactly the bug
    // that broke the functional-groups badge, so every idle "breathing" pulse in this book now goes
    // through the attribute it already owns instead of a transform.
    idle(ctx) {
      const ball = ctx.$("#ball");
      gsap.to(ball, { attr: { r: BALL_R * 1.2 }, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      start: {
        caption: "Some reactions release energy; some take it in. Tap to run a reaction that releases energy.",
        tap: toExo
      },
      exo: {
        caption: "The products end up lower in energy than the reactants. The difference is released as heat, warming the surroundings.",
        booklet: "§14 enthalpies of combustion: burning methane, ΔH<sub>c</sub> = −891 kJ mol⁻¹ — the minus sign means energy released.",
        footnote: "This is an exothermic reaction, like burning fuel. Tap to try one that goes the other way.",
        tap: toEndo,
        back: backToStart
      },
      endo: {
        caption: "This time the products end up higher in energy. The reaction takes heat in from its surroundings to get there.",
        footnote: "This is an endothermic reaction, like the reaction inside an instant cold pack, which is why it feels cold.",
        back: backToExo,
        final: true
      }
    }
  });
})();
;
/* ---- pages/14-collision.js ---- */
// Page 14: collision theory. Two kinds of particle bounce around a box. Most collisions just bounce
// off harmlessly; only a fast, hard enough collision actually reacts, turning both into product.
// Tapping heats the mixture: faster particles collide more often, and more of those collisions succeed.

(() => {
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 400 };
  const N_EACH = 7;
  const THRESHOLD_COOL = 230; // relative speed a collision needs to "succeed" while cool
  const THRESHOLD_HOT = 150;  // ...and while hot (still needs some energy, just an easier bar)

  let seed = 13;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="440">reacted so far: 0</text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="260" r="420"/>`;

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      ctx.data.particles.forEach(p => { if (p.kind !== "product") { p.vx *= 1.7; p.vy *= 1.7; } });
      ctx.data.threshold = THRESHOLD_HOT;
      // Pulse each particle's own radius attribute rather than a CSS scale: the physics ticker keeps
      // writing cx/cy on these same circles every frame while this plays, and a CSS transform pulsing
      // concurrently with that is exactly what let particles visually drift past the walls.
      const tl = gsap.timeline();
      ctx.data.particles.forEach(p => {
        tl.to(p.el, { attr: { r: p.r * 1.4 }, duration: 0.4, ease: "power2.out" }, 0)
          .to(p.el, { attr: { r: p.r }, duration: 0.4, ease: "power2.in" }, 0.4);
      });
      return tl;
    }
  };

  Book.register({
    id: "collision",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Collision theory: why heating speeds things up",
    description: "Red and blue particles bounce around a box. Most collisions just bounce off, but a fast, hard enough collision turns both particles green, a successful reaction. Tapping heats the mixture, so collisions happen more often and more of them succeed.",
    svg,
    legend: '<span class="dot" style="width:18px;height:18px;background:var(--proton)" aria-hidden="true"></span>reactant A <span class="dot" style="width:12px;height:12px;background:var(--electron);border:2px solid var(--ink)" aria-hidden="true"></span>reactant B <span class="dot" style="width:16px;height:16px;background:var(--product);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "cool",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to heat the mixture", hint: Hint.ring("#ring", "500 260") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.reacted = 0;
      d.threshold = THRESHOLD_COOL;
      const layer = ctx.$("#particles");
      // A, B and product differ by more than colour alone (size, and whether they have an outline),
      // so the page still reads without colour.
      const LOOK = {
        A: { r: 9, fill: "var(--proton)", stroke: "none" },
        B: { r: 6, fill: "var(--electron)", stroke: "var(--ink)" },
        product: { r: 8, fill: "var(--product)", stroke: "#fff" }
      };
      const spawn = kind => {
        const look = LOOK[kind];
        for (let i = 0; i < N_EACH; i++) {
          const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
          const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
          const angle = rand() * Math.PI * 2, speed = 60 + rand() * 40;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          el.setAttribute("class", "fade");
          el.setAttribute("r", look.r);
          el.setAttribute("fill", look.fill);
          el.setAttribute("stroke", look.stroke);
          el.setAttribute("stroke-width", 2);
          el.setAttribute("cx", x); el.setAttribute("cy", y);
          layer.appendChild(el);
          d.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: look.r, el, kind });
        }
      };
      spawn("A");
      spawn("B");

      const onCollide = (a, b, speed) => {
        if (a.kind === "product" || b.kind === "product" || a.kind === b.kind) return;
        if (speed < d.threshold) return;
        [a, b].forEach(p => {
          p.kind = "product"; p.r = LOOK.product.r;
          p.el.setAttribute("fill", LOOK.product.fill);
          p.el.setAttribute("stroke", LOOK.product.stroke);
          p.el.setAttribute("r", LOOK.product.r);
          // The new radius can be bigger than the one that was inside the walls a moment ago —
          // reclamp now rather than waiting for next frame's step() to catch it.
          p.x = Math.min(Math.max(p.x, BOX.x0 + p.r), BOX.x1 - p.r);
          p.y = Math.min(Math.max(p.y, BOX.y0 + p.r), BOX.y1 - p.r);
          p.el.setAttribute("cx", p.x.toFixed(1));
          p.el.setAttribute("cy", p.y.toFixed(1));
        });
        d.reacted += 2;
        ctx.$("#counter").textContent = "reacted so far: " + d.reacted;
        Sound.pop();
      };
      d.render = (time, dt) => {
        if (!ctx.reduceMotion) d.box.step(d.particles, Math.min(dt, 50) / 1000, onCollide);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      cool: {
        caption: "Only a fast, head-on enough collision actually reacts — most just bounce off. Tap to heat things up.",
        footnote: "This is collision theory: particles must collide with enough energy, not just collide at all.",
        tap: heat
      },
      hot: {
        caption: "Heating makes particles move faster. They collide more often, and more of those collisions now have enough energy to react.",
        footnote: "That combination — more collisions, and a bigger share of them succeeding — is why heating speeds a reaction up so much.",
        final: true
      }
    }
  });
})();
;
/* ---- pages/14a-maxwell.js ---- */
// Maxwell–Boltzmann distribution. Particles are "measured" one at a time and drop into a histogram of
// kinetic energy, the same keep-sampling-until-it-settles idea as the mass-spec page. Heating re-measures
// them: the curve flattens and stretches right, and far more of it lies past the activation energy.
//
// Bar heights are exact, not random: each bin gets its share of N from the real 3D energy distribution
// (largest-remainder rounding so they add up to N). Only the order the particles arrive in is shuffled.
//
// The last step is a "now you try" step: a slider sets the temperature and the curve, the shaded part past the
// activation energy and its percentage follow live, from the exact distribution (not the 200-particle sample).

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const N = 200;
  const BIN_W = 0.5, BINS = 20;              // energy bins 0–10, in units where the cool gas has kT = 1
                                              // (wide enough that the last bin's share of the tail is ~1 particle)
  const T_COOL = 1, T_HOT = 1.6;
  const EA = 4.5;                             // activation energy, on a bin boundary
  const EA_BIN = EA / BIN_W;                  // first bin past the line
  const CHART = { x0: 170, x1: 870, base: 400, top: 125 };
  const PX = 5;                               // bar height per particle
  const BIN_PX = (CHART.x1 - CHART.x0) / BINS;
  const eX = e => CHART.x0 + (e / (BIN_W * BINS)) * (CHART.x1 - CHART.x0);
  const EA_X = eX(EA);

  let seed = 17;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Abramowitz & Stegun 7.1.26 (error < 1.5e-7), for x >= 0.
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * x);
    return 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  }
  // 3D Maxwell–Boltzmann in energy (k = 1): density, and the fraction of particles below E.
  const pdf = (E, T) => 2 * Math.sqrt(E / Math.PI) * Math.pow(T, -1.5) * Math.exp(-E / T);
  const cdf = (E, T) => { const x = E / T; return erf(Math.sqrt(x)) - 2 * Math.sqrt(x / Math.PI) * Math.exp(-x); };

  function binCounts(T) {
    // The share beyond the chart's right edge (under 0.6% even when hot) is spread back over the bins
    // by rescaling, rather than piled into the last bar where it would show as a fake spike.
    const shown = cdf(BINS * BIN_W, T);
    const exact = [];
    for (let i = 0; i < BINS; i++) exact.push(N * (cdf((i + 1) * BIN_W, T) - cdf(i * BIN_W, T)) / shown);
    const c = exact.map(Math.floor);
    const left = N - c.reduce((a, b) => a + b, 0);
    exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => c[i]++);
    return c;
  }
  const COOL = binCounts(T_COOL), HOT = binCounts(T_HOT);
  const T_MIN = 1, T_MAX = 2.2, T_ROOM_K = 300;          // slider range, in units of the cool gas's kT; the cool gas is 300 K
  const tailFraction = T => 1 - cdf(EA, T);              // the exact fraction with energy above Ea
  const pastEa = c => c.slice(EA_BIN).reduce((a, b) => a + b, 0);
  const curveY = (E, T) => CHART.base - PX * N * BIN_W * pdf(E, T);

  function curvePath(T) {
    let d = "";
    for (let k = 0; k <= 180; k++) {
      const E = (k / 180) * BIN_W * BINS;
      d += (k ? " L " : "M ") + eX(E).toFixed(1) + " " + curveY(E, T).toFixed(1);
    }
    return d;
  }

  const bars = Array.from({ length: BINS }, (_, i) =>
    `<rect id="bin${i}" x="${(CHART.x0 + i * BIN_PX + 2).toFixed(1)}" y="${CHART.base}" width="${(BIN_PX - 4).toFixed(1)}" height="0" rx="2" fill="${i >= EA_BIN ? "var(--heat)" : "var(--ion)"}"/>`).join("");

  const svg = `
    <path class="axis-line fade" d="M ${CHART.x0 - 10} ${CHART.base} L ${CHART.x0 - 10} ${CHART.top} M ${CHART.x0 - 15} ${CHART.top + 12} L ${CHART.x0 - 10} ${CHART.top} L ${CHART.x0 - 5} ${CHART.top + 12}"/>
    <path class="axis-line fade" d="M ${CHART.x0 - 10} ${CHART.base} L ${CHART.x1 + 20} ${CHART.base} M ${CHART.x1 + 8} ${CHART.base - 5} L ${CHART.x1 + 20} ${CHART.base} L ${CHART.x1 + 8} ${CHART.base + 5}"/>
    <text class="graph-label fade" x="${(CHART.x0 + CHART.x1) / 2}" y="${CHART.base + 30}">kinetic energy</text>
    <text class="graph-label fade" x="${CHART.x0 - 26}" y="${(CHART.base + CHART.top) / 2}" transform="rotate(-90 ${CHART.x0 - 26} ${(CHART.base + CHART.top) / 2})">number of particles</text>

    <g id="bars">${bars}</g>
    <g id="drops"></g>

    <path id="curveCool" d="${curvePath(T_COOL)}" fill="none" stroke="var(--electron)" stroke-width="3" stroke-linejoin="round" opacity="0"/>
    <path id="curveHot" d="${curvePath(T_HOT)}" fill="none" stroke="var(--heat)" stroke-width="3" stroke-linejoin="round" opacity="0"/>
    <text class="graph-label" id="labelCool" x="${eX(1.2)}" y="${curveY(1.2, T_COOL) - 14}" opacity="0">cooler</text>
    <text class="graph-label" id="labelHot" x="${eX(3.2)}" y="${curveY(3.2, T_HOT) - 18}" opacity="0">hotter</text>

    <g class="fade">
      <line x1="${EA_X}" y1="${CHART.base}" x2="${EA_X}" y2="${CHART.top}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 6"/>
      <text class="graph-label" x="${EA_X}" y="${CHART.top - 10}">activation energy</text>
    </g>
    <text class="graph-label fade" x="740" y="175">enough energy to react:</text>
    <text class="molecule-label fade" id="count" x="740" y="203">–</text>

    <g id="live" opacity="0">
      <path id="liveArea" fill="var(--heat)" fill-opacity="0.35"/>
      <path id="liveCurve" fill="none" stroke="var(--heat)" stroke-width="3" stroke-linejoin="round"/>
      <text class="graph-label" x="710" y="268">temperature</text>
      <text class="molecule-label" id="liveTemp" x="710" y="352">–</text>
      <text class="graph-label" id="liveRatio" x="740" y="231"></text>
      ${Kit.sliderMarkup("tslider", 560, 860, 300, "Temperature")}
    </g>

    <rect class="tap-ring" id="ring" x="120" y="95" width="780" height="360" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="510" cy="265" r="500"/>`;

  // Redraw the live curve, its shaded tail and the readouts for temperature T (kT units).
  function drawLive(ctx, T) {
    ctx.$("#liveCurve").setAttribute("d", curvePath(T));
    let a = "M " + EA_X.toFixed(1) + " " + CHART.base;
    for (let k = 0; k <= 60; k++) {
      const E = EA + (k / 60) * (BIN_W * BINS - EA);
      a += " L " + eX(E).toFixed(1) + " " + curveY(E, T).toFixed(1);
    }
    ctx.$("#liveArea").setAttribute("d", a + " L " + CHART.x1 + " " + CHART.base + " Z");
    const f = tailFraction(T);
    ctx.$("#count").textContent = (100 * f).toFixed(f < 0.1 ? 1 : 0) + " %";
    ctx.$("#liveTemp").textContent = Math.round(T * T_ROOM_K) + " K";
    const x = f / tailFraction(T_MIN);
    ctx.$("#liveRatio").textContent = x < 1.05 ? "(the same as at 300 K)" : "(about ×" + (x < 10 ? x.toFixed(1) : Math.round(x)) + " compared with 300 K)";
  }

  function setCount(ctx, n) { ctx.$("#count").textContent = n + " of " + N; }

  // Drop one particle per entry of `counts` into its bar, in shuffled order. Each landing raises the
  // bar by one step and updates the "enough energy" count.
  function measure(ctx, tl, counts, t0) {
    const order = [];
    counts.forEach((n, bin) => { for (let k = 0; k < n; k++) order.push(bin); });
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

    const heights = new Array(BINS).fill(0);
    let past = 0;
    const layer = ctx.$("#drops");
    order.forEach((bin, k) => {
      heights[bin]++;
      const h = heights[bin] * PX;
      const at = t0 + k * 0.012;
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", (CHART.x0 + (bin + 0.5) * BIN_PX + (rand() - 0.5) * (BIN_PX - 14)).toFixed(1));
      dot.setAttribute("cy", CHART.top + 10);
      dot.setAttribute("r", 3.5);
      dot.setAttribute("fill", bin >= EA_BIN ? "var(--heat)" : "var(--ion)");
      dot.setAttribute("opacity", 0);
      layer.appendChild(dot);
      tl.set(dot, { opacity: 1 }, at)
        .to(dot, { attr: { cy: CHART.base - h }, duration: 0.3, ease: "power2.in" }, at)
        .call(() => {
          const bar = ctx.$("#bin" + bin);
          bar.setAttribute("y", CHART.base - h);
          bar.setAttribute("height", h);
          dot.remove();
          if (bin >= EA_BIN) setCount(ctx, ++past);
          if (k % 25 === 0) Sound.pop();
        }, null, at + 0.3);
    });
    return t0 + order.length * 0.012 + 0.3;
  }

  function setBars(tl, counts, at) {
    counts.forEach((n, i) => tl.to("#bin" + i, { attr: { y: CHART.base - n * PX, height: n * PX }, duration: 0.4, ease: "power2.inOut" }, at));
  }

  const measureCool = {
    hotspot: "hit", to: "cool", sound: "pop",
    captionAt: 0.3 + N * 0.012 + 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      setCount(ctx, 0);
      const end = measure(ctx, tl, COOL, 0.3);
      tl.to(["#curveCool", "#labelCool"], { opacity: 1, duration: 0.6 }, end);
      return tl;
    }
  };

  const heat = {
    hotspot: "hit", to: "hot", sound: "zwoop",
    captionAt: 0.6 + N * 0.012 + 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      ctx.$("#curveCool").setAttribute("stroke-dasharray", "6 6");
      tl.to("#curveCool", { opacity: 0.6, duration: 0.4 }, 0);
      setBars(tl, new Array(BINS).fill(0), 0);
      tl.call(() => setCount(ctx, 0), null, 0.4);
      const end = measure(ctx, tl, HOT, 0.6);
      tl.to(["#curveHot", "#labelHot"], { opacity: 1, duration: 0.6 }, end);
      return tl;
    }
  };

  const unmeasure = {
    to: "empty", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      setBars(tl, new Array(BINS).fill(0), 0);
      tl.to(["#curveCool", "#labelCool"], { opacity: 0, duration: 0.4 }, 0)
        .call(() => { ctx.$("#count").textContent = "–"; }, null, 0.4);
      return tl;
    }
  };

  // "Now you try": swap the histogram for a live curve with a temperature slider.
  const tryIt = {
    hotspot: "hit", to: "play", sound: "zwoop", captionAt: 0.4,
    play(ctx) {
      const tl = gsap.timeline();
      setBars(tl, new Array(BINS).fill(0), 0);
      tl.to(["#curveCool", "#labelCool", "#curveHot", "#labelHot"], { opacity: 0, duration: 0.4 }, 0);
      drawLive(ctx, ctx.data.slider.get());
      tl.to("#live", { opacity: 1, duration: 0.6 }, 0.4);
      tl.call(() => ctx.$("#tslider").setAttribute("tabindex", "0"), null, 0.4);
      return tl;
    }
  };
  const leavePlay = {
    to: "hot", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      ctx.$("#tslider").setAttribute("tabindex", "-1");
      tl.to("#live", { opacity: 0, duration: 0.4 }, 0);
      setBars(tl, HOT, 0.2);
      tl.to(["#curveHot", "#labelHot", "#labelCool"], { opacity: 1, duration: 0.4 }, 0.2)
        .to("#curveCool", { opacity: 0.6, duration: 0.4 }, 0.2)
        .call(() => setCount(ctx, pastEa(HOT)), null, 0.4);
      return tl;
    }
  };

  const cool = {
    to: "cool", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      const tl = gsap.timeline();
      ctx.$("#curveCool").removeAttribute("stroke-dasharray");
      setBars(tl, COOL, 0);
      tl.to(["#curveHot", "#labelHot"], { opacity: 0, duration: 0.4 }, 0)
        .to("#curveCool", { opacity: 1, duration: 0.4 }, 0)
        .call(() => setCount(ctx, pastEa(COOL)), null, 0.4);
      return tl;
    }
  };

  Book.register({
    id: "maxwell",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Maxwell–Boltzmann: why a little heat goes a long way",
    description: "An empty bar chart of kinetic energy, with a dashed vertical line marking the activation energy. Tapping measures 200 gas particles one at a time: each drops into a bar, building a lopsided hump with a long tail to the right, and a smooth curve appears over it. Only a few particles land past the activation-energy line. Tapping again heats the gas and measures again: the new curve is lower, wider and shifted right, with the same area, and many more particles land past the line.",
    svg,
    start: "empty",

    setup(ctx) {
      ctx.$("#tslider").setAttribute("tabindex", "-1");
      ctx.data.slider = Kit.slider(ctx, "tslider", { min: T_MIN, max: T_MAX, value: T_HOT, step: 0.01, onInput: T => drawLive(ctx, T) });
    },

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to measure the particles' energies", hint: Hint.ring("#ring", "510 275") }],

    states: {
      empty: {
        caption: "In a gas, particles don't all have the same energy. Tap to measure a couple of hundred of them, one at a time.",
        footnote: "Not to scale: a real sample has vastly more particles, which is why the real curve is perfectly smooth.",
        tap: measureCool
      },
      cool: {
        caption: "Most have modest energy. Only the few in the long tail, past the dashed line, have enough to react. Tap to heat the gas.",
        footnote: "Here that's " + pastEa(COOL) + " of " + N + ". This spread is called the Maxwell–Boltzmann distribution.",
        tap: heat,
        back: unmeasure
      },
      hot: {
        caption: "Hotter, the curve gets lower and stretches right. It's the same particles, so the same area — but far more of them now sit past the line. Tap to try it yourself.",
        booklet: "§1 equations (HL): the Arrhenius equation, k = Ae<sup>−Ea/RT</sup> — raise T and the rate constant k climbs steeply.",
        footnote: "From " + pastEa(COOL) + " to " + pastEa(HOT) + " out of " + N + ": a modest temperature rise multiplies the number that can react. That's why heating speeds reactions up so much.",
        tap: tryIt,
        back: cool
      },
      play: {
        caption: "Your turn: drag the slider to change the temperature. Watch the curve flatten and stretch as it gets hotter, while the shaded part past the dashed line, the particles that can react, grows quickly.",
        footnote: "Temperatures here are for the model, with the cool gas as 300 K. The shaded fraction comes from the exact Maxwell–Boltzmann distribution, not from the 200 particles above.",
        back: leavePlay,
        final: true
      }
    }
  });
})();
;
/* ---- pages/14b-catalysts.js ---- */
// Catalysts. The same energy profile as the exo/endothermic page, then a second, lower hump drawn over
// it: same reactants, same products, a smaller activation energy. The ball then rolls the easier route.

(() => {
  const X0 = 280, XHUMP = 550, X1 = 820;      // XHUMP is exactly midway, so each curve peaks at x = XHUMP
  const REACT_Y = 290, PROD_Y = 360;
  const PEAK = 120, PEAK_CAT = 215;
  const BALL_R = 16;
  const EA_X = 195, EA_CAT_X = 245;          // the two activation-energy brackets beside the axis

  // Same maths as pages/13-energy.js: pick the control point so the curve really peaks at `peak`.
  const path = peak => {
    const cy = 2 * peak - 0.5 * (REACT_Y + PROD_Y);
    return `M ${X0} ${REACT_Y} Q ${XHUMP} ${cy} ${X1} ${PROD_Y}`;
  };

  const bracket = (x, top, colour) => `
      <line x1="${x}" y1="${REACT_Y}" x2="${x}" y2="${top}" stroke="${colour}" stroke-width="2"/>
      <path d="M ${x - 5} ${REACT_Y - 9} L ${x} ${REACT_Y} L ${x + 5} ${REACT_Y - 9}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M ${x - 5} ${top + 9} L ${x} ${top} L ${x + 5} ${top + 9}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const guide = (x1, x2, y) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--ink)" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="4 6"/>`;
  const sideLabel = (x, y, text) => `<text class="graph-label" x="${x}" y="${y}" transform="rotate(-90 ${x} ${y})">${text}</text>`;

  const svg = `
    <path class="axis-line fade" d="M 160 400 L 160 130 M 155 140 L 160 128 L 165 140" />
    <text class="graph-label fade" x="150" y="120" text-anchor="end">energy</text>
    <path class="axis-line fade" d="M 160 400 L 850 400 M 838 395 L 850 400 L 838 405" />
    <text class="graph-label fade" x="500" y="430">reaction progress</text>

    <g id="uncat" class="fade">
      ${guide(EA_X, XHUMP, PEAK)}
      ${guide(EA_X, X0, REACT_Y)}
      <g opacity="0.7">${bracket(EA_X, PEAK, "var(--ink)")}</g>
      ${sideLabel(EA_X - 14, (REACT_Y + PEAK) / 2, "Ea without catalyst")}
      <path id="pathSlow" d="${path(PEAK)}" fill="none" stroke="var(--electron)" stroke-width="4" stroke-linecap="round"/>
    </g>

    <g id="cat" opacity="0">
      ${guide(EA_CAT_X, XHUMP, PEAK_CAT)}
      ${bracket(EA_CAT_X, PEAK_CAT, "var(--product)")}
      ${sideLabel(EA_CAT_X - 14, (REACT_Y + PEAK_CAT) / 2, "Ea with catalyst")}
      <path id="pathCat" d="${path(PEAK_CAT)}" fill="none" stroke="var(--product)" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 8"/>
    </g>

    <text class="graph-label fade" x="${X0}" y="${REACT_Y + 26}">reactants</text>
    <text class="graph-label fade" x="${X1}" y="${PROD_Y + 26}">products</text>

    <circle class="ball fade" id="ball" cx="${X0}" cy="${REACT_Y}" r="${BALL_R}"/>
    <rect class="tap-ring" id="ring" x="160" y="95" width="690" height="335" rx="40" opacity="0"/>
    <circle class="hit" id="hit" cx="505" cy="262" r="480"/>`;

  // Rolls the ball along a drawn path by reading points off it (no motion-path plugin needed).
  function rollAlong(ball, pathEl, duration) {
    const len = pathEl.getTotalLength();
    const proxy = { t: 0 };
    return gsap.to(proxy, {
      t: 1, duration, ease: "power1.inOut",
      onUpdate() {
        const p = pathEl.getPointAtLength(proxy.t * len);
        ball.setAttribute("cx", p.x);
        ball.setAttribute("cy", p.y);
      }
    });
  }

  const addCatalyst = {
    hotspot: "hit", to: "catalysed", sound: "zwoop", captionAt: 0.8,
    play(ctx) {
      return gsap.timeline()
        .to("#cat", { opacity: 1, duration: 0.7 }, 0)
        .add(rollAlong(ctx.$("#ball"), ctx.$("#pathCat"), 1.8), 0.8)
        .call(() => Sound.pop(), null, 2.6);
    }
  };

  const removeCatalyst = {
    to: "slow", sound: "zwoop-rev", captionAt: 0.3,
    play() {
      return gsap.timeline()
        .to("#cat", { opacity: 0, duration: 0.5 }, 0)
        .to("#ball", { attr: { cx: X0, cy: REACT_Y }, duration: 0.6, ease: "power2.inOut" }, 0);
    }
  };

  Book.register({
    id: "catalysts",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Catalysts: a lower hump to get over",
    description: "An energy profile: a ball sits at the reactants' level, with a tall hump before the lower products' level. A bracket beside the energy axis marks the activation energy. Tapping adds a catalyst: a second, dashed green curve appears with a much lower hump between the same reactants and products, with its own smaller activation-energy bracket, and the ball rolls over the lower hump to the products.",
    svg,
    start: "slow",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to add a catalyst", hint: Hint.ring("#ring", "505 262") }],

    idle(ctx) {
      gsap.to(ctx.$("#ball"), { attr: { r: BALL_R * 1.2 }, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      slow: {
        caption: "To react, particles need enough energy to get over this hump: the activation energy. Tap to add a catalyst.",
        footnote: "The ball is a stand-in for the reacting particles, not a real thing rolling anywhere.",
        tap: addCatalyst
      },
      catalysed: {
        caption: "A catalyst gives the reaction a different route with a lower hump. Same start, same finish, but far less energy needed to get over.",
        booklet: "§1 equations (HL): in k = Ae<sup>−Ea/RT</sup>, a smaller Ea gives a larger rate constant k.",
        footnote: "The catalyst comes out unchanged, and the overall energy change stays the same. With a lower hump, many more particles have enough energy — see the Maxwell–Boltzmann page.",
        back: removeCatalyst,
        final: true
      }
    }
  });
})();
;
/* ---- pages/15-equilibrium.js ---- */
// Page 15: equilibrium. Particles keep switching between reactant and product in both directions.
// Tap starts a reaction with equal forward/reverse rates, settling close to half and half. Further
// taps swap in a reaction with skewed rate constants, so the same particles resettle favouring
// product, then favouring reactant — the equilibrium constant K, shown as a live shift rather than
// three separate reactions.

(() => {
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 380 };
  const N = 20;
  // Three reactions that differ only in their rate constants — the whole idea behind an equilibrium
  // constant K = rateF/rateR. Equal rates settle close to half and half; skewed rates settle skewed.
  const SCENARIOS = {
    balanced: { rateF: 0.22, rateR: 0.22 },
    favorsProduct: { rateF: 0.34, rateR: 0.09 },
    favorsReactant: { rateF: 0.09, rateR: 0.34 }
  };

  let seed = 21;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const expWait = rate => -Math.log(1 - rand()) / rate;

  // Reactant and product differ by more than colour (size, and an outline on product), so the
  // page still reads without colour.
  const LOOK = {
    reactant: { r: 6, fill: "var(--electron)", stroke: "none" },
    product: { r: 9, fill: "var(--heat)", stroke: "#fff" }
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="420">reactant 20 : 0 product</text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  // Re-aims every particle's next flip at the new rates (exponential waits are memoryless, so this
  // is a clean restart, not a discontinuity) — used both to start the reaction and to swap in a
  // different reaction's rate constants without resetting the particles themselves.
  function retarget(ctx, rates) {
    const d = ctx.data;
    d.rateF = rates.rateF; d.rateR = rates.rateR;
    d.particles.forEach(p => { p.flipAt = d.t + expWait(p.kind === "reactant" ? d.rateF : d.rateR); });
  }

  const start = {
    hotspot: "hit", to: "balanced", sound: "zwoop", captionAt: 0.4,
    play(ctx) { ctx.data.running = true; ctx.data.t = 0; retarget(ctx, SCENARIOS.balanced); return gsap.timeline(); }
  };

  const shiftTo = (scenario, toState) => ({
    hotspot: "hit", to: toState, sound: "zwoop", captionAt: 0.4,
    play(ctx) { retarget(ctx, SCENARIOS[scenario]); return gsap.timeline(); }
  });

  const shiftBackTo = (scenario, toState) => ({
    to: toState, sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) { retarget(ctx, SCENARIOS[scenario]); return gsap.timeline(); }
  });

  const reset = {
    to: "before", sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) {
      const d = ctx.data;
      d.running = false;
      d.particles.forEach(p => {
        if (p.kind !== "reactant") {
          d.counts[p.kind]--; d.counts.reactant++; p.kind = "reactant"; p.r = LOOK.reactant.r;
          p.el.setAttribute("fill", LOOK.reactant.fill);
          p.el.setAttribute("stroke", LOOK.reactant.stroke);
          p.el.setAttribute("r", LOOK.reactant.r);
        }
      });
      ctx.$("#counter").textContent = "reactant " + d.counts.reactant + " : " + d.counts.product + " product";
      return gsap.timeline();
    }
  };

  Book.register({
    id: "equilibrium",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Equilibrium: a reaction that runs both ways at once",
    description: "Twenty particles bouncing in a box, all starting as reactant (blue). Tapping starts the reaction: particles keep switching to product (orange) and back again in both directions, settling close to half and half. Further taps swap in a reaction with different rate constants, so the same particles settle skewed toward product, then skewed toward reactant, showing how an equilibrium constant sets which side a reaction favours.",
    svg,
    legend: '<span class="dot" style="width:12px;height:12px;background:var(--electron)" aria-hidden="true"></span>reactant <span class="dot" style="width:18px;height:18px;background:var(--heat);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "before",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to run or shift the reaction", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.running = false;
      d.t = 0;
      d.rateF = SCENARIOS.balanced.rateF;
      d.rateR = SCENARIOS.balanced.rateR;
      d.counts = { reactant: N, product: 0 };
      const layer = ctx.$("#particles");
      for (let i = 0; i < N; i++) {
        const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
        const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
        const angle = rand() * Math.PI * 2, speed = 40 + rand() * 30;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("class", "fade");
        el.setAttribute("r", LOOK.reactant.r);
        el.setAttribute("fill", LOOK.reactant.fill);
        el.setAttribute("stroke", "none");
        el.setAttribute("stroke-width", 2);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: LOOK.reactant.r, el, kind: "reactant", flipAt: Infinity };
        d.particles.push(p);
      }
      const setKind = (p, kind) => {
        d.counts[p.kind]--; p.kind = kind; d.counts[kind]++;
        const look = LOOK[kind];
        p.el.setAttribute("fill", look.fill);
        p.el.setAttribute("stroke", look.stroke);
        p.el.setAttribute("r", look.r);
        p.r = look.r;
        p.flipAt = d.t + expWait(kind === "reactant" ? d.rateF : d.rateR);
        ctx.$("#counter").textContent = "reactant " + d.counts.reactant + " : " + d.counts.product + " product";
      };
      d.render = (time, dt) => {
        if (ctx.reduceMotion) return;
        const step = Math.min(dt, 50) / 1000;
        d.box.step(d.particles, step);
        if (!d.running) return;
        d.t += step;
        d.particles.forEach(p => { if (d.t >= p.flipAt) setKind(p, p.kind === "reactant" ? "product" : "reactant"); });
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      before: {
        caption: "Right now, everything here is reactant. Tap to start a reaction where the forward and reverse rates are equal.",
        tap: start
      },
      balanced: {
        caption: "Particles keep converting both ways. With equal rates each way, the split settles close to half and half.",
        footnote: "That's dynamic equilibrium: the two rates end up equal, so the amounts stop changing, even though individual particles never stop switching.",
        tap: shiftTo("favorsProduct", "favorsProduct"),
        back: reset
      },
      favorsProduct: {
        caption: "Same box, same particles — only the rate constants changed. Converting to product faster than back means it settles with far more product than reactant.",
        footnote: "Chemists write this reaction's equilibrium constant as K = [product] / [reactant]. A reaction like this one has a large K.",
        tap: shiftTo("favorsReactant", "favorsReactant"),
        back: shiftBackTo("balanced", "balanced")
      },
      favorsReactant: {
        caption: "Flip the rates the other way and the same reaction settles with mostly reactant left instead.",
        footnote: "A small K this time — same idea, just run the other way. Which side a reaction “prefers” at equilibrium is exactly what K measures.",
        back: shiftBackTo("favorsProduct", "favorsProduct"),
        final: true
      }
    }
  });
})();
;
/* ---- pages/15b-lechatelier.js ---- */
// Le Châtelier's principle. A box already at equilibrium (equal forward and reverse rates, so it sits
// near half and half). Tap to pour in extra reactant: more converts forward than back until the split
// evens out again. Tap to take all the product away: the reaction makes more to replace it. Each
// particle flips on its own random clock, so the shift is real behaviour, not a scripted animation.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const BOX = { x0: 190, y0: 120, x1: 810, y1: 380 };
  const RATE = 0.22;          // per second, both directions (so K = 1: equilibrium at equal amounts)
  const START = 20, ADD = 10;

  let seed = 29;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const expWait = () => -Math.log(1 - rand()) / RATE;

  // Same looks as the equilibrium page: they differ in size and outline, not just colour.
  const LOOK = {
    reactant: { r: 6, fill: "var(--electron)", stroke: "none" },
    product: { r: 9, fill: "var(--heat)", stroke: "#fff" }
  };

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <g id="particles"></g>
    <text class="graph-label fade" id="counter" x="500" y="420"></text>
    <rect class="tap-ring" id="ring" x="${BOX.x0 - 24}" y="${BOX.y0 - 24}" width="${BOX.x1 - BOX.x0 + 48}" height="${BOX.y1 - BOX.y0 + 48}" rx="34" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="250" r="420"/>`;

  function showCount(ctx) {
    const d = ctx.data;
    const r = d.particles.filter(p => p.kind === "reactant").length;
    ctx.$("#counter").textContent = "reactant " + r + " : " + (d.particles.length - r) + " product";
  }

  function paint(p) {
    const look = LOOK[p.kind];
    p.r = look.r;
    p.el.setAttribute("fill", look.fill);
    p.el.setAttribute("stroke", look.stroke);
    p.el.setAttribute("r", look.r);
  }

  // Adds a particle somewhere inside the box; `hidden` ones start transparent so they can fade in.
  function spawn(ctx, kind, hidden) {
    const d = ctx.data;
    const x = BOX.x0 + 30 + rand() * (BOX.x1 - BOX.x0 - 60);
    const y = BOX.y0 + 30 + rand() * (BOX.y1 - BOX.y0 - 60);
    const angle = rand() * Math.PI * 2, speed = 40 + rand() * 30;
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("stroke-width", 2);
    el.setAttribute("cx", x); el.setAttribute("cy", y);
    if (hidden) el.setAttribute("opacity", 0);
    ctx.$("#particles").appendChild(el);
    const p = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, el, kind, flipAt: d.t + expWait() };
    paint(p);
    d.particles.push(p);
    return p;
  }

  function removeParticles(ctx, list) {
    const d = ctx.data;
    list.forEach(p => p.el.remove());
    d.particles = d.particles.filter(p => !list.includes(p));
    showCount(ctx);
  }

  // Pour in `n` particles of one kind: they fade in, then join the simulation.
  function pourIn(ctx, kind, n) {
    const tl = gsap.timeline();
    const fresh = [];
    for (let i = 0; i < n; i++) fresh.push(spawn(ctx, kind, true));
    showCount(ctx);
    fresh.forEach((p, i) => tl.to(p.el, { opacity: 1, duration: 0.3 }, i * 0.05));
    tl.call(() => Sound.pop(), null, 0);
    return tl;
  }

  // Take away particles of one kind (all of them, or `n` of them): they fade out, then leave.
  function takeOut(ctx, kind, n) {
    const d = ctx.data;
    let list = d.particles.filter(p => p.kind === kind);
    if (n !== undefined) list = list.slice(0, n);
    list.forEach(p => { p.flipAt = Infinity; }); // leaving: don't let them switch kind on the way out
    const tl = gsap.timeline();
    list.forEach((p, i) => tl.to(p.el, { opacity: 0, duration: 0.3 }, i * 0.03));
    tl.call(() => removeParticles(ctx, list));
    return tl;
  }

  const addReactant = {
    hotspot: "hit", to: "added", sound: "pop", captionAt: 0.6,
    play(ctx) { ctx.data.lastAdded = ADD; return pourIn(ctx, "reactant", ADD); }
  };
  const removeProduct = {
    hotspot: "hit", to: "removed", sound: "zwoop-rev", captionAt: 0.6,
    play(ctx) {
      ctx.data.lastRemoved = ctx.data.particles.filter(p => p.kind === "product").length;
      return takeOut(ctx, "product");
    }
  };
  const undoAdd = {
    to: "steady", sound: "zwoop-rev", captionAt: 0.4,
    play(ctx) { return takeOut(ctx, "reactant", ctx.data.lastAdded || ADD); }
  };
  const undoRemove = {
    to: "added", sound: "pop", captionAt: 0.4,
    play(ctx) { return pourIn(ctx, "product", ctx.data.lastRemoved || 0); }
  };

  Book.register({
    id: "lechatelier",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Le Châtelier's principle: pushing back against a change",
    description: "A box of twenty particles already at equilibrium, about half reactant (small blue) and half product (larger orange), converting both ways all the time. Tapping pours in ten more reactant: for a while more particles convert forward than back, until the split evens out again with more of both. Tapping again removes every product particle: the reactant starts converting to replace it, until the split evens out once more.",
    svg,
    legend: '<span class="dot" style="width:12px;height:12px;background:var(--electron)" aria-hidden="true"></span>reactant <span class="dot" style="width:18px;height:18px;background:var(--heat);border:2px solid #fff;box-shadow:0 0 0 1px var(--ink)" aria-hidden="true"></span>product',
    start: "steady",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to disturb the equilibrium", hint: Hint.ring("#ring", "500 250") }],

    setup(ctx) {
      const d = ctx.data;
      d.box = ParticleBox(BOX);
      d.particles = [];
      d.t = 0;
      for (let i = 0; i < START; i++) spawn(ctx, i % 2 ? "product" : "reactant", false);
      d.particles.forEach(p => p.el.setAttribute("class", "fade"));
      showCount(ctx);
      d.render = (time, dt) => {
        if (ctx.reduceMotion) return;
        const step = Math.min(dt, 50) / 1000;
        d.box.step(d.particles, step);
        d.t += step;
        let flipped = false;
        d.particles.forEach(p => {
          if (d.t < p.flipAt) return;
          p.kind = p.kind === "reactant" ? "product" : "reactant";
          paint(p);
          p.x = Math.min(Math.max(p.x, BOX.x0 + p.r), BOX.x1 - p.r); // a bigger radius might not fit where it is
          p.y = Math.min(Math.max(p.y, BOX.y0 + p.r), BOX.y1 - p.r);
          p.flipAt = d.t + expWait();
          flipped = true;
        });
        if (flipped) showCount(ctx);
      };
      gsap.ticker.add(d.render);
    },

    teardown(ctx) { gsap.ticker.remove(ctx.data.render); },

    intro() {
      return gsap.to(["#particles circle", "rect.fade", "#counter"], { opacity: 1, duration: 0.6, stagger: 0.02 });
    },

    states: {
      steady: {
        caption: "This mixture is already at equilibrium: roughly half reactant, half product, converting both ways at the same rate. Tap to pour in more reactant.",
        footnote: "Nothing looks like it's changing overall, but every particle is still flipping back and forth.",
        tap: addReactant
      },
      added: {
        caption: "Extra reactant tips the balance: for a while more particles convert forward than back, until the split evens out again — now with more of both.",
        footnote: "That's Le Châtelier's principle: when you change an equilibrium, it shifts to partly undo the change. Here it uses up some of the reactant you added. Tap to take the product away.",
        tap: removeProduct,
        back: undoAdd
      },
      removed: {
        caption: "With the product gone, only the forward direction has anything to work with, so product builds up again until the two sides even out.",
        footnote: "Adding or removing a substance shifts where the equilibrium sits, but the ratio it settles at — the equilibrium constant, K — doesn't change. Only a change of temperature changes K.",
        back: undoRemove,
        final: true
      }
    }
  });
})();
;
/* ---- pages/16-acids.js ---- */
// Page 16: acids and bases. An acid is a proton donor; a base is a proton acceptor. Tap sends a
// proton (H+) from HCl across to NH3, leaving Cl- and NH4+ behind.

(() => {
  const AX = 300, BX = 700, CY = 240, R = 55;

  const svg = `
    <circle class="fade" cx="${AX}" cy="${CY}" r="${R}" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <text class="molecule-label fade" id="acidLabel" x="${AX}" y="${CY}" dominant-baseline="central">HCl</text>
    <text class="atom-sub fade" x="${AX}" y="${CY + R + 26}">acid</text>

    <circle class="fade" cx="${BX}" cy="${CY}" r="${R}" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <text class="molecule-label fade" id="baseLabel" x="${BX}" y="${CY}" dominant-baseline="central">NH₃</text>
    <text class="atom-sub fade" x="${BX}" y="${CY + R + 26}">base</text>

    <g id="proton">
      <circle class="h-plus fade" id="protonDot" cx="${AX + R}" cy="${CY}" r="17"/>
      <text class="h-plus-label fade" id="protonLabel" x="${AX + R}" y="${CY}">H⁺</text>
    </g>

    <rect class="tap-ring" id="ring" x="223" y="163" width="554" height="186" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="${CY}" r="420"/>`;

  const give = {
    hotspot: "hit", to: "given", sound: "zwoop", captionAt: 1.1,
    play(ctx) {
      const tl = gsap.timeline();
      tl.to("#protonDot", { attr: { cx: BX - R }, duration: 1.1, ease: "power2.inOut" }, 0)
        .to("#protonLabel", { attr: { x: BX - R }, duration: 1.1, ease: "power2.inOut" }, 0)
        .call(() => Sound.pop(), null, 1.05)
        .call(() => { ctx.$("#acidLabel").textContent = "Cl⁻"; ctx.$("#baseLabel").textContent = "NH₄⁺"; }, null, 1.1);
      return tl;
    }
  };

  const takeBack = {
    to: "apart", sound: "zwoop-rev", captionAt: 1.1,
    play(ctx) {
      const tl = gsap.timeline();
      tl.call(() => { ctx.$("#acidLabel").textContent = "HCl"; ctx.$("#baseLabel").textContent = "NH₃"; }, null, 0)
        .to("#protonDot", { attr: { cx: AX + R }, duration: 1.0, ease: "power2.inOut" }, 0)
        .to("#protonLabel", { attr: { x: AX + R }, duration: 1.0, ease: "power2.inOut" }, 0);
      return tl;
    }
  };

  Book.register({
    id: "acids",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Acids and bases: passing a proton",
    description: "An acid, HCl, and a base, NH3, drawn as two circles with a small H-plus proton sitting on the acid's edge. Tapping sends the proton across to the base: the acid becomes chloride, Cl-, and the base becomes ammonium, NH4-plus.",
    svg,
    start: "apart",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to let the acid hand over its proton", hint: Hint.ring("#ring", "500 256") }],

    intro() {
      return gsap.to(["circle.fade", "text.fade"], { opacity: 1, duration: 0.6, stagger: 0.04 });
    },

    idle() {
      gsap.to("#proton", { scale: 1.15, transformOrigin: "center", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    },

    states: {
      apart: {
        caption: "Here's an acid, HCl, and a base, NH₃. Acids are proton donors, and bases are proton acceptors. Tap to watch the proton move.",
        tap: give
      },
      given: {
        caption: "HCl handed over a proton to NH₃. HCl is now Cl⁻, its conjugate base; NH₃ is now NH₄⁺, its conjugate acid.",
        footnote: "This ‘passing a proton’ idea is the Brønsted–Lowry definition of acids and bases.",
        back: takeBack,
        final: true
      }
    }
  });
})();
;
/* ---- pages/17-redox.js ---- */
// Page 17: redox and electrochemical cells. Electrons flow through the wire from the anode (where
// something loses electrons, oxidation) to the cathode (where something gains them, reduction).

(() => {
  const AX = 300, CX2 = 700, TOP_Y = 140, EL_TOP = 180, EL_BOT = 350;
  const SOL_Y = 350, SOL_H = 50;
  const N_E = 5;

  const svg = `
    <rect class="fade" x="200" y="${SOL_Y}" width="600" height="${SOL_H}" rx="10" fill="#CFE8FF" stroke="var(--ink)" stroke-width="2"/>
    <rect class="fade" x="${AX - 30}" y="${EL_TOP}" width="60" height="${EL_BOT - EL_TOP}" fill="#8A8590"/>
    <rect class="fade" x="${CX2 - 30}" y="${EL_TOP}" width="60" height="${EL_BOT - EL_TOP}" fill="#8A8590"/>
    <path class="wire fade" id="wire" d="M ${AX} ${EL_TOP} L ${AX} ${TOP_Y} L ${CX2} ${TOP_Y} L ${CX2} ${EL_TOP}"/>

    <text class="molecule-label fade" x="${AX}" y="${SOL_Y + SOL_H + 30}">anode</text>
    <text class="atom-sub fade" x="${AX}" y="${SOL_Y + SOL_H + 54}">oxidation — loses electrons</text>
    <text class="molecule-label fade" x="${CX2}" y="${SOL_Y + SOL_H + 30}">cathode</text>
    <text class="atom-sub fade" x="${CX2}" y="${SOL_Y + SOL_H + 54}">reduction — gains electrons</text>

    <g id="electrons"></g>
    <rect class="tap-ring" id="ring" x="167" y="118" width="668" height="358" rx="30" opacity="0"/>
    <circle class="hit" id="hit" cx="500" cy="260" r="420"/>`;

  function makeElectrons(ctx) {
    const layer = ctx.$("#electrons");
    layer.innerHTML = "";
    const els = [];
    for (let i = 0; i < N_E; i++) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = '<circle r="10" fill="var(--electron)"/><text class="h-plus-label" fill="#fff" dominant-baseline="central" text-anchor="middle">−</text>';
      layer.appendChild(g);
      els.push(g);
    }
    return els;
  }

  const PATH = [[AX, EL_TOP], [AX, TOP_Y], [CX2, TOP_Y], [CX2, EL_TOP]];

  const turnOn = {
    hotspot: "hit", to: "on", sound: "zwoop", captionAt: 0.5,
    play(ctx) {
      const d = ctx.data;
      const els = makeElectrons(ctx);
      // Position each electron with GSAP itself (never a raw attribute) before animating its x/y,
      // so GSAP's own transform cache starts from the same place it will animate from.
      // Placed (and hidden) straight away: during its start delay an electron would otherwise sit at
      // (0, 0), peeking out of the top-left corner of the scene.
      d.flows = els.map((g, i) => {
        gsap.set(g, { x: PATH[0][0], y: PATH[0][1], opacity: 0 });
        const tl = gsap.timeline({ repeat: -1, delay: i * (2.4 / N_E) });
        tl.set(g, { x: PATH[0][0], y: PATH[0][1], opacity: 1 });
        for (let s = 1; s < PATH.length; s++) tl.to(g, { x: PATH[s][0], y: PATH[s][1], duration: 0.6, ease: "none" });
        return tl;
      });
      return gsap.timeline().call(() => Sound.pop());
    }
  };

  const turnOff = {
    to: "off", sound: "zwoop-rev", captionAt: 0.3,
    play(ctx) {
      (ctx.data.flows || []).forEach(f => f.kill());
      ctx.$("#electrons").innerHTML = "";
      return gsap.timeline();
    }
  };

  Book.register({
    id: "redox",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Redox and electrochemical cells: following the electrons",
    description: "Two electrode strips standing in a shared solution, joined by a wire over the top. Tapping starts electrons flowing along the wire from the anode to the cathode, on a loop. The anode is labelled oxidation, loses electrons; the cathode is labelled reduction, gains electrons.",
    svg,
    start: "off",

    hotspots: [{ id: "hit", selector: "#hit", label: "Tap to let the cell run", hint: Hint.ring("#ring", "501 297") }],

    setup(ctx) { ctx.data.flows = []; },
    teardown(ctx) { (ctx.data.flows || []).forEach(f => f.kill()); },

    intro() {
      return gsap.to(["rect.fade", "path.fade", "text.fade"], { opacity: 1, duration: 0.6, stagger: 0.03 });
    },

    states: {
      off: {
        caption: "Here's a simple electrochemical cell: two electrodes in a shared solution, joined by a wire. Tap to let it run.",
        tap: turnOn
      },
      on: {
        caption: "Electrons flow through the wire from the anode to the cathode. The anode loses electrons — oxidation. The cathode gains them — reduction.",
        booklet: "§19 standard reduction potentials: in a zinc–copper cell, zinc (E<sup>⦵</sup> = −0.76 V) is oxidized at the anode and copper (+0.34 V) is reduced at the cathode. The more negative E<sup>⦵</sup> gets oxidized.",
        footnote: "A memory trick: OIL RIG — Oxidation Is Loss, Reduction Is Gain.",
        back: turnOff,
        final: true
      }
    }
  });
})();
;
/* ---- pages/s1-01-states.js ---- */
// Solid, liquid, gas: the same 28 particles, held in a grid, forming a layer across the bottom of the
// container (a liquid takes the container's shape, keeping its volume), or filling the whole box.

(() => {
  const K = Kit, C = K.C;
  const BOX = { x0: 200, y0: 110, x1: 800, y1: 410 };
  const LIQ = { x0: 200, y0: 318, x1: 800, y1: 410 };   // full width of the container, same volume
  const R = 18, COLS = 7, ROWS = 4, SP = 40;

  const svg = `
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="14" fill="none" stroke="var(--ink)" stroke-width="3"/>
    <rect id="liqfill" x="${BOX.x0}" y="${LIQ.y0}" width="${BOX.x1 - BOX.x0}" height="${LIQ.y1 - LIQ.y0}" fill="${C.ion}" fill-opacity="0.16" opacity="0"/>
    <g id="ps"></g>
    ${K.t(500, 452, "solid", "atom-name fade", 'id="stateLabel"')}`;

  K.page({
    id: "states",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Particles and the states of matter",
    description: "A box of 28 particles. At first they sit packed in a regular grid at the bottom, only vibrating: a solid. Tapping heats them: they break out of the grid and slide past each other in a layer spread across the whole width of the bottom of the box, taking the shape of the container: a liquid. Tapping again, they fly apart and fill the whole box: a gas.",
    svg, bounds: [200, 110, 800, 460], tapLabel: "Tap to heat the particles",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(5);
      d.mode = 0; d.time = 0;
      d.list = K.spawn(ctx, "#ps", COLS * ROWS, { r: R, fill: C.ion, cls: "fade" }, BOX, rand, 45);
      d.list.forEach((p, i) => {
        p.hx = 500 + ((i % COLS) - (COLS - 1) / 2) * SP;
        p.hy = BOX.y1 - R - 3 - Math.floor(i / COLS) * SP;
        p.x = p.hx; p.y = p.hy;
        p.el.setAttribute("cx", p.x); p.el.setAttribute("cy", p.y);
      });
      K.tick(ctx, dt => {
        d.time += dt;
        const ps = d.list, k = Math.min(1, dt * 8);
        if (d.mode === 0) {
          ps.forEach((p, i) => {
            p.x += (p.hx + Math.sin(d.time * 9 + i * 1.7) * 2.2 - p.x) * k;
            p.y += (p.hy + Math.cos(d.time * 8 + i * 2.3) * 2.2 - p.y) * k;
            p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1));
          });
          return;
        }
        const box = d.mode === 1 ? LIQ : BOX;
        K.setSpeed(ps, d.mode === 1 ? 70 : 130, Math.min(1, dt * 2));
        if (d.mode === 1) {   // liquid: particles touch and can't overlap, so they spread across the bottom
          for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
            const dx = ps[b].x - ps[a].x, dy = ps[b].y - ps[a].y, dist = Math.hypot(dx, dy) || 0.01, min = 2 * R;
            const ux = dx / dist, uy = dy / dist;
            if (dist < min) {
              const push = (min - dist) / 2;
              ps[a].x -= ux * push; ps[a].y -= uy * push; ps[b].x += ux * push; ps[b].y += uy * push;
            }
            if (dist < 90) {   // a gentle push between near neighbours, so the layer spreads out to fill the bottom
              const f = (90 - dist) / 90 * 260 * dt;
              ps[a].vx -= ux * f; ps[b].vx += ux * f;
            }
          }
          ps.forEach(p => {   // the pushes must never move a particle through the container's walls
            p.x = Math.min(BOX.x1 - R, Math.max(BOX.x0 + R, p.x)); p.y = Math.min(BOX.y1 - R, p.y);
          });
        }
        ps.forEach(p => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          // Outside the (new) box the particle is pulled back in; inside, it bounces off the walls.
          if (p.x - p.r < box.x0) { if (p.x < box.x0 - 2) p.vx += 500 * dt; else if (p.vx < 0) p.vx = -p.vx; }
          if (p.x + p.r > box.x1) { if (p.x > box.x1 + 2) p.vx -= 500 * dt; else if (p.vx > 0) p.vx = -p.vx; }
          if (p.y - p.r < box.y0) { if (p.y < box.y0 - 2) p.vy += 500 * dt; else if (p.vy < 0) p.vy = -p.vy; }
          if (p.y + p.r > box.y1) { if (p.y > box.y1 + 2) p.vy -= 500 * dt; else if (p.vy > 0) p.vy = -p.vy; }
          p.el.setAttribute("cx", p.x.toFixed(1)); p.el.setAttribute("cy", p.y.toFixed(1));
        });
      });
    },

    steps: [
      { caption: "This is a solid: the particles are packed close together in a regular pattern. They vibrate on the spot but can't swap places, so a solid keeps its shape and its volume.",
        footnote: "Real particles are far smaller than these, and there are unimaginably more of them — not to scale, of course." },
      { caption: "Heat it and the particles vibrate harder until they break free of their fixed places. In a liquid they still touch, but slide past each other: it flows and spreads out to take the shape of its container, filling the bottom of it, yet keeps its volume.",
        to: { "#liqfill": { opacity: 1 } }, text: { "#stateLabel": "liquid" }, dur: 0.6, run(ctx, tl, dir) { tl.call(() => { ctx.data.mode = dir === "fwd" ? 1 : 0; }, null, 0); } },
      { caption: "Heat it more and the particles fly apart, far from each other and moving fast. A gas has no fixed shape or volume: it fills whatever container it is in.",
        footnote: "In a real gas at everyday pressure, the gaps between particles are much bigger than the particles themselves — bigger than we can draw here.",
        to: { "#liqfill": { opacity: 0 } }, text: { "#stateLabel": "gas" }, dur: 0.6, run(ctx, tl, dir) { tl.call(() => { ctx.data.mode = dir === "fwd" ? 2 : 1; }, null, 0); } }
    ]
  });
})();
;
/* ---- pages/s1-02-kelvin.js ---- */
// Kelvin: a thermometer with two scales, and a marker that slides down to absolute zero.

(() => {
  const K = Kit, C = K.C;
  const yOf = T => 420 - 0.9 * T;                 // kelvin -> canvas y
  const hg = T => ({ attr: { y: +yOf(T).toFixed(2), height: +(440 - yOf(T)).toFixed(2) } });
  const spd = T => ({ attr: { width: +(11 * Math.sqrt(T)).toFixed(1) } });
  const left = 'style="text-anchor:end"', right = 'style="text-anchor:start"';
  const tick = (T, kText, cText, what) => `
    ${K.l(456, yOf(T), 470, yOf(T), "var(--ink)", 2.5, 'class="fade"')}${K.l(498, yOf(T), 512, yOf(T), "var(--ink)", 2.5, 'class="fade"')}
    ${K.t(448, yOf(T) + 5, kText, "graph-label fade", left)}${K.t(520, yOf(T) + 5, cText, "graph-label fade", right)}
    ${K.t(640, yOf(T) + 5, what, "atom-sub fade", right)}`;

  const svg = `
    ${K.t(380, 42, "kelvin (K)", "atom-name fade", 'style="font-size:20px"')}${K.t(590, 42, "Celsius (°C)", "atom-name fade", 'style="font-size:20px"')}
    <rect class="fade" x="470" y="60" width="28" height="366" rx="14" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    <rect id="mercury" class="fade" x="477" y="${yOf(298.15)}" width="14" height="${440 - yOf(298.15)}" fill="${C.heat}"/>
    <circle class="fade" cx="484" cy="448" r="24" fill="${C.heat}" stroke="var(--ink)" stroke-width="3"/>
    ${tick(0, "0 K", "−273.15 °C", "absolute zero")}${tick(273.15, "273.15 K", "0 °C", "water freezes")}${tick(373.15, "373.15 K", "100 °C", "water boils")}
    ${K.t(830, 205, "298.15 K", "atom-name fade", 'id="rK"')}${K.t(830, 245, "25 °C", "atom-name fade", 'id="rC"')}
    ${K.t(810, 322, "average particle speed", "graph-label fade")}
    <rect class="fade" x="700" y="336" width="220" height="16" rx="8" fill="${C.pale}"/>
    <rect id="spd" class="fade" x="700" y="336" width="${11 * Math.sqrt(298.15)}" height="16" rx="8" fill="${C.heat}"/>`;

  K.page({
    id: "kelvin",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Kelvin: a temperature scale that starts at zero",
    description: "A tall thermometer with kelvin marked down the left and degrees Celsius down the right. It starts at room temperature, 298.15 K or 25 °C. Tapping moves the red column to where water freezes (273.15 K, 0 °C), where water boils (373.15 K, 100 °C), and finally to absolute zero (0 K, −273.15 °C), where an average particle speed bar on the right shrinks to nothing.",
    svg, bounds: [360, 30, 940, 476], tapLabel: "Tap to move the thermometer",
    steps: [
      { caption: "Room temperature is about 25 °C, which is 298.15 K. Kelvin is Celsius shifted up by 273.15: T (K) = T (°C) + 273.15.",
        booklet: "§4 unit conversions: temperature (K) = temperature (°C) + 273.15." },
      { caption: "Water freezes at 0 °C = 273.15 K. A step of 1 K is exactly the same size as a step of 1 °C. Only the zero point is different.",
        to: { "#mercury": hg(273.15), "#spd": spd(273.15) }, text: { "#rK": "273.15 K", "#rC": "0 °C" } },
      { caption: "Water boils at 100 °C = 373.15 K (at standard pressure).",
        to: { "#mercury": hg(373.15), "#spd": spd(373.15) }, text: { "#rK": "373.15 K", "#rC": "100 °C" } },
      { caption: "Absolute zero: 0 K = −273.15 °C, where the particles have the least energy they possibly can. Nothing can be colder, so kelvin never goes negative.",
        footnote: "Temperature in kelvin is proportional to the particles' average kinetic energy — which is why the speed bar shrinks to nothing, and why gas-law sums always use kelvin.",
        to: { "#mercury": hg(0), "#spd": spd(0) }, text: { "#rK": "0 K", "#rC": "−273.15 °C" }, dur: 1.4 }
    ]
  });
})();
;
/* ---- pages/s1-03-orbitals.js ---- */
// Orbitals: the fuzzy cloud from page 1 has a name. s is a sphere, p is a dumbbell in three directions,
// and each orbital holds at most two electrons.

(() => {
  const K = Kit, C = K.C, rand = K.rng(11);
  const dot = (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + rand() * 1.6).toFixed(1)}" fill="${C.electron}" opacity="${(0.3 + rand() * 0.45).toFixed(2)}"/>`;
  const sub = s => `<tspan dy="5" style="font-size:0.7em">${s}</tspan>`;

  // s: dots at a distance following r² e^(-2r/a), in a random 3D direction, flattened to 2D.
  let s = "";
  for (let n = 0; n < 190;) {
    const rr = -22 * (Math.log(1 - rand()) + Math.log(1 - rand()) + Math.log(1 - rand()));
    if (rr > 100) continue;
    const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = 2 * Math.PI * rand();
    s += dot(rr * st * Math.cos(ph), rr * st * Math.sin(ph)); n++;
  }
  // p: two lobes, dots spread through an ellipse either side of the middle, then turned by `deg`.
  function dumbbell(deg) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let out = "";
    [-1, 1].forEach(side => {
      for (let n = 0; n < 60;) {
        const u = 2 * rand() - 1, v = 2 * rand() - 1;
        if (u * u + v * v > 1) continue;
        const px = side * 54 + u * 46, py = v * 25;
        out += dot(px * ca - py * sa, px * sa + py * ca); n++;
      }
    });
    return out;
  }
  const box = (x, y) => `<g class="orbBox" opacity="0"><rect x="${x - 22}" y="${y}" width="44" height="34" rx="5" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x, y + 23, "↑↓", "molecule-label")}</g>`;

  const svg = `
    ${K.g("sOrb", 190, 205, s)}
    ${K.t(190, 328, "s orbital", "atom-name fade")}
    ${K.g("px", 430, 205, dumbbell(0), "", 'opacity="0"')}${K.g("py", 580, 205, dumbbell(90), "", 'opacity="0"')}${K.g("pz", 730, 205, dumbbell(-35), "", 'opacity="0"')}
    ${K.t(430, 328, "p" + sub("x"), "atom-name pLab", 'opacity="0"')}
    ${K.t(580, 328, "p" + sub("y"), "atom-name pLab", 'opacity="0"')}
    ${K.t(730, 328, "p" + sub("z"), "atom-name pLab", 'opacity="0"')}
    ${box(190, 352)}${box(430, 352)}${box(580, 352)}${box(730, 352)}
    ${K.t(190, 412, "1 orbital · 2 e⁻", "graph-label orbBox", 'opacity="0"')}
    ${K.t(580, 412, "3 orbitals · 6 e⁻", "graph-label orbBox", 'opacity="0"')}`;

  K.page({
    id: "orbitals",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Orbitals: the shapes of the clouds",
    description: "A fuzzy blue cloud of dots shaped like a sphere, labelled s orbital. Tapping adds three dumbbell-shaped clouds side by side, one lying along each direction, labelled p x, p y and p z. Tapping again draws a box with two arrows under each orbital to show that every orbital holds at most two electrons: one s orbital holds 2, three p orbitals hold 6.",
    svg, bounds: [80, 100, 830, 425], tapLabel: "Tap to reveal more orbitals",
    steps: [
      { caption: "Remember the fuzzy cloud from the first page? Its proper name is an orbital: a region of space where an electron is likely to be found. This shape, a sphere, is an s orbital.",
        footnote: "Denser dots mean the electron is more likely to be found there. It's a picture of probability, not a picture of an electron's path." },
      { caption: "Not every orbital is a sphere. A p orbital has two lobes, like a dumbbell, and the three p orbitals point in three directions at right angles: p" + sub("x") + ", p" + sub("y") + " and p" + sub("z") + ".",
        footnote: "p" + sub("z") + " really points toward you, out of the page. It's drawn slanted so you can see it.",
        to: { "#px": { opacity: 1 }, "#py": { opacity: 1, delay: 0.25 }, "#pz": { opacity: 1, delay: 0.5 }, ".pLab": { opacity: 1, delay: 0.6, stagger: 0.15 } } },
      { caption: "An orbital can hold at most two electrons, with opposite spins. So one s orbital holds 2 electrons and the three p orbitals together hold 6.",
        footnote: "Next come five d orbitals (10 electrons) and seven f orbitals (14).",
        to: { ".orbBox": { opacity: 1, stagger: 0.12 } } }
    ]
  });
})();
;
/* ---- pages/s1-04-convergence.js ---- */
// The limit of convergence (HL): hydrogen's energy levels crowd together towards n = ∞. Electrons falling
// to n = 1 make lines that crowd together too, and the limit they converge on is the ionization energy.

(() => {
  const K = Kit, C = K.C;
  const yOf = n => 90 + 330 / (n * n);                 // energy level n -> canvas y (n = ∞ sits at y = 90)
  const xLine = n => 650 + ((1 - 1 / (n * n) - 0.7) / 0.3) * 280;   // line position by energy of the fall
  const N = [2, 3, 4, 5, 6];
  const left = 'style="text-anchor:end"', start = 'style="text-anchor:start"';

  const levels = [1, 2, 3, 4, 5, 6].map(n => K.l(200, yOf(n), 420, yOf(n), "var(--ink)", 2.5, 'class="fade"')).join("");
  const nLabels = [1, 2, 3, 4].map(n => K.t(190, yOf(n) + 5, "n = " + n, "graph-label fade", left)).join("");

  const svg = `
    ${K.arrow(165, 440, 165, 58, "var(--ink)", 2.5, 'class="fade"')}${K.t(165, 46, "energy", "graph-label fade")}
    ${levels}${nLabels}
    <line class="fade" x1="200" y1="90" x2="420" y2="90" stroke="var(--ink)" stroke-width="2" stroke-dasharray="6 6"/>
    ${K.t(190, 95, "n = ∞", "graph-label fade", left)}

    ${N.map((n, i) => K.arrow(235 + i * 42, yOf(n), 235 + i * 42, 416, C.violet, 3, `class="fall" opacity="0"`)).join("")}

    <rect class="fade" x="650" y="205" width="280" height="34" rx="4" fill="#14121b"/>
    ${N.map(n => K.l(xLine(n), 209, xLine(n), 235, C.violet, 4, 'class="specLine" opacity="0"')).join("")}
    ${K.t(790, 268, "hydrogen's Lyman series (ultraviolet)", "graph-label fade")}
    <g id="limitG" opacity="0">
      <line x1="930" y1="195" x2="930" y2="249" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 5"/>
      ${K.t(930, 186, "limit of convergence", "graph-label", 'style="text-anchor:end"')}
      ${K.arrow(460, 418, 460, 96, "var(--ink)", 3)}
      ${K.t(478, 252, "ionization energy", "molecule-label", start)}${K.t(478, 278, "1312 kJ mol⁻¹", "molecule-label", start)}
    </g>`;

  K.page({
    id: "convergence",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "The limit of convergence: when an electron escapes",
    description: "An energy-level diagram for hydrogen: horizontal lines for n equals 1, 2, 3 and so on, squeezing closer together towards a dashed line at n equals infinity. Tapping draws arrows from the higher levels down to n equals 1, and the lines they produce on a dark strip crowd together at the right. Tapping again marks the limit where the lines converge, and an arrow from n equals 1 up to infinity labelled ionization energy, 1312 kilojoules per mole.",
    svg, bounds: [150, 40, 940, 450], tapLabel: "Tap to add the electron falls",
    steps: [
      { caption: "In hydrogen, the electron's energy levels get closer and closer together the further out you go, squeezing up towards a limit at the top.",
        footnote: "The levels are not to scale in one way: the real gaps are set by −1/n², which is why they bunch up so quickly." },
      { caption: "An electron falling to n = 1 gives out light: the Lyman series, in the ultraviolet. Since the levels crowd together, the lines from those falls crowd together too, converging on a limit.",
        to: { ".fall": { opacity: 1, stagger: 0.18 }, ".specLine": { opacity: 1, stagger: 0.18, delay: 0.3 } }, dur: 0.6, captionAt: 1.2 },
      { caption: "The lines converge on the energy of an electron falling in from n = ∞, one that has only just been set free. That energy, from n = 1 to ∞, is hydrogen's ionization energy: 1312 kJ mol⁻¹.",
        footnote: "Chemists find it from a real spectrum: measure the frequency where the lines converge, then use E = hf, and multiply by Avogadro's constant for a mole.",
        booklet: "§9: first ionization energy of hydrogen, 1312 kJ mol⁻¹. §1: E = hf. §2: N<sub>A</sub> = 6.02 × 10²³ mol⁻¹.",
        to: { "#limitG": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s1-05-successive-ie.js ---- */
// Successive ionization energies (HL): sodium's eleven electrons removed one at a time. Big jumps mark
// the shell boundaries. Values are approximate (rounded from standard tables), on a log scale.

(() => {
  const K = Kit, C = K.C;
  const IE = [496, 4562, 6910, 9543, 13354, 16613, 20117, 25496, 28932, 141362, 159076];
  const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th"];
  const BASE = 400, X0 = 160, PITCH = 62, W = 44;
  const hOf = v => +((Math.log10(v) - 2) * 90).toFixed(1);
  const colour = i => (i === 0 ? C.heat : i < 9 ? C.ion : C.electron);
  const xOf = i => X0 + i * PITCH;
  const fmt = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const grid = [1000, 10000, 100000].map(v => `
    <line class="fade" x1="150" y1="${BASE - hOf(v)}" x2="850" y2="${BASE - hOf(v)}" stroke="var(--ink)" stroke-opacity="0.25" stroke-dasharray="4 6"/>
    ${K.t(142, BASE - hOf(v) + 5, fmt(v), "graph-label fade", 'style="text-anchor:end"')}`).join("");

  const bars = IE.map((v, i) => `
    <rect id="bar${i}" class="${i === 0 ? "fade" : ""}" x="${xOf(i)}" y="${i === 0 ? BASE - hOf(v) : BASE}" width="${W}" height="${i === 0 ? hOf(v) : 0}" rx="3" fill="${colour(i)}"/>
    ${K.t(xOf(i) + W / 2, BASE - hOf(v) - 8, fmt(v), i === 0 ? "graph-label fade" : "graph-label", i === 0 ? `id="val${i}"` : `id="val${i}" opacity="0"`)}
    ${K.t(xOf(i) + W / 2, 420, ORD[i], "graph-label fade")}`).join("");

  const bracket = (a, b, text) => `<g class="shells" opacity="0">
    <path d="M ${xOf(a)} 436 L ${xOf(a)} 442 L ${xOf(b) + W} 442 L ${xOf(b) + W} 436" fill="none" stroke="var(--ink)" stroke-width="2.5"/>
    ${K.t((xOf(a) + xOf(b) + W) / 2, 463, text, "graph-label")}</g>`;

  const svg = `${grid}${bars}
    ${K.t(150, 104, "energy needed, kJ mol⁻¹ (log scale)", "graph-label fade", 'style="text-anchor:start"')}
    ${bracket(0, 0, "3rd shell: 1 e⁻")}${bracket(1, 8, "2nd shell: 8 e⁻")}${bracket(9, 10, "1st shell: 2 e⁻")}`;

  const grow = (from, to, extra = {}) => {
    const o = {};
    for (let i = from; i <= to; i++) {
      o["#bar" + i] = { attr: { y: BASE - hOf(IE[i]), height: hOf(IE[i]) }, delay: (i - from) * 0.09, ...extra };
      o["#val" + i] = { opacity: 1, delay: (i - from) * 0.09 + 0.5 };
    }
    return o;
  };

  K.page({
    id: "successive-ie",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Successive ionization energies: peeling off electrons",
    description: "A bar chart on a logarithmic scale of the energy needed to remove sodium's eleven electrons one at a time. At first only the first bar, 496 kilojoules per mole, is shown. Tapping adds the second to ninth bars, which are about ten times taller, then the tenth and eleventh, which are far taller again. Brackets underneath group them as the third shell with one electron, the second shell with eight, and the first shell with two.",
    svg, bounds: [100, 100, 870, 470], tapLabel: "Tap to remove more electrons",
    steps: [
      { caption: "How much energy does it take to pull off a sodium atom's first electron? About 496 kJ for a mole of atoms. Then the second, the third… each from an ion that's more positive than the last. Tap to see.",
        booklet: "§9: first ionization energy of sodium, 496 kJ mol⁻¹. (The booklet lists only the first.)" },
      { caption: "The second electron costs nine times as much: 4562 kJ. It comes from a full inner shell, much closer to the nucleus. That big jump says sodium has only one outer electron.",
        footnote: "Values are rounded from standard tables, and the axis is logarithmic so all eleven fit on the page.",
        to: grow(1, 8), dur: 0.7, captionAt: 1.2 },
      { caption: "After the ninth, another enormous jump: the tenth electron comes from the innermost shell. Reading the jumps, sodium's eleven electrons sit 2, 8, 1 in their shells.",
        to: { ...grow(9, 10), ".shells": { opacity: 1, stagger: 0.2, delay: 0.7 } }, dur: 0.9 }
    ]
  });
})();
;
/* ---- pages/s1-06-molar-mass.js ---- */
// Relative atomic mass as a weighted average of isotopes, and molar mass in g/mol.
// Chlorine: about 76 of every 100 atoms are Cl-35 and 24 are Cl-37.

(() => {
  const K = Kit, C = K.C, rand = K.rng(3);
  // Which 24 of the 100 grid places hold a chlorine-37 atom.
  const order = Array.from({ length: 100 }, (_, i) => i);
  for (let i = 99; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const heavy = new Set(order.slice(0, 24));
  const grid = Array.from({ length: 100 }, (_, i) => {
    const x = 105 + (i % 10) * 30, y = 105 + Math.floor(i / 10) * 30;
    return heavy.has(i) ? `<circle class="fade" cx="${x}" cy="${y}" r="12" fill="${C.heat}" stroke="var(--ink)" stroke-width="2"/>`
                        : `<circle class="fade" cx="${x}" cy="${y}" r="9" fill="${C.ion}"/>`;
  }).join("");
  const start = 'style="text-anchor:start"';

  const svg = `${grid}
    <circle class="fade" cx="490" cy="130" r="9" fill="${C.ion}"/>${K.t(510, 136, "chlorine-35: 76 atoms", "molecule-label fade", start)}
    <circle class="fade" cx="490" cy="170" r="12" fill="${C.heat}" stroke="var(--ink)" stroke-width="2"/>${K.t(510, 176, "chlorine-37: 24 atoms", "molecule-label fade", start)}
    <g id="calc" opacity="0">
      ${K.t(500, 228, "76 × 35 = 2660", "molecule-label", start)}${K.t(500, 258, "24 × 37 = 888", "molecule-label", start)}
      ${K.t(500, 296, "(2660 + 888) ÷ 100 ≈ 35.5", "atom-name", start)}
    </g>
    <g id="jars" opacity="0">
      <rect x="500" y="340" width="130" height="62" rx="8" fill="${C.ion}"/>${K.t(565, 379, "35.45 g", "molecule-label", 'style="fill:#fff"')}${K.t(565, 424, "1 mol Cl atoms", "graph-label")}
      <rect x="720" y="330" width="150" height="72" rx="8" fill="${C.heat}"/>${K.t(795, 373, "58.44 g", "molecule-label", 'style="fill:#fff"')}${K.t(795, 424, "1 mol NaCl", "graph-label")}
    </g>`;

  K.page({
    id: "molar-mass",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Weighing atoms: relative and molar mass",
    description: "A grid of one hundred chlorine atoms: seventy-six small blue ones, chlorine-35, and twenty-four larger orange ones with an outline, chlorine-37. Tapping shows the weighted-average sum that gives chlorine's relative atomic mass, about 35.5. Tapping again shows that one mole of chlorine atoms weighs 35.45 grams and one mole of sodium chloride weighs 58.44 grams.",
    svg, bounds: [90, 90, 880, 440], tapLabel: "Tap to work out the average mass",
    steps: [
      { caption: "Chlorine atoms aren't all identical. Of every 100, about 76 are chlorine-35 and 24 are chlorine-37: isotopes with different numbers of neutrons.",
        footnote: "Chlorine-37 is drawn bigger and outlined so you can tell them apart without colour — the real size difference is tiny." },
      { caption: "The 'average' chlorine atom has a weighted-average mass: (76 × 35 + 24 × 37) ÷ 100 = 35.5. That's the relative atomic mass, A<sub>r</sub>, of chlorine.",
        booklet: "§7 periodic table: chlorine's relative atomic mass is 35.45, a touch under our 35.5 because real isotope masses aren't exact whole numbers.",
        to: { "#calc": { opacity: 1 } } },
      { caption: "Weigh out the relative atomic mass in grams and you have one mole of atoms. That mass per mole is the molar mass, M: 35.45 g mol⁻¹ for chlorine. For a compound, add up its atoms: NaCl = 22.99 + 35.45 = 58.44 g mol⁻¹.",
        booklet: "§7: A<sub>r</sub> of Na is 22.99 and of Cl is 35.45. §2: one mole is N<sub>A</sub> = 6.02 × 10²³ particles.",
        to: { "#jars": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s1-07-empirical.js ---- */
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
;
/* ---- pages/s1-08-concentration.js ---- */
// Concentration: the same five dots (0.50 mol of solute) in a beaker whose water level changes.
// c = n / V. Diluting spreads the dots out; boiling water away crowds them together.

(() => {
  const K = Kit, C = K.C, rand = K.rng(7);
  const BOT = 410, PX = 160;                        // canvas px per dm³ of solution
  const yOf = V => BOT - PX * V;
  const level = V => ({ y: yOf(V), height: PX * V });
  const start = 'style="text-anchor:start"';

  const dots = Array.from({ length: 5 }, (_, i) => {
    const x = 265 + rand() * 150, f = 0.15 + (i + rand() * 0.7) / 5 * 0.8;   // f: fraction of the way up the water
    return `<circle class="sol fade" cx="${x.toFixed(1)}" cy="${(BOT - f * PX).toFixed(1)}" r="8" fill="${C.heat}" data-f="${f.toFixed(3)}"/>`;
  }).join("");
  const dotY = V => (i, el) => BOT - +el.dataset.f * PX * V;
  const tick = (V, text) => `${K.l(448, yOf(V), 462, yOf(V), "var(--ink)", 2.5, 'class="fade"')}${K.t(470, yOf(V) + 5, text, "graph-label fade", start)}`;

  const svg = `
    <rect id="water" class="fade" x="243" y="${yOf(1)}" width="194" height="${PX}" fill="#CFE8FF"/>
    <path class="fade" d="M 240 80 L 240 ${BOT} L 440 ${BOT} L 440 80" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    ${dots}${tick(0.5, "0.50 dm³")}${tick(1, "1.00 dm³")}${tick(2, "2.00 dm³")}
    ${K.t(700, 175, "n = 0.50 mol", "molecule-label fade")}
    ${K.t(700, 215, "V = 1.00 dm³", "molecule-label fade", 'id="vVal"')}
    ${K.t(700, 275, "c = n ÷ V", "graph-label fade")}
    ${K.t(700, 315, "0.50 mol dm⁻³", "atom-name fade", 'id="cVal"')}`;

  K.page({
    id: "concentration",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Concentration: how crowded a solution is",
    description: "A beaker of water holding five orange dots of dissolved solute, 0.50 moles in 1.00 cubic decimetres, a concentration of 0.50 moles per cubic decimetre. Tapping adds water up to 2.00 cubic decimetres and the dots spread out, giving 0.25. Tapping again boils the water down to 0.50 cubic decimetres and the same dots crowd together, giving 1.00.",
    svg, bounds: [230, 70, 900, 420], tapLabel: "Tap to change the volume",
    steps: [
      { caption: "Here, 0.50 mol of solute is dissolved in 1.00 dm³ of solution. Concentration is the amount of solute per unit volume: c = n ÷ V, so 0.50 mol dm⁻³.",
        booklet: "§1 equations: n = C × V, so C = n ÷ V. (§4: 1 dm³ = 1 litre.)",
        footnote: "Written in square brackets, [NaCl] means the concentration of NaCl in mol dm⁻³. Other measures include molality, mole fraction and parts per million." },
      { caption: "Add water, up to 2.00 dm³, and the same amount of solute is spread through twice the volume: the concentration halves to 0.25 mol dm⁻³. This is dilution.",
        to: { "#water": { attr: level(2) }, ".sol": { attr: { cy: dotY(2) } } }, text: { "#vVal": "V = 2.00 dm³", "#cVal": "0.25 mol dm⁻³" } },
      { caption: "Now boil most of the water away, down to 0.50 dm³. The solute is still there, but crowded into a quarter of the volume: 1.00 mol dm⁻³.",
        to: { "#water": { attr: level(0.5) }, ".sol": { attr: { cy: dotY(0.5) } } }, text: { "#vVal": "V = 0.50 dm³", "#cVal": "1.00 mol dm⁻³" }, dur: 1.3 }
    ]
  });
})();
;
/* ---- pages/s1-09-avogadros-law.js ---- */
// Avogadro's law: equal volumes of gases, same temperature and pressure, hold equal numbers of
// particles. Then double the particles in one cylinder and the piston moves out to double the volume.

(() => {
  const K = Kit, C = K.C;
  const A = { x0: 80, y0: 170, x1: 320, y1: 400 };      // x1 moves with the piston
  const B = { x0: 680, y0: 170, x1: 920, y1: 400 };
  const HE = { r: 9, fill: C.ion }, CO2 = { r: 14, fill: C.heat, stroke: "#fff", sw: 2 };

  const svg = `
    <path class="fade" d="M ${B.x0} ${B.y0} L ${B.x1} ${B.y0} L ${B.x1} ${B.y1} L ${B.x0} ${B.y1} Z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <path class="fade" d="M 570 ${A.y0} L ${A.x0} ${A.y0} L ${A.x0} ${A.y1} L 570 ${A.y1}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="psA"></g><g id="psB"></g>
    ${K.g("pistonA", 320, 0, `<line x1="0" y1="${A.y0}" x2="0" y2="${A.y1}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="285" x2="46" y2="285" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(200, 448, "8 helium atoms", "graph-label fade", 'id="nA"')}${K.t(800, 448, "8 carbon dioxide molecules", "graph-label fade")}
    ${K.t(200, 148, "helium (He)", "molecule-label fade")}${K.t(800, 148, "carbon dioxide (CO₂)", "molecule-label fade")}`;

  K.page({
    id: "avogadros-law",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Avogadro's law: equal volumes, equal numbers",
    description: "Two cylinders of gas of equal size: the left holds 8 small helium atoms and the right holds 8 bigger carbon dioxide molecules. Tapping adds 8 more helium atoms to the left cylinder and its piston slides out to double the volume, keeping the same temperature and pressure.",
    svg, bounds: [70, 130, 930, 460], tapLabel: "Tap to add more gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(9);
      d.a = A; d.boxA = { ...A }; d.boxB = { ...B };
      d.pa = K.spawn(ctx, "#psA", 8, { ...HE, cls: "fade" }, d.boxA, rand, 70);
      d.pb = K.spawn(ctx, "#psB", 8, { ...CO2, cls: "fade" }, d.boxB, rand, 70);
      d.extra = [];
      K.tick(ctx, dt => { K.bounce(d.pa.concat(d.extra), d.boxA, dt); K.bounce(d.pb, d.boxB, dt); });
    },

    steps: [
      { caption: "Two gases in equal-sized containers, at the same temperature and pressure: 8 helium atoms on the left, 8 carbon dioxide molecules on the right. Avogadro's law says equal volumes of gases hold equal numbers of particles, whatever the gas.",
        footnote: "The carbon dioxide molecules are drawn bigger, but in a gas the particles are so far apart that their size hardly matters." },
      { caption: "Now put twice as much gas in the left cylinder, keeping the temperature and pressure the same. The piston has to move out to double the volume: volume is proportional to the amount of gas, V ∝ n.",
        footnote: "At standard temperature and pressure, one mole of any ideal gas takes up 22.7 dm³.",
        booklet: "§2: molar volume of an ideal gas at STP, 22.7 dm³ mol⁻¹. §4: STP is 273.15 K and 100 kPa.",
        to: { "#pistonA": { x: 570 } }, text: { "#nA": "16 helium atoms" }, dur: 1.4,
        run(ctx, tl, dir) {
          const d = ctx.data;
          if (dir === "fwd") {
            const fresh = K.spawn(ctx, "#psA", 8, { ...HE, fade: true }, { x0: A.x0, y0: A.y0, x1: 320, y1: A.y1 }, K.rng(21), 70);
            d.extra = fresh;
            tl.to(fresh.map(p => p.el), { opacity: 1, duration: 0.5 }, 0).to(d.boxA, { x1: 570, duration: 1.4, ease: "power2.inOut" }, 0);
          } else {
            const gone = d.extra;
            tl.to(d.boxA, { x1: 320, duration: 0.9, ease: "power2.inOut" }, 0)
              .to(gone.map(p => p.el), { opacity: 0, duration: 0.5 }, 0.3)
              .call(() => { gone.forEach(p => p.el.remove()); if (d.extra === gone) d.extra = []; }, null, 0.9);
          }
        } }
    ]
  });
})();
;
/* ---- pages/s1-10-real-gases.js ---- */
// Real gases: an ideal gas is tiny particles that never attract each other. Squeeze it (high pressure)
// and the particles' own size matters; cool it (low temperature) and their attractions matter.

(() => {
  const K = Kit, C = K.C;
  const TOP = 150, BOT = 390, LEFT = 140, WIDE = 760, TIGHT = 340, R = 10;
  const share = w => Math.round(100 * 14 * Math.PI * R * R / (w - LEFT) / (BOT - TOP));

  const svg = `
    <path class="fade" d="M ${WIDE + 30} ${TOP} L ${LEFT} ${TOP} L ${LEFT} ${BOT} L ${WIDE + 30} ${BOT}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="halos" opacity="0"></g><g id="ps"></g>
    ${K.g("piston", WIDE, 0, `<line x1="0" y1="${TOP}" x2="0" y2="${BOT}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="270" x2="46" y2="270" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(500, 440, "ideal gas: tiny particles, no forces between them", "molecule-label fade", 'id="tag"')}
    ${K.t(500, 122, "the particles fill about " + share(WIDE) + " % of the space", "graph-label fade", 'id="fill"')}`;

  K.page({
    id: "real-gases",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "Real gases: when particles get in each other's way",
    description: "A cylinder with a piston, holding 14 particles bouncing freely: the ideal gas model. Tapping pushes the piston in, so the particles fill a much bigger share of the space. Tapping again slows the particles and draws a pale halo round each one to show the attractions between real particles that matter at low temperature.",
    svg, bounds: [130, 110, 810, 460], tapLabel: "Tap to squeeze or cool the gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(14);
      d.box = { x0: LEFT, y0: TOP, x1: WIDE, y1: BOT };
      d.speed = 90;
      d.list = K.spawn(ctx, "#ps", 14, { r: R, fill: C.ion, cls: "fade" }, d.box, rand, 90);
      d.halos = d.list.map(() => {
        const h = document.createElementNS(K.NS, "circle");
        h.setAttribute("r", 26); h.setAttribute("fill", C.violet); h.setAttribute("opacity", 0.16);
        ctx.$("#halos").appendChild(h);
        return h;
      });
      K.tick(ctx, dt => {
        K.setSpeed(d.list, d.speed, Math.min(1, dt * 3));
        K.bounce(d.list, d.box, dt);
        d.list.forEach((p, i) => { d.halos[i].setAttribute("cx", p.x); d.halos[i].setAttribute("cy", p.y); });
      });
    },

    steps: [
      { caption: "The ideal gas is a simple model: particles so small they take up no space, and that never attract or repel each other. Real gases behave almost like this at low pressure and high temperature.",
        footnote: "Here the particles are drawn much bigger than in real life, so you can see the effect." },
      { caption: "Squeeze the gas at high pressure and the particles' own size stops being negligible: they fill a real share of the space, so there's less room to move than the ideal gas law assumes.",
        to: { "#piston": { x: TIGHT } }, text: { "#fill": "the particles fill about " + share(TIGHT) + " % of the space" }, dur: 1.4,
        run(ctx, tl, dir) { tl.to(ctx.data.box, { x1: dir === "fwd" ? TIGHT : WIDE, duration: dir === "fwd" ? 1.4 : 0.9, ease: "power2.inOut" }, 0); } },
      { caption: "Cool it and the particles slow down so much that their weak attractions matter. They pull on each other and hit the walls less hard, so the pressure is lower than the ideal gas law predicts. Cool enough and the gas condenses to a liquid.",
        to: { "#halos": { opacity: 1 } }, text: { "#tag": "real gas: particles that attract each other" },
        run(ctx, tl, dir) { tl.to(ctx.data, { speed: dir === "fwd" ? 28 : 90, duration: 1.2 }, 0); } }
    ]
  });
})();
;
/* ---- pages/s1-11-ideal-gas-law.js ---- */
// PV = nRT: 0.10 mol of gas in a cylinder. Halve the volume: pressure doubles. Double the temperature:
// pressure doubles again. Let the piston go: it settles where the pressure is back to 100 kPa.
// P (kPa) = n R T / V (dm³), with n = 0.10 mol and R = 8.31 J K⁻¹ mol⁻¹.

(() => {
  const K = Kit, C = K.C;
  const N_MOL = 0.10, R_GAS = 8.31, X0 = 100, TOP = 140, BOT = 340, PXV = 96;
  const STATES = [
    { V: 2.5, T: 300 },
    { V: 1.25, T: 300 },
    { V: 1.25, T: 600 },
    { V: 5.0, T: 600 }
  ];
  STATES.forEach(s => { s.P = N_MOL * R_GAS * s.T / s.V; s.x = X0 + PXV * s.V; });
  const pbar = P => ({ attr: { y: 400 - 0.6 * P, height: 0.6 * P } });
  const texts = s => ({ "#rT": "T = " + s.T + " K", "#rV": "V = " + s.V.toFixed(2) + " dm³", "#rP": "P ≈ " + Math.round(s.P) + " kPa" });
  const s0 = STATES[0];
  const start = 'style="text-anchor:start"';

  const svg = `
    <path class="fade" d="M 600 ${TOP} L ${X0} ${TOP} L ${X0} ${BOT} L 600 ${BOT}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    <g id="ps"></g>
    ${K.g("piston", s0.x, 0, `<line x1="0" y1="${TOP}" x2="0" y2="${BOT}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/><line x1="0" y1="240" x2="46" y2="240" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`)}
    ${K.t(X0, 400, "n = 0.10 mol", "molecule-label fade", start)}
    ${K.t(660, 190, "T = " + s0.T + " K", "molecule-label fade", 'id="rT" ' + start)}
    ${K.t(660, 228, "V = " + s0.V.toFixed(2) + " dm³", "molecule-label fade", 'id="rV" ' + start)}
    ${K.t(660, 266, "P ≈ " + Math.round(s0.P) + " kPa", "molecule-label fade", 'id="rP" ' + start)}
    ${K.t(877, 428, "pressure", "graph-label fade")}
    <rect id="pbar" class="fade" x="860" y="${400 - 0.6 * s0.P}" width="34" height="${0.6 * s0.P}" rx="3" fill="${C.heat}"/>
    <line class="fade" x1="850" y1="400" x2="904" y2="400" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`;

  const stepTo = (i, caption, extra = {}) => ({
    caption, ...extra,
    to: { "#piston": { x: STATES[i].x }, "#pbar": pbar(STATES[i].P) }, text: texts(STATES[i]), dur: 1.3,
    run(ctx, tl, dir) {
      const s = STATES[dir === "fwd" ? i : i - 1], d = ctx.data;
      tl.to(d.box, { x1: s.x, duration: 1.3, ease: "power2.inOut" }, 0).to(d, { T: s.T, duration: 1.3 }, 0);
    }
  });

  K.page({
    id: "ideal-gas-law",
    topic: "Structure 1 — Models of the particulate nature of matter",
    title: "PV = nRT: squeezing, heating and adding gas",
    description: "A cylinder with a piston holds 0.10 moles of gas at 300 kelvin, 2.5 cubic decimetres, and about 100 kilopascals, shown as a red pressure bar. Tapping halves the volume and the pressure bar doubles. Tapping again doubles the temperature to 600 kelvin and the particles speed up and the pressure doubles again. Tapping a last time lets the piston move freely and it settles at 5.0 cubic decimetres and 100 kilopascals.",
    svg, bounds: [90, 120, 920, 420], tapLabel: "Tap to change the gas",

    setup(ctx) {
      const d = ctx.data;
      d.box = { x0: X0, y0: TOP, x1: s0.x, y1: BOT };
      d.T = s0.T;
      d.list = K.spawn(ctx, "#ps", 12, { r: 7, fill: C.ion, cls: "fade" }, d.box, K.rng(31), 60);
      K.tick(ctx, dt => {
        K.setSpeed(d.list, 60 * Math.sqrt(d.T / 300), Math.min(1, dt * 3));
        K.bounce(d.list, d.box, dt);
      });
    },

    steps: [
      { caption: "A sealed cylinder holds 0.10 mol of gas at 300 K. It takes up 2.5 dm³ and pushes on the walls with about 100 kPa. The ideal gas equation ties all four quantities together: PV = nRT.",
        footnote: "Real gases only follow it roughly, but for most school problems it's spot on.",
        booklet: "§1 equations: PV = nRT. §2: R = 8.31 J K⁻¹ mol⁻¹. (With P in kPa and V in dm³, the product PV is in joules.)" },
      stepTo(1, "Halve the volume at constant temperature and the same particles hit the walls twice as often: the pressure doubles. (P ∝ 1 ÷ V)"),
      stepTo(2, "Now double the temperature in kelvin, 300 K to 600 K, at constant volume. The particles move faster, so they hit harder as well as more often: the pressure doubles again. (P ∝ T)"),
      stepTo(3, "Let the piston go, with 100 kPa pushing back from outside. The gas pushes it out until the pressure is back to 100 kPa: V = nRT ÷ P = 5.0 dm³. Twice the temperature at the same pressure means twice the volume. (V ∝ T)",
        { footnote: "The gas laws you may have met separately (Boyle's, Charles's) are all special cases of PV = nRT." })
    ]
  });
})();
;
/* ---- pages/s2-01-ionic-lattice.js ---- */
// Ionic lattices: one Na+ and one Cl- attract; add more and a lattice builds. Slide a layer by one ion
// and like charges meet, so the crystal splits (brittle).

(() => {
  const K = Kit, C = K.C;
  const COLS = 8, ROWS = 5, SP = 60, X0 = 290, Y0 = 115;
  const ion = (i, j) => {
    const pos = (i + j) % 2 === 0, x = X0 + j * SP, y = Y0 + i * SP, seed = i === 2 && (j === 3 || j === 4);
    return `<g class="${seed ? "fade" : "lat"}" ${seed ? "" : 'opacity="0"'} data-d="${Math.hypot(j - 3.5, i - 2).toFixed(2)}">
      <circle cx="${x}" cy="${y}" r="${pos ? 19 : 30}" fill="${pos ? C.proton : C.electron}"/>
      <text class="nuc-sym" x="${x}" y="${y}" style="font-size:22px">${pos ? "+" : "−"}</text></g>`;
  };
  const rows = (a, b) => { let s = ""; for (let i = a; i <= b; i++) for (let j = 0; j < COLS; j++) s += ion(i, j); return s; };
  const crack = `M 270 205 L 320 195 L 370 215 L 420 195 L 470 215 L 520 195 L 570 215 L 620 195 L 670 215 L 720 195 L 790 210`;

  const svg = `
    ${K.g("bottom", 0, 0, rows(2, 4))}${K.g("top", 0, 0, rows(0, 1))}
    <path id="crack" d="${crack}" fill="none" stroke="${C.heat}" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round" opacity="0"/>
    ${K.t(880, 210, "cracks!", "molecule-label", 'id="crackLab" opacity="0"')}
    ${K.t(500, 445, "small red: sodium ions, Na⁺  ·  big blue: chloride ions, Cl⁻", "graph-label fade")}`;

  K.page({
    id: "ionic-lattice",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Ionic lattices: why salt makes crystals",
    description: "A single small red sodium ion, plus, sits next to a big blue chloride ion, minus. Tapping adds more ions until a rectangular lattice forms, red and blue alternating in every direction. Tapping again slides the top two rows one ion to the right so that like charges sit above each other, and a dashed orange crack appears between the layers.",
    svg, bounds: [260, 85, 830, 450], tapLabel: "Tap to build and break the crystal",
    steps: [
      { caption: "On the ionic bonding page, one Na⁺ ion attracted one Cl⁻ ion. But an ion attracts every ion of the opposite charge around it, in every direction, not just one partner.",
        footnote: "Ions are drawn as flat discs here. Real ions are 3D spheres, and the chloride ion really is bigger than sodium's." },
      { caption: "So ions pile up into a giant lattice: every Na⁺ surrounded by Cl⁻, every Cl⁻ by Na⁺, all held by strong attraction in every direction. That's why ionic compounds are hard crystals with high melting points.",
        footnote: "In real, 3D sodium chloride, each ion touches six of the opposite charge.",
        booklet: "§10 ionic radii: Na⁺ 102 pm, Cl⁻ 181 pm. §16 lattice enthalpy of NaCl: 790 kJ mol⁻¹ (the energy to pull one mole of the crystal apart into gaseous ions).",
        to: { ".lat": { opacity: 1, delay: (i, el) => +el.dataset.d * 0.12 } }, dur: 0.5, captionAt: 1.6 },
      { caption: "Hit the crystal and a layer can slide along by one ion. Now like charges sit side by side and repel, and the crystal splits. That's why ionic solids are hard but brittle.",
        footnote: "Melt it or dissolve it and the ions are free to move, so it conducts electricity. As a solid, the ions are locked in place and it doesn't.",
        to: { "#top": { x: SP }, "#crack": { opacity: 1, delay: 0.7 }, "#crackLab": { opacity: 1, delay: 0.7 } }, dur: 1.0 }
    ]
  });
})();
;
/* ---- pages/s2-02-multiple-bonds.js ---- */
// Double and triple bonds: more shared pairs pull the atoms closer and hold them harder.
// C-C in ethane, C=C in ethene, C≡C in ethyne. Lengths (pm) and enthalpies (kJ/mol) from the data booklet.

(() => {
  const K = Kit, C = K.C;
  const PX = 2;                                       // canvas px per pm
  const X = pm => [500 - pm * PX / 2, 500 + pm * PX / 2];
  const LINES = { // y of each of the three lines, and whether it shows, for 1, 2 and 3 shared pairs
    1: [[235, 1], [235, 0], [235, 0]],
    2: [[222, 1], [248, 1], [235, 0]],
    3: [[212, 1], [258, 1], [235, 1]]
  };
  const move = (order, pm) => {
    const [xa, xb] = X(pm), out = { "#cL": { x: xa }, "#cR": { x: xb } };
    LINES[order].forEach(([y, show], i) => { out["#ln" + i] = { attr: { x1: xa, x2: xb, y1: y, y2: y }, opacity: show }; });
    return out;
  };
  const [x0, x1] = X(154);

  const svg = `
    ${[0, 1, 2].map(i => `<line id="ln${i}" ${i === 0 ? 'class="fade"' : 'opacity="0"'} x1="${x0}" y1="235" x2="${x1}" y2="235" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>`).join("")}
    ${K.atom("cL", x0, 235, 34, "C", C.grey)}${K.atom("cR", x1, 235, 34, "C", C.grey)}
    ${K.t(500, 140, "ethane: a single bond, C–C", "atom-name fade", 'id="what"')}
    ${K.t(500, 340, "bond length 154 pm", "molecule-label fade", 'id="len"')}
    ${K.t(500, 376, "bond enthalpy 346 kJ mol⁻¹", "molecule-label fade", 'id="enth"')}`;

  K.page({
    id: "multiple-bonds",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Double and triple bonds",
    description: "Two grey carbon atoms joined by one line, a single bond, 154 picometres long with a bond enthalpy of 346 kilojoules per mole. Tapping adds a second line and the atoms move closer, 134 picometres and 614 kilojoules per mole for a double bond. Tapping again adds a third, 120 picometres and 839 kilojoules per mole for a triple bond.",
    svg, bounds: [300, 120, 700, 400], tapLabel: "Tap to share another pair",
    steps: [
      { caption: "A single bond is one shared pair of electrons. The C–C bond in ethane is 154 pm long, and it takes 346 kJ to break a mole of them.",
        booklet: "§11 bond lengths: C–C 154 pm. §12 bond enthalpies: C–C 346 kJ mol⁻¹." },
      { caption: "Share two pairs and you have a double bond, as in ethene. More shared electrons pull the atoms closer, so the bond is shorter (134 pm) and stronger (614 kJ mol⁻¹).",
        booklet: "§11: C=C 134 pm. §12: C=C 614 kJ mol⁻¹.",
        to: move(2, 134), text: { "#what": "ethene: a double bond, C=C", "#len": "bond length 134 pm", "#enth": "bond enthalpy 614 kJ mol⁻¹" } },
      { caption: "Three shared pairs make a triple bond, as in ethyne: shorter still (120 pm) and stronger still (839 kJ mol⁻¹).",
        footnote: "Notice the double bond is stronger than a single one, but not twice as strong (614 against 346). The extra pairs don't help as much as the first.",
        booklet: "§11: C≡C 120 pm. §12: C≡C 839 kJ mol⁻¹.",
        to: move(3, 120), text: { "#what": "ethyne: a triple bond, C≡C", "#len": "bond length 120 pm", "#enth": "bond enthalpy 839 kJ mol⁻¹" } }
    ]
  });
})();
;
/* ---- pages/s2-04b-build-molecule.js ---- */
// Build a molecule: drag atoms from the tray onto the canvas. Atoms snap together when you drop one near
// another that still has a free bond (its "valence"), tap a bond to make it double or triple, drag an atom
// back to the tray to remove it. Bonded atoms are held together by springs and non-bonded atoms push apart,
// so molecules settle into a sensible flat shape (real molecules are 3D, as the footnote says).
// A finished molecule (every atom's bonds used up) gets its formula, name and shape.
// Keyboard: Tab to a tray atom and press Enter to add it, bonded to the latest atom that has a free bond.

(() => {
  const K = Kit, C = K.C, NS = K.NS;
  const KIND = {
    H: { v: 1, r: 17, fill: "#E7EAF0", text: "#1B1A22" }, C: { v: 4, r: 24, fill: "#6B6672", text: "#fff" },
    N: { v: 3, r: 23, fill: C.electron, text: "#fff" }, O: { v: 2, r: 23, fill: C.proton, text: "#fff" },
    Cl: { v: 1, r: 26, fill: C.product, text: "#fff" }
  };
  const SYMS = Object.keys(KIND);
  const LONE_PAIRS = { H: 0, C: 0, N: 1, O: 2, Cl: 3 };   // on a finished atom; used for the angle each atom prefers
  const AREA = { x0: 235, x1: 770, y0: 70, y1: 445 };
  const TRAY_X = 150, BOND_LEN = 72, REPEL = 118, SNAP = BOND_LEN + 46;
  const sub = s => String(s).replace(/\d/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]);

  // key = Hill-order formula (C first, then H, then the rest alphabetically; with no C, all alphabetical)
  const KNOWN = {
    "H2": ["H₂", "hydrogen", "linear"], "O2": ["O₂", "oxygen", "linear, double bond"], "N2": ["N₂", "nitrogen", "linear, triple bond"],
    "Cl2": ["Cl₂", "chlorine", "linear"], "ClH": ["HCl", "hydrogen chloride", "linear"], "H2O": ["H₂O", "water", "bent"],
    "H3N": ["NH₃", "ammonia", "trigonal pyramidal"], "CH4": ["CH₄", "methane", "tetrahedral"], "CO2": ["CO₂", "carbon dioxide", "linear"],
    "C2H4": ["C₂H₄", "ethene", "trigonal planar at each C"], "C2H2": ["C₂H₂", "ethyne", "linear"], "C2H6": ["C₂H₆", "ethane", "tetrahedral at each C"],
    "CH3Cl": ["CH₃Cl", "chloromethane", "tetrahedral"], "CCl4": ["CCl₄", "tetrachloromethane", "tetrahedral"], "CHN": ["HCN", "hydrogen cyanide", "linear"],
    "CH2O": ["CH₂O", "methanal", "trigonal planar"], "CH4O": ["CH₃OH", "methanol", "tetrahedral C, bent O"], "CH5N": ["CH₃NH₂", "methylamine", "tetrahedral C, pyramidal N"],
    "H2O2": ["H₂O₂", "hydrogen peroxide", "bent at each O"], "H4N2": ["N₂H₄", "hydrazine", "pyramidal at each N"], "CH2Cl2": ["CH₂Cl₂", "dichloromethane", "tetrahedral"],
    "CHCl3": ["CHCl₃", "trichloromethane", "tetrahedral"], "C2H6O": ["C₂H₆O", "ethanol or methoxymethane", "isomers: same atoms, new bonds"]
  };
  const GOALS = [["H2O", "water"], ["H3N", "ammonia"], ["CH4", "methane"], ["CO2", "carbon dioxide"], ["C2H4", "ethene"], ["CHN", "hydrogen cyanide"]];

  const trayY = i => 95 + i * 78;
  const palette = SYMS.map((s, i) => K.g("tray" + s, TRAY_X - 80, trayY(i),
    `<circle r="${KIND[s].r}" fill="${KIND[s].fill}" stroke="var(--ink)" stroke-width="2.5"/><text class="nuc-sym" style="font-size:${s === "Cl" ? 18 : 20}px;fill:${KIND[s].text}">${s}</text>`,
    "tray dragger", `data-sym="${s}" role="button" aria-label="Add a ${s} atom"`)).join("");
  const trayLabels = SYMS.map((s, i) => K.t(TRAY_X - 25, trayY(i) + 6, "bonds: " + KIND[s].v, "graph-label", 'style="text-anchor:start"')).join("");
  const goalRows = GOALS.map(([, name], i) => `<text class="graph-label" id="goal${i}" x="800" y="${270 + i * 26}" style="text-anchor:start">○ ${name}</text>`).join("");

  const svg = `
    <g id="play" opacity="0">
      <rect id="trayBox" x="20" y="64" width="${TRAY_X + 40}" height="${AREA.y1 - 58}" rx="18" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="7 6"/>
      ${K.t(95, 54, "atoms (drag out)", "graph-label")}
      ${trayLabels}
      <rect x="${AREA.x0 - 10}" y="${AREA.y0 - 8}" width="${AREA.x1 - AREA.x0 + 20}" height="${AREA.y1 - AREA.y0 + 16}" rx="18" fill="${C.violet}" fill-opacity="0.04" stroke="${C.pale}" stroke-width="2"/>
      <g id="bondLayer"></g><g id="atomLayer"></g>
      ${palette}
      ${K.t(885, 92, "", "atom-name", 'id="formula" style="font-size:26px"')}
      ${K.t(885, 126, "", "molecule-label", 'id="mname"')}
      ${K.t(885, 156, "", "graph-label", 'id="mshape"')}
      ${K.t(885, 186, "", "graph-label", 'id="mnote"')}
      ${K.t(885, 244, "try making:", "graph-label")}
      ${goalRows}
    </g>`;

  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (parent) parent.appendChild(e); return e; };

  function build(ctx) {
    const d = ctx.data, svgEl = ctx.svg;
    d.atoms = []; d.bonds = []; d.drag = null; d.done = new Set(); d.nextId = 1;
    const atomLayer = ctx.$("#atomLayer"), bondLayer = ctx.$("#bondLayer");

    const toSvg = e => { const pt = svgEl.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svgEl.getScreenCTM().inverse()); };
    const used = a => d.bonds.reduce((n, b) => n + (b.a === a || b.b === a ? b.order : 0), 0);
    const free = a => KIND[a.sym].v - used(a);
    const bondBetween = (a, b) => d.bonds.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    const neighbours = a => d.bonds.filter(b => b.a === a || b.b === a).map(b => b.a === a ? b.b : b.a);
    const canBond = (a, o) => o !== a && free(o) > 0 && free(a) > 0 && !bondBetween(a, o);

    function place(a) { a.el.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)})`); }
    function placeBond(b) {
      const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, gap = 8;
      b.el.querySelectorAll("line").forEach((ln, i) => {
        const o = i === 0 ? 0 : (i - 1 - (b.order - 1) / 2) * gap;     // line 0 is the wide invisible one you tap
        ln.setAttribute("x1", b.a.x + nx * o); ln.setAttribute("y1", b.a.y + ny * o);
        ln.setAttribute("x2", b.b.x + nx * o); ln.setAttribute("y2", b.b.y + ny * o);
      });
    }
    const render = () => { d.atoms.forEach(place); d.bonds.forEach(placeBond); };

    function newAtom(sym, x, y) {
      const k = KIND[sym];
      const g = el("g", { class: "dragger" }, atomLayer);
      el("circle", { class: "body", r: k.r, fill: k.fill, stroke: "var(--ink)", "stroke-width": 2.5 }, g);
      const t = el("text", { class: "nuc-sym", style: `font-size:${sym === "Cl" ? 18 : 20}px;fill:${k.text}` }, g); t.textContent = sym;
      const a = { id: d.nextId++, sym, x, y, vx: 0, vy: 0, el: g, slots: el("g", {}, g) };
      g.addEventListener("pointerdown", e => { startDrag(a, e); e.preventDefault(); e.stopPropagation(); });
      d.atoms.push(a);
      place(a); refreshSlots(a);
      return a;
    }
    function refreshSlots(a) {   // hollow dots around an atom: one for each bond it can still make
      a.slots.innerHTML = "";
      const n = free(a), r = KIND[a.sym].r + 8;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i + 0.5) / n * Math.PI * 2 + a.id;
        el("circle", { cx: Math.cos(ang) * r, cy: Math.sin(ang) * r, r: 4, fill: "none", stroke: C.heat, "stroke-width": 2 }, a.slots);
      }
    }
    function removeAtom(a) { d.bonds.filter(b => b.a === a || b.b === a).forEach(removeBond); a.el.remove(); d.atoms.splice(d.atoms.indexOf(a), 1); }
    function removeBond(b) { b.el.remove(); d.bonds.splice(d.bonds.indexOf(b), 1); }
    function addBond(a, b) {
      const g = el("g", { class: "bond" }, bondLayer), bd = { a, b, order: 1, el: g };
      g.addEventListener("click", () => cycleBond(bd));
      d.bonds.push(bd);
      a.vy += (Math.random() - 0.5) * 8; b.vy += (Math.random() - 0.5) * 8;   // a nudge, so a perfectly straight chain can still bend
      drawBond(bd); placeBond(bd);
      return bd;
    }
    function drawBond(b) {
      b.el.innerHTML = "";
      el("line", { stroke: "transparent", "stroke-width": 26, "stroke-linecap": "round", style: "cursor:pointer" }, b.el);
      for (let i = 0; i < b.order; i++) el("line", { stroke: "var(--ink)", "stroke-width": 5, "stroke-linecap": "round", style: "pointer-events:none" }, b.el);
    }
    function cycleBond(b) {
      const room = Math.min(free(b.a), free(b.b));
      b.order = room > 0 && b.order < 3 ? b.order + 1 : 1;
      drawBond(b); placeBond(b);
      afterChange();
    }

    // ----- dragging -----
    function startDrag(a, e) {
      const p = toSvg(e);
      d.drag = { a, dx: a.x - p.x, dy: a.y - p.y };
      svgEl.setPointerCapture && svgEl.setPointerCapture(e.pointerId);
      a.el.parentNode.appendChild(a.el);                                // on top of the others while it moves
    }
    const highlight = (a, on) => d.atoms.forEach(o => {
      const cand = on && canBond(a, o) && Math.hypot(o.x - a.x, o.y - a.y) < SNAP;
      const body = o.el.querySelector(".body"); body.setAttribute("stroke", cand ? C.product : "var(--ink)"); body.setAttribute("stroke-width", cand ? 5 : 2.5);
    });
    const onMove = e => {
      if (!d.drag) return;
      const p = toSvg(e), a = d.drag.a;
      a.x = p.x + d.drag.dx; a.y = p.y + d.drag.dy; a.vx = a.vy = 0;
      ctx.$("#trayBox").setAttribute("stroke", a.x < TRAY_X + 40 ? C.proton : "var(--ink)");
      highlight(a, true); render();
    };
    const onUp = e => {
      if (!d.drag) return;
      const a = d.drag.a; d.drag = null;
      highlight(a, false);
      ctx.$("#trayBox").setAttribute("stroke", "var(--ink)");
      try { svgEl.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (a.x < TRAY_X + 40) { removeAtom(a); afterChange(); return; }
      a.x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, a.x)); a.y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, a.y));
      d.atoms.filter(o => canBond(a, o) && Math.hypot(o.x - a.x, o.y - a.y) < SNAP)
        .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))
        .forEach(o => { if (canBond(a, o)) addBond(a, o); });
      afterChange(); render();
    };
    ["pointermove", "pointerup", "pointercancel"].forEach((n, i) => svgEl.addEventListener(n, i ? onUp : onMove));
    d.listeners = [["pointermove", onMove], ["pointerup", onUp], ["pointercancel", onUp]];

    // pulling a new atom out of the tray (pointer), or adding one bonded to the latest unfinished atom (keyboard)
    function keyboardAdd(sym) {
      const open = d.atoms.slice().reverse().find(a => free(a) > 0 && KIND[sym]);
      let x = (AREA.x0 + AREA.x1) / 2, y = (AREA.y0 + AREA.y1) / 2;
      if (open) { const ang = Math.random() * Math.PI * 2; x = open.x + Math.cos(ang) * BOND_LEN; y = open.y + Math.sin(ang) * BOND_LEN; }
      x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, x)); y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, y));
      const a = newAtom(sym, x, y);
      if (open && canBond(a, open)) addBond(a, open);
      afterChange(); render();
    }
    ctx.$$(".tray").forEach(t => {
      t.addEventListener("pointerdown", e => { const p = toSvg(e), a = newAtom(t.dataset.sym, p.x, p.y); startDrag(a, e); e.preventDefault(); e.stopPropagation(); });
      t.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); keyboardAdd(t.dataset.sym); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
      });
      t.setAttribute("tabindex", "-1");
    });

    // ----- results -----
    function components() {
      const seen = new Set(), out = [];
      d.atoms.forEach(a => {
        if (seen.has(a)) return;
        const comp = [], stack = [a];
        while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); comp.push(x); neighbours(x).forEach(n => stack.push(n)); }
        out.push(comp);
      });
      return out;
    }
    function hill(comp) {
      const cnt = {}; comp.forEach(a => { cnt[a.sym] = (cnt[a.sym] || 0) + 1; });
      const syms = Object.keys(cnt), rest = syms.filter(s => s !== "C" && s !== "H").sort();
      const order = cnt.C ? ["C", ...(cnt.H ? ["H"] : []), ...rest] : syms.sort();
      return order.map(s => s + (cnt[s] > 1 ? cnt[s] : "")).join("");
    }
    function afterChange() {
      d.atoms.forEach(refreshSlots);
      const main = components().filter(c => c.length > 1).sort((p, q) => q.length - p.length)[0];
      const f = ctx.$("#formula"), nm = ctx.$("#mname"), sh = ctx.$("#mshape"), nt = ctx.$("#mnote");
      f.textContent = nm.textContent = sh.textContent = nt.textContent = "";
      if (!main) { nt.textContent = d.atoms.length ? "bring two atoms close together" : ""; }
      else {
        const open = main.reduce((n, a) => n + free(a), 0), key = hill(main), known = KNOWN[key];
        if (open > 0) { f.textContent = sub(key); nm.textContent = "not finished"; sh.textContent = open + " open bond" + (open > 1 ? "s" : "") + " left (hollow dots)"; }
        else if (known) { f.textContent = known[0]; nm.textContent = known[1]; sh.textContent = known[2]; GOALS.forEach(([k], i) => { if (k === key) d.done.add(i); }); }
        else { f.textContent = sub(key); nm.textContent = "every bond is used up"; sh.textContent = "stable, but not one I know"; }
      }
      GOALS.forEach((g, i) => { const t = ctx.$("#goal" + i); t.textContent = (d.done.has(i) ? "● " : "○ ") + g[1]; t.style.fill = d.done.has(i) ? C.product : C.ink; });
    }
    d.afterChange = afterChange;

    // ----- physics: springs along bonds, repulsion between the rest, kept inside the canvas -----
    K.tick(ctx, dt => {
      const k = Math.min(dt * 60, 3);
      d.atoms.forEach(a => { a.fx = 0; a.fy = 0; });
      d.bonds.forEach(b => {
        const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, L = Math.hypot(dx, dy) || 1;
        const rest = BOND_LEN - 6 * (b.order - 1) + (KIND[b.a.sym].r + KIND[b.b.sym].r - 40) * 0.5;
        const f = (L - rest) * 0.18, fx = f * dx / L, fy = f * dy / L;
        b.a.fx += fx; b.a.fy += fy; b.b.fx -= fx; b.b.fy -= fy;
      });
      // VSEPR in two dimensions: the neighbours of an atom prefer the angle its electron domains (bonds + lone pairs) give
      const shaped = new Set();
      d.atoms.forEach(x => {
        const nb = neighbours(x);
        if (nb.length < 2) return;
        const domains = Math.min(4, nb.length + LONE_PAIRS[x.sym]), theta = [0, 0, Math.PI, 2 * Math.PI / 3, 105 * Math.PI / 180][domains];
        for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
          const a = nb[i], b = nb[j], ra = Math.hypot(a.x - x.x, a.y - x.y), rb = Math.hypot(b.x - x.x, b.y - x.y);
          const target = Math.sqrt(ra * ra + rb * rb - 2 * ra * rb * Math.cos(theta));
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 0.01, f = (L - target) * 0.1, fx = f * dx / L, fy = f * dy / L;
          a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
          shaped.add(a.id + "-" + b.id); shaped.add(b.id + "-" + a.id);
        }
      });
      for (let i = 0; i < d.atoms.length; i++) for (let j = i + 1; j < d.atoms.length; j++) {
        const a = d.atoms[i], b = d.atoms[j];
        if (d.drag && (d.drag.a === a || d.drag.a === b)) continue;     // so an atom you're holding can reach its target
        if (shaped.has(a.id + "-" + b.id)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 0.01;
        const range = bondBetween(a, b) ? 0 : REPEL + (a.sym === "Cl" || b.sym === "Cl" ? 14 : 0);
        if (L < range) { const f = (range - L) * 0.1, fx = f * dx / L, fy = f * dy / L; a.fx -= fx; a.fy -= fy; b.fx += fx; b.fy += fy; }
      }
      d.atoms.forEach(a => {
        if (d.drag && d.drag.a === a) return;
        a.vx = (a.vx + a.fx * k) * 0.8; a.vy = (a.vy + a.fy * k) * 0.8;
        a.x = Math.min(AREA.x1 - 20, Math.max(AREA.x0 + 20, a.x + a.vx * k)); a.y = Math.min(AREA.y1 - 20, Math.max(AREA.y0 + 20, a.y + a.vy * k));
      });
      render();
    });
    d.clear = () => { d.atoms.slice().forEach(removeAtom); d.done.clear(); afterChange(); };
  }

  K.page({
    id: "build-molecule",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Build a molecule",
    description: "A toolbox for building molecules. On the left is a tray with five kinds of atom: hydrogen, carbon, nitrogen, oxygen and chlorine, each labelled with how many bonds it can make: 1, 4, 3, 2 and 1. You drag atoms onto the canvas; when you drop an atom close to another that still has a free bond, they join with a line. Hollow orange dots around an atom show its unused bonds. Tapping a bond makes it double or triple when both atoms have a spare bond. Dragging an atom back to the tray removes it. When every bond in a molecule is used up, its formula, name and shape appear on the right, and a checklist ticks off water, ammonia, methane, carbon dioxide, ethene and hydrogen cyanide as you build them.",
    svg, bounds: [20, 50, 980, 465], tapLabel: "Tap to open the atom tray",
    setup(ctx) { build(ctx); ctx.data.afterChange(); },
    teardown(ctx) { (ctx.data.listeners || []).forEach(([n, f]) => ctx.svg.removeEventListener(n, f)); },   // the book's svg outlives this page
    steps: [
      { caption: "Atoms bond to fill their outer shells. How many bonds an atom can make depends on how many electrons it is short of a full shell: hydrogen 1, oxygen 2, nitrogen 3, carbon 4, chlorine 1. That number is its valence.",
        footnote: "On the next page there are no wrong moves: if a bond isn't allowed, it just won't form." },
      { caption: "Your turn. Drag atoms out of the tray and drop them next to each other to bond them. The hollow dots show the bonds an atom can still make. Tap a bond to make it double or triple. Drag an atom back to the tray to remove it. When all the dots are used up, you've made a molecule. Try water, ammonia, methane, carbon dioxide, ethene and hydrogen cyanide.",
        footnote: "Drawn flat to keep things simple. Real methane, for example, is a 3D tetrahedron (see the VSEPR page). With a keyboard: Tab to an atom in the tray and press Enter.",
        to: { "#play": { opacity: 1 } }, dur: 0.7,
        run(ctx, tl, dir) {
          if (dir !== "fwd") tl.call(() => ctx.data.clear(), null, 0);
          tl.call(() => ctx.$$(".tray").forEach(t => t.setAttribute("tabindex", dir === "fwd" ? "0" : "-1")), null, 0.3);
        } }
    ]
  });
})();
;
/* ---- pages/s2-03-coordination-bond.js ---- */
// A coordination bond: ammonia's lone pair reaches out to a hydrogen ion, supplying both electrons of the
// new bond. Afterwards, all four N-H bonds in NH4+ are identical.

(() => {
  const K = Kit, C = K.C;
  const H = (x, y, id = "") => `<g ${id ? `id="${id}"` : ""} class="fade" data-x="${x}" data-y="${y}"><circle r="20" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:18px">H</text></g>`;
  const bond = (x, y, extra = 'class="fade"') => K.l(450, 240, x, y, "var(--ink)", 5, extra);

  const svg = `
    ${bond(360, 300)}${bond(540, 300)}${bond(450, 340)}
    <line id="newBond" x1="450" y1="240" x2="450" y2="146" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" opacity="0"/>
    ${H(360, 300)}${H(540, 300)}${H(450, 340)}
    ${K.atom("nAtom", 450, 240, 32, "N", C.electron)}
    <g id="pair" class="fade"><circle cx="441" cy="188" r="5" fill="${C.electron}"/><circle cx="459" cy="188" r="5" fill="${C.electron}"/></g>
    ${K.g("hPlus", 760, 110, `<circle r="20" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><text class="h-plus-label" style="font-size:15px">H⁺</text>`)}
    <g id="giveArrow" opacity="0">${K.arrow(450, 180, 450, 148, C.heat, 4)}</g>
    ${K.t(555, 165, "+", "atom-name", 'id="plus" opacity="0" style="font-size:38px"')}
    ${K.t(500, 445, "ammonia, NH₃, and a hydrogen ion, H⁺", "graph-label fade", 'id="tag"')}`;

  K.page({
    id: "coordination-bond",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Coordination bonds: one atom brings both electrons",
    description: "A blue nitrogen atom joined to three small grey hydrogen atoms, with a pair of blue dots, a lone pair, above it. A hydrogen ion, H plus, sits off to the top right. Tapping moves the hydrogen ion above the lone pair and an orange arrow shows the pair being donated. Tapping again draws a fourth bond and a plus sign: an ammonium ion, NH4 plus, with four identical bonds.",
    svg, bounds: [330, 90, 800, 460], tapLabel: "Tap to bring in the hydrogen ion",
    steps: [
      { caption: "Ammonia, NH₃, has a lone pair: two of nitrogen's outer electrons that aren't used in bonding. A hydrogen ion, H⁺, has no electrons at all, so it has an empty space for a pair.",
        footnote: "H⁺ is just a bare proton. Hydrogen loses its one electron to become an ion." },
      { caption: "The lone pair swings round to make a bond. Both electrons of this new bond come from nitrogen. A bond where one atom supplies both electrons is called a coordination bond (or dative covalent bond).",
        to: { "#hPlus": { x: 450, y: 118 }, "#giveArrow": { opacity: 1, delay: 0.9 } }, text: { "#tag": "the lone pair forms a coordination bond" }, dur: 1.1 },
      { caption: "Once it's formed, NH₄⁺ has four N–H bonds that are all identical. You couldn't tell which one was the coordination bond. The whole ion carries a 1+ charge.",
        to: { "#newBond": { opacity: 1 }, "#pair": { opacity: 0 }, "#giveArrow": { opacity: 0 }, "#plus": { opacity: 1, delay: 0.3 } }, text: { "#tag": "the ammonium ion, NH₄⁺" } }
    ]
  });
})();
;
/* ---- pages/s2-04-vsepr.js ---- */
// VSEPR: electron pairs repel, so they spread out. Lone pairs repel more than bonding pairs and squeeze
// the bond angle: methane 109.5°, ammonia about 107°, water about 104.5°.

(() => {
  const K = Kit, C = K.C, L = 95;
  const wedge = (x, y) => {
    const len = Math.hypot(x, y), px = -y / len * 7, py = x / len * 7;
    return `<polygon points="0,0 ${x + px},${y + py} ${x - px},${y - py}" fill="var(--ink)"/>`;
  };
  const plane = (x, y) => K.l(0, 0, x, y, "var(--ink)", 5);
  const away = (x, y) => K.l(0, 0, x, y, "var(--ink)", 4, 'stroke-dasharray="4 7"');
  const H = (x, y) => `<g transform="translate(${x} ${y})"><circle r="19" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:17px">H</text></g>`;
  const lobe = (x, y) => `<circle cx="${x}" cy="${y}" r="24" fill="${C.violet}" opacity="0.16"/><circle cx="${x - 7}" cy="${y}" r="4.5" fill="${C.violet}"/><circle cx="${x + 7}" cy="${y}" r="4.5" fill="${C.violet}"/>`;
  const centre = (sym, fill) => `<circle r="27" fill="${fill}"/><text class="nuc-sym" style="font-size:22px">${sym}</text>`;

  const ch4 = plane(-78, 55) + plane(78, 55) + wedge(48, -52) + away(-48, -52) + H(-78, 55) + H(78, 55) + H(48, -52) + H(-48, -52) + centre("C", C.grey);
  const nh3 = plane(-76, 58) + plane(76, 58) + wedge(45, -55) + lobe(-45, -58) + H(-76, 58) + H(76, 58) + H(45, -55) + centre("N", C.electron);
  const h2o = plane(-72, 58) + plane(72, 58) + lobe(-48, -55) + lobe(48, -55) + H(-72, 58) + H(72, 58) + centre("O", C.proton);

  const svg = `
    ${K.g("mCH4", 500, 210, ch4)}${K.g("mNH3", 500, 210, nh3, "", 'opacity="0"')}${K.g("mH2O", 500, 210, h2o, "", 'opacity="0"')}
    ${K.t(500, 345, "methane, CH₄: tetrahedral", "atom-name fade", 'id="shape"')}
    ${K.t(500, 385, "H–C–H angle 109.5°", "molecule-label fade", 'id="angle"')}
    ${K.t(500, 430, "solid wedge: towards you · dashed: away from you · purple: a lone pair", "graph-label fade")}`;

  K.page({
    id: "vsepr",
    topic: "Structure 2 — Models of bonding and structure",
    title: "VSEPR: electron pairs pushing apart",
    description: "A methane molecule: a grey carbon atom in the middle with four small hydrogen atoms around it in a tetrahedral arrangement, two bonds in the plane, one solid wedge coming towards you and one dashed going away, with a bond angle of 109.5 degrees. Tapping swaps it for ammonia, where one position is a purple lone pair and the angle is about 107 degrees. Tapping again swaps it for water, with two lone pairs and an angle of about 104.5 degrees.",
    svg, bounds: [380, 110, 620, 450], tapLabel: "Tap to swap the molecule",
    steps: [
      { caption: "Electron pairs repel each other, so around a central atom they spread as far apart as they can. Methane has four bonding pairs, giving a tetrahedral shape with 109.5° between the bonds.",
        footnote: "Two pairs make a straight line (180°), three a flat triangle (120°), four a tetrahedron (109.5°)." },
      { caption: "Ammonia has four pairs too, but one is a lone pair. A lone pair is held by only one nucleus, so it spreads out and repels harder, squeezing the bonding pairs together: trigonal pyramidal, about 107°.",
        to: { "#mCH4": { opacity: 0 }, "#mNH3": { opacity: 1 } }, text: { "#shape": "ammonia, NH₃: trigonal pyramidal", "#angle": "H–N–H angle about 107°" }, dur: 0.7 },
      { caption: "Water has two lone pairs, which squeeze the bonding pairs even closer: a bent shape, about 104.5°. The shape of the molecule is the shape of its atoms, not its electron pairs.",
        footnote: "HL: five electron pairs make a trigonal bipyramid, six an octahedron.",
        to: { "#mNH3": { opacity: 0 }, "#mH2O": { opacity: 1 } }, text: { "#shape": "water, H₂O: bent", "#angle": "H–O–H angle about 104.5°" }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s2-05-polarity.js ---- */
// Polar bonds and polar molecules. HCl has one polar bond, so the molecule is polar. CO2 has two polar
// bonds that cancel, so it isn't. In bent H2O the bond dipoles add up, so it is.

(() => {
  const K = Kit, C = K.C;
  const cloud = (cx, rx) => `<ellipse cx="${cx}" cy="0" rx="${rx}" ry="34" fill="${C.violet}" opacity="0.17"/>`;
  const at = (x, y, r, fill, sym, dark) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.round(r * 0.85)}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text></g>`;
  const lab = (x, y, s) => K.t(x, y, s, "molecule-label");

  const hcl = cloud(30, 78) + at(-72, 0, 22, C.pale, "H", true) + at(72, 0, 34, C.product, "Cl") +
    lab(-72, -46, "δ+") + lab(72, -56, "δ−") + K.arrow(-60, 78, 62, 78, C.violet, 5) + K.t(0, 112, "the electrons are pulled towards chlorine", "graph-label");
  const co2 = at(0, 0, 25, C.grey, "C") + at(-118, 0, 30, C.proton, "O") + at(118, 0, 30, C.proton, "O") +
    lab(-118, -50, "δ−") + lab(118, -50, "δ−") + lab(0, -44, "2δ+") +
    K.arrow(-22, 70, -104, 70, C.violet, 5) + K.arrow(22, 70, 104, 70, C.violet, 5) + K.t(0, 112, "equal and opposite: no overall dipole", "graph-label");
  const h2o = K.l(0, -10, -78, 66, "var(--ink)", 5) + K.l(0, -10, 78, 66, "var(--ink)", 5) +
    at(0, -10, 32, C.proton, "O") + at(-78, 66, 21, C.pale, "H", true) + at(78, 66, 21, C.pale, "H", true) +
    lab(0, -60, "δ−") + K.arrow(-90, 92, -28, 14, C.violet, 4) + K.arrow(90, 92, 28, 14, C.violet, 4) +
    K.arrow(178, 70, 178, -30, C.violet, 8) + K.t(178, 100, "net dipole", "graph-label") + K.t(0, 132, "the dipoles add up: a polar molecule", "graph-label");

  const svg = `
    ${K.g("sHCl", 500, 200, hcl)}${K.g("sCO2", 500, 200, co2, "", 'opacity="0"')}${K.g("sH2O", 500, 200, h2o, "", 'opacity="0"')}
    ${K.t(500, 405, "H–Cl: 3.2 − 2.2 = 1.0", "atom-name fade", 'id="calc"')}
    ${K.t(500, 445, "a polar bond, so a polar molecule", "molecule-label fade", 'id="verdict"')}`;

  K.page({
    id: "polarity",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Polar bonds and polar molecules",
    description: "A hydrogen chloride molecule: a small grey hydrogen and a bigger green chlorine joined together, with a purple electron cloud pulled towards chlorine, which is marked delta minus while hydrogen is delta plus, and an arrow below pointing from hydrogen towards chlorine. Tapping swaps it for a straight carbon dioxide molecule, whose two purple arrows point in opposite directions and cancel. Tapping again swaps it for a bent water molecule, whose bond arrows add up to a large net dipole arrow.",
    svg, bounds: [300, 110, 800, 460], tapLabel: "Tap to try another molecule",
    steps: [
      { caption: "In H–Cl, chlorine attracts the shared electrons more strongly than hydrogen does. The bond is polar: chlorine is slightly negative (δ−) and hydrogen slightly positive (δ+). The bigger the electronegativity difference, the more polar the bond.",
        booklet: "§9 electronegativity: H 2.2, C 2.6, O 3.4, Cl 3.2." },
      { caption: "Carbon dioxide has two polar bonds, but the molecule is a straight line, so they pull in opposite directions and cancel out. A molecule can have polar bonds and still not be polar overall.",
        to: { "#sHCl": { opacity: 0 }, "#sCO2": { opacity: 1 } }, text: { "#calc": "C=O: 3.4 − 2.6 = 0.8", "#verdict": "polar bonds, but a non-polar molecule" }, dur: 0.7 },
      { caption: "Water's bonds are polar too, but the molecule is bent, so they don't cancel: they add up to a net dipole. Water is a polar molecule, which is why it dissolves so many things.",
        footnote: "Polar molecules attract each other more strongly than non-polar ones, and dissolve in polar solvents — 'like dissolves like'.",
        to: { "#sCO2": { opacity: 0 }, "#sH2O": { opacity: 1 } }, text: { "#calc": "O–H: 3.4 − 2.2 = 1.2", "#verdict": "polar bonds, bent shape: a polar molecule" }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s2-06-giant-covalent.js ---- */
// Giant covalent structures: diamond (a rigid network), graphite (layers that slide, delocalized
// electrons), and silicon dioxide (silicon bridged by oxygen).

(() => {
  const K = Kit, C = K.C;
  const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

  // Diamond: every atom bonded to four neighbours (a flat slice of a 3D network).
  let diamond = "";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
    const x = -175 + 70 * j, y = -105 + 70 * i;
    if (j < 5) diamond += K.l(x, y, x + 70, y, "var(--ink)", 4);
    if (i < 3) diamond += K.l(x, y, x, y + 70, "var(--ink)", 4);
  }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) diamond += dot(-175 + 70 * j, -105 + 70 * i, 14, "#3d3b47");

  // Graphite: three layers seen edge-on, atoms in a zigzag, with free electrons between the layers.
  const layer = y => {
    let s = "";
    for (let k = 0; k < 9; k++) {
      const x = -240 + 60 * k, yy = y + (k % 2 ? -9 : 9);
      if (k < 8) s += K.l(x, yy, x + 60, y + ((k + 1) % 2 ? -9 : 9), "var(--ink)", 4);
    }
    for (let k = 0; k < 9; k++) s += dot(-240 + 60 * k, y + (k % 2 ? -9 : 9), 12, "#3d3b47");
    return s;
  };
  let free = "";
  [-40, 40].forEach(y => { for (let k = 0; k < 11; k++) free += dot(-250 + 50 * k, y + (k % 2 ? 6 : -6), 4, C.electron); });
  const graphite = `${K.g("layTop", 0, 0, layer(-80), "", "")}${layer(0)}${layer(80)}${free}
    ${K.l(-260, -40, 260, -40, "var(--ink)", 1.5, 'stroke-opacity="0.3" stroke-dasharray="3 8"')}${K.l(-260, 40, 260, 40, "var(--ink)", 1.5, 'stroke-opacity="0.3" stroke-dasharray="3 8"')}`;

  // Silicon dioxide: silicon atoms with an oxygen atom on every bond.
  let silica = "";
  const sx = j => -180 + 120 * j, sy = i => -120 + 120 * i;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    if (j < 3) silica += K.l(sx(j), sy(i), sx(j + 1), sy(i), "var(--ink)", 4);
    if (i < 2) silica += K.l(sx(j), sy(i), sx(j), sy(i + 1), "var(--ink)", 4);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    if (j < 3) silica += dot((sx(j) + sx(j + 1)) / 2, sy(i), 11, C.proton);
    if (i < 2) silica += dot(sx(j), (sy(i) + sy(i + 1)) / 2, 11, C.proton);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) silica += dot(sx(j), sy(i), 17, C.heat);

  const svg = `
    ${K.g("dia", 500, 225, diamond)}${K.g("gra", 500, 225, graphite, "", 'opacity="0"')}${K.g("sil", 500, 225, silica, "", 'opacity="0"')}
    ${K.t(500, 82, "diamond", "atom-name fade", 'id="subst"')}
    ${K.t(500, 445, "very hard · melts at 3500 °C · does not conduct", "molecule-label fade", 'id="props"')}`;

  K.page({
    id: "giant-covalent",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Giant covalent structures: diamond, graphite and silicon",
    description: "A grid of dark carbon atoms joined by lines in a rigid network: diamond. Tapping swaps it for graphite, three flat layers of carbon atoms seen edge-on with small blue free electrons between the layers, and the top layer slides sideways. Tapping again shows silicon dioxide: orange silicon atoms joined through red oxygen atoms in a network.",
    svg, bounds: [220, 60, 780, 460], tapLabel: "Tap to see another giant structure",
    steps: [
      { caption: "In diamond, every carbon atom is bonded to four others by strong covalent bonds, in one enormous rigid network. There are no molecules, just one giant structure. Diamond is very hard, and melts only at a very high temperature.",
        footnote: "This is a flat slice; in real diamond the four bonds point out in 3D, like the corners of a tetrahedron.",
        booklet: "§8 melting points: carbon, 3500 °C." },
      { caption: "Graphite is also pure carbon, but each atom bonds to only three others, making flat layers. The layers are held together only weakly, so they slide over each other — that's why graphite is soft and used in pencils. The fourth electron of each atom is free to move along the layer, so graphite conducts electricity.",
        to: { "#dia": { opacity: 0 }, "#gra": { opacity: 1 } }, text: { "#subst": "graphite", "#props": "soft, slippery layers · conducts electricity" }, dur: 0.7,
        run(ctx, tl, dir) { if (dir === "fwd") tl.to("#layTop", { x: 50, duration: 0.7, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.0); } },
      { caption: "Silicon sits below carbon in the periodic table and forms the same kind of network as diamond. Silicon dioxide, SiO₂ (the main part of sand and quartz), joins each silicon atom to four oxygens, with each oxygen shared between two silicons. It's hard, melts at a high temperature and doesn't conduct.",
        booklet: "§8 melting points: silicon, 1414 °C.",
        to: { "#gra": { opacity: 0 }, "#sil": { opacity: 1 } }, text: { "#subst": "silicon dioxide", "#props": "hard · very high melting point · does not conduct" }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s2-07-imf.js ---- */
// Forces between molecules: London dispersion forces (all particles), dipole-dipole forces (polar
// molecules) and hydrogen bonds (H on N, O or F, next to a lone pair on N, O or F).

(() => {
  const K = Kit, C = K.C;
  const at = (x, y, r, fill, sym, dark) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${Math.round(r * 0.85)}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text></g>`;
  const dash = (x1, y1, x2, y2, col = C.violet) => K.l(x1, y1, x2, y2, col, 4, 'stroke-dasharray="4 9"');
  const lab = (x, y, s) => K.t(x, y, s, "molecule-label");

  // Two argon atoms: the electron cloud of each has slipped to the left.
  const atomWithCloud = x => `<circle cx="${x}" cy="0" r="62" fill="none" stroke="var(--ink)" stroke-width="2.5"/>
    <circle cx="${x - 16}" cy="0" r="50" fill="${C.violet}" opacity="0.2"/>${at(x, 0, 12, C.grey, "")}`;
  const disp = atomWithCloud(-110) + atomWithCloud(110) + lab(-160, -84, "δ−") + lab(-58, -84, "δ+") + lab(60, -84, "δ−") + lab(162, -84, "δ+") +
    dash(-48, 0, 48, 0) + K.t(0, 100, "a passing dipole nudges the next atom's electrons into a matching one", "graph-label");

  const hcl = (x, y) => K.l(x, y, x + 62, y, "var(--ink)", 5) + at(x, y, 20, C.pale, "H", true) + at(x + 62, y, 30, C.product, "Cl");
  const dd = hcl(-190, 0) + hcl(50, 0) + lab(-190, -46, "δ+") + lab(-128, -52, "δ−") + lab(50, -46, "δ+") + lab(112, -52, "δ−") +
    dash(-98, 0, 26, 0) + K.t(0, 100, "δ+ ends are attracted to δ− ends of their neighbours", "graph-label");

  const water = (x, y, hx1, hy1, hx2, hy2) => K.l(x, y, x + hx1, y + hy1, "var(--ink)", 4) + K.l(x, y, x + hx2, y + hy2, "var(--ink)", 4) +
    at(x, y, 25, C.proton, "O") + at(x + hx1, y + hy1, 14, C.pale, "H", true) + at(x + hx2, y + hy2, 14, C.pale, "H", true);
  const hb = water(-170, -10, -40, 34, 40, 34) + water(0, 60, -42, -30, 44, -28) + water(170, -10, 42, -30, 44, 34) +
    dash(-42, 30, -150, 0, C.heat) + dash(44, 32, 150, 0, C.heat) + lab(-96, 34, "H-bond") + lab(100, 34, "H-bond") +
    K.t(0, 130, "H bonded to O, with a lone pair on the next O", "graph-label");

  const svg = `
    ${K.g("fDisp", 500, 215, disp)}${K.g("fDip", 500, 215, dd, "", 'opacity="0"')}${K.g("fHb", 500, 215, hb, "", 'opacity="0"')}
    ${K.t(500, 82, "London dispersion forces", "atom-name fade", 'id="kind"')}
    ${K.t(500, 445, "the weakest, but present between all particles", "molecule-label fade", 'id="rank"')}`;

  K.page({
    id: "imf",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Forces between molecules",
    description: "Two atoms, each an outlined circle with a purple electron cloud that has slipped to the left, joined by a dashed line: London dispersion forces. Tapping swaps it for two polar hydrogen chloride molecules lined up so a positive hydrogen end faces a negative chlorine end: dipole-dipole forces. Tapping again shows three water molecules joined by orange dashed lines from hydrogen to a neighbouring oxygen: hydrogen bonds.",
    svg, bounds: [200, 60, 800, 460], tapLabel: "Tap to see the next force",
    steps: [
      { caption: "Even atoms and molecules with no permanent charge attract each other weakly. Their electrons slosh about, making a brief dipole, which nudges the neighbour's electrons into a matching dipole. These are London (dispersion) forces. More electrons means stronger forces.",
        footnote: "That's why the noble gases, which have no other forces, boil at higher temperatures the bigger they get.",
        booklet: "§8 boiling points: He −268.9 °C, Ne −246.0 °C, Ar −185.8 °C, Kr −153.4 °C, Xe −108.1 °C." },
      { caption: "Polar molecules have a permanent δ+ end and δ− end, so they line up and attract, on top of their dispersion forces. These dipole–dipole forces are stronger than dispersion forces between molecules of a similar size.",
        to: { "#fDisp": { opacity: 0 }, "#fDip": { opacity: 1 } }, text: { "#kind": "dipole–dipole forces", "#rank": "stronger, between polar molecules" }, dur: 0.7 },
      { caption: "When hydrogen is bonded to nitrogen, oxygen or fluorine, it's so δ+ that it's attracted to a lone pair on a neighbouring N, O or F. This hydrogen bond is the strongest of the three, and it's why water is a liquid at room temperature instead of a gas.",
        footnote: "A hydrogen bond is still far weaker than a covalent bond. It's the bond between molecules, not the O–H bond inside them.",
        to: { "#fDip": { opacity: 0 }, "#fHb": { opacity: 1 } }, text: { "#kind": "hydrogen bonds", "#rank": "the strongest of the three" }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s2-08-chromatography.js ---- */
// Chromatography: a mixture of dyes on a paper strip. The solvent creeps up the paper and carries each
// dye a different distance. Rf = distance moved by the spot / distance moved by the solvent.

(() => {
  const K = Kit, C = K.C;
  const BASE = 380, TOP = 140, FRONT = BASE - TOP;
  const SPOTS = [
    { id: "A", rf: 0.85, fill: "#E5B800", name: "yellow" },
    { id: "B", rf: 0.55, fill: "#D2352C", name: "red" },
    { id: "C", rf: 0.25, fill: "#2E6FE0", name: "blue" }
  ];
  const yOf = rf => BASE - rf * FRONT;

  const svg = `
    <rect class="fade" x="400" y="90" width="200" height="330" fill="#F3EBD9" stroke="var(--ink)" stroke-width="2.5"/>
    <rect id="wet" class="fade" x="401" y="${BASE}" width="198" height="0" fill="#CFE8FF" fill-opacity="0.8"/>
    <line class="fade" x1="400" y1="${BASE}" x2="600" y2="${BASE}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 5"/>
    <line id="frontLine" class="fade" x1="400" y1="${BASE}" x2="600" y2="${BASE}" stroke="#5A93C8" stroke-width="3"/>
    <ellipse id="mix" class="fade" cx="500" cy="${BASE}" rx="12" ry="9" fill="#3a3540"/>
    ${SPOTS.map(s => `<ellipse id="sp${s.id}" cx="500" cy="${BASE}" rx="11" ry="8" fill="${s.fill}" opacity="0"/>`).join("")}
    ${K.t(500, 452, "start line", "graph-label fade", 'id="baseLab"')}
    <g id="rfTable" opacity="0">
      ${SPOTS.map((s, i) => K.t(760, 215 + i * 44, `${s.id}: Rf = ${(s.rf * FRONT).toFixed(0)} ÷ ${FRONT} = ${s.rf.toFixed(2)}`, "molecule-label")).join("")}
      ${K.t(760, 175, "distance moved by spot ÷ by solvent", "graph-label")}
    </g>
    <g id="labs" opacity="0">${SPOTS.map(s => K.t(560, yOf(s.rf) + 5, s.id, "atom-name", 'style="text-anchor:start"')).join("")}</g>`;

  K.page({
    id: "chromatography",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Chromatography: a race on paper",
    description: "A strip of paper with a single dark spot of dye mixture on a start line at the bottom. Tapping lets the solvent rise up the paper and the spot splits into three: yellow travelling furthest, red in the middle and blue only a little way. Tapping again labels the three spots A, B and C and shows their Rf values: distance moved by the spot divided by distance moved by the solvent, 0.85, 0.55 and 0.25.",
    svg, bounds: [380, 80, 900, 460], tapLabel: "Tap to start the solvent",
    steps: [
      { caption: "A drop of ink is really a mixture of dyes. Put a spot of it on the start line of a strip of paper, and dip the bottom edge in a solvent.",
        footnote: "The paper is the stationary phase, and the solvent is the mobile phase." },
      { caption: "The solvent creeps up the paper, carrying the dyes with it. A dye that dissolves well in the solvent and clings less to the paper is carried further; one that clings to the paper hangs back. The mixture separates.",
        to: { "#wet": { attr: { y: TOP, height: FRONT } }, "#frontLine": { attr: { y1: TOP, y2: TOP } }, "#mix": { opacity: 0 },
              "#spA": { opacity: 1, attr: { cy: yOf(0.85), ry: 14 } }, "#spB": { opacity: 1, attr: { cy: yOf(0.55), ry: 12 } }, "#spC": { opacity: 1, attr: { cy: yOf(0.25), ry: 10 } } },
        text: { "#baseLab": "start line" }, dur: 2.4 },
      { caption: "Chemists compare substances with the Rf value: the distance moved by the spot divided by the distance moved by the solvent. It's always between 0 and 1, and for a given solvent and paper it identifies the substance.",
        footnote: "Chromatography is used to check the purity of a sample, or to identify what's in a mixture by matching Rf values with known substances.",
        to: { "#rfTable": { opacity: 1 }, "#labs": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s2-09-benzene.js ---- */
// Resonance and benzene (HL): two Kekulé structures, and the truth: six identical bonds sharing a ring
// of delocalized electrons.

(() => {
  const K = Kit, C = K.C, R = 110, CX = 500, CY = 230;
  const v = k => [CX + R * Math.cos(Math.PI / 3 * k - Math.PI / 2), CY + R * Math.sin(Math.PI / 3 * k - Math.PI / 2)];
  // A second line inside the ring, parallel to edge k -> k+1.
  const inner = k => {
    const [x1, y1] = v(k), [x2, y2] = v(k + 1), mx = CX, my = CY, o = 0.2;
    const ip = (x, y) => [x + (mx - x) * o, y + (my - y) * o];
    const [a, b] = ip(x1, y1), [c, d] = ip(x2, y2);
    return `<line x1="${a + (c - a) * 0.12}" y1="${b + (d - b) * 0.12}" x2="${a + (c - a) * 0.88}" y2="${b + (d - b) * 0.88}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`;
  };
  const edges = [0, 1, 2, 3, 4, 5].map(k => { const [x1, y1] = v(k), [x2, y2] = v(k + 1); return K.l(x1, y1, x2, y2, "var(--ink)", 5, 'class="fade"'); }).join("");
  const dbl = ks => `<g id="db${ks[0] % 2 ? "B" : "A"}" ${ks[0] % 2 ? 'opacity="0"' : 'class="fade"'}>${ks.map(inner).join("")}</g>`;

  const svg = `
    ${edges}${dbl([0, 2, 4])}${dbl([1, 3, 5])}
    <circle id="ringE" cx="${CX}" cy="${CY}" r="66" fill="none" stroke="${C.electron}" stroke-width="6" opacity="0"/>
    <g id="both" opacity="0">${K.arrow(640, 230, 730, 230, "var(--ink)", 4)}${K.arrow(730, 230, 640, 230, "var(--ink)", 4)}</g>
    ${K.t(500, 405, "benzene, C₆H₆ (a carbon at each corner, hydrogens not shown)", "graph-label fade")}
    ${K.t(500, 445, "one way to draw it", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "benzene",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Resonance and benzene",
    description: "A hexagon representing benzene, with three double bonds drawn as second lines on alternate sides. Tapping switches the double bonds to the other three sides, with a double-headed arrow to show the two drawings are related by resonance. Tapping again removes the double lines and draws a blue circle inside the hexagon: all six bonds are identical, sharing a ring of delocalized electrons.",
    svg, bounds: [360, 100, 760, 460], tapLabel: "Tap to redraw the molecule",
    steps: [
      { caption: "Benzene, C₆H₆, is a ring of six carbon atoms. One way to draw it gives three C=C double bonds and three C–C single bonds, alternating round the ring.",
        footnote: "Each corner is a carbon atom with one hydrogen attached, left out to keep the picture simple." },
      { caption: "But you can draw it equally well with the double bonds on the other three sides. Neither drawing is right: the molecule doesn't flip between them. Structures like these, which differ only in where the electrons are drawn, are called resonance structures.",
        to: { "#dbA": { opacity: 0 }, "#dbB": { opacity: 1 }, "#both": { opacity: 1, delay: 0.4 } }, text: { "#tag": "the other way to draw it" }, dur: 0.8 },
      { caption: "In fact all six carbon–carbon bonds in benzene are identical, all about 140 pm: in between a single bond (154 pm) and a double bond (134 pm). The electrons of the extra bonds are spread evenly all round the ring: delocalized. That's often drawn as a circle.",
        footnote: "The delocalization makes benzene unusually stable.",
        booklet: "§11: C–C 154 pm and C=C 134 pm. (The 140 pm figure for benzene isn't in the booklet.)",
        to: { "#dbB": { opacity: 0 }, "#both": { opacity: 0 }, "#ringE": { opacity: 1, delay: 0.3 } }, text: { "#tag": "the real molecule: six identical bonds" }, dur: 0.8 }
    ]
  });
})();
;
/* ---- pages/s2-10-formal-charge.js ---- */
// Expanded octets and formal charge (HL): sulfate, SO4 2-. Structure A obeys the octet rule but leaves
// S with +2 and each O with -1. Structure B expands sulfur's octet to 12 electrons and gets every formal
// charge closer to zero, so it is preferred.
// The trick used here: formal charge = valence electrons − sticks − stones, where a "stick" is a bond
// (each stick is half of a bonding pair, so counting sticks already halves the bonding electrons) and a
// "stone" is a single electron in a lone pair.

(() => {
  const K = Kit, C = K.C, D = 95;
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];          // top, right, bottom, left oxygens
  const fcTxt = (id, x, y, s) => K.t(x, y, s, "molecule-label", `id="${id}" style="fill:${C.heat}"`);
  const STONE = "#1B1A22";
  // A lone pair of stones at angle `deg` (0 = straight out from the molecule), `dist` from an atom's centre.
  const pair = (deg, dist, id, extra = "", rad = 3.6, sep = 5) => {
    const a = deg * Math.PI / 180, px = Math.cos(a) * dist, py = Math.sin(a) * dist, nx = -Math.sin(a) * sep, ny = Math.cos(a) * sep;
    return `<g ${id ? `id="${id}"` : ""} ${extra}>${K.c(px + nx, py + ny, rad, STONE)}${K.c(px - nx, py - ny, rad, STONE)}</g>`;
  };
  const outAngle = i => Math.atan2(dirs[i][1], dirs[i][0]) * 180 / Math.PI;

  const oxy = i => {
    const [dx, dy] = dirs[i], x = dx * D, y = dy * D;
    return `${K.l(0, 0, x, y, "var(--ink)", 5, `id="sb${i}"`)}
      <g id="dbl${i}" opacity="0">${K.l(dy * 7, -dx * 7, x + dy * 7, y - dx * 7, "var(--ink)", 4, "")}${K.l(-dy * 7, dx * 7, x - dy * 7, y + dx * 7, "var(--ink)", 4, "")}</g>`;
  };
  // each oxygen: disc, symbol, and three lone pairs (out, and to each side); the "out" pair of the top
  // and bottom oxygens goes when they become double-bonded (6 stones → 4)
  const oAtoms = i => {
    const [dx, dy] = dirs[i], a = outAngle(i);
    return `<g data-x="${dx * D}" data-y="${dy * D}" id="oAt${i}"><circle r="24" fill="${C.proton}"/><text class="nuc-sym" style="font-size:20px">O</text>
      ${pair(a, 36, `lpo${i}`)}${pair(a + 90, 36, `lps${i}`)}${pair(a - 90, 36, `lpt${i}`)}</g>`;
  };
  const charges = [[0, -D - 72], [D + 72, 0], [0, D + 76], [-D - 72, 0]];

  const mol = [0, 1, 2, 3].map(oxy).join("") + [0, 1, 2, 3].map(oAtoms).join("") +
    `<circle r="30" fill="${C.heat}"/><text class="nuc-sym" style="font-size:24px">S</text>` +
    `<circle id="hiS" cx="0" cy="0" r="42" fill="none" stroke="${C.frame}" stroke-width="4" stroke-dasharray="7 6" opacity="0"/>` +
    fcTxt("fcS", 46, -34, "+2") + charges.map(([x, y], i) => fcTxt("fcO" + i, x, y + 5, "−1")).join("");

  // ----- the zoomed-in counting view on the right: a big atom with its sticks and stones -----
  const ZX = 730, ZY = 200;
  const zoomS = `
    <g id="zS" opacity="0" data-x="${ZX}" data-y="${ZY}">
      ${[0, 1, 2, 3].map(i => `<g id="zs${i}">${K.l(0, 0, dirs[i][0] * 100, dirs[i][1] * 100, "var(--ink)", 8, "")}<circle cx="${dirs[i][0] * 100}" cy="${dirs[i][1] * 100}" r="17" fill="${C.proton}" opacity="0.35"/></g>`).join("")}
      <circle r="46" fill="${C.heat}"/><text class="nuc-sym" style="font-size:34px">S</text>
      ${[0, 1, 2, 3].map(i => `<text id="zn${i}" class="atom-name" opacity="0" x="${dirs[i][0] * 56 + (dirs[i][0] === 0 ? 24 : 0)}" y="${dirs[i][1] * 62 + 8 - (dirs[i][1] === 0 ? 24 : 0)}" style="fill:${C.heat}">${i + 1}</text>`).join("")}
    </g>`;
  const zoomO = `
    <g id="zO" opacity="0" data-x="${ZX}" data-y="${ZY}">
      ${K.l(0, 0, 125, 0, "var(--ink)", 8, 'id="zo0"')}<circle cx="125" cy="0" r="17" fill="${C.heat}" opacity="0.35"/>
      <circle r="46" fill="${C.proton}"/><text class="nuc-sym" style="font-size:34px">O</text>
      ${[120, 180, 240].map((d, k) => pair(d, 68, `zp${k}`, 'opacity="0"', 6.5, 9)).join("")}
      ${K.t(80, -16, "1", "atom-name", 'id="zon0" opacity="0" style="fill:#E05A2B"')}
    </g>`;
  const ledger = `
    <g id="ledger" opacity="0">
      ${K.t(ZX, 348, "", "molecule-label", 'id="lv"')}${K.t(ZX, 378, "", "molecule-label", 'id="lk"')}
      ${K.t(ZX, 408, "", "molecule-label", 'id="ls"')}${K.t(ZX, 442, "", "atom-name", 'id="lr" style="fill:#E05A2B"')}
    </g>`;

  const svg = `${K.g("sulfate", 300, 192, mol)}
    ${zoomS}${zoomO}${ledger}
    ${K.t(300, 402, "sulfate ion, SO₄²⁻: every bond single", "atom-name fade", 'id="what"')}
    ${K.t(300, 434, "formal charge = valence e⁻ − sticks − stones", "molecule-label fade", 'id="sums"')}
    ${K.t(300, 460, "", "molecule-label", 'id="sums2"')}`;

  K.page({
    id: "formal-charge",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Expanded octets and formal charge",
    description: "A sulfate ion: an orange sulfur atom in the middle joined by single lines (sticks) to four red oxygen atoms, each oxygen with three pairs of small white dots (stones, the lone-pair electrons). Formal charges are labelled: plus 2 on sulfur and minus 1 on each oxygen. Tapping zooms in on sulfur, counting its four sticks and no stones: 6 minus 4 minus 0 equals plus 2. Tapping again zooms in on an oxygen: one stick and six stones, 6 minus 1 minus 6 equals minus 1. A last tap turns the top and bottom bonds into double bonds, the formal charges on sulfur and those two oxygens drop to 0, and the sums are shown.",
    svg, bounds: [20, 30, 880, 470], tapLabel: "Tap to count sticks and stones",
    steps: [
      { caption: "Sulfate can be drawn with sulfur following the octet rule: eight electrons around it, four single bonds. To see how strained that is, work out each atom's formal charge with a trick: formal charge = valence electrons − sticks − stones. A stick is a bond (a line), and a stone is a single electron in a lone pair (a dot).",
        footnote: "Counting sticks already halves the bonding electrons: each bond is two electrons shared, and half of each pair is yours. That's the step people forget. It's a bookkeeping tool, not a real charge on the atom." },
      { caption: "Zoom in on sulfur. Sulfur is in group 16, so it has 6 valence electrons. Count its sticks: four bonds. Count its stones: none, because sulfur has no lone pairs here. So 6 − 4 − 0 = +2.",
        footnote: "The formula: FC = valence electrons − (bonds) − (lone-pair electrons).",
        to: { "#sulfate": { x: 215, opacity: 1 }, "#zS": { opacity: 1 }, "#what": { opacity: 0 }, "#sums": { opacity: 0 }, "#ledger": { opacity: 1 }, "#hiS": { opacity: 1 },
              "#zs0": { opacity: 1 }, "#zs1": { opacity: 1 }, "#zs2": { opacity: 1 }, "#zs3": { opacity: 1 } },
        text: { "#lv": "valence electrons: 6", "#lk": "− sticks: 4", "#ls": "− stones: 0", "#lr": "6 − 4 − 0 = +2" }, dur: 1.2,
        run(ctx, tl, dir) {
          if (dir !== "fwd") return;
          [0, 1, 2, 3].forEach(i => tl.fromTo(ctx.$("#zn" + i), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.0 + i * 0.35));
        } },
      { caption: "Now an oxygen. Oxygen is also in group 16: 6 valence electrons. It has one stick (the single bond to sulfur) and three lone pairs, so six stones. 6 − 1 − 6 = −1. That's why every oxygen shows −1 here.",
        to: { "#zS": { opacity: 0 }, "#zO": { opacity: 1 }, "#hiS": { attr: { cx: 95, r: 34 } }, "#zp0": { opacity: 1 }, "#zp1": { opacity: 1, delay: 0.2 }, "#zp2": { opacity: 1, delay: 0.4 }, "#zo0": { opacity: 1 }, "#zon0": { opacity: 1, delay: 0.6 } },
        text: { "#lv": "valence electrons: 6", "#lk": "− sticks: 1", "#ls": "− stones: 6", "#lr": "6 − 1 − 6 = −1" }, dur: 1.0 },
      { caption: "Atoms in period 3 and below can hold more than eight electrons: an expanded octet. Give sulfur two double bonds, 12 electrons in all. Sulfur now has six sticks: 6 − 6 − 0 = 0. A double-bonded oxygen has two sticks and four stones: 6 − 2 − 4 = 0. Formal charges closest to zero mark the preferred structure.",
        footnote: "Real sulfate is a resonance hybrid: all four S–O bonds are identical, in between these drawings.",
        to: { "#zO": { opacity: 0 }, "#ledger": { opacity: 0 }, "#hiS": { opacity: 0 }, "#sulfate": { x: 300 }, "#what": { opacity: 1 }, "#sums": { opacity: 1 },
              "#dbl0": { opacity: 1 }, "#dbl2": { opacity: 1 }, "#sb0": { opacity: 0 }, "#sb2": { opacity: 0 }, "#lpo0": { opacity: 0 }, "#lpo2": { opacity: 0 } },
        text: { "#fcS": "0", "#fcO0": "0", "#fcO2": "0", "#what": "sulfate ion, SO₄²⁻: two double bonds",
                "#sums": "sulfur: 6 − 6 − 0 = 0", "#sums2": "double-bonded O: 6 − 2 − 4 = 0 · single-bonded O: 6 − 1 − 6 = −1" }, dur: 1.2 }
    ]
  });
})();
;
/* ---- pages/s2-11-hybridization.js ---- */
// Sigma and pi bonds, and hybridization (HL). A sigma bond is orbitals overlapping head-on along the bond
// axis; a pi bond is p orbitals overlapping sideways, above and below it. Hybridization explains the
// bond angles: sp3 (109.5°), sp2 (120°), sp (180°).

(() => {
  const K = Kit, C = K.C;
  const blob = (cx, cy, rx, ry, fill, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${op}"/>`;
  const row = (y, name, hyb, bonds, angle) =>
    K.t(150, y, name, "molecule-label", 'style="text-anchor:start"') + K.t(370, y, hyb, "atom-name", 'style="text-anchor:start"') +
    K.t(500, y, bonds, "molecule-label", 'style="text-anchor:start"') + K.t(770, y, angle, "molecule-label", 'style="text-anchor:start"');

  const svg = `
    <g id="sigma" class="fade">
      ${blob(440, 235, 78, 60, C.electron, 0.3)}${blob(560, 235, 78, 60, C.electron, 0.3)}${blob(500, 235, 40, 44, C.electron, 0.35)}
      ${K.atom("s1", 400, 235, 16, "", C.grey)}${K.atom("s2", 600, 235, 16, "", C.grey)}
      <g id="sigTxt">${K.t(500, 330, "overlap head-on, on the line between the nuclei", "graph-label")}</g>
    </g>
    <g id="pi" opacity="0">
      ${blob(440, 150, 46, 30, C.violet, 0.4)}${blob(560, 150, 46, 30, C.violet, 0.4)}${blob(440, 320, 46, 30, C.violet, 0.4)}${blob(560, 320, 46, 30, C.violet, 0.4)}
      ${blob(500, 150, 20, 26, C.violet, 0.5)}${blob(500, 320, 20, 26, C.violet, 0.5)}
      ${K.t(500, 380, "overlap sideways, above and below the line", "graph-label")}
    </g>
    <g id="table" opacity="0">
      ${K.t(150, 110, "carbon in…", "graph-label", 'style="text-anchor:start"')}${K.t(370, 110, "hybrid", "graph-label", 'style="text-anchor:start"')}${K.t(500, 110, "bonds", "graph-label", 'style="text-anchor:start"')}${K.t(770, 110, "angle", "graph-label", 'style="text-anchor:start"')}
      ${row(190, "ethane, C₂H₆", "sp³", "4 σ", "109.5°")}
      ${row(270, "ethene, C₂H₄", "sp²", "3 σ + 1 π", "120°")}
      ${row(350, "ethyne, C₂H₂", "sp", "2 σ + 2 π", "180°")}
    </g>
    ${K.t(500, 445, "a σ (sigma) bond", "atom-name fade", 'id="tag"')}`;

  K.page({
    id: "hybridization",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Sigma and pi bonds, and hybridization",
    description: "Two grey nuclei with two large overlapping blue clouds joined head-on between them, labelled a sigma bond. Tapping adds four purple lobes, two above and two below the line, overlapping sideways: a pi bond. Tapping again replaces the picture with a table: ethane's carbon is sp3 with four sigma bonds at 109.5 degrees, ethene's is sp2 with three sigma and one pi at 120 degrees, and ethyne's is sp with two sigma and two pi at 180 degrees.",
    svg, bounds: [130, 80, 880, 460], tapLabel: "Tap to add a pi bond",
    steps: [
      { caption: "A sigma (σ) bond forms when two orbitals overlap head-on, so the electron density is concentrated along the line between the nuclei. Every single bond is a sigma bond.",
        footnote: "Any pair of orbitals that overlaps like this counts: s with s, s with p, or p with p end-to-end." },
      { caption: "A pi (π) bond forms when two p orbitals overlap sideways, above and below the bond axis, with the electron density off the line. A double bond is one σ plus one π; a triple bond is one σ plus two π. The sideways overlap is weaker, which is why π bonds are the reactive part of alkenes.",
        to: { "#pi": { opacity: 1 }, "#sigTxt": { opacity: 0 } }, text: { "#tag": "plus a π (pi) bond: a double bond" } },
      { caption: "Why are the bond angles what they are? Carbon mixes (hybridizes) its 2s and 2p orbitals into new hybrid orbitals that point where the electron pairs want to be: four sp³ (109.5°), three sp² with one p left over for a π bond (120°), or two sp with two p left over (180°).",
        to: { "#sigma": { opacity: 0 }, "#pi": { opacity: 0 }, "#table": { opacity: 1, delay: 0.3 } }, text: { "#tag": "hybridization decides the shape" }, dur: 0.8 }
    ]
  });
})();
;
/* ---- pages/s2-12-metallic-strength.js ---- */
// What makes a metallic bond strong: more delocalized electrons per atom, and a smaller ion.
// Na (1 electron, 102 pm ion) -> Mg (2, 72 pm) -> Al (3, 54 pm). Melting points from the data booklet.

(() => {
  const K = Kit, C = K.C, rand = K.rng(17);
  const GX = (j) => 350 + j * 100, GY = i => 150 + i * 100;
  const ions = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ions.push(`<circle class="mion fade" cx="${GX(j)}" cy="${GY(i)}" r="28" fill="${C.ion}"/>`);
  // 27 electrons scattered between the ions; the first 9 always show, then 9 more, then the last 9.
  let e = "";
  for (let n = 0; n < 27; n++) {
    const x = 305 + rand() * 390, y = 105 + rand() * 290;
    e += `<circle class="${n < 9 ? "fade" : "e" + (n < 18 ? 2 : 3)}" ${n < 9 ? "" : 'opacity="0"'} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${C.electron}"/>`;
  }
  const svg = `${ions.join("")}${e}
    ${K.t(500, 68, "sodium: Na⁺ ions, 1 electron each", "atom-name fade", 'id="metal"')}
    ${K.t(840, 215, "melting point", "graph-label fade")}${K.t(840, 255, "98 °C", "atom-name fade", 'id="mp"')}
    ${K.t(500, 440, "ion radius 102 pm", "molecule-label fade", 'id="rad"')}`;

  K.page({
    id: "metallic-strength",
    topic: "Structure 2 — Models of bonding and structure",
    title: "What makes a metallic bond strong",
    description: "A three by three grid of blue positive ions with small blue electrons scattered between them, labelled sodium, one electron each, melting point 98 degrees Celsius. Tapping changes it to magnesium: the ions shrink, twice as many electrons appear, and the melting point rises to 650 degrees. Tapping again changes it to aluminium: smaller ions, three electrons each, melting point 660 degrees.",
    svg, bounds: [280, 40, 900, 460], tapLabel: "Tap to move across the period",
    steps: [
      { caption: "A metallic bond is the attraction between positive metal ions and the sea of delocalized electrons around them. Sodium gives just one electron per atom to the sea, and its ions are relatively big. The bond is weak, and sodium melts at only 98 °C.",
        booklet: "§8 melting points: Na 97.79 °C. §10 ionic radius: Na⁺ 102 pm." },
      { caption: "Magnesium gives two electrons per atom, and its ion is smaller and carries a 2+ charge. More electrons in the sea, more charge, and ions that get closer to it: a much stronger attraction, and a melting point of 650 °C.",
        booklet: "§8: Mg 650.0 °C. §10: Mg²⁺ 72 pm.",
        to: { ".mion": { attr: { r: 20 } }, ".e2": { opacity: 1, stagger: 0.04 } }, text: { "#metal": "magnesium: Mg²⁺ ions, 2 electrons each", "#mp": "650 °C", "#rad": "ion radius 72 pm" } },
      { caption: "Aluminium gives three electrons per atom and has a smaller ion again: the strongest metallic bond of the three, and the highest melting point, 660 °C.",
        footnote: "Transition elements do even better: their d electrons join the sea too, which is why many transition metals melt at very high temperatures.",
        booklet: "§8: Al 660.3 °C. §10: Al³⁺ 54 pm.",
        to: { ".mion": { attr: { r: 15 } }, ".e3": { opacity: 1, stagger: 0.04 } }, text: { "#metal": "aluminium: Al³⁺ ions, 3 electrons each", "#mp": "660 °C", "#rad": "ion radius 54 pm" } }
    ]
  });
})();
;
/* ---- pages/s2-13-bonding-triangle.js ---- */
// The van Arkel–Ketelaar bonding triangle, drawn like the data booklet's (§17). A compound sits at
// (average electronegativity, electronegativity difference); the corners are metallic, covalent and ionic
// and most bonds sit in between. The right-hand scale reads off % covalent / % ionic character.
// The scale marks (8, 25, 50, 75, 92 % ionic) follow Pauling's estimate: % ionic = 100 (1 − e^(−Δχ²/4)).

(() => {
  const K = Kit, C = K.C;
  const X = m => 100 + (m - 0.79) / 3.21 * 540;        // average electronegativity -> x
  const Y = d => 395 - d * 88;                         // electronegativity difference -> y
  const SC = 740;                                      // x of the percentage scale
  const ionic = d => 100 * (1 - Math.exp(-d * d / 4)); // % ionic character
  const dOf = p => 2 * Math.sqrt(-Math.log(1 - p / 100)); // difference that gives p % ionic

  const pt = (id, name, m, d, fill, extra = 'opacity="0"', dx = 0) => `
    <g id="${id}" ${extra} data-x="${X(m)}" data-y="${Y(d)}"><circle r="11" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${K.t(dx, -19, name, "molecule-label")}</g>`;
  const pct = (id, name, m, d) => `
    <g id="${id}" opacity="0">${K.l(X(m), Y(d), SC - 38, Y(d), C.violet, 2.5, 'stroke-dasharray="6 5"')+K.l(SC - 38, Y(d), SC - 30, Y(d), C.violet, 2.5, '')}${K.c(SC, Y(d), 6, C.violet)}
      ${K.t(SC + 44, Y(d) + 5, `${name}: ${Math.round(ionic(d))} % ionic`, "molecule-label", 'style="text-anchor:start"')}</g>`;

  const xTicks = [0.79, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map(m =>
    K.l(X(m), 395, X(m), 402, "var(--ink)", 2, "") + K.t(X(m), 420, m === 0.79 ? "0.79" : m.toFixed(1), "graph-label")).join("");
  const yTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(d =>
    K.l(72, Y(d), 80, Y(d), "var(--ink)", 2, "") + K.t(64, Y(d) + 5, d === 0 ? "0" : d.toFixed(1), "graph-label", 'style="text-anchor:end"')).join("");
  const scale = [[100, 0], [75, 25], [50, 50], [25, 75], [8, 92]].map(([cov, ion]) =>
    K.l(SC - 6, Y(dOf(ion)), SC + 6, Y(dOf(ion)), "var(--ink)", 2, "") +
    K.t(SC - 12, Y(dOf(ion)) + 5, cov, "graph-label", 'style="text-anchor:end"') + K.t(SC + 12, Y(dOf(ion)) + 5, ion, "graph-label", 'style="text-anchor:start"')).join("");

  const svg = `
    <g class="fade">
      ${K.l(80, Y(0), 80, Y(3.2), "var(--ink)", 2, "")}${yTicks}${K.l(X(0.79), 395, X(4.0), 395, "var(--ink)", 2, "")}${xTicks}
      ${K.t(30, 96, "difference Δχ = |χa − χb|", "graph-label", 'style="text-anchor:start"')}
      ${K.t(X(2.4), 448, "average electronegativity, (χa + χb) ÷ 2", "graph-label")}
      ${K.l(SC, Y(0), SC, Y(3.2), "var(--ink)", 2, "")}${scale}
      ${K.t(SC - 12, 96, "% covalent", "graph-label", 'style="text-anchor:end"')}${K.t(SC + 12, 96, "% ionic", "graph-label", 'style="text-anchor:start"')}
    </g>
    <path class="fade" d="M ${X(0.79)} ${Y(0)} L ${X(4.0)} ${Y(0)} L ${X(2.4)} ${Y(3.2)} Z" fill="${C.violet}" fill-opacity="0.07" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
    ${K.t(X(2.4), Y(3.2) - 14, "ionic", "atom-name fade")}
    ${K.t(X(1.7), Y(0.5), "metallic", "atom-name fade")}${K.t(X(3.3), Y(0.5), "covalent", "atom-name fade")}
    ${K.t(X(2.4), Y(1.6), "polar covalent", "molecule-label fade")}
    ${pt("pNa", "Na", 0.9, 0, C.ion, 'opacity="0"', 26)}${pt("pCl2", "Cl₂", 3.2, 0, C.product)}${pt("pNaCl", "NaCl", 2.05, 2.3, C.proton)}
    ${pt("pHCl", "HCl", 2.7, 1.0, C.heat)}${pt("pSi", "Si", 1.9, 0, C.grey)}
    ${pct("mNaCl", "NaCl", 2.05, 2.3)}${pct("mHCl", "HCl", 2.7, 1.0)}`;

  K.page({
    id: "bonding-triangle",
    topic: "Structure 2 — Models of bonding and structure",
    title: "The bonding triangle: ionic, covalent, metallic",
    description: "The data booklet's bonding triangle. A large triangle with axes: average electronegativity along the bottom from 0.79 to 4.0 and electronegativity difference up the left from 0 to 3.0, and a scale on the right giving percent covalent and percent ionic character. Its corners are labelled metallic at the bottom left, covalent at the bottom right and ionic at the top, with polar covalent in between. Tapping places sodium near the metallic corner, chlorine gas near the covalent corner and sodium chloride near the ionic corner. Tapping again places hydrogen chloride and silicon. A last tap reads off the percentages: sodium chloride about 73 percent ionic and hydrogen chloride about 22 percent ionic.",
    svg, bounds: [20, 80, 990, 466], tapLabel: "Tap to place compounds on the triangle",
    steps: [
      { caption: "Ionic, covalent and metallic bonding are three models, but real bonding is a continuum between them. The bonding triangle places a substance by two numbers: the average electronegativity of its two atoms, (χa + χb) ÷ 2, along the bottom, and the difference between them, Δχ = |χa − χb|, up the side.",
        booklet: "§17 triangular bonding diagram (van Arkel–Ketelaar triangle), with the % covalent and % ionic scale; §9 electronegativity values." },
      { caption: "Sodium, with two atoms of low electronegativity, sits at the metallic corner. Chlorine gas, two identical atoms of high electronegativity, sits at the covalent corner. Sodium chloride has a big difference (3.2 − 0.9 = 2.3) and lands near the ionic corner.",
        booklet: "§9: Na 0.9, Cl 3.2, H 2.2, Si 1.9.",
        to: { "#pNa": { opacity: 1 }, "#pCl2": { opacity: 1, delay: 0.3 }, "#pNaCl": { opacity: 1, delay: 0.6 } } },
      { caption: "Most compounds fall in between. Hydrogen chloride has a medium difference (1.0): a polar covalent bond. Silicon, with identical atoms of middling electronegativity, sits along the bottom edge between metallic and covalent, and is a semiconductor.",
        to: { "#pHCl": { opacity: 1 }, "#pSi": { opacity: 1, delay: 0.3 } } },
      { caption: "The scale on the right turns the difference into character percentages. Follow a compound across to it: sodium chloride is about 73 % ionic (27 % covalent), hydrogen chloride only about 22 % ionic (78 % covalent). No bond is 100 % ionic: even the most ionic compounds have some covalent character.",
        footnote: "The marks on the scale follow Pauling's estimate: % ionic = 100 × (1 − e^(−Δχ²/4)). The formula itself isn't printed in the booklet.",
        booklet: "§17: % covalent and % ionic scale (100/0, 75/25, 50/50, 25/75, 8/92).",
        to: { "#mNaCl": { opacity: 1 }, "#mHCl": { opacity: 1, delay: 0.4 } } }
    ]
  });
})();
;
/* ---- pages/s2-14-alloys.js ---- */
// Alloys: in a pure metal, identical layers of atoms slide over each other easily. In an alloy, atoms of a
// different size break up the layers, so they can't slide, and the alloy is harder.

(() => {
  const K = Kit, C = K.C, SP = 56, X0 = 250, Y0 = 130, COLS = 9, ROWS = 5;
  const big = new Set(["1,2", "1,5", "2,3", "2,7", "3,1", "3,4", "3,6", "0,4", "0,7", "4,2", "4,5", "4,8"]);   // the larger atoms of the second metal
  const lattice = (id, alloy) => {
    const top = [], bottom = [];
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      const x = X0 + j * SP + (i % 2) * 0, y = Y0 + i * SP, isBig = alloy && big.has(i + "," + j);
      (i < 2 ? top : bottom).push(`<circle cx="${x}" cy="${y}" r="${isBig ? 27 : 21}" fill="${isBig ? C.heat : C.ion}" stroke="#fff" stroke-width="2"/>`);
    }
    return K.g(id + "Top", 0, 0, top.join(""), "") + bottom.join("");
  };
  const svg = `
    <g id="pure" class="fade">${lattice("pure", false)}</g>
    <g id="alloy" opacity="0">${lattice("alloy", true)}</g>
    <g id="push" class="fade">${K.arrow(150, 158, 232, 158, C.heat, 7)}${K.t(150, 128, "push", "molecule-label")}</g>
    ${K.t(500, 445, "pure metal: identical atoms in tidy layers", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "alloys",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Alloys: mixing metals",
    description: "Rows of identical blue metal atoms packed in tidy layers, with an orange arrow pushing the top two rows sideways. Tapping lets the top layers slide along easily. Tapping again swaps to an alloy: the same layers with some bigger orange atoms mixed in, and when the top layers are pushed they barely move because the bigger atoms block them.",
    svg, bounds: [120, 100, 820, 440], tapLabel: "Tap to push the top layers",
    steps: [
      { caption: "A pure metal is layers of identical atoms held by the sea of electrons. Because the atoms are all the same size, the layers line up neatly.",
        footnote: "The atoms are drawn as flat discs; a real metal is a 3D stack." },
      { caption: "Push on the top layers and they slide over the ones below, because the bonding is the same wherever the atoms end up. That's why pure metals are malleable and soft.",
        to: { "#pureTop": { x: SP } }, dur: 1.1 },
      { caption: "An alloy is a mixture of a metal with other metals or non-metals. The atoms of the second element are a different size, so they break up the neat layers and lock them together: push, and the layers can't slide. Alloys are usually harder and stronger than their pure metals.",
        footnote: "Brass is copper mixed with zinc. Steel is iron mixed with a little carbon.",
        to: { "#pure": { opacity: 0 }, "#alloy": { opacity: 1 } }, text: { "#tag": "alloy: atoms of a different size block the layers" }, dur: 0.7,
        run(ctx, tl, dir) { if (dir === "fwd") tl.to("#alloyTop", { x: 12, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.9); } }
    ]
  });
})();
;
/* ---- pages/s2-15-addition-polymers.js ---- */
// Addition polymers: ethene monomers each break their C=C double bond and join end to end into
// poly(ethene). n CH2=CH2 -> (-CH2-CH2-)n

(() => {
  const K = Kit, C = K.C, Y = 235;
  const FINAL = p => 230 + p * 180, START = p => 160 + p * 230;
  const unit = x => `<circle cx="${x}" cy="0" r="26" fill="${C.grey}"/><text class="nuc-sym" x="${x}" y="0" style="font-size:16px">CH₂</text>`;
  const monomer = p => K.g("mono" + p, START(p), Y, `
    ${K.l(-45, -6, 45, -6, "var(--ink)", 5, 'class="dbl1"')}${K.l(-45, 6, 45, 6, "var(--ink)", 5, 'class="dbl2"')}
    ${unit(-45)}${unit(45)}
    <circle class="ends" cx="-82" cy="0" r="6" fill="${C.heat}" opacity="0"/><circle class="ends" cx="82" cy="0" r="6" fill="${C.heat}" opacity="0"/>`);
  const links = [0, 1, 2].map(p => K.l(FINAL(p) + 45, Y, FINAL(p + 1) - 45, Y, "var(--ink)", 5, `class="link" opacity="0"`)).join("");

  const svg = `${links}${[0, 1, 2, 3].map(monomer).join("")}
    ${K.t(500, 350, "ethene, CH₂=CH₂: four separate molecules", "atom-name fade", 'id="tag"')}
    ${K.t(500, 405, "n CH₂=CH₂  →  ( –CH₂–CH₂– )<tspan dy=\"5\" style=\"font-size:0.7em\">n</tspan>", "molecule-label", 'id="eq" opacity="0"')}`;

  K.page({
    id: "addition-polymers",
    topic: "Structure 2 — Models of bonding and structure",
    title: "Addition polymers: monomers joining hands",
    description: "Four ethene molecules in a row, each two grey CH2 units joined by a double bond. Tapping opens each double bond into a single bond, leaving reactive orange dots at the ends. Tapping again slides the molecules together and new single bonds link them into one long chain: poly(ethene).",
    svg, bounds: [80, 170, 920, 430], tapLabel: "Tap to make the polymer",
    steps: [
      { caption: "Ethene is a small molecule with a C=C double bond. A monomer is a small molecule like this that can be joined to many others.",
        footnote: "Hydrogen atoms are left out of the drawing to keep it simple: each CH₂ has two." },
      { caption: "In addition polymerization, one bond of each double bond breaks. Each monomer is left with a reactive end at either side, ready to join to another.",
        to: { ".dbl2": { opacity: 0 }, ".dbl1": { attr: { y1: 0, y2: 0 } }, ".ends": { opacity: 1, stagger: 0.03, delay: 0.3 } }, text: { "#tag": "each double bond opens up" } },
      { caption: "The monomers link end to end with new single bonds, making one long chain: poly(ethene), or polythene. Nothing is lost: the polymer's atoms are exactly the monomers' atoms, added together, which is why it's called addition polymerization.",
        footnote: "Real chains have thousands of units, far more than fit on the page.",
        to: { "#mono0": { x: FINAL(0) }, "#mono1": { x: FINAL(1) }, "#mono2": { x: FINAL(2) }, "#mono3": { x: FINAL(3) },
              ".ends": { opacity: 0 }, ".link": { opacity: 1, delay: 1.3 }, "#eq": { opacity: 1, delay: 1.4 } },
        text: { "#tag": "poly(ethene): one long chain" }, dur: 1.5 }
    ]
  });
})();
;
/* ---- pages/s3-01-periodic-table.js ---- */
// The periodic table, periods 1 to 4: rows are periods, columns are groups, and the block names come from
// the type of orbital filled last.

(() => {
  const K = Kit, C = K.C;
  const ROWS = [
    { cols: [0, 17], syms: ["H", "He"] },
    { cols: [0, 1, 12, 13, 14, 15, 16, 17], syms: ["Li", "Be", "B", "C", "N", "O", "F", "Ne"] },
    { cols: [0, 1, 12, 13, 14, 15, 16, 17], syms: ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"] },
    { cols: Array.from({ length: 18 }, (_, i) => i), syms: ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"] }
  ];
  const X = c => 104 + c * 44, Y = r => 128 + r * 46;
  const tint = c => (c < 2 || c === 17 && false ? "#FBE3DC" : c >= 12 ? "#E1ECFA" : c >= 2 ? "#E9E1F8" : "#FBE3DC");

  let cells = "";
  ROWS.forEach((row, r) => row.cols.forEach((c, i) => {
    const he = row.syms[i] === "He";
    cells += `<rect class="fade" x="${X(c)}" y="${Y(r)}" width="40" height="40" rx="6" fill="${he ? "#E1ECFA" : tint(c)}" stroke="var(--ink)" stroke-width="2"/>
      ${K.t(X(c) + 20, Y(r) + 26, row.syms[i], "graph-label fade")}`;
  }));
  const heads = Array.from({ length: 18 }, (_, c) => K.t(X(c) + 20, 118, c + 1, "graph-label fade")).join("");
  const nums = [1, 2, 3, 4].map(r => K.t(92, Y(r - 1) + 26, r, "graph-label fade", 'style="text-anchor:end"')).join("");
  const bracket = (c0, c1, text) => `<g class="blk" opacity="0"><path d="M ${X(c0)} 322 L ${X(c0)} 330 L ${X(c1) + 40} 330 L ${X(c1) + 40} 322" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t((X(c0) + X(c1) + 40) / 2, 356, text, "atom-name")}</g>`;

  const svg = `${cells}${heads}${nums}
    ${K.t(500, 96, "group", "atom-name fade", 'style="font-size:18px"')}${K.t(56, 240, "period", "atom-name fade", 'style="font-size:18px"')}
    <rect id="hiPeriod" x="98" y="${Y(2) - 6}" width="802" height="52" rx="10" fill="none" stroke="${C.heat}" stroke-width="5" opacity="0"/>
    <rect id="hiGroup" x="${X(16) - 6}" y="${Y(1) - 6}" width="52" height="${46 * 3 + 6}" rx="10" fill="none" stroke="${C.heat}" stroke-width="5" opacity="0"/>
    ${bracket(0, 1, "s block")}${bracket(2, 11, "d block")}${bracket(12, 17, "p block")}
    ${K.t(500, 445, "period 3: electrons up to the third shell", "molecule-label", 'id="note" opacity="0"')}`;

  K.page({
    id: "periodic-table",
    topic: "Structure 3 — Classification of matter",
    title: "The periodic table: periods, groups and blocks",
    description: "The first four rows of the periodic table drawn as a grid of tinted boxes, with group numbers 1 to 18 along the top and period numbers 1 to 4 down the side. Tapping outlines period 3, the row from sodium to argon. Tapping again outlines group 17: fluorine, chlorine and bromine. Tapping a last time brackets the s block, d block and p block underneath.",
    svg, bounds: [50, 80, 950, 470], tapLabel: "Tap to pick out rows, columns and blocks",
    steps: [
      { caption: "The periodic table arranges the elements by atomic number. Each row is a period and each column is a group. Here are the first four periods.",
        footnote: "Helium sits in group 18 with the noble gases, though it has just two electrons.",
        booklet: "§7 the periodic table." },
      { caption: "The period number shows the outer energy level that holds electrons. Across period 3, from sodium to argon, each atom adds electrons to the same third shell.",
        to: { "#hiPeriod": { opacity: 1 }, "#note": { opacity: 1 } } },
      { caption: "Elements in a group have the same number of outer electrons, so they behave alike. Fluorine, chlorine and bromine (group 17) each have seven outer electrons, and all form 1− ions and react in similar ways.",
        to: { "#hiPeriod": { opacity: 0 }, "#hiGroup": { opacity: 1 } }, text: { "#note": "group 17: seven outer electrons each" } },
      { caption: "The table also falls into blocks, named after the type of orbital being filled last: the s block, the p block, and the d block of transition elements in between.",
        to: { "#hiGroup": { opacity: 0 }, ".blk": { opacity: 1, stagger: 0.2 }, "#note": { opacity: 0 } } }
    ]
  });
})();
;
/* ---- pages/s3-02-hydrogen.js ---- */
// Hydrogen: one outer electron like the group 1 metals, one short of a full shell like the halogens.

(() => {
  const K = Kit, C = K.C;
  const at = (n, sym, cx, shells, fill) => {
    const R = [44, 70];
    let s = "";
    shells.forEach((e, k) => {
      s += `<circle r="${R[k]}" fill="none" class="orbit"/>`;
      for (let i = 0; i < e; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / e + (k ? 0.3 : 0), outer = k === shells.length - 1;
        s += `<circle cx="${(R[k] * Math.cos(a)).toFixed(1)}" cy="${(R[k] * Math.sin(a)).toFixed(1)}" r="7" fill="${C.electron}" ${outer ? `stroke="${C.heat}" stroke-width="3"` : ""}/>`;
      }
    });
    return K.g(n, cx, 215, `${s}<circle r="22" fill="${fill}"/><text class="nuc-sym">${sym}</text>`);
  };
  const cap = (x, t) => K.t(x, 335, t, "atom-name fade");

  const svg = `
    ${at("aLi", "Li", 200, [2, 1], C.proton)}${at("aH", "H", 500, [1], C.proton)}${at("aF", "F", 800, [2, 7], C.proton)}
    ${cap(200, "lithium")}${cap(500, "hydrogen")}${cap(800, "fluorine")}
    <g id="linkL" opacity="0">${K.arrow(455, 150, 245, 150, C.heat, 4)}${K.t(350, 130, "like group 1: 1 outer electron", "graph-label")}</g>
    <g id="linkF" opacity="0">${K.arrow(545, 150, 755, 150, C.heat, 4)}${K.t(650, 130, "like group 17: one short of full", "graph-label")}</g>
    ${K.t(500, 395, "H → H⁺ + e⁻", "molecule-label fade", 'id="eqn"')}
    ${K.t(500, 440, "electronegativity: Li 1.0 · H 2.2 · F 4.0", "graph-label", 'id="en" opacity="0"')}`;

  K.page({
    id: "hydrogen-element",
    topic: "Structure 3 — Classification of matter",
    title: "Hydrogen: the element that doesn't fit",
    description: "Three atoms drawn as electron-shell diagrams: lithium on the left with one outer electron, hydrogen in the middle with its single electron, and fluorine on the right with seven outer electrons; the outer electrons are ringed in orange. Tapping draws an arrow from hydrogen to lithium: hydrogen is like a group 1 metal. Tapping again adds an arrow to fluorine: hydrogen is also like a halogen, one electron short of a full shell. Tapping a last time adds their electronegativities showing hydrogen sits in between.",
    svg, bounds: [100, 100, 900, 460], tapLabel: "Tap to compare hydrogen",
    steps: [
      { caption: "Hydrogen has a single electron in its outer shell, just like the group 1 metals, lithium and sodium. Like them, it can lose that electron to form a positive ion, H⁺, and it's usually placed at the top of group 1.",
        to: { "#linkL": { opacity: 1 } } },
      { caption: "But it also looks like a halogen. A halogen is one electron short of a full shell, and so is hydrogen (a full first shell has two). Hydrogen can gain an electron to make the hydride ion, H⁻, and forms diatomic molecules, H₂, like F₂ and Cl₂.",
        to: { "#linkF": { opacity: 1 } }, text: { "#eqn": "H + e⁻ → H⁻" } },
      { caption: "So hydrogen doesn't fit neatly in either group. It's a non-metal gas, with an electronegativity (2.2) between the group 1 metals (about 1) and the halogens (3.2 to 4.0). Some periodic tables give it a box on its own.",
        booklet: "§9 electronegativity: Li 1.0, Na 0.9, H 2.2, Cl 3.2, F 4.0.",
        to: { "#en": { opacity: 1 } }, text: { "#eqn": "hydrogen is a group of one" } }
    ]
  });
})();
;
/* ---- pages/s3-03-metals-nonmetals.js ---- */
// Metals and non-metals across period 3: conductivity, and the oxides going from basic through amphoteric
// to acidic.

(() => {
  const K = Kit, C = K.C;
  const EL = [
    ["Na", "metal", "conducts", "Na₂O", "basic"], ["Mg", "metal", "conducts", "MgO", "basic"], ["Al", "metal", "conducts", "Al₂O₃", "amphoteric"],
    ["Si", "metalloid", "semiconductor", "SiO₂", "acidic"], ["P", "non-metal", "insulator", "P₄O₁₀", "acidic"], ["S", "non-metal", "insulator", "SO₃", "acidic"],
    ["Cl", "non-metal", "insulator", "Cl₂O₇", "acidic"], ["Ar", "noble gas", "insulator", "no oxide", "–"]
  ];
  const x = k => 150 + k * 100;
  const col = k => (k < 3 ? C.ion : k === 3 ? C.grey : C.product);
  const svg = `${EL.map((e, k) => `
    <rect class="fade" x="${x(k) - 42}" y="118" width="84" height="84" rx="14" fill="${col(k)}"/>
    ${K.t(x(k), 174, e[0], "atom-name fade", 'style="fill:#fff;font-size:34px"')}
    ${K.t(x(k), 236, e[1], "graph-label fade")}${K.t(x(k), 262, e[2], "graph-label fade")}
    <g class="ox" opacity="0">${K.t(x(k), 320, e[3], "molecule-label")}${K.t(x(k), 350, e[4], "graph-label")}</g>`).join("")}
    ${K.t(500, 96, "period 3", "atom-name fade", 'style="font-size:20px"')}
    <g id="trend" opacity="0">${K.arrow(120, 405, 880, 405, C.heat, 5)}${K.t(500, 440, "metallic character decreases across a period", "molecule-label")}</g>`;

  K.page({
    id: "metals-nonmetals",
    topic: "Structure 3 — Classification of matter",
    title: "Metals and non-metals",
    description: "The eight elements of period 3, sodium to argon, in tiles labelled metal, metalloid, non-metal or noble gas, with whether they conduct electricity. Tapping adds the formula of each element's oxide and whether it is basic, amphoteric or acidic. Tapping again adds an arrow across the bottom: metallic character decreases across a period.",
    svg, bounds: [90, 85, 910, 460], tapLabel: "Tap to look at the oxides",
    steps: [
      { caption: "Across period 3 the elements change from metals to non-metals. Sodium, magnesium and aluminium are metals: they conduct electricity. Silicon is a metalloid, in between, and the rest are non-metals that don't conduct.",
        footnote: "Metals are also shiny, malleable and ductile. Non-metals are usually brittle when solid." },
      { caption: "Their oxides change too. Metal oxides are basic, non-metal oxides are acidic, and aluminium oxide, in between, is amphoteric: it reacts with both acids and bases.",
        to: { ".ox": { opacity: 1, stagger: 0.1 } } },
      { caption: "So metallic character decreases from left to right across a period (and increases going down a group). It's a gradual change, not a sudden switch.",
        to: { "#trend": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s3-04-oxidation-states.js ---- */
// Oxidation states: the charge an atom would have if every bond were ionic. They add up to the charge on
// the species. NaCl, then H2O, then sulfate (working backwards to find sulfur's).

(() => {
  const K = Kit, C = K.C;
  const scene = (id, name, atoms, sum, hidden) => {
    const n = atoms.length;
    const cells = atoms.map(([sym, ox, fill, dark], i) => {
      const x = (i - (n - 1) / 2) * 96;
      return `<circle cx="${x}" cy="0" r="30" fill="${fill}"/><text class="nuc-sym" x="${x}" y="0" style="font-size:24px${dark ? ";fill:#1B1A22" : ""}">${sym}</text>
        ${K.t(x, -50, ox, "atom-name", `style="fill:${C.heat}"`)}`;
    }).join("");
    return K.g(id, 500, 215, `${cells}${K.t(0, -105, name, "molecule-label")}${K.t(0, 92, sum, "atom-name")}`, hidden ? "" : "fade", hidden ? 'opacity="0"' : "");
  };
  const svg = `
    ${scene("nacl", "sodium chloride, NaCl", [["Na", "+1", C.ion], ["Cl", "−1", C.product]], "(+1) + (−1) = 0", false)}
    ${scene("h2o", "water, H₂O", [["H", "+1", C.pale, true], ["H", "+1", C.pale, true], ["O", "−2", C.proton]], "2 × (+1) + (−2) = 0", true)}
    ${scene("so4", "sulfate ion, SO₄²⁻", [["S", "+6", C.heat], ["O", "−2", C.proton], ["O", "−2", C.proton], ["O", "−2", C.proton], ["O", "−2", C.proton]], "(+6) + 4 × (−2) = −2", true)}
    ${K.t(500, 400, "the oxidation states add up to the charge on the whole species", "graph-label fade", 'id="rule"')}`;

  K.page({
    id: "oxidation-states",
    topic: "Structure 3 — Classification of matter",
    title: "Oxidation states: keeping score of electrons",
    description: "Sodium chloride drawn as two discs, sodium labelled plus 1 and chlorine minus 1, adding up to 0. Tapping swaps it for water: two hydrogens at plus 1 and oxygen at minus 2, adding up to 0. Tapping again swaps it for the sulfate ion: sulfur at plus 6 and four oxygens at minus 2, adding up to minus 2, the charge on the ion.",
    svg, bounds: [280, 90, 720, 420], tapLabel: "Tap to try another compound",
    steps: [
      { caption: "An oxidation state keeps score of electrons: it's the charge an atom would have if every bond in the compound were ionic. In sodium chloride that's simply the ion charges, Na +1 and Cl −1.",
        footnote: "Oxidation states are written with the sign first: +1, not 1+. (Ion charges go the other way round: Na⁺.)" },
      { caption: "In a covalent compound, give the shared electrons to the more electronegative atom. Oxygen is more electronegative than hydrogen, so in water oxygen is −2 and each hydrogen +1: 2 × (+1) + (−2) = 0.",
        booklet: "§9 electronegativity: O 3.4, H 2.2.",
        to: { "#nacl": { opacity: 0 }, "#h2o": { opacity: 1 } }, dur: 0.7 },
      { caption: "Work backwards to find an unknown. In sulfate, four oxygens at −2 make −8, but the ion's charge is only 2−, so sulfur must be +6. The Roman numerals in names use these numbers: iron(III) means Fe in the +3 state.",
        footnote: "Exceptions: oxygen is −1 in peroxides, and hydrogen is −1 in metal hydrides, such as NaH.",
        to: { "#h2o": { opacity: 0 }, "#so4": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s3-05-ionization-dips.js ---- */
// Dips in first ionization energy across periods 2 and 3 (HL). Values are the data booklet's, section 9.
// The dips at B and Al (a p electron replaces an s electron) and at O and S (paired p electrons repel).

(() => {
  const K = Kit, C = K.C;
  const EL = ["Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
  const IE = [520, 900, 801, 1086, 1402, 1314, 1681, 2081, 496, 738, 578, 787, 1012, 1000, 1251, 1520];
  const X = k => 130 + k * 48 + (k >= 8 ? 36 : 0), Y = v => 400 - v / 2200 * 290;
  const line = (a, b) => `<polyline class="fade" points="${IE.slice(a, b).map((v, i) => `${X(a + i)},${Y(v)}`).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-opacity="0.55"/>`;
  const grid = [500, 1000, 1500, 2000].map(v => `<line class="fade" x1="110" y1="${Y(v)}" x2="890" y2="${Y(v)}" stroke="var(--ink)" stroke-opacity="0.2" stroke-dasharray="4 7"/>${K.t(102, Y(v) + 5, v, "graph-label fade", 'style="text-anchor:end"')}`).join("");
  const ring = k => `<circle cx="${X(k)}" cy="${Y(IE[k])}" r="17" fill="none" stroke="${C.heat}" stroke-width="4"/>`;

  const svg = `${grid}${line(0, 8)}${line(8, 16)}
    ${IE.map((v, k) => `<circle class="fade" cx="${X(k)}" cy="${Y(v)}" r="7" fill="${k < 8 ? C.electron : C.heat}"/>${K.t(X(k), 424, EL[k], "graph-label fade")}`).join("")}
    ${K.t(80, 96, "first ionization energy, kJ mol⁻¹", "graph-label fade", 'style="text-anchor:start"')}
    ${K.t(X(3.5), 454, "period 2", "molecule-label fade")}${K.t(X(11.5), 454, "period 3", "molecule-label fade")}
    <g id="dipA" opacity="0">${ring(2)}${ring(10)}</g><g id="dipB" opacity="0">${ring(5)}${ring(13)}</g>`;

  K.page({
    id: "ionization-dips",
    topic: "Structure 3 — Classification of matter",
    title: "Dips in ionization energy",
    description: "A line graph of the first ionization energy of the elements lithium to neon and sodium to argon, with a general rise across each period. Tapping rings the dips at boron and aluminium, where the energy falls slightly. Tapping again rings the dips at oxygen and sulfur.",
    svg, bounds: [70, 80, 900, 470], tapLabel: "Tap to circle the dips",
    steps: [
      { caption: "Going across a period, the first ionization energy generally rises: more protons pull on electrons in the same shell, so they're harder to remove. But the rise isn't smooth.",
        booklet: "§9 first ionization energies (kJ mol⁻¹): Li 520, Be 900, B 801, C 1086, N 1402, O 1314, F 1681, Ne 2081." },
      { caption: "Boron dips below beryllium, and aluminium below magnesium. The outer electron of B and Al is in a p orbital, which is a little higher in energy and further out than the s orbital before it, so it's easier to remove.",
        booklet: "§9: Be 900 → B 801; Mg 738 → Al 578.",
        to: { "#dipA": { opacity: 1 } } },
      { caption: "Oxygen dips below nitrogen, and sulfur below phosphorus. In N and P each p orbital holds one electron. In O and S, the fourth p electron has to share an orbital with another, and the two repel each other, so one is easier to remove.",
        booklet: "§9: N 1402 → O 1314; P 1012 → S 1000.",
        to: { "#dipB": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s3-06-transition-elements.js ---- */
// Transition elements (HL): coloured ions, more than one oxidation state, and why they're coloured
// (ligands split the d orbitals; an electron absorbs light to jump between the two levels).

(() => {
  const K = Kit, C = K.C;
  const TUBES = [
    ["Cu²⁺", "#4D94E8", "blue"], ["Fe²⁺", "#B7D9A0", "pale green"], ["Fe³⁺", "#E3B23C", "yellow"], ["Co²⁺", "#F0A6C8", "pink"]
  ];
  const tx = i => 130 + i * 100;
  const tubes = TUBES.map(([ion, col, name], i) => `
    <path class="fade" d="M ${tx(i) - 30} 150 L ${tx(i) - 30} 320 Q ${tx(i) - 30} 350 ${tx(i)} 350 Q ${tx(i) + 30} 350 ${tx(i) + 30} 320 L ${tx(i) + 30} 150" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path class="fade" d="M ${tx(i) - 28} 210 L ${tx(i) - 28} 320 Q ${tx(i) - 28} 348 ${tx(i)} 348 Q ${tx(i) + 28} 348 ${tx(i) + 28} 320 L ${tx(i) + 28} 210 Z" fill="${col}"/>
    ${K.t(tx(i), 386, ion, "atom-name fade", 'style="font-size:22px"')}${K.t(tx(i), 412, name, "graph-label fade")}`).join("");
  const box = (x, y, arrows) => `<rect x="${x}" y="${y}" width="44" height="28" rx="4" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x + 22, y + 21, arrows, "molecule-label")}`;

  const svg = `${tubes}
    ${K.t(280, 108, "hexaaqua ions in solution", "molecule-label fade")}
    <g id="oxid" opacity="0">${K.arrow(238, 262, 262, 262, C.heat, 4)}${K.t(250, 130, "Fe²⁺ → Fe³⁺ + e⁻", "molecule-label", `style="fill:${C.heat}"`)}</g>
    <g id="dsplit" opacity="0">
      ${K.t(730, 108, "d orbitals in a complex", "molecule-label")}
      ${box(632, 170, "↑↓")}${box(688, 170, "↑")}
      ${box(604, 280, "↑↓")}${box(660, 280, "↑↓")}${box(716, 280, "↑↓")}
      ${K.arrow(760, 300, 740, 205, C.heat, 5)}
      ${K.t(730, 345, "light absorbed: red–orange", "graph-label")}${K.t(730, 375, "so the solution looks blue", "graph-label")}
    </g>`;

  K.page({
    id: "transition-elements",
    topic: "Structure 3 — Classification of matter",
    title: "Transition elements: many oxidation states, coloured complexes",
    description: "Four test tubes of solutions of transition metal ions: copper two plus is blue, iron two plus pale green, iron three plus yellow and cobalt two plus pink. Tapping adds an arrow from the iron two plus tube to the iron three plus tube, showing iron in two oxidation states. Tapping again shows a diagram of d orbitals split into a lower level of three boxes and an upper level of two, with an arrow for an electron absorbing red-orange light so the solution looks blue.",
    svg, bounds: [60, 90, 900, 430], tapLabel: "Tap to see what makes them tick",
    steps: [
      { caption: "Compounds of the transition elements are often brightly coloured, unlike most compounds of the s-block metals. Copper(II) is blue, iron(II) pale green, iron(III) yellow, cobalt(II) pink.",
        footnote: "These are the ions surrounded by six water molecules, called hexaaqua complexes." },
      { caption: "Transition elements can also form more than one stable ion, with different oxidation states. Iron makes Fe²⁺ and Fe³⁺: after losing its 4s electrons, it can lose a 3d electron too, because the 3d and 4s energy levels are so close.",
        booklet: "§19 standard reduction potentials: Fe³⁺/Fe²⁺ +0.77 V; Cu²⁺/Cu⁺ +0.15 V.",
        to: { "#oxid": { opacity: 1 } } },
      { caption: "The colour comes from the d orbitals. Surrounding ligands (here water) split the d orbitals into two levels. An electron can jump from the lower to the upper level by absorbing light of just the right energy. We see the colour that's left over.",
        footnote: "Copper(II) absorbs red-orange light, so what reaches your eye is blue.",
        to: { "#dsplit": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/s3-07-organic-formulas.js ---- */
// Ways to write an organic molecule, using butane: molecular and empirical formulas, the condensed
// structural formula, the full structural (displayed) formula, and the skeletal formula.

(() => {
  const K = Kit, C = K.C;
  const CX = [350, 450, 550, 650], CY = 300;
  let shown = "";
  CX.forEach((x, i) => {
    if (i < 3) shown += K.l(x, CY, CX[i + 1], CY, "var(--ink)", 4, "");
    shown += K.l(x, CY, x, CY - 58, "var(--ink)", 3, "") + K.l(x, CY, x, CY + 58, "var(--ink)", 3, "");
  });
  shown += K.l(350, CY, 292, CY, "var(--ink)", 3, "") + K.l(650, CY, 708, CY, "var(--ink)", 3, "");
  const hs = [[292, CY], [708, CY], ...CX.flatMap(x => [[x, CY - 58], [x, CY + 58]])];
  shown += hs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${C.pale}"/>${K.t(x, y + 5, "H", "graph-label", 'style="font-size:14px"')}`).join("");
  shown += CX.map(x => `<circle cx="${x}" cy="${CY}" r="19" fill="${C.grey}"/>${K.t(x, CY + 5, "C", "graph-label", 'style="fill:#fff;font-size:17px"')}`).join("");

  const svg = `
    ${K.t(500, 100, "molecular formula:  C₄H₁₀", "molecule-label fade")}
    ${K.t(500, 136, "empirical formula:  C₂H₅", "molecule-label fade")}
    ${K.t(500, 176, "condensed structural formula:  CH₃CH₂CH₂CH₃", "molecule-label", 'id="cond" opacity="0"')}
    <g id="disp" opacity="0">${shown}</g>
    <polyline id="skel" points="350,330 450,270 550,330 650,270" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;

  K.page({
    id: "organic-formulas",
    topic: "Structure 3 — Classification of matter",
    title: "Drawing organic molecules: types of formula",
    description: "Butane written several ways. At first only two lines of text: the molecular formula C4H10 and the empirical formula C2H5. Tapping adds the condensed structural formula, CH3CH2CH2CH3, and a full drawing of four carbon atoms in a row with every hydrogen and bond shown. Tapping again replaces that with the skeletal formula: just a zigzag line, where each end and corner is a carbon atom.",
    svg, bounds: [280, 80, 720, 460], tapLabel: "Tap to write it another way",
    steps: [
      { caption: "The molecular formula counts the atoms of each element in one molecule: butane is C₄H₁₀. The empirical formula gives just the simplest whole-number ratio: C₂H₅.",
        footnote: "Neither tells you how the atoms are joined up, and that matters in organic chemistry." },
      { caption: "The condensed structural formula shows the atoms in order, group by group: CH₃CH₂CH₂CH₃. The full structural (displayed) formula draws every atom and every bond.",
        to: { "#cond": { opacity: 1 }, "#disp": { opacity: 1 } } },
      { caption: "Drawing every hydrogen gets tedious for big molecules, so chemists use skeletal formulas. Each end and corner of the zigzag is a carbon atom, and each carbon has as many hydrogens as it needs to make four bonds. Only other atoms, like O, are written in.",
        to: { "#disp": { opacity: 0 }, "#skel": { opacity: 1, delay: 0.3 } }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/s3-08-homologous-series.js ---- */
// A homologous series: the alkanes, each member one CH2 longer than the last. The enthalpy of combustion
// changes by a steady amount each time (data booklet section 14).

(() => {
  const K = Kit, C = K.C;
  const SERIES = [
    { name: "methane", f: "CH₄", units: ["CH₄"], hc: "−891", bp: "−162" },
    { name: "ethane", f: "C₂H₆", units: ["CH₃", "CH₃"], hc: "−1561", bp: "−89" },
    { name: "propane", f: "C₃H₈", units: ["CH₃", "CH₂", "CH₃"], hc: "−2219", bp: "−42" },
    { name: "butane", f: "C₄H₁₀", units: ["CH₃", "CH₂", "CH₂", "CH₃"], hc: "−2878", bp: "−0.5" }
  ];
  const chain = (s, i) => {
    const n = s.units.length, W = 100, gap = 28, total = n * W + (n - 1) * gap;
    const boxes = s.units.map((u, k) => {
      const x = -total / 2 + k * (W + gap), mid = n > 2 && k > 0 && k < n - 1;
      return `${k ? K.l(x - gap, 0, x, 0, "var(--ink)", 5, "") : ""}<rect x="${x}" y="-32" width="${W}" height="64" rx="14" fill="${mid ? C.heat : C.ion}"/>${K.t(x + W / 2, 8, u, "atom-name", 'style="fill:#fff;font-size:24px"')}`;
    }).join("");
    return K.g("alk" + i, 500, 200, boxes, i ? "" : "fade", i ? 'opacity="0"' : "");
  };
  const svg = `${SERIES.map(chain).join("")}
    ${K.t(500, 118, "methane, CH₄", "atom-name fade", 'id="nm"')}
    ${K.t(500, 300, "enthalpy of combustion  −891 kJ mol⁻¹", "molecule-label fade", 'id="hc"')}
    ${K.t(500, 336, "boiling point  −162 °C", "molecule-label fade", 'id="bp"')}
    ${K.t(500, 420, "general formula:  CₙH₂ₙ₊₂", "graph-label fade", 'id="gen"')}`.replace("CₙH₂ₙ₊₂", "C<tspan dy=\"5\" style=\"font-size:0.7em\">n</tspan><tspan dy=\"-5\">H</tspan><tspan dy=\"5\" style=\"font-size:0.7em\">2n+2</tspan>");

  const step = i => ({
    caption: [
      "", "Add one CH₂ and you have the next alkane, ethane. The alkanes form a homologous series: a family with the same functional group and general formula, where each member differs from the next by one CH₂.",
      "Add another CH₂: propane. The general formula for an alkane with n carbons is C<sub>n</sub>H<sub>2n+2</sub> (here n = 3, so C₃H₈).",
      "And butane. Chemical properties stay the same all the way down the series, while physical properties change gradually: each CH₂ adds about the same enthalpy of combustion, and longer chains boil at higher temperatures because there are stronger London forces between them."
    ][i],
    booklet: "§14 enthalpies of combustion (kJ mol⁻¹): methane −891, ethane −1561, propane −2219, butane −2878 — about −660 more each time.",
    to: { ["#alk" + (i - 1)]: { opacity: 0 }, ["#alk" + i]: { opacity: 1 } },
    text: { "#nm": SERIES[i].name + ", " + SERIES[i].f, "#hc": "enthalpy of combustion  " + SERIES[i].hc + " kJ mol⁻¹", "#bp": "boiling point  " + SERIES[i].bp + " °C" }, dur: 0.6
  });

  K.page({
    id: "homologous-series",
    topic: "Structure 3 — Classification of matter",
    title: "Homologous series: one CH₂ at a time",
    description: "A chain of blue boxes labelled with groups of atoms: first just methane, CH4, with its enthalpy of combustion and boiling point beneath. Each tap adds one more CH2 box in the middle in orange, giving ethane, propane and butane, while the enthalpy of combustion gets about 660 kilojoules more negative each time and the boiling point rises.",
    svg, bounds: [280, 90, 720, 440], tapLabel: "Tap to add a CH₂",
    steps: [
      { caption: "Here's methane, CH₄, the simplest alkane. Watch what happens as we add one carbon at a time.",
        footnote: "Boiling points are typical textbook values, not from the data booklet." },
      step(1), step(2), step(3)
    ]
  });
})();
;
/* ---- pages/s3-09-naming.js ---- */
// IUPAC naming, using a three-carbon chain: the stem counts carbons, the ending shows the functional group,
// and a number says which carbon it's on.

(() => {
  const K = Kit, C = K.C;
  const P = [[340, 290], [500, 200], [660, 290]];
  const badge = (x, y, n) => `<g class="num" opacity="0"><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/>${K.t(x, y + 5, n, "graph-label")}</g>`;
  const STEMS = ["1 carbon: meth-", "2: eth-", "3: prop-", "4: but-", "5: pent-", "6: hex-"];

  const svg = `
    <polyline class="fade" points="${P.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    ${K.l(340, 290, 272, 336, "var(--ink)", 7, 'id="bond1" opacity="0"')}${K.t(244, 362, "OH", "atom-name", 'id="oh1" opacity="0" style="fill:#D2352C"')}
    ${K.l(500, 200, 500, 132, "var(--ink)", 7, 'id="bond2" opacity="0"')}${K.t(500, 112, "OH", "atom-name", 'id="oh2" opacity="0" style="fill:#D2352C"')}
    ${badge(340, 336, 1)}${badge(500, 246, 2)}${badge(660, 336, 3)}
    <g class="stems fade">${STEMS.map((s, i) => K.t(770, 130 + i * 26, s, "graph-label", 'style="text-anchor:start"')).join("")}</g>
    ${K.t(500, 440, "prop-", "atom-name", 'id="name" style="font-size:40px"')}`;

  K.page({
    id: "naming",
    topic: "Structure 3 — Classification of matter",
    title: "Naming organic compounds",
    description: "A skeletal three-carbon chain, with a list of stems on the right: meth, eth, prop, but, pent, hex for one to six carbons. Tapping numbers the carbons 1, 2 and 3 and names the chain propane. Tapping again adds an OH group on carbon 1, making propan-1-ol. Tapping again moves the OH to carbon 2, making propan-2-ol, a different compound.",
    svg, bounds: [220, 90, 900, 460], tapLabel: "Tap to name the molecule",
    steps: [
      { caption: "Organic names are built from parts. The first part, the stem, counts the carbons in the longest chain: this chain has three, so its stem is prop-.",
        footnote: "IUPAC nomenclature is the international system, so every compound has one agreed name." },
      { caption: "The ending shows the family. With only single bonds between carbons it's an alkane, ending in -ane: prop + ane = propane. Number the carbons from one end.",
        to: { ".num": { opacity: 1, stagger: 0.15 } }, text: { "#name": "propane" } },
      { caption: "Add an –OH group and it's an alcohol, ending in -ol. The number says which carbon it's attached to: this OH is on carbon 1, so the name is propan-1-ol.",
        to: { "#bond1": { opacity: 1 }, "#oh1": { opacity: 1 } }, text: { "#name": "propan-1-ol" } },
      { caption: "Move the OH to the middle carbon and you get propan-2-ol: a different compound with different properties, even though the formula, C₃H₈O, hasn't changed. That's why the number matters.",
        to: { "#bond1": { opacity: 0 }, "#oh1": { opacity: 0 }, "#bond2": { opacity: 1, delay: 0.3 }, "#oh2": { opacity: 1, delay: 0.3 } }, text: { "#name": "propan-2-ol" } }
    ]
  });
})();
;
/* ---- pages/s3-10-isomers.js ---- */
// Structural isomers: same molecular formula, different structures. Butane and 2-methylpropane (C4H10)
// differ in shape; ethanol and methoxymethane (C2H6O) differ in functional group.

(() => {
  const K = Kit, C = K.C;
  const zig = (pts, extra = "") => `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const lab = (t, f, bp) => `${K.t(0, 118, t + ", " + f, "molecule-label")}${K.t(0, 148, bp, "graph-label")}`;
  const o = (x, y, s) => K.t(x, y, s, "atom-name", 'style="fill:#D2352C"');

  const butane = zig([[-100, 40], [-33, 0], [33, 40], [100, 0]]);
  const branched = `${K.l(0, 20, 0, -50, "var(--ink)", 7, "")}${K.l(0, 20, -65, 60, "var(--ink)", 7, "")}${K.l(0, 20, 65, 60, "var(--ink)", 7, "")}`;
  const ethanol = zig([[-90, 40], [-10, -6]]) + K.l(-10, -6, 68, 40, "var(--ink)", 7, "") + o(90, 62, "OH");
  const dme = zig([[-90, 40], [0, -6], [90, 40]]) + o(0, -22, "O");

  const svg = `
    ${K.g("bu", 500, 200, butane + lab("butane", "C₄H₁₀", "boils at −0.5 °C"))}
    ${K.g("iso", 700, 200, branched + lab("2-methylpropane", "C₄H₁₀", "boils at −11.7 °C"), "", 'opacity="0"')}
    ${K.g("et", 300, 200, ethanol + lab("ethanol", "C₂H₆O", "boils at 78 °C"), "", 'opacity="0"')}
    ${K.g("me", 700, 200, dme + lab("methoxymethane", "C₂H₆O", "boils at −25 °C"), "", 'opacity="0"')}`;

  K.page({
    id: "isomers",
    topic: "Structure 3 — Classification of matter",
    title: "Structural isomers: same atoms, different shapes",
    description: "A zigzag skeletal drawing of butane, C4H10. Tapping slides it to the left and adds a branched drawing, 2-methylpropane, which has the same formula but boils at a lower temperature. Tapping again swaps both for a different pair with the same formula C2H6O: ethanol, with an OH group, boiling at 78 degrees, and methoxymethane, with an oxygen between two carbons, boiling at minus 25 degrees.",
    svg, bounds: [180, 100, 900, 380], tapLabel: "Tap to meet the isomers",
    steps: [
      { caption: "Butane has the molecular formula C₄H₁₀. But there's another way to join four carbons and ten hydrogens.",
        footnote: "Skeletal formulas: each corner and end is a carbon atom." },
      { caption: "2-methylpropane has the same formula, C₄H₁₀, but a branched chain. They're structural isomers: same molecular formula, different structures. Different structures give different properties: the branched one is more compact, so it has weaker London forces and boils at a lower temperature.",
        to: { "#bu": { x: 300 }, "#iso": { opacity: 1, delay: 0.4 } }, dur: 0.9 },
      { caption: "Isomers can differ in their functional group too. C₂H₆O can be ethanol, an alcohol with an O–H group that forms hydrogen bonds, or methoxymethane, an ether that can't. Ethanol boils at 78 °C; the ether, at −25 °C, is a gas at room temperature.",
        to: { "#bu": { opacity: 0 }, "#iso": { opacity: 0 }, "#et": { opacity: 1 }, "#me": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/r1-01-calorimetry.js ---- */
// Measuring enthalpy changes: neutralization in a polystyrene cup. Q = mcΔT, then ΔH = -Q / n.
// 50 cm3 of 1.0 mol/dm3 HCl + 50 cm3 of 1.0 mol/dm3 NaOH: the temperature rises 6.8 K.

(() => {
  const K = Kit, C = K.C;
  const T0 = 20.0, T1 = 26.8;
  const hg = T => ({ attr: { y: +(360 - (110 + (T - 20) * 10)).toFixed(1), height: +(110 + (T - 20) * 10).toFixed(1) } });
  const start = 'style="text-anchor:start"';
  const beaker = (x, label) => `<g class="pour fade"><path d="M ${x - 40} 76 L ${x - 34} 146 L ${x + 34} 146 L ${x + 40} 76" fill="#CFE8FF" stroke="var(--ink)" stroke-width="3"/>${K.t(x, 170, label, "graph-label")}</g>`;
  const heat = x => `<path d="M ${x} 215 q 9 -12 0 -24 q -9 -12 0 -24" fill="none" stroke="${C.heat}" stroke-width="4" stroke-linecap="round"/>`;

  const svg = `
    <polygon id="liquid" class="fade" points="412,250 708,250 682,390 438,390" fill="#CFE8FF"/>
    <path class="fade" d="M 400 200 L 436 398 L 684 398 L 720 200" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linejoin="round"/>
    ${beaker(490, "HCl")}${beaker(630, "NaOH")}
    <g id="heat" opacity="0">${heat(490)}${heat(560)}${heat(630)}</g>
    <rect class="fade" x="841" y="100" width="18" height="260" rx="9" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    <rect id="hg" class="fade" x="846" y="${360 - 110}" width="8" height="110" fill="${C.heat}"/>
    <circle class="fade" cx="850" cy="372" r="17" fill="${C.heat}" stroke="var(--ink)" stroke-width="3"/>
    ${K.t(850, 84, "20.0 °C", "atom-name fade", 'id="temp"')}
    <g id="c1" opacity="0">${K.t(30, 160, "Q = m × c × ΔT", "atom-name", start)}${K.t(30, 202, "= 100 g × 4.18 J g⁻¹ K⁻¹ × 6.8 K", "molecule-label", start)}${K.t(30, 240, "= 2842 J", "molecule-label", start)}</g>
    <g id="c2" opacity="0">${K.t(30, 300, "n(water made) = 0.050 mol", "molecule-label", start)}${K.t(30, 342, "ΔH = −Q ÷ n", "atom-name", start)}${K.t(30, 384, "= −2.84 kJ ÷ 0.050 mol", "molecule-label", start)}${K.t(30, 424, "= −56.9 kJ mol⁻¹", "atom-name", `${start} fill="${C.heat}"`)}</g>`;

  K.page({
    id: "calorimetry",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Measuring enthalpy changes: Q = mcΔT",
    description: "A polystyrene cup of solution with a thermometer beside it reading 20.0 degrees Celsius, and two small beakers of hydrochloric acid and sodium hydroxide on either side. Tapping mixes them: wavy heat lines rise from the cup and the thermometer climbs to 26.8 degrees, with the working Q equals m c delta T equals 2842 joules. Tapping again shows the enthalpy change per mole: minus 56.9 kilojoules per mole.",
    svg, bounds: [20, 60, 900, 440], tapLabel: "Tap to mix the solutions",
    steps: [
      { caption: "To measure the enthalpy change of a reaction, run it in an insulated cup and watch the temperature. Here 50 cm³ of 1.0 mol dm⁻³ hydrochloric acid will be mixed with 50 cm³ of 1.0 mol dm⁻³ sodium hydroxide, both at 20.0 °C.",
        footnote: "Polystyrene is a good insulator, so little heat escapes. Real experiments still lose some, which is why measured values come out a little low." },
      { caption: "The temperature rises to 26.8 °C, so the reaction gave out heat. The heat absorbed by the solution is Q = mcΔT. The 100 cm³ of solution has a mass of about 100 g, and we treat it as water.",
        booklet: "§1 equations: Q = mcΔT. §2: specific heat capacity of water, c = 4.18 J g⁻¹ K⁻¹.",
        to: { ".pour": { opacity: 0 }, "#hg": hg(T1), "#liquid": { fill: "#F5D6C6" }, "#heat": { opacity: 1, delay: 0.5 }, "#c1": { opacity: 1, delay: 0.7 } },
        text: { "#temp": "26.8 °C" }, dur: 1.4 },
      { caption: "That's the heat for 0.050 mol of acid reacting. Divide by the moles to get the enthalpy change per mole. It's negative, because the reaction lost energy to its surroundings: an exothermic reaction.",
        footnote: "The temperature rose, but ΔH is negative: ΔH describes the system, and the system lost energy.",
        to: { "#c2": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r1-02-bond-energies.js ---- */
// Bond breaking and bond making: H2 + Cl2 -> 2HCl. Breaking bonds takes energy in, making them gives it out.
// Bond enthalpies (kJ/mol) from the data booklet: H-H 436, Cl-Cl 242, H-Cl 431.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 300 - e * 0.25;                                   // energy (kJ) -> y on the small diagram
  const at = (id, x, y, sym, r, fill) => K.g(id, x, y, `<circle r="${r}" fill="${fill}"/><text class="nuc-sym" style="font-size:${r * 0.8}px${fill === C.pale ? ";fill:#1B1A22" : ""}">${sym}</text>`);
  const lev = (y, x0, x1) => K.l(x0, y, x1, y, "var(--ink)", 4, 'class="fade"');
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.l(150, 230, 210, 230, "var(--ink)", 5, 'id="bHH" class="fade"')}${K.l(310, 230, 394, 230, "var(--ink)", 5, 'id="bClCl" class="fade"')}
    ${K.l(120, 230, 200, 230, "var(--ink)", 5, 'id="bHCl1" opacity="0"')}${K.l(300, 230, 380, 230, "var(--ink)", 5, 'id="bHCl2" opacity="0"')}
    ${at("H1", 150, 230, "H", 18, C.pale)}${at("H2", 210, 230, "H", 18, C.pale)}${at("Cl1", 310, 230, "Cl", 26, C.product)}${at("Cl2", 394, 230, "Cl", 26, C.product)}
    ${K.t(270, 340, "H₂ + Cl₂", "atom-name fade", 'id="lab2"')}
    ${lev(Y(0), 560, 700)}${K.t(630, Y(0) + 26, "H₂ + Cl₂", "graph-label fade")}
    <g id="up" opacity="0">${lev(Y(678), 720, 860)}${K.arrow(710, Y(0) - 6, 710, Y(678) + 6, C.heat, 5)}${K.t(790, Y(678) - 10, "4 free atoms", "graph-label")}${K.t(698, 210, "+678", "molecule-label", 'style="text-anchor:end"')}${K.t(698, 235, "bonds break", "graph-label", 'style="text-anchor:end"')}</g>
    <g id="down" opacity="0">${lev(Y(-184), 900, 990)}${K.arrow(880, Y(678) + 6, 880, Y(-184) - 6, C.electron, 5)}${K.t(868, 240, "−862", "molecule-label", 'style="text-anchor:end"')}${K.t(868, 265, "bonds form", "graph-label", 'style="text-anchor:end"')}${K.t(944, Y(-184) + 24, "2HCl", "graph-label")}</g>
    ${K.t(500, 440, "H–H 436 + Cl–Cl 242 = 678 kJ in", "molecule-label fade", 'id="tally"')}`;

  K.page({
    id: "bond-energies",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Bond breaking and bond making",
    description: "A hydrogen molecule and a chlorine molecule on the left, and a small energy diagram on the right. Tapping breaks both bonds into four free atoms and draws an arrow up the diagram: 678 kilojoules taken in. Tapping again forms two hydrogen chloride molecules and draws an arrow down: 862 kilojoules given out, leaving the products 184 kilojoules lower than the reactants.",
    svg, bounds: [100, 100, 990, 460], tapLabel: "Tap to break, then make, bonds",
    steps: [
      { caption: "Every reaction breaks some bonds in the reactants and makes new bonds in the products. Take H₂ + Cl₂ → 2HCl. Breaking a bond needs energy; making a bond releases it.",
        booklet: "§12 bond enthalpies: H–H 436, Cl–Cl 242, H–Cl 431 kJ mol⁻¹." },
      { caption: "First the bonds break: 436 kJ to break a mole of H–H bonds, and 242 kJ for a mole of Cl–Cl bonds. That's 678 kJ taken in, so this step is endothermic.",
        to: { "#bHH": { opacity: 0 }, "#bClCl": { opacity: 0 }, "#H1": { x: 110, y: 185 }, "#H2": { x: 245, y: 285 }, "#Cl1": { x: 300, y: 190 }, "#Cl2": { x: 430, y: 285 }, "#up": { opacity: 1, delay: 0.5 } },
        text: { "#lab2": "4 separate atoms", "#tally": "H–H 436 + Cl–Cl 242 = 678 kJ in" }, dur: 1.2 },
      { caption: "Then two new H–Cl bonds form, releasing 2 × 431 = 862 kJ. More energy goes out than came in, so the overall change is 678 − 862 = −184 kJ: exothermic.",
        footnote: "This gives an estimate: bond enthalpies are averages, so the answer is close to the real value, not exact.",
        to: { "#H1": { x: 120, y: 230 }, "#Cl1": { x: 200, y: 230 }, "#H2": { x: 300, y: 230 }, "#Cl2": { x: 380, y: 230 }, "#bHCl1": { opacity: 1, delay: 0.9 }, "#bHCl2": { opacity: 1, delay: 0.9 }, "#down": { opacity: 1, delay: 0.6 } },
        text: { "#lab2": "2 HCl", "#tally": "ΔH = 678 − 862 = −184 kJ" }, dur: 1.4 }
    ]
  });
})();
;
/* ---- pages/r1-03-hess.js ---- */
// Hess's law: the enthalpy change from C + O2 to CO2 is the same whether it goes in one step (-394) or
// via CO in two (-111, then -283). Values from the data booklet.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 120 - e * 0.5;
  const lev = (y, label) => `${K.l(300, y, 700, y, "var(--ink)", 4, 'class="fade"')}${K.t(500, y + (y > 300 ? 28 : -12), label, "molecule-label fade")}`;
  const svg = `
    ${lev(Y(0), "C(s) + O₂(g)")}${lev(Y(-111), "CO(g) + ½O₂(g)")}${lev(Y(-394), "CO₂(g)")}
    <g id="direct" opacity="0">${K.arrow(340, Y(0) + 4, 340, Y(-394) - 4, C.heat, 6)}${K.t(325, 240, "−394 kJ", "atom-name", 'style="text-anchor:end"')}</g>
    <g id="via" opacity="0">
      ${K.arrow(600, Y(0) + 4, 600, Y(-111) - 4, C.electron, 5)}${K.t(615, Y(-55) + 5, "−111", "molecule-label", 'style="text-anchor:start"')}
      ${K.arrow(600, Y(-111) + 4, 600, Y(-394) - 4, C.electron, 5)}${K.t(615, Y(-252) + 5, "−283", "molecule-label", 'style="text-anchor:start"')}
    </g>
    ${K.t(500, 445, "one step: ΔH = −394 kJ mol⁻¹", "molecule-label", 'id="verdict" opacity="0"')}`;

  K.page({
    id: "hess",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Hess's law: two routes, same total",
    description: "An energy level diagram with three horizontal lines: carbon plus oxygen at the top, carbon monoxide plus half an oxygen a little lower, and carbon dioxide at the bottom. Tapping draws a single orange arrow straight from the top to the bottom, minus 394 kilojoules. Tapping again draws the two-step route via carbon monoxide, minus 111 then minus 283, ending in the same place with the same total.",
    svg, bounds: [220, 60, 780, 470], tapLabel: "Tap to take a route",
    steps: [
      { caption: "Burning carbon can end up as carbon dioxide, and we can measure the enthalpy change directly. Here are the starting point at the top and the finish at the bottom.",
        booklet: "§13 enthalpies of formation: CO −111, CO₂ −394 kJ mol⁻¹. §14: ΔHc of CO −283 kJ mol⁻¹." },
      { caption: "Straight to carbon dioxide, the enthalpy change is −394 kJ per mole of carbon.",
        to: { "#direct": { opacity: 1 }, "#verdict": { opacity: 1 } }, dur: 0.9 },
      { caption: "But carbon can also burn to carbon monoxide first (−111 kJ), and that burns on to carbon dioxide (−283 kJ). Add the two steps: −111 + −283 = −394 kJ. Same start, same finish, same total. That's Hess's law: the enthalpy change doesn't depend on the route taken.",
        footnote: "It's a consequence of energy being conserved. It lets us work out enthalpy changes we can't measure directly, like the first step here, which is hard to stop at CO.",
        to: { "#via": { opacity: 1 } }, text: { "#verdict": "two steps: −111 + −283 = −394 kJ mol⁻¹" }, dur: 0.9 }
    ]
  });
})();
;
/* ---- pages/r1-04-formation-combustion.js ---- */
// Enthalpies of formation and combustion (HL): ΔH = Σ ΔHf(products) − Σ ΔHf(reactants), with methane burning.
// Formation values (kJ/mol) from the data booklet: CH4 −74, CO2 −394, H2O(l) −286; ΔHc of methane −891.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 110 - e * 0.25;
  const lev = (y, x0, x1, label, dy = 26) => `${K.l(x0, y, x1, y, "var(--ink)", 4, 'class="fade"')}${K.t((x0 + x1) / 2, y + dy, label, "graph-label fade")}`;
  const svg = `
    ${lev(Y(0), 150, 850, "elements in their standard states (zero)", -12)}
    ${lev(Y(-74), 200, 400, "CH₄ + 2O₂", 24)}${lev(Y(-966), 600, 800, "CO₂ + 2H₂O(l)", 24)}
    <g id="form" opacity="0">
      ${K.arrow(270, Y(0) + 4, 270, Y(-74) - 4, C.electron, 5)}${K.t(255, 138, "−74", "molecule-label", 'style="text-anchor:end"')}
      ${K.arrow(700, Y(0) + 4, 700, Y(-966) - 4, C.electron, 5)}${K.t(716, 260, "−394 + 2(−286) = −966", "molecule-label", 'style="text-anchor:start"')}
    </g>
    <g id="rxn" opacity="0">${K.arrow(480, Y(-74) + 4, 480, Y(-966) - 4, C.heat, 7)}${K.t(495, 240, "ΔH = −966 − (−74)", "molecule-label", 'style="text-anchor:start"')}${K.t(495, 272, "= −892 kJ mol⁻¹", "atom-name", 'style="text-anchor:start"')}</g>
    ${K.t(500, 445, "CH₄ + 2O₂ → CO₂ + 2H₂O", "atom-name fade")}`;

  K.page({
    id: "formation-combustion",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Enthalpies of formation and combustion",
    description: "An energy diagram with a line at the top for elements in their standard states, at zero. Tapping draws a short arrow down to methane plus oxygen, minus 74 kilojoules, and a long arrow down to carbon dioxide plus water, minus 966. Tapping again draws an arrow between them: the enthalpy change of burning methane, minus 892 kilojoules per mole, which matches the tabulated enthalpy of combustion, minus 891.",
    svg, bounds: [140, 70, 870, 460], tapLabel: "Tap to build the cycle",
    steps: [
      { caption: "The standard enthalpy of formation, ΔH_f, is the enthalpy change when one mole of a compound is made from its elements in their standard states. Elements themselves are defined as zero. Here's methane burning: CH₄ + 2O₂ → CO₂ + 2H₂O.",
        footnote: "Oxygen is an element, so its ΔH_f is zero." },
      { caption: "Use formation data to place both sides on the same scale: reactants (methane, −74 kJ) and products (carbon dioxide −394, plus two waters at −286 each, −966 in total).",
        booklet: "§13: CH₄ −74, CO₂ −394, H₂O(l) −286 kJ mol⁻¹.",
        to: { "#form": { opacity: 1 } } },
      { caption: "The enthalpy change of the reaction is the difference: ΔH = Σ ΔH_f(products) − Σ ΔH_f(reactants) = −966 − (−74) = −892 kJ. That's the enthalpy of combustion of methane, and it matches the tabulated value of −891.",
        booklet: "§1: ΔH⦵ = Σ(ΔH_f⦵ products) − Σ(ΔH_f⦵ reactants). §14: ΔH_c of methane −891 kJ mol⁻¹.",
        to: { "#rxn": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r1-05-born-haber.js ---- */
// Born-Haber cycle (HL) for sodium chloride. Values (kJ/mol): atomization of Na +107 (not in the booklet),
// ½ Cl–Cl +121 (half of 242, §12), ionization of Na +496 (§9), electron affinity of Cl −349 (§9), lattice
// formation −790 (minus the booklet's lattice enthalpy, §16). The sum is −415; the experimental value is −411.

(() => {
  const K = Kit, C = K.C;
  const Y = e => 110 + (724 - e) * 0.26;
  const LV = [
    { e: 0, x0: 90, lab: "Na(s)+½Cl₂(g)" }, { e: 107, x0: 240, lab: "Na(g)+½Cl₂(g)" }, { e: 228, x0: 390, lab: "Na(g)+Cl(g)" },
    { e: 724, x0: 540, lab: "Na⁺(g)+e⁻+Cl(g)" }, { e: 375, x0: 690, lab: "Na⁺(g)+Cl⁻(g)" }, { e: -415, x0: 840, lab: "NaCl(s)" }
  ];
  const W = 100;
  const svg = `${LV.map((l, i) => `<g id="lv${i}" ${i < 1 ? 'class="fade"' : 'opacity="0"'}>${K.l(l.x0, Y(l.e), l.x0 + W, Y(l.e), "var(--ink)", 4, "")}${K.t(l.x0 + W / 2, Y(l.e) + (l.e > 300 ? -12 : 26), l.lab, "graph-label", 'style="font-size:13px"')}</g>`).join("")}
    <g id="st1" opacity="0">${K.arrow(215, Y(0), 215, Y(107), C.heat, 4)}${K.t(198, 262, "+107", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st2" opacity="0">${K.arrow(365, Y(107), 365, Y(228), C.heat, 4)}${K.t(348, 248, "+121", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st3" opacity="0">${K.arrow(515, Y(228), 515, Y(724), C.heat, 4)}${K.t(498, 170, "+496", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st4" opacity="0">${K.arrow(665, Y(724), 665, Y(375), C.electron, 4)}${K.t(648, 160, "−349", "molecule-label", 'style="text-anchor:end"')}</g>
    <g id="st5" opacity="0">${K.arrow(815, Y(375), 815, Y(-415), C.electron, 4)}${K.t(798, 300, "−790", "molecule-label", 'style="text-anchor:end"')}</g>
    ${K.t(500, 445, "the elements in their standard states: zero", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "born-haber",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Born–Haber cycles",
    description: "An energy level diagram with six short horizontal levels from left to right for making sodium chloride from sodium and chlorine. Tapping adds the first steps, turning sodium into gaseous atoms, plus 107 kilojoules, and splitting half a chlorine molecule, plus 121. Tapping again adds the electron transfers: ionization of sodium, plus 496, and chlorine's electron affinity, minus 349. A last tap adds the lattice forming, minus 790, ending with the enthalpy of formation of sodium chloride, about minus 415 kilojoules per mole.",
    svg, bounds: [80, 90, 950, 460], tapLabel: "Tap to add the next steps",
    steps: [
      { caption: "A Born–Haber cycle applies Hess's law to an ionic compound: a route from the elements to the solid that is made of steps we can measure. Here, sodium metal and chlorine gas will become sodium chloride.",
        footnote: "The levels are plotted to scale: the higher up, the more energy." },
      { caption: "First the elements must become gaseous atoms: sodium vaporizes (+107 kJ) and half a mole of chlorine molecules splits into atoms (+121 kJ).",
        booklet: "§12: Cl–Cl 242 kJ mol⁻¹, so ½ is 121. (The atomization of sodium, +107, isn't in the booklet.)",
        to: { "#lv1": { opacity: 1 }, "#lv2": { opacity: 1, delay: 0.5 }, "#st1": { opacity: 1, delay: 0.2 }, "#st2": { opacity: 1, delay: 0.7 } }, dur: 1.1 },
      { caption: "Next the electron moves. Removing sodium's outer electron costs its ionization energy (+496 kJ), and chlorine gains it back, releasing its electron affinity (−349 kJ).",
        booklet: "§9: first ionization energy of Na 496; electron affinity of Cl −349 kJ mol⁻¹.",
        to: { "#lv3": { opacity: 1 }, "#lv4": { opacity: 1, delay: 0.7 }, "#st3": { opacity: 1, delay: 0.3 }, "#st4": { opacity: 1, delay: 1.0 } }, text: { "#tag": "ionization of Na +496 · electron affinity of Cl −349" }, dur: 1.2 },
      { caption: "Finally the gaseous ions fall together into a lattice, releasing 790 kJ per mole. Adding it all up: +107 + 121 + 496 − 349 − 790 = −415 kJ. That's the enthalpy of formation of NaCl, and it agrees closely with the measured −411.",
        footnote: "The small mismatch comes from rounding and the averaged, experimental values used.",
        booklet: "§16: lattice enthalpy of NaCl, 790 kJ mol⁻¹ (defined as the energy to separate the lattice into ions, so forming it is −790).",
        to: { "#lv5": { opacity: 1 }, "#st5": { opacity: 1, delay: 0.4 } }, text: { "#tag": "ΔH_f(NaCl) ≈ −415 kJ mol⁻¹ (measured −411)" }, dur: 1.2 }
    ]
  });
})();
;
/* ---- pages/r1-06-combustion.js ---- */
// Combustion of methane, complete and incomplete. Plenty of oxygen: CO2 + H2O and a blue flame. Too little:
// carbon monoxide and soot too, a yellow flame, and less energy released.
// ΔH (methane -> CO + 2H2O(l)) = -111 + 2(-286) - (-74) = -609 kJ/mol from data booklet section 13.

(() => {
  const K = Kit, C = K.C;
  const flame = (id, w, h, fill, extra = "") =>
    `<path id="${id}" d="M 0 0 C ${-w} 0 ${-w} ${-h * 0.5} 0 ${-h} C ${w} ${-h * 0.5} ${w} 0 0 0 Z" fill="${fill}" ${extra}/>`;
  const soot = Array.from({ length: 8 }, (_, i) => `<circle class="soot" cx="${262 + (i % 4) * 26}" cy="${186 - i * 12}" r="${4 + (i % 2) * 2}" fill="#3a3540" opacity="0"/>`).join("");
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.g("burner", 300, 330, `<rect x="-14" y="0" width="28" height="80" fill="${C.grey}"/><rect x="-40" y="76" width="80" height="16" rx="6" fill="${C.grey}"/><rect id="airHole" x="-14" y="30" width="28" height="18" fill="#FFFDF8" stroke="var(--ink)" stroke-width="2"/>
      ${flame("outer", 34, 130, "#4D94E8")}${flame("inner", 16, 70, "#9CC8FF")}`)}
    ${soot}
    ${K.t(300, 452, "air hole open: plenty of oxygen", "molecule-label fade", 'id="air"')}
    <g class="fade">
      ${K.t(470, 130, "products:", "graph-label", start)}
      ${K.t(470, 168, "CO₂ + H₂O", "atom-name", 'id="prods" ' + start)}
      ${K.t(470, 214, "CH₄ + 2O₂ → CO₂ + 2H₂O", "molecule-label", 'id="eqn" ' + start)}
      ${K.t(470, 260, "energy released  891 kJ per mole", "molecule-label", 'id="en" ' + start)}
    </g>`;

  K.page({
    id: "combustion",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Combustion, complete and incomplete",
    description: "A gas burner with a blue flame and its air hole open, with the products carbon dioxide and water and the equation for methane burning listed on the right. Tapping closes the air hole: the flame turns yellow, soot particles appear, and the products change to include carbon monoxide and carbon, with less energy released per mole.",
    svg, bounds: [220, 90, 900, 470], tapLabel: "Tap to close the air hole",
    idle() { gsap.to("#outer", { scaleY: 1.06, svgOrigin: "0 0", duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 }); },
    steps: [
      { caption: "Combustion is a fuel reacting with oxygen and releasing energy. With plenty of oxygen, a hydrocarbon burns completely: all its carbon becomes carbon dioxide and all its hydrogen becomes water. The flame is blue.",
        footnote: "Every combustion reaction is exothermic.",
        booklet: "§14 enthalpies of combustion: methane −891 kJ mol⁻¹." },
      { caption: "Close the air hole and there isn't enough oxygen for all the carbon to become CO₂. Some ends up as carbon monoxide, CO, and some as tiny bits of carbon: soot. The flame goes yellow and smoky, and less energy is released.",
        footnote: "Carbon monoxide is colourless, odourless and toxic: it binds to haemoglobin in your blood in place of oxygen. Faulty gas heaters that burn incompletely can be deadly.",
        booklet: "§13: CH₄ −74, CO −111, H₂O(l) −286 kJ mol⁻¹, so making CO gives ΔH = −111 + 2(−286) − (−74) = −609 kJ mol⁻¹.",
        to: { "#outer": { fill: "#F2C230" }, "#inner": { fill: "#F7DF7A" }, "#airHole": { attr: { height: 2, y: 46 } }, ".soot": { opacity: 0.8, stagger: 0.12, delay: 0.5 } },
        text: { "#air": "air hole closed: not enough oxygen", "#prods": "CO + C + H₂O (and some CO₂)", "#eqn": "2CH₄ + 3O₂ → 2CO + 4H₂O", "#en": "energy released  609 kJ per mole" }, dur: 1.1 }
    ]
  });
})();
;
/* ---- pages/r1-07-fuels.js ---- */
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
;
/* ---- pages/r1-08-fuel-cell.js ---- */
// A hydrogen-oxygen fuel cell (HL), acidic electrolyte. Anode: H2 -> 2H+ + 2e-. Cathode:
// O2 + 4H+ + 4e- -> 2H2O. Electrons go round the wire, protons through the membrane.

(() => {
  const K = Kit, C = K.C;
  const WIRE = [[300, 190], [300, 100], [700, 100], [700, 190]];
  const NE = 5;
  const start = 'style="text-anchor:start"';

  const svg = `
    <rect class="fade" x="322" y="190" width="356" height="200" fill="#EAF3FF"/>
    <rect class="fade" x="290" y="190" width="32" height="200" fill="${C.grey}"/><rect class="fade" x="678" y="190" width="32" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 300 190 L 300 100 L 700 100 L 700 190" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="fade"><circle cx="500" cy="100" r="24" fill="#FFF3B0" stroke="var(--ink)" stroke-width="4"/>${K.l(484, 84, 516, 116, "var(--ink)", 3)}${K.l(516, 84, 484, 116, "var(--ink)", 3)}</g>
    <g class="fade">${K.arrow(120, 290, 282, 290, "var(--ink)", 5)}${K.t(120, 268, "H₂ in", "atom-name", start)}</g>
    <g class="fade">${K.arrow(880, 290, 718, 290, "var(--ink)", 5)}${K.t(880, 268, "O₂ in", "atom-name", 'style="text-anchor:end"')}</g>
    <g class="fade">${K.arrow(722, 350, 800, 350, "var(--ink)", 5)}${K.t(812, 356, "H₂O out", "graph-label", start)}</g>
    ${K.t(300, 418, "anode (−)", "atom-name fade", 'style="font-size:20px"')}${K.t(700, 418, "cathode (+)", "atom-name fade", 'style="font-size:20px"')}
    ${K.t(500, 300, "acidic electrolyte / membrane", "graph-label fade")}
    <g id="halfA" opacity="0">${K.t(300, 448, "H₂ → 2H⁺ + 2e⁻", "molecule-label", "")}</g>
    <g id="halfC" opacity="0">${K.t(700, 448, "O₂ + 4H⁺ + 4e⁻ → 2H₂O", "molecule-label")}</g>
    <g id="electrons"></g><g id="protons"></g>
    <g id="volts" opacity="0">${K.t(500, 445, "cell voltage ≈ 1.23 V", "atom-name", "")}</g>`;

  const kill = d => { (d.flows || []).forEach(f => f.kill()); d.flows = []; };

  K.page({
    id: "fuel-cell",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Fuel cells",
    description: "A hydrogen-oxygen fuel cell: two grey electrodes either side of a blue electrolyte, with hydrogen fed in at the left and oxygen at the right, joined by a wire over the top with a lamp. Tapping runs the cell: electrons flow along the wire from the anode to the cathode and hydrogen ions cross the electrolyte, and the half-equations appear under each electrode. Tapping again shows the cell voltage, about 1.23 volts, and that water is the only product.",
    svg, bounds: [100, 70, 900, 470], tapLabel: "Tap to run the fuel cell",
    setup(ctx) { ctx.data.flows = []; },
    steps: [
      { caption: "A fuel cell turns the energy of a fuel reacting with oxygen straight into electrical energy, with no flame. Hydrogen is fed to one electrode and oxygen to the other, separated by an electrolyte that lets hydrogen ions through.",
        footnote: "Unlike a battery, it never runs flat: it keeps working as long as fuel and oxygen keep being supplied." },
      { caption: "At the anode, hydrogen loses electrons (oxidation) and the hydrogen ions cross the electrolyte. The electrons can't follow, so they go round the wire, powering the lamp, to the cathode, where oxygen gains them (reduction) and combines with the ions to make water.",
        to: { "#halfA": { opacity: 1 }, "#halfC": { opacity: 1, delay: 0.3 } }, dur: 0.8,
        run(ctx, tl, dir) {
          const d = ctx.data; kill(d);
          if (dir !== "fwd") { ctx.$("#electrons").innerHTML = ""; ctx.$("#protons").innerHTML = ""; return; }
          tl.call(() => {
            const el = ctx.$("#electrons"), pr = ctx.$("#protons");
            for (let i = 0; i < NE; i++) {
              const dot = document.createElementNS(K.NS, "circle");
              dot.setAttribute("r", 7); dot.setAttribute("fill", C.electron); el.appendChild(dot);
              gsap.set(dot, { x: WIRE[0][0], y: WIRE[0][1], opacity: 0 });
              const f = gsap.timeline({ repeat: -1, delay: i * 0.55 });
              f.set(dot, { x: WIRE[0][0], y: WIRE[0][1], opacity: 1 });
              for (let s = 1; s < WIRE.length; s++) f.to(dot, { x: WIRE[s][0], y: WIRE[s][1], duration: 0.7, ease: "none" });
              d.flows.push(f);
              const p = document.createElementNS(K.NS, "circle");
              p.setAttribute("r", 8); p.setAttribute("fill", "#fff"); p.setAttribute("stroke", "#1B1A22"); p.setAttribute("stroke-width", 2); pr.appendChild(p);
              const y = 220 + i * 32;
              gsap.set(p, { x: 336, y, opacity: 0 });
              const g = gsap.timeline({ repeat: -1, delay: i * 0.5 });
              g.set(p, { x: 336, y, opacity: 1 }).to(p, { x: 664, y, duration: 2.2, ease: "none" });
              d.flows.push(g);
            }
          }, null, 0.3);
        } },
      { caption: "The reaction between hydrogen and oxygen releases a lot of energy, and the cell captures it as a voltage of about 1.23 V. The only product is water. This is the same overall reaction as burning hydrogen, 2H₂ + O₂ → 2H₂O, with the energy going into electricity instead of heat.",
        booklet: "§19 standard reduction potentials: ½O₂ + 2H⁺ + 2e⁻ → H₂O, +1.23 V; H⁺/H₂, 0.00 V.",
        to: { "#volts": { opacity: 1 }, "#halfA": { opacity: 0 }, "#halfC": { opacity: 0 } } }
    ]
  });
})();
;
/* ---- pages/r1-09-entropy.js ---- */
// Entropy and spontaneity (HL). Water: liquid -> gas has ΔH = +44 kJ and ΔS = +119 J/K/mol, so
// ΔG = ΔH − TΔS = 44 − 0.119 T (kJ) turns negative above about 370 K.
// Data booklet section 13: ΔHf H2O(l) −286, H2O(g) −242; S° H2O(l) 70, H2O(g) 189.

(() => {
  const K = Kit, C = K.C, rand = K.rng(23);
  const dots = (cx, cy, w, h, n, id) => {
    let s = "";
    for (let i = 0; i < n; i++) s += `<circle cx="${(cx - w / 2 + rand() * w).toFixed(1)}" cy="${(cy - h / 2 + rand() * h).toFixed(1)}" r="7" fill="${C.ion}"/>`;
    return s;
  };
  const gx = T => 200 + (T - 250) * 3, gy = g => 300 - g * 8;
  const dG = T => 44 - 0.119 * T;
  const start = 'style="text-anchor:start"';

  const svg = `
    <g id="ent">
      <rect class="fade" x="140" y="150" width="200" height="130" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>${dots(240, 215, 170, 100, 14)}
      <rect class="fade" x="440" y="110" width="360" height="210" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>${dots(620, 215, 320, 175, 14)}
      ${K.t(240, 115, "liquid water", "atom-name fade", 'style="font-size:20px"')}${K.t(620, 100, "steam", "atom-name fade", 'style="font-size:20px"')}
      ${K.t(240, 315, "S = 70 J K⁻¹ mol⁻¹", "molecule-label fade")}${K.t(620, 345, "S = 189 J K⁻¹ mol⁻¹", "molecule-label fade")}
      ${K.t(500, 405, "the same 14 particles: far more ways to be arranged as a gas", "graph-label fade")}
    </g>
    <g id="calc" opacity="0">
      ${K.t(500, 448, "ΔH = −242 − (−286) = +44 kJ mol⁻¹     ΔS = 189 − 70 = +119 J K⁻¹ mol⁻¹", "molecule-label")}
    </g>
    <g id="graph" opacity="0">
      ${K.arrow(190, 300, 830, 300, "var(--ink)", 3)}${K.arrow(200, 320, 200, 120, "var(--ink)", 3)}
      ${K.t(840, 330, "T / K", "graph-label", start)}${K.t(206, 112, "ΔG / kJ mol⁻¹", "graph-label", start)}
      ${K.t(gx(300), 322, "300", "graph-label")}${K.t(gx(400), 322, "400", "graph-label")}
      <path d="M ${gx(250)} ${gy(dG(250))} L ${gx(450)} ${gy(dG(450))}" stroke="${C.heat}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="${gx(370)}" y="302" width="${gx(450) - gx(370)}" height="70" fill="${C.product}" opacity="0.18"/>
      ${K.t((gx(370) + gx(450)) / 2, 394, "ΔG < 0: spontaneous", "molecule-label")}
      <circle cx="${gx(369.7)}" cy="300" r="7" fill="${C.heat}"/>${K.t(gx(369.7), 285, "≈ 370 K", "molecule-label")}
      ${K.t(gx(258), gy(dG(258)) - 14, "ΔG = ΔH − TΔS", "molecule-label", start)}
    </g>`;

  K.page({
    id: "entropy",
    topic: "Reactivity 1 — What drives chemical reactions?",
    title: "Entropy and spontaneity",
    description: "Two boxes with the same fourteen particles: in liquid water they are close together, entropy 70, and in steam they are spread through a bigger box, entropy 189. Tapping shows the enthalpy and entropy changes for turning the liquid into steam. Tapping again replaces the boxes with a graph of free energy change against temperature: a falling straight line that crosses zero at about 370 kelvin, with the region beyond that labelled spontaneous.",
    svg, bounds: [120, 90, 850, 440], tapLabel: "Tap to see when it's spontaneous",
    steps: [
      { caption: "Entropy, S, is a measure of how spread out the energy and particles are: the number of ways they can be arranged. Gases have much higher entropy than liquids, and liquids more than solids. Nature tends to favour more entropy.",
        booklet: "§13 thermodynamic data: S⦵ of H₂O(l) 70, H₂O(g) 189 J K⁻¹ mol⁻¹." },
      { caption: "Turning liquid water into steam takes energy in (ΔH is positive, +44 kJ mol⁻¹, which works against it), but entropy increases a lot (+119 J K⁻¹ mol⁻¹, which favours it). Which wins depends on the temperature.",
        booklet: "§13: ΔH_f H₂O(l) −286, H₂O(g) −242 kJ mol⁻¹.",
        to: { "#calc": { opacity: 1 } } },
      { caption: "The Gibbs free energy change, ΔG = ΔH − TΔS, combines them. A reaction is spontaneous when ΔG is negative. For evaporation, ΔG is positive at low temperatures and turns negative above about 370 K (97 °C), close to water's real boiling point.",
        footnote: "Spontaneous means it can happen without a continuous push, not that it happens fast: a spontaneous reaction can still be very slow.",
        booklet: "§1: ΔG⦵ = ΔH⦵ − TΔS⦵.",
        to: { "#ent": { opacity: 0 }, "#calc": { opacity: 0 }, "#graph": { opacity: 1, delay: 0.3 } }, dur: 0.8 }
    ]
  });
})();
;
/* ---- pages/r2-01-rate.js ---- */
// Rate of reaction: how quickly reactant is used up or product forms. The rate is the slope of a
// concentration-time graph, steepest at the start and flattening as the reactant runs out.
// Illustrative first-order reaction: [A] = 1.0 e^(-0.03 t), so rate = 0.03 [A].

(() => {
  const K = Kit, C = K.C;
  const KRATE = 0.03, PXS = 6, PXC = 260;
  const X = t => 160 + t * PXS, Y = c => 400 - c * PXC, A = t => Math.exp(-KRATE * t);
  const path = f => { let d = ""; for (let t = 0; t <= 100; t += 2) d += (t ? " L " : "M ") + X(t).toFixed(1) + " " + Y(f(t)).toFixed(1); return d; };
  const tangent = (t0, half, id) => {
    const a = A(t0), slope = PXC * KRATE * a;      // canvas px of fall per second
    const t1 = Math.max(0, t0 - half), t2 = t0 + half;
    return `<line id="${id}" x1="${X(t1)}" y1="${Y(a) - (t0 - t1) * slope}" x2="${X(t2)}" y2="${Y(a) + (t2 - t0) * slope}" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round" opacity="0"/>`;
  };
  const start = 'style="text-anchor:start"';

  const svg = `
    ${K.arrow(150, 400, 780, 400, "var(--ink)", 3, 'class="fade"')}${K.arrow(160, 410, 160, 112, "var(--ink)", 3, 'class="fade"')}
    ${[0, 50, 100].map(t => K.t(X(t), 424, t, "graph-label fade")).join("")}${[0, 0.5, 1].map(c => K.t(148, Y(c) + 5, c.toFixed(1), "graph-label fade", 'style="text-anchor:end"')).join("")}
    ${K.t(790, 424, "time / s", "graph-label fade", start)}${K.t(172, 102, "concentration / mol dm⁻³", "graph-label fade", start)}
    <path class="fade" d="${path(A)}" fill="none" stroke="${C.electron}" stroke-width="5" stroke-linecap="round"/>
    <path class="fade" d="${path(t => 1 - A(t))}" fill="none" stroke="${C.heat}" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 7"/>
    ${K.t(X(14), Y(A(14)) - 14, "reactant: used up", "molecule-label fade", start)}${K.t(X(52), Y(1 - A(52)) - 14, "product: made", "molecule-label fade", start)}
    ${tangent(0, 28, "tan0")}${tangent(50, 15, "tan50")}
    <g id="r0" opacity="0">${K.t(800, 210, "rate at 0 s", "molecule-label", start)}${K.t(800, 240, "0.030", "atom-name", start)}${K.t(800, 266, "mol dm⁻³ s⁻¹", "graph-label", start)}</g>
    <g id="r50" opacity="0">${K.t(800, 330, "rate at 50 s", "molecule-label", start)}${K.t(800, 360, "0.0067", "atom-name", start)}${K.t(800, 386, "mol dm⁻³ s⁻¹", "graph-label", start)}</g>`;

  K.page({
    id: "rate",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Rate of reaction: how fast is fast?",
    description: "A graph of concentration against time. A blue curve for the reactant falls steeply at first and then flattens out, and a dashed orange curve for the product rises the same way in mirror image. Tapping draws a steep straight tangent to the reactant curve at the start, labelled with a rate of 0.030 mol per cubic decimetre per second. Tapping again moves the tangent to 50 seconds where it is much shallower: 0.0067.",
    svg, bounds: [130, 90, 990, 440], tapLabel: "Tap to measure the rate",
    steps: [
      { caption: "The rate of a reaction is how fast reactants are used up or products are formed: the change in concentration divided by the time taken. On a graph of concentration against time, the rate is the slope of the curve.",
        footnote: "In practice you can follow a reaction by collecting the gas given off, measuring loss of mass, or watching a colour change." },
      { caption: "At the start the reactant curve is steep: reactant is being used up quickly, at 0.030 mol dm⁻³ s⁻¹. The steepness at one moment is the slope of the tangent to the curve at that point.",
        to: { "#tan0": { opacity: 1 }, "#r0": { opacity: 1 } } },
      { caption: "By 50 seconds the curve has flattened, and the tangent is far shallower: the rate has dropped to 0.0067 mol dm⁻³ s⁻¹. Reactions slow down as the reactants get used up, because there are fewer of them left to collide.",
        to: { "#tan0": { opacity: 0 }, "#r0": { opacity: 0.35 }, "#tan50": { opacity: 1 }, "#r50": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r2-02-rate-factors.js ---- */
// What changes the rate: four cards, revealed one at a time. Concentration/pressure, temperature,
// surface area, catalyst. Each one changes how often particles collide, or how many collisions succeed.

(() => {
  const K = Kit, C = K.C, rand = K.rng(41);
  const card = (id, x, y, title, inner, note, cls) => `<g id="${id}" ${cls} >
    <rect x="${x}" y="${y}" width="400" height="170" rx="16" fill="#FFFDF8" stroke="var(--ink)" stroke-width="3"/>
    ${K.t(x + 16, y + 30, title, "atom-name", 'style="text-anchor:start;font-size:20px"')}${inner}
    ${K.t(x + 200, y + 154, note, "graph-label")}</g>`;
  const dots = (x0, y0, w, h, n) => { let s = ""; for (let i = 0; i < n; i++) s += `<circle cx="${(x0 + 8 + rand() * (w - 16)).toFixed(1)}" cy="${(y0 + 8 + rand() * (h - 16)).toFixed(1)}" r="6" fill="${C.ion}"/>`; return s; };

  // A: concentration
  const A = `<rect x="130" y="150" width="120" height="76" rx="8" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${dots(130, 150, 120, 76, 4)}
    ${K.arrow(262, 188, 310, 188, "var(--ink)", 3)}
    <rect x="322" y="150" width="120" height="76" rx="8" fill="none" stroke="var(--ink)" stroke-width="2.5"/>${dots(322, 150, 120, 76, 14)}`;
  // B: temperature
  const B = `<circle cx="560" cy="160" r="9" fill="${C.ion}"/>${K.arrow(575, 160, 615, 160, "var(--ink)", 3)}${K.t(770, 165, "cooler: slow", "graph-label", 'style="text-anchor:start"')}
    <circle cx="560" cy="204" r="9" fill="${C.heat}"/>${K.arrow(575, 204, 735, 204, "var(--ink)", 4)}${K.t(770, 209, "hotter: fast", "graph-label", 'style="text-anchor:start"')}`;
  // C: surface area
  // The exposed surface is outlined in orange: one block has a small outline, twenty small blocks have a lot.
  let small = "";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) small += `<rect x="${326 + i * 18}" y="${350 + j * 18}" width="14" height="14" fill="${C.grey}" stroke="${C.heat}" stroke-width="2.5"/>`;
  const Cc = `<rect x="150" y="350" width="76" height="72" fill="${C.grey}" stroke="${C.heat}" stroke-width="2.5"/>${K.arrow(250, 386, 306, 386, "var(--ink)", 3)}${small}
    ${K.t(188, 342, "1 block", "graph-label")}${K.t(370, 342, "20 small blocks", "graph-label")}`;
  // D: catalyst
  const D = `<path d="M 550 420 L 590 420 Q 660 300 730 420 L 770 420" fill="none" stroke="var(--ink)" stroke-width="4"/>
    <path d="M 590 420 Q 660 372 730 420 " fill="none" stroke="${C.product}" stroke-width="4" stroke-dasharray="8 6"/>${K.t(660, 348, "Ea", "molecule-label", "")}`;

  const svg = `${card("cA", 90, 100, "concentration (pressure)", A, "more crowded: more collisions per second", 'class="fade"')}
    ${card("cB", 510, 100, "temperature", B, "faster: more collisions, and more with enough energy", 'opacity="0"')}
    ${card("cC", 90, 285, "surface area", Cc, "more surface exposed: more collisions", 'opacity="0"')}
    ${card("cD", 510, 285, "catalyst", D, "lower activation energy: more collisions succeed", 'opacity="0"')}`;

  K.page({
    id: "rate-factors",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "What changes the rate",
    description: "A two by two grid of cards. The first shows a box of a few particles beside a box of many, for concentration. Tapping reveals a card for temperature: a slow particle with a short arrow and a fast one with a long arrow. Tapping again shows a block of solid turning into many small blocks for surface area, and a last tap shows an energy hump with a lower dashed hump for a catalyst.",
    svg, bounds: [80, 90, 920, 465], tapLabel: "Tap to add the next factor",
    steps: [
      { caption: "For a reaction to happen, particles have to collide, and with enough energy. Anything that makes collisions more frequent, or makes more of them successful, speeds the reaction up. Crowd more particles into the same volume (a higher concentration, or a higher pressure for a gas) and they collide more often.",
        footnote: "Collision theory in one line: rate depends on collision frequency and on the fraction of collisions with enough energy." },
      { caption: "Raising the temperature makes particles move faster. They collide more often, and a much bigger share of the collisions have enough energy to react.",
        to: { "#cB": { opacity: 1 } } },
      { caption: "When one reactant is a solid, the reaction can only happen at its surface. Crush the solid into a powder and far more of it is exposed, so there are more collisions.",
        to: { "#cC": { opacity: 1 } } },
      { caption: "A catalyst gives the reaction another route with a lower activation energy, so a bigger share of collisions succeed. It's not used up.",
        footnote: "See the pages on collision theory, Maxwell–Boltzmann distributions and catalysts for more.",
        to: { "#cD": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r2-03-lechatelier-pt.js ---- */
// Le Châtelier's principle for pressure and temperature: N2O4 (colourless) ⇌ 2 NO2 (brown), ΔH = +57 kJ/mol.
// A gas in a container with a plunger. Every N2O4 splits with probability kf·dt and every pair of NO2
// recombines at a rate kr·(pairs)·(V0/V), so squeezing the gas favours the side with fewer particles
// (N2O4), and heating raises kf much more than kr (the forward reaction is endothermic), favouring NO2.
// The particles' colours, counts and the box's tint come straight from the running simulation.

(() => {
  const K = Kit, C = K.C, BR = "#9C4A2A";
  const BX0 = 260, BX1 = 740, BY1 = 400, H0 = 200, LID_H = 14;
  const A_LOOK = { r: 14, fill: "#E7EAF0", stroke: "#8B8590" };
  const B_LOOK = { r: 8, fill: BR, stroke: "none" };
  
  // Conditions for each step: plunger height (1 = start), particle speed, forward and reverse rate constants.
  const COND = [
    { h: 1, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 0.4, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 1.6, speed: 80, kf: 0.3, kr: 0.0127 },
    { h: 1, speed: 135, kf: 1.5, kr: 0.019 },
    { h: 1, speed: 45, kf: 0.09, kr: 0.0115 }
  ];

  const svg = `
    <rect id="tint" x="${BX0 + 2}" y="${BY1 - H0}" width="${BX1 - BX0 - 4}" height="${H0}" fill="${BR}" fill-opacity="0.1"/>
    <path class="fade" d="M ${BX0} 60 L ${BX0} ${BY1} L ${BX1} ${BY1} L ${BX1} 60" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <g id="pl" class="fade">
      <rect id="lid" x="${BX0 + 2}" y="${BY1 - H0 - LID_H}" width="${BX1 - BX0 - 4}" height="${LID_H}" fill="#6B6672"/>
      <line id="rod" x1="500" y1="${BY1 - H0 - LID_H}" x2="500" y2="${BY1 - H0 - LID_H - 42}" stroke="#6B6672" stroke-width="8" stroke-linecap="round"/>
      <rect id="handle" x="450" y="${BY1 - H0 - LID_H - 54}" width="100" height="14" rx="7" fill="#3A3540"/>
    </g>
    <g id="ps"></g>
    ${K.g("flame", 500, 432, `<path d="M -26 38 Q -34 8 -12 -14 Q -8 10 0 4 Q 6 -22 14 -32 Q 34 4 26 38 Z" fill="${C.heat}"/><path d="M -10 38 Q -14 20 -2 10 Q 4 24 10 38 Z" fill="#F5B841"/>`, "", 'opacity="0"')}
    ${K.g("ice", 500, 430, [-70, -22, 26].map(x => `<rect x="${x}" y="-16" width="44" height="34" rx="6" fill="#BFE3FA" stroke="#5A93C8" stroke-width="2.5"/>`).join(""), "", 'opacity="0"')}
    ${K.t(140, 110, "N₂O₄ ⇌ 2NO₂", "atom-name fade")}${K.t(140, 142, "ΔH = +57 kJ mol⁻¹", "graph-label fade")}
    ${K.c(60, 205, A_LOOK.r, A_LOOK.fill, `stroke="${A_LOOK.stroke}" stroke-width="2.5" class="fade"`)}${K.t(92, 211, "", "molecule-label", 'id="cA" style="text-anchor:start"')}
    ${K.c(60, 262, B_LOOK.r, B_LOOK.fill, 'class="fade"')}${K.t(92, 268, "", "molecule-label", 'id="cB" style="text-anchor:start"')}
    ${K.t(780, 205, "volume: normal", "molecule-label fade", 'id="vol" style="text-anchor:start"')}
    ${K.t(780, 250, "temperature: normal", "molecule-label fade", 'id="tmp" style="text-anchor:start"')}`;

  const step = (i, o) => ({
    ...o,
    run(ctx, tl, dir) {
      const c = COND[dir === "fwd" ? i : i - 1];
      tl.to(ctx.data.env, { ...c, duration: 1.6, ease: "power2.inOut" }, 0);
    }
  });

  K.page({
    id: "lechatelier-pt",
    topic: "Reactivity 2 — How much, how fast, how far?",
    title: "Le Châtelier: pressure and temperature",
    description: "A gas in a container with a plunger, at equilibrium: large pale N2O4 particles and pairs of small brown NO2 particles converting into each other, the mixture tinted brown by the NO2. Tapping pushes the plunger in, raising the pressure: the equilibrium shifts to the side with fewer particles and the brown fades as pairs join into N2O4. Tapping again pulls the plunger out, lowering the pressure, so N2O4 splits into more NO2. A further tap resets the volume and heats the container with a flame: the endothermic forward reaction speeds up and the mixture turns darker brown. A last tap cools it with ice, and the equilibrium shifts back towards N2O4.",
    svg, bounds: [30, 30, 950, 470], tapLabel: "Tap to squeeze the gas",

    setup(ctx) {
      const d = ctx.data, rand = K.rng(17);
      d.env = { ...COND[0] };
      d.list = [];
      d.rand = rand;
      d.n = { a: 0, b: 0 };
      const layer = ctx.$("#ps");
      const make = (kind, x, y, fresh) => {
        const look = kind === "A" ? A_LOOK : B_LOOK, el = document.createElementNS(K.NS, "circle");
        el.setAttribute("r", look.r); el.setAttribute("fill", look.fill);
        if (look.stroke !== "none") { el.setAttribute("stroke", look.stroke); el.setAttribute("stroke-width", 2.5); }
        if (!fresh) el.setAttribute("class", "fade");
        const a = rand() * Math.PI * 2, s = COND[0].speed * (0.7 + rand() * 0.6);
        el.setAttribute("cx", x); el.setAttribute("cy", y);
        layer.appendChild(el);
        const p = { kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: look.r, el };
        d.list.push(p);
        return p;
      };
      const setKind = (p, kind) => {
        const look = kind === "A" ? A_LOOK : B_LOOK;
        p.kind = kind; p.r = look.r;
        p.el.setAttribute("r", look.r); p.el.setAttribute("fill", look.fill);
        if (look.stroke !== "none") { p.el.setAttribute("stroke", look.stroke); p.el.setAttribute("stroke-width", 2.5); } else p.el.removeAttribute("stroke");
      };
      const inBox = (x0, x1, y0, y1, r) => [x0 + r + rand() * (x1 - x0 - 2 * r), y0 + r + rand() * (y1 - y0 - 2 * r)];
      for (let i = 0; i < 10; i++) make("A", ...inBox(BX0, BX1, BY1 - H0, BY1, 14), false);
      for (let i = 0; i < 24; i++) make("B", ...inBox(BX0, BX1, BY1 - H0, BY1, 8), false);

      const counts = () => {
        d.n.a = d.list.filter(p => p.kind === "A").length; d.n.b = d.list.length - d.n.a;
        ctx.$("#cA").textContent = "N₂O₄: " + d.n.a; ctx.$("#cB").textContent = "NO₂: " + d.n.b;
      };
      counts();

      K.tick(ctx, dt => {
        const e = d.env, top = BY1 - H0 * e.h, box = { x0: BX0, x1: BX1, y0: top, y1: BY1 };
        K.setSpeed(d.list, e.speed, Math.min(1, dt * 3));
        K.bounce(d.list, box, dt);
        // reactions
        let changed = false;
        d.list.slice().forEach(p => {
          if (p.kind === "A" && rand() < e.kf * dt) {          // N2O4 → 2 NO2
            setKind(p, "B");
            const q = make("B", p.x, p.y, true), a = rand() * Math.PI * 2;
            q.vx = Math.cos(a) * e.speed; q.vy = Math.sin(a) * e.speed; p.vx = -q.vx; p.vy = -q.vy;
            changed = true;
          }
        });
        const bs = d.list.filter(p => p.kind === "B"), pairs = bs.length * (bs.length - 1) / 2;
        if (bs.length >= 2 && rand() < e.kr * pairs / e.h * dt) {  // 2 NO2 → N2O4 (denser gas: more often)
          const i = Math.floor(rand() * bs.length); let j = Math.floor(rand() * (bs.length - 1)); if (j >= i) j++;
          const a = bs[i], b = bs[j];
          setKind(a, "A"); a.x = (a.x + b.x) / 2; a.y = Math.min(BY1 - a.r, Math.max(top + a.r, (a.y + b.y) / 2));
          b.el.remove(); d.list.splice(d.list.indexOf(b), 1);
          changed = true;
        }
        if (changed) counts();
        // the plunger and the colour of the gas (which follows the concentration of NO2)
        ctx.$("#lid").setAttribute("y", top - LID_H);
        ctx.$("#rod").setAttribute("y1", top - LID_H); ctx.$("#rod").setAttribute("y2", top - LID_H - 42);
        ctx.$("#handle").setAttribute("y", top - LID_H - 54);
        const tint = ctx.$("#tint");
        tint.setAttribute("y", top); tint.setAttribute("height", BY1 - top);
        tint.setAttribute("fill-opacity", Math.min(0.75, 0.04 + 0.55 * (d.n.b / e.h) / 60).toFixed(3));
      });
    },

    steps: [
      { caption: "Here is a real equilibrium: N₂O₄ ⇌ 2NO₂, in a gas syringe. N₂O₄ is colourless and NO₂ is brown, so the colour of the gas shows where the equilibrium sits. Notice one gas particle on the left becomes two on the right.",
        footnote: "The forward reaction (N₂O₄ → 2NO₂) absorbs heat: it is endothermic, ΔH ≈ +57 kJ mol⁻¹. (Value not from the data booklet.)" },
      step(1, { caption: "Push the plunger in: the same particles in less space, so the pressure goes up. The system pushes back by shifting to the side with fewer gas particles, which means fewer collisions with the walls. Two NO₂ join up into one N₂O₄, and the brown fades.",
        footnote: "Right at the moment of squeezing the gas gets darker, because everything is more concentrated. Only afterwards does it fade as the equilibrium shifts.",
        text: { "#vol": "volume: squeezed" }, dur: 1.6 }),
      step(2, { caption: "Pull the plunger out: more space, lower pressure. Now the system shifts to the side with more gas particles, so N₂O₄ splits into NO₂ and the gas gets browner.",
        footnote: "If both sides had the same number of gas particles, pressure would have no effect on the position of the equilibrium.",
        text: { "#vol": "volume: expanded" }, dur: 1.6 }),
      step(3, { caption: "Now put the plunger back to the start and heat the container. The forward reaction absorbs heat, so the system shifts forward to use some of the extra heat up: more NO₂, a darker brown. Unlike pressure, a temperature change changes the value of K.",
        footnote: "Raising the temperature favours the endothermic direction.",
        to: { "#flame": { opacity: 1 } }, text: { "#vol": "volume: normal", "#tmp": "temperature: hot" }, dur: 1.6 }),
      step(4, { caption: "Take the flame away and cool it in ice. The system shifts in the exothermic direction, releasing heat to oppose the cooling: back towards N₂O₄, and the brown fades. K gets smaller.",
        footnote: "A catalyst would not shift the equilibrium at all: it speeds up both directions equally.",
        to: { "#flame": { opacity: 0 }, "#ice": { opacity: 1 } }, text: { "#tmp": "temperature: cold" }, dur: 1.6 })
    ]
  });
})();
;
/* ---- pages/r3-01-amphiprotic.js ---- */
// Amphiprotic species: water accepts a proton from HCl (acting as a base) and donates one to NH3
// (acting as an acid).

(() => {
  const K = Kit, C = K.C;
  const mol = (id, x, y, r, label, fill) => K.g(id, x, y, `<circle r="${r}" fill="${fill}"/><text id="${id}T" class="nuc-sym" style="font-size:22px">${label}</text>`, "");
  const token = (id, x, y) => K.g(id, x, y, `<circle r="15" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><text class="h-plus-label" style="font-size:13px">H⁺</text>`, "");

  const svg = `
    <g id="sc1" class="fade">${mol("hcl", 300, 215, 52, "HCl", C.product)}${mol("w1", 700, 215, 52, "H₂O", C.proton)}${token("t1", 356, 215)}</g>
    <g id="sc2" opacity="0">${mol("w2", 300, 215, 52, "H₂O", C.proton)}${mol("nh3", 700, 215, 52, "NH₃", C.electron)}${token("t2", 356, 215)}</g>
    ${K.t(500, 350, "HCl gives a proton to water", "atom-name fade", 'id="what"')}
    ${K.t(500, 400, "", "molecule-label", 'id="role"')}
    ${K.t(500, 432, "", "graph-label", 'id="sub"')}`;

  K.page({
    id: "amphiprotic",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Amphiprotic species: acid or base?",
    description: "A green hydrogen chloride molecule on the left with a small white hydrogen ion, H plus, on its edge, and a red water molecule on the right. Tapping sends the proton across to the water, which becomes H3O plus, so water has acted as a base. Tapping again swaps to water on the left and a blue ammonia molecule on the right: this time the proton moves from the water to the ammonia, so water has acted as an acid.",
    svg, bounds: [220, 130, 780, 450], tapLabel: "Tap to pass the proton",
    steps: [
      { caption: "An acid is a proton donor and a base is a proton acceptor. Some species can be either, depending on what they meet. Here hydrogen chloride, a strong acid, meets water.",
        footnote: "A proton here means a hydrogen ion, H⁺: a hydrogen atom that has lost its electron." },
      { caption: "HCl hands its proton to water. Water has accepted a proton, so here it's acting as a base, and becomes the hydronium ion, H₃O⁺. HCl becomes chloride, Cl⁻.",
        to: { "#t1": { x: 644 } }, text: { "#hclT": "Cl⁻", "#w1T": "H₃O⁺", "#role": "water is a base here: it accepted a proton" }, dur: 1.2 },
      { caption: "Now water meets ammonia, a base. This time water gives up a proton, so it's acting as an acid, and becomes hydroxide, OH⁻. A species that can both donate and accept protons is amphiprotic. Water is the classic example.",
        footnote: "Amphoteric is a wider word: something that can react as an acid or a base, like aluminium oxide. Amphiprotic means specifically that it can donate or accept a proton.",
        to: { "#sc1": { opacity: 0 }, "#sc2": { opacity: 1 }, "#t2": { x: 644, delay: 0.9 } },
        text: { "#w2T": "OH⁻", "#nh3T": "NH₄⁺", "#what": "water gives a proton to NH₃", "#role": "water is an acid here: it donated a proton", "#sub": "HCO₃⁻ is amphiprotic too" }, dur: 1.8 }
    ]
  });
})();
;
/* ---- pages/r3-02-ph-scale.js ---- */
// The pH scale: pH = -log10[H+], so each pH unit is a factor of ten in hydrogen ion concentration.

(() => {
  const K = Kit, C = K.C;
  const COL = ["#D7263D", "#E4432D", "#EE6B2B", "#F5943A", "#F7B733", "#F4D03F", "#C9D84A", "#7CC66B", "#46B88B", "#3AA5A8", "#3B82C4", "#4A62B8", "#5B48A8", "#6A3E96"];
  const W = 800 / 14, X = p => 100 + p * W;
  const bar = COL.map((c, i) => `<rect class="fade" x="${X(i)}" y="210" width="${W + 0.5}" height="40" fill="${c}"/>`).join("");
  const ticks = Array.from({ length: 15 }, (_, p) => K.t(X(p), 274, p, "graph-label fade")).join("");
  const marker = (id, p, name, conc) => `<g id="${id}" opacity="0">
    <polygon points="${X(p) - 10},186 ${X(p) + 10},186 ${X(p)},207" fill="var(--ink)"/>${K.t(X(p), 172, name, "molecule-label")}${K.t(X(p), 312, conc, "graph-label")}</g>`;

  const svg = `${bar}${ticks}
    ${K.t(500, 116, "pH = −log₁₀[H⁺]", "atom-name fade", 'style="font-size:34px"')}
    ${K.t(X(1.5), 448, "acidic", "molecule-label fade")}${K.t(X(7), 448, "neutral", "molecule-label fade")}${K.t(X(12.5), 448, "alkaline", "molecule-label fade")}
    ${marker("mLemon", 2, "lemon juice", "1 × 10⁻² mol dm⁻³")}${marker("mWater", 7, "pure water", "1 × 10⁻⁷ mol dm⁻³")}${marker("mAmm", 11, "household ammonia", "1 × 10⁻¹¹ mol dm⁻³")}
    <g id="span" opacity="0">
      <path d="M ${X(2)} 345 L ${X(2)} 353 L ${X(7)} 353 L ${X(7)} 345" fill="none" stroke="${C.heat}" stroke-width="4" stroke-linejoin="round"/>
      ${K.t((X(2) + X(7)) / 2, 385, "5 pH units: 10⁵ = 100 000 times more H⁺ in lemon juice", "molecule-label", `style="fill:${C.heat}"`)}
    </g>`;

  K.page({
    id: "ph-scale",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "pH: a scale in powers of ten",
    description: "A colour bar from red on the left to purple on the right, numbered from pH 0 to 14, with pH equals minus log of the hydrogen ion concentration written above it. Tapping places three markers: lemon juice at pH 2, pure water at pH 7 and household ammonia at pH 11, each with its hydrogen ion concentration. Tapping again brackets lemon juice and pure water, five pH units apart, and shows that means a hundred thousand times more hydrogen ions.",
    svg, bounds: [80, 100, 920, 470], tapLabel: "Tap to place some examples",
    steps: [
      { caption: "pH measures how acidic or alkaline a solution is: it's the negative logarithm (base 10) of the hydrogen ion concentration in mol dm⁻³. Low pH is acidic, 7 is neutral, and high pH is alkaline.",
        booklet: "§1 equations: pH = −log₁₀[H⁺] (or −log₁₀[H₃O⁺]).",
        footnote: "The colours are those of universal indicator, which changes through the rainbow as pH rises." },
      { caption: "Lemon juice has a pH of about 2, so [H⁺] = 1 × 10⁻² mol dm⁻³. Pure water is neutral at pH 7, with [H⁺] = 1 × 10⁻⁷. Household ammonia is alkaline, around pH 11.",
        footnote: "Typical values, which vary from sample to sample.",
        to: { "#mLemon": { opacity: 1 }, "#mWater": { opacity: 1, delay: 0.3 }, "#mAmm": { opacity: 1, delay: 0.6 } }, dur: 0.6 },
      { caption: "Because it's a logarithmic scale, one pH unit is a factor of ten in [H⁺]. Lemon juice is five units below pure water, so it has 10⁵, or 100 000, times more hydrogen ions.",
        to: { "#span": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r3-03-kw.js ---- */
// The ion product of water: [H+][OH-] = Kw = 1.00 x 10^-14 at 298 K. A seesaw: when one goes up the other
// goes down, and their product stays the same.

(() => {
  const K = Kit, C = K.C;
  const pan = (x, label, fill) => `${K.l(x, 240, x - 40, 300, "var(--ink)", 3, "")}${K.l(x, 240, x + 40, 300, "var(--ink)", 3, "")}
    <rect x="${x - 60}" y="298" width="120" height="34" rx="8" fill="${fill}"/>${K.t(x, 322, label, "molecule-label", 'style="fill:#fff"')}`;
  const svg = `
    <g id="beam" class="fade">
      ${K.l(300, 240, 700, 240, "var(--ink)", 8, "")}${pan(300, "[H⁺]", C.heat)}${pan(700, "[OH⁻]", C.electron)}
    </g>
    <polygon class="fade" points="500,242 470,320 530,320" fill="var(--ink)"/>
    ${K.t(500, 116, "[H⁺] × [OH⁻] = 1.0 × 10⁻¹⁴", "atom-name fade", 'style="font-size:32px"')}
    ${K.t(500, 168, "pure water: pH 7", "molecule-label fade", 'id="ph"')}
    ${K.t(300, 432, "[H⁺] = 1.0 × 10⁻⁷", "molecule-label fade", 'id="hv"')}${K.t(700, 432, "[OH⁻] = 1.0 × 10⁻⁷", "molecule-label fade", 'id="ohv"')}`;

  K.page({
    id: "kw",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Water's own ions: Kw",
    description: "A seesaw with a beam balanced on a triangle and two pans labelled hydrogen ion concentration on the left and hydroxide ion concentration on the right, with the equation that their product equals 1.0 times ten to the minus 14 above. In pure water the beam is level, pH 7. Tapping adds acid: the hydrogen ion side tips down, pH 3. Tapping again adds alkali: the hydroxide side tips down, pH 11.",
    svg, bounds: [220, 90, 780, 450], tapLabel: "Tap to add acid, then alkali",
    setup() { gsap.set("#beam", { svgOrigin: "500 240" }); },
    steps: [
      { caption: "Even pure water has a very few ions, because a tiny fraction of water molecules donate protons to others. There are equal amounts of H⁺ and OH⁻, each 1.0 × 10⁻⁷ mol dm⁻³, so the water is neutral, pH 7.",
        booklet: "§2: K_w = 1.00 × 10⁻¹⁴ mol² dm⁻⁶ at 298.15 K. §1: K_w = [H⁺][OH⁻]." },
      { caption: "Add an acid and [H⁺] shoots up. But the product [H⁺] × [OH⁻] is fixed at 1.0 × 10⁻¹⁴ (at 298 K), so [OH⁻] must fall by the same factor. Here: 10⁻³ × 10⁻¹¹ = 10⁻¹⁴.",
        to: { "#beam": { rotation: -12 } }, text: { "#ph": "acidic: pH 3", "#hv": "[H⁺] = 1.0 × 10⁻³", "#ohv": "[OH⁻] = 1.0 × 10⁻¹¹" }, dur: 1.2 },
      { caption: "Add an alkali instead and it's the other way round: [OH⁻] rises and [H⁺] falls, so that the product stays the same.",
        footnote: "K_w changes with temperature, so pure water is only neutral at pH 7 at 298 K.",
        to: { "#beam": { rotation: 12 } }, text: { "#ph": "alkaline: pH 11", "#hv": "[H⁺] = 1.0 × 10⁻¹¹", "#ohv": "[OH⁻] = 1.0 × 10⁻³" }, dur: 1.4 }
    ]
  });
})();
;
/* ---- pages/r3-04-strong-weak.js ---- */
// Strong and weak acids: a strong acid (HCl) ionizes completely in water; a weak acid (ethanoic acid)
// only slightly. Same concentration, very different pH. Ka(CH3COOH) = 1.8e-5 (not in the booklet).

(() => {
  const K = Kit, C = K.C, rand = K.rng(12);
  const BX = { s: 90, w: 530 };
  const part = (cls, id, x, y, r, fill, stroke) => K.g(id, x, y, `<circle r="${r}" fill="${fill}" ${stroke ? `stroke="var(--ink)" stroke-width="2"` : ""}/>`, "fade", `data-cls="${cls}"`).replace('class="fade"', `class="fade ${cls}"`);
  let s = "";
  ["s", "w"].forEach(kind => {
    for (let i = 0; i < 10; i++) {
      const x = BX[kind] + 60 + (i % 5) * 65, y = 190 + Math.floor(i / 5) * 80;
      s += part(kind + "H", kind + "H" + i, x - 9, y, 8, "#fff", true) + part(kind + "A", kind + "A" + i, x + 8, y, 16, kind === "s" ? C.product : C.heat, false);
    }
  });
  const box = x => `<rect class="fade" x="${x}" y="140" width="380" height="180" rx="12" fill="none" stroke="var(--ink)" stroke-width="3"/>`;

  const svg = `${box(BX.s)}${box(BX.w)}${s}
    ${K.t(280, 116, "hydrochloric acid, HCl", "molecule-label fade")}${K.t(720, 116, "ethanoic acid, CH₃COOH", "molecule-label fade")}
    ${K.t(280, 352, "acid molecules, HA", "molecule-label fade", 'id="eqS"')}${K.t(720, 352, "acid molecules, HA", "molecule-label fade", 'id="eqW"')}
    ${K.t(500, 445, "small white: H⁺  ·  large: the rest of the acid, A⁻", "graph-label fade")}
    <g id="res" opacity="0">${K.t(280, 400, "pH 1.0 · fully ionized", "molecule-label")}${K.t(720, 400, "pH 2.9 · about 1 % ionized", "molecule-label")}</g>`;

  K.page({
    id: "strong-weak",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Strong and weak acids",
    description: "Two boxes, each with ten acid molecules drawn as a small white hydrogen ion touching a larger coloured ion: hydrochloric acid, a strong acid, on the left and ethanoic acid, a weak acid, on the right. Tapping lets them dissolve: in the strong acid every molecule splits into separate ions, but in the weak acid only one of the ten does. Tapping again shows that at the same concentration the strong acid has pH 1.0 and the weak acid pH 2.9.",
    svg, bounds: [80, 100, 920, 465], tapLabel: "Tap to dissolve the acids",
    steps: [
      { caption: "Here are ten molecules of each of two acids, in water at the same concentration, 0.10 mol dm⁻³. Each has a hydrogen it could give away as H⁺.",
        footnote: "Strong and weak describe how far an acid ionizes. That's different from concentrated and dilute, which describe how much acid is in the water." },
      { caption: "A strong acid ionizes completely: every HCl molecule splits into H⁺ and Cl⁻. A weak acid ionizes only partially: most of the ethanoic acid stays as molecules, with a few splitting into ions and reforming all the time. That's why it's written with an equilibrium arrow, ⇌.",
        to: { ".sH": { x: (i, el) => +el.dataset.x - 30, y: (i, el) => +el.dataset.y - 30, stagger: 0.05 }, ".sA": { x: (i, el) => +el.dataset.x + 26, y: (i, el) => +el.dataset.y + 22, stagger: 0.05 },
              "#wH0": { x: (i, el) => +el.dataset.x - 30, y: (i, el) => +el.dataset.y - 30, delay: 0.3 }, "#wA0": { x: (i, el) => +el.dataset.x + 26, y: (i, el) => +el.dataset.y + 22, delay: 0.3 } },
        text: { "#eqS": "HCl → H⁺ + Cl⁻", "#eqW": "CH₃COOH ⇌ H⁺ + CH₃COO⁻" }, dur: 1.1, captionAt: 1.2 },
      { caption: "So the strong acid has far more H⁺ in the same volume: at 0.10 mol dm⁻³, HCl has pH 1.0, while ethanoic acid has pH 2.9, with only about 1 % of its molecules ionized. A strong acid also reacts faster with metals and conducts electricity better.",
        footnote: "The ionization of a weak acid has an equilibrium constant, K_a, which for ethanoic acid is 1.8 × 10⁻⁵ (from tables, not the booklet).",
        to: { "#res": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r3-04b-acid-picker.js ---- */
// Pick an acid, set its concentration, and see its pH, the share of its molecules that ionize and a picture of
// 100 of them. pH comes from the full charge balance, [H+] = [A-] + Kw/[H+], solved by bisection, so it is
// right even for very dilute weak acids (where water's own H+ matters). Ka values are from tables, not
// the data booklet (flagged on the page and in FACTS.md).

(() => {
  const K = Kit, C = K.C, KW = 1e-14;
  // name, formula, Ka (Infinity = strong)
  const ACIDS = [
    ["hydrochloric acid", "HCl", Infinity], ["nitric acid", "HNO₃", Infinity],
    ["hydrofluoric acid", "HF", 6.8e-4], ["methanoic acid", "HCOOH", 1.8e-4], ["ethanoic acid", "CH₃COOH", 1.8e-5],
    ["chloric(I) acid", "HOCl", 3.0e-8], ["hydrocyanic acid", "HCN", 4.9e-10]
  ];
  const BOX = { x0: 290, x1: 640, y0: 92, y1: 292 }, COLS = 10, ROWS = 10, N = COLS * ROWS;
  const SLX0 = 290, SLX1 = 640;
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹", sci = x => {
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(1) >= 10) { m /= 10; e++; }
    const ex = String(Math.abs(e)).split("").map(d => sup[+d]).join("");
    return m.toFixed(1) + " × 10" + (e < 0 ? "⁻" : "") + ex;
  };
  const concText = c => c.toPrecision(2).replace(/e.*/, "");

  // [H+] of an acid of concentration c: charge balance h = Ka c / (Ka + h) + Kw / h
  function hydrogen(Ka, c) {
    if (!isFinite(Ka)) return (c + Math.sqrt(c * c + 4 * KW)) / 2;
    let lo = -14, hi = 0;                                     // bisect on log10(h): f rises with h
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2, h = Math.pow(10, mid);
      if (h - Ka * c / (Ka + h) - KW / h > 0) hi = mid; else lo = mid;
    }
    return Math.pow(10, (lo + hi) / 2);
  }

  // ----- drawing -----
  const rand = K.rng(8);
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const rank = new Array(N); order.forEach((u, r) => { rank[u] = r; });   // unit u ionizes when rank[u] < n

  const unit = u => {
    const x = BOX.x0 + 17.5 + (u % COLS) * 35, y = BOX.y0 + 11 + Math.floor(u / COLS) * 19.5;
    const t = 'style="transition: transform .45s ease"';
    return `<circle class="uH" data-u="${u}" cx="${x - 6}" cy="${y}" r="4.5" fill="#fff" stroke="var(--ink)" stroke-width="1.5" ${t}/>` +
           `<circle class="uA" data-u="${u}" cx="${x + 6}" cy="${y}" r="8.5" fill="${C.heat}" ${t}/>`;
  };
  let grid = ""; for (let u = 0; u < N; u++) grid += unit(u);

  const chipY = i => 74 + i * 52;
  const chips = ACIDS.map((a, i) => `<g id="chip${i}" class="chip" role="button" tabindex="-1" aria-pressed="false" aria-label="${a[0]}">
      <rect class="chip-bg" x="30" y="${chipY(i)}" width="230" height="42" rx="14" fill="${C.paper}" stroke="var(--ink)" stroke-width="2.5"/>
      ${K.t(46, chipY(i) + 27, a[1], "molecule-label", `id="chipT${i}" style="text-anchor:start"`)}${K.t(244, chipY(i) + 27, isFinite(a[2]) ? "weak" : "strong", "graph-label", `id="chipS${i}" style="text-anchor:end"`)}
    </g>`).join("");

  const svg = `
    <defs><linearGradient id="phgrad" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#E5352B"/><stop offset="0.2" stop-color="#F28C28"/><stop offset="0.36" stop-color="#F5D327"/>
      <stop offset="0.5" stop-color="#5CB85C"/><stop offset="0.66" stop-color="#2E9E9E"/><stop offset="0.82" stop-color="#2E6FE0"/><stop offset="1" stop-color="#6A2BD9"/>
    </linearGradient></defs>
    <rect class="fade" x="${BOX.x0}" y="${BOX.y0}" width="${BOX.x1 - BOX.x0}" height="${BOX.y1 - BOX.y0}" rx="12" fill="#CFE8FF" fill-opacity="0.35" stroke="var(--ink)" stroke-width="3"/>
    <g id="units" class="fade">${grid}</g>
    ${K.t(465, 70, "100 acid molecules in water", "graph-label fade", 'id="beakerLab"')}
    ${K.t(830, 130, "pH 1.00", "atom-name fade", 'id="phText" style="font-size:40px"')}
    ${K.t(830, 178, "", "molecule-label fade", 'id="hText"')}
    ${K.t(830, 214, "", "molecule-label fade", 'id="alphaText"')}
    ${K.t(830, 258, "", "graph-label fade", 'id="kaText"')}
    <rect class="fade" x="${SLX0}" y="378" width="${SLX1 - SLX0}" height="14" rx="7" fill="url(#phgrad)"/>
    <g id="marker" class="fade" data-x="${SLX0}" data-y="375"><polygon points="0,0 -9,-14 9,-14" fill="var(--ink)"/></g>
    ${K.t(SLX0, 418, "0", "graph-label fade")}${K.t((SLX0 + SLX1) / 2, 418, "7", "graph-label fade")}${K.t(SLX1, 418, "14", "graph-label fade")}
    ${K.t(465, 455, "pH scale · small white: H⁺ · large: A⁻ (the rest of the acid)", "graph-label fade")}
    <g id="controls" opacity="0">
      ${chips}
      ${K.t(465, 318, "", "molecule-label", 'id="concText"')}
      ${K.sliderMarkup("cslider", SLX0, SLX1, 345, "Concentration of the acid")}
    </g>`;

  // ----- behaviour -----
  function draw(ctx) {
    const d = ctx.data, a = ACIDS[d.acid], Ka = a[2], c = d.conc;
    const h = hydrogen(Ka, c), pH = -Math.log10(h);
    const strong = !isFinite(Ka), alpha = strong ? 1 : Ka / (Ka + h);
    const n = Math.round(N * alpha);
    ctx.$$(".uH").forEach(e => { const r = rank[+e.dataset.u] < n; e.style.transform = r ? "translate(-10px,-6px)" : "none"; });
    ctx.$$(".uA").forEach(e => { const r = rank[+e.dataset.u] < n; e.style.transform = r ? "translate(8px,5px)" : "none"; });
    ctx.$("#phText").textContent = "pH " + pH.toFixed(2);
    ctx.$("#hText").textContent = "[H⁺] = " + sci(h) + " mol dm⁻³";
    ctx.$("#alphaText").textContent = strong ? "fully ionized" : alpha >= 0.1 ? Math.round(alpha * 100) + " % ionized" : (alpha * 100 < 0.1 ? "<0.1" : (alpha * 100).toFixed(1)) + " % ionized";
    ctx.$("#kaText").textContent = strong ? "strong acid" : "Ka = " + sci(Ka) + " (tables)";
    ctx.$("#beakerLab").textContent = "100 molecules of " + a[0] + ", " + concText(c) + " mol dm⁻³";
    ctx.$("#concText").textContent = "concentration: " + concText(c) + " mol dm⁻³";
    gsap.set(ctx.$("#marker"), { x: SLX0 + Math.min(14, Math.max(0, pH)) / 14 * (SLX1 - SLX0) });
    ACIDS.forEach((_, i) => {
      const on = i === d.acid, g = ctx.$("#chip" + i);
      g.setAttribute("aria-pressed", on);
      g.querySelector(".chip-bg").setAttribute("fill", on ? C.ink : C.paper);
      g.querySelectorAll("text").forEach(t => { t.style.fill = on ? C.paper : C.ink; });
    });
  }

  K.page({
    id: "acid-picker",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Pick an acid: see its pH",
    description: "A box of one hundred acid molecules in water, each a small white hydrogen ion touching a larger orange ion, with a readout of pH, hydrogen ion concentration and percentage ionized, and a colour bar for the pH scale with a marker. At first it shows 0.10 mol per cubic decimetre hydrochloric acid, fully ionized, pH 1. Tapping reveals controls: a list of seven acids, two strong and five weak, and a slider for concentration. You choose an acid and a concentration and the picture, pH and percentage ionized update. A strong acid is always completely ionized; a weak acid only a little, and a lower share the more dilute it is, so its pH is higher than a strong acid's at the same concentration.",
    svg, bounds: [20, 55, 980, 470], tapLabel: "Tap to pick your own acid",
    setup(ctx) {
      const d = ctx.data;
      d.acid = 0; d.conc = 0.1;
      ACIDS.forEach((_, i) => {
        const g = ctx.$("#chip" + i), pick = () => { d.acid = i; draw(ctx); };
        g.addEventListener("click", pick);
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); pick(); } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation(); });
      });
      d.slider = K.slider(ctx, "cslider", { min: -3, max: 0, value: -1, step: 0.05, onInput: v => { d.conc = Math.pow(10, v); draw(ctx); } });
      ctx.$("#cslider").setAttribute("tabindex", "-1");
      draw(ctx);
    },
    steps: [
      { caption: "Here is 0.10 mol dm⁻³ hydrochloric acid, a strong acid: every molecule has split into H⁺ and Cl⁻, so [H⁺] = 0.10 and pH = −log₁₀ 0.10 = 1.00. The picture shows 100 molecules; the pH bar below shows where that lands on the scale.",
        footnote: "pH = −log₁₀[H⁺]. Each pH unit is a factor of ten in H⁺ concentration." },
      { caption: "Now you choose. Pick an acid, then drag the slider to change its concentration. A strong acid is always fully ionized. A weak acid ionizes only a little (more of it the more dilute it is), so its pH is higher than a strong acid's at the same concentration.",
        footnote: "Weak acid: Ka = [H⁺][A⁻] / [HA]. The Ka values come from tables, not from the data booklet. Water's own H⁺ is included, which matters for very weak, dilute acids.",
        booklet: "§1 equations: pH = −log₁₀[H⁺]; Kw = [H⁺][OH⁻].",
        to: { "#controls": { opacity: 1 } }, dur: 0.7,
        run(ctx, tl, dir) {
          const on = dir === "fwd";
          tl.call(() => {
            ACIDS.forEach((_, i) => ctx.$("#chip" + i).setAttribute("tabindex", on ? "0" : "-1"));
            ctx.$("#cslider").setAttribute("tabindex", on ? "0" : "-1");
          }, null, 0.3);
        } }
    ]
  });
})();
;
/* ---- pages/r3-05-neutralization.js ---- */
// Neutralization: HCl + NaOH -> NaCl + H2O. The ionic equation is H+ + OH- -> H2O; Na+ and Cl- are
// spectators that don't change.

(() => {
  const K = Kit, C = K.C;
  const N = 5;
  const ionG = (cls, sym, r, fill, sx, sy, mx, my, px, py, dark) =>
    K.g("", sx, sy, `<circle class="${cls}C" r="${r}" fill="${fill}" ${dark ? `stroke="var(--ink)" stroke-width="2"` : ""}/><text class="nuc-sym ${cls}T" style="font-size:${r > 15 ? 13 : 12}px${dark ? ";fill:#1B1A22" : ""}">${sym}</text>`, "fade " + cls, `data-mx="${mx}" data-my="${my}" data-px="${px}" data-py="${py}"`);
  // Grid positions keep every ion (and its label) clear of the others: each kind has its own row in the acid
  // beaker, the alkali beaker, and the mixed beaker. The hydroxide ions sit under the hydrogen ions when mixed.
  const mixX = i => 360 + 55 * i, ROW = { h: [215, 200], cl: [290, 284], na: [215, 326], oh: [290, 242] };
  let ions = "";
  for (let i = 0; i < N; i++) {
    ions += ionG("h", "H⁺", 14, "#fff", 130 + 65 * i, ROW.h[0], mixX(i), ROW.h[1], mixX(i), ROW.h[1], true);
    ions += ionG("cl", "Cl⁻", 19, C.product, 130 + 65 * i, ROW.cl[0], mixX(i), ROW.cl[1], 0, 0);
    ions += ionG("na", "Na⁺", 17, C.ion, 610 + 65 * i, ROW.na[0], mixX(i), ROW.na[1], 0, 0);
    ions += ionG("oh", "OH⁻", 19, C.proton, 610 + 65 * i, ROW.oh[0], mixX(i), ROW.oh[1], mixX(i), ROW.h[1], false);
  }
  const beaker = (x0, x1, id, cls) => `<path id="${id}" ${cls ? `class="${cls}"` : 'opacity="0"'} d="M ${x0} 130 L ${x0 + 10} 350 L ${x1 - 10} 350 L ${x1} 130" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>`;

  const svg = `${beaker(100, 420, "bA", "fade")}${beaker(580, 900, "bB", "fade")}${beaker(320, 680, "bM", "")}
    ${ions}
    ${K.t(260, 116, "hydrochloric acid", "molecule-label fade", 'id="tA"')}${K.t(740, 116, "sodium hydroxide", "molecule-label fade", 'id="tB"')}${K.t(500, 116, "the two solutions, mixed", "molecule-label", 'id="tM" opacity="0"')}
    ${K.t(500, 396, "HCl + NaOH → NaCl + H₂O", "atom-name fade", 'id="eq"')}${K.t(500, 436, "acid + alkali → salt + water", "graph-label fade", 'id="eq2"')}`;

  K.page({
    id: "neutralization",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Neutralization",
    description: "Two beakers: hydrochloric acid on the left with white hydrogen ions and green chloride ions, and sodium hydroxide on the right with grey sodium ions and red hydroxide ions. Tapping pours them together into one beaker where the ions mix. Tapping again pairs each hydrogen ion with a hydroxide ion to make a water molecule, while the sodium and chloride ions stay unchanged as spectators.",
    svg, bounds: [80, 100, 920, 465], tapLabel: "Tap to mix the solutions",
    steps: [
      { caption: "Hydrochloric acid is full of H⁺ and Cl⁻ ions. Sodium hydroxide, an alkali, is full of Na⁺ and OH⁻ ions.",
        footnote: "Acids also neutralize metal oxides and carbonates (making a salt and water, and with carbonates, carbon dioxide too)." },
      { caption: "Mix them and all four kinds of ion are together in one solution.",
        to: { "#bA": { opacity: 0 }, "#bB": { opacity: 0 }, "#bM": { opacity: 1 }, "#tA": { opacity: 0 }, "#tB": { opacity: 0 }, "#tM": { opacity: 1 }, ".h, .cl, .na, .oh": { x: (i, el) => +el.dataset.mx, y: (i, el) => +el.dataset.my, stagger: 0.03 } },
        dur: 1.4 },
      { caption: "Each H⁺ meets an OH⁻ and they join to make a water molecule: H⁺ + OH⁻ → H₂O. That's the whole neutralization reaction. The Na⁺ and Cl⁻ ions don't change: they're spectator ions, left dissolved as the salt, sodium chloride.",
        footnote: "Neutralization is exothermic: about −57 kJ per mole of water made, the same for any strong acid and strong alkali (see the calorimetry page).",
        to: { ".oh": { x: (i, el) => +el.dataset.px, y: (i, el) => +el.dataset.py }, ".ohC": { fill: "#4D94E8" }, ".h": { opacity: 0, delay: 0.6 } },
        text: { ".ohT": "H₂O", "#eq2": "H⁺ + OH⁻ → H₂O   (Na⁺ and Cl⁻ are spectators)" }, dur: 1.4 }
    ]
  });
})();
;
/* ---- pages/r3-06-ph-curves.js ---- */
// pH curves: 25 cm3 of 0.100 mol/dm3 acid titrated with 0.100 mol/dm3 NaOH. Calculated, not drawn by hand.
// Strong acid (HCl) and weak acid (ethanoic, Ka = 1.8e-5). Indicator ranges from the data booklet, section 18.

(() => {
  const K = Kit, C = K.C;
  const CONC = 0.1, VA = 25, KA = 1.8e-5, KW = 1e-14;
  const X = v => 160 + v * 13.6, Y = ph => 400 - ph * 22;
  // Charge balance [Na+] + [H+] = [A-] + [OH-], solved for pH by bisection.
  const solve = (v, weak) => {
    const V = VA + v, na = CONC * v / V, ca = CONC * VA / V;
    const g = x => { const h = Math.pow(10, -x), a = weak ? ca * KA / (KA + h) : ca; return na + h - a - KW / h; };
    let lo = 0.01, hi = 13.99;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const path = weak => { let d = ""; for (let v = 0; v <= 50; v += 0.5) d += (v ? " L " : "M ") + X(v).toFixed(1) + " " + Y(solve(v, weak)).toFixed(1); return d; };
  const band = (lo, hi, name, col) => `<g class="band" opacity="0"><rect x="160" y="${Y(hi)}" width="680" height="${Y(lo) - Y(hi)}" fill="${col}" opacity="0.28"/>${K.t(850, (Y(lo) + Y(hi)) / 2 + 5, name, "graph-label", 'style="text-anchor:start"')}</g>`;
  const eqStrong = solve(25, false), eqWeak = solve(25, true);

  const svg = `
    ${K.arrow(150, 400, 850, 400, "var(--ink)", 3, 'class="fade"')}${K.arrow(160, 410, 160, 84, "var(--ink)", 3, 'class="fade"')}
    ${[0, 10, 20, 30, 40, 50].map(v => K.t(X(v), 424, v, "graph-label fade")).join("")}${[0, 7, 14].map(p => K.t(146, Y(p) + 5, p, "graph-label fade", 'style="text-anchor:end"')).join("")}
    ${K.t(500, 452, "volume of NaOH added / cm³", "graph-label fade")}${K.t(172, 82, "pH", "atom-name fade", 'style="text-anchor:start"')}
    ${band(3.1, 4.4, "methyl orange", "#E85D3A")}${band(6.0, 7.6, "bromothymol blue", "#4D94E8")}${band(8.0, 10.0, "phenolphthalein", "#E85DA6")}
    <path class="fade" d="${path(false)}" fill="none" stroke="${C.electron}" stroke-width="5" stroke-linecap="round"/>
    <path id="weakCurve" d="${path(true)}" fill="none" stroke="${C.heat}" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 7" opacity="0"/>
    <g id="eqS" opacity="0"><circle cx="${X(25)}" cy="${Y(eqStrong)}" r="8" fill="${C.electron}" stroke="#fff" stroke-width="2"/>${K.t(X(25) + 14, Y(eqStrong) + 26, "equivalence: pH 7", "molecule-label", 'style="text-anchor:start"')}</g>
    <g id="eqW" opacity="0"><circle cx="${X(25)}" cy="${Y(eqWeak)}" r="8" fill="${C.heat}" stroke="#fff" stroke-width="2"/>${K.t(X(25) - 14, Y(eqWeak) - 14, "equivalence: pH 8.7", "molecule-label", 'style="text-anchor:end"')}</g>
    ${K.t(400, 130, "strong acid + strong base", "molecule-label fade", `style="fill:${C.electron}"`)}
    ${K.t(700, 300, "weak acid + strong base", "molecule-label", `id="wk" opacity="0" style="fill:${C.heat}"`)}`;

  K.page({
    id: "ph-curves",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "pH curves",
    description: "A graph of pH against volume of sodium hydroxide added to 25 cubic centimetres of acid. A blue curve for a strong acid starts near pH 1, stays low, shoots up almost vertically around 25 cubic centimetres, and levels off near pH 13. Tapping marks the equivalence point at pH 7 and shades the colour-change ranges of three indicators. Tapping again adds a dashed orange curve for a weak acid, which starts higher, rises gently, and has its equivalence point at pH 8.7.",
    svg, bounds: [130, 70, 990, 470], tapLabel: "Tap to mark the equivalence point",
    steps: [
      { caption: "In a titration, an alkali is added a little at a time to an acid while the pH is recorded. For a strong acid and a strong base, the pH starts low, barely changes for most of the addition, then shoots up steeply right where the acid has been used up.",
        footnote: "Curve calculated for 25 cm³ of 0.100 mol dm⁻³ acid and 0.100 mol dm⁻³ NaOH." },
      { caption: "The steep part is centred on the equivalence point, where exactly the right amount of alkali has been added, at 25.0 cm³. For a strong acid with a strong base it's at pH 7. An indicator is a weak acid that changes colour over a small pH range, and any whose range sits in the steep part will show the end point.",
        booklet: "§18 indicators: methyl orange pH 3.1–4.4, bromothymol blue 6.0–7.6, phenolphthalein 8.0–10.0.",
        to: { "#eqS": { opacity: 1 }, ".band": { opacity: 1, stagger: 0.25, delay: 0.3 } }, dur: 0.8 },
      { caption: "With a weak acid, the curve looks different: it starts higher, the rise is gentler, and the equivalence point is above 7 (here 8.7) because the salt formed is slightly alkaline. Now the choice of indicator matters: phenolphthalein changes in the right place, but methyl orange would change far too early.",
        to: { "#weakCurve": { opacity: 1 }, "#eqW": { opacity: 1, delay: 0.5 }, "#wk": { opacity: 1 } }, dur: 1.0 }
    ]
  });
})();
;
/* ---- pages/r3-07-redox-four-ways.js ---- */
// Oxidation and reduction described four ways: electrons, oxidation state, oxygen, hydrogen. Each row is
// one definition; a worked example changes with it.

(() => {
  const K = Kit, C = K.C;
  const ROWS = [
    ["electrons", "loses electrons", "gains electrons", "Mg → Mg²⁺ + 2e⁻: magnesium loses electrons, so it's oxidized"],
    ["oxidation state", "increases", "decreases", "Mg: 0 → +2: its oxidation state increases, so it's oxidized"],
    ["oxygen", "gains oxygen", "loses oxygen", "2Mg + O₂ → 2MgO: magnesium gains oxygen, so it's oxidized"],
    ["hydrogen", "loses hydrogen", "gains hydrogen", "CH₃CH₂OH → CH₃CHO: ethanol loses hydrogen, so it's oxidized"]
  ];
  const Y = i => 205 + i * 55;
  const row = (r, i) => `<g id="row${i}" ${i ? 'opacity="0"' : 'class="fade"'}>
    ${K.t(80, Y(i) + 6, r[0], "molecule-label", 'style="text-anchor:start"')}${K.t(500, Y(i) + 6, r[1], "molecule-label")}${K.t(760, Y(i) + 6, r[2], "molecule-label")}</g>`;

  const svg = `
    ${K.t(500, 150, "oxidation", "atom-name fade", `style="fill:${C.heat}"`)}${K.t(760, 150, "reduction", "atom-name fade", `style="fill:${C.electron}"`)}
    ${K.l(70, 170, 900, 170, "var(--ink)", 2.5, 'class="fade" stroke-opacity="0.4"')}
    ${ROWS.map(row).join("")}
    ${K.t(500, 445, ROWS[0][3], "molecule-label fade", 'id="ex"')}`;

  const step = (i, cap, extra = {}) => ({ caption: cap, to: { ["#row" + i]: { opacity: 1 } }, text: { "#ex": ROWS[i][3] }, ...extra });

  K.page({
    id: "redox-four-ways",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Oxidation and reduction: four ways to see it",
    description: "A table with oxidation in orange on one side and reduction in blue on the other. It starts with one row, electrons: oxidation is losing electrons and reduction is gaining them. Each tap adds a row: oxidation state increases or decreases; gaining or losing oxygen; losing or gaining hydrogen. A worked example beneath changes with each row.",
    svg, bounds: [60, 110, 940, 470], tapLabel: "Tap to add another definition",
    steps: [
      { caption: "Oxidation and reduction can be described in four ways. The most general is in terms of electrons: oxidation is loss of electrons, and reduction is gain of electrons. They always happen together.",
        footnote: "OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons)." },
      step(1, "Oxidation states give the same answer: an atom that is oxidized has its oxidation state go up, and one that is reduced has it go down."),
      step(2, "The oldest definition is in terms of oxygen: gaining oxygen is oxidation, and losing oxygen is reduction. It's how the words started, from things burning in air."),
      step(3, "Organic chemistry often uses hydrogen: losing hydrogen is oxidation, and gaining hydrogen is reduction.",
        { footnote: "Try any of the four on the same reaction and they'll agree." })
    ]
  });
})();
;
/* ---- pages/r3-08-half-equations.js ---- */
// Half-equations: zinc and copper(II) ions. Zn + Cu2+ -> Zn2+ + Cu splits into an oxidation half-equation
// and a reduction half-equation; the electrons cancel when they are added.

(() => {
  const K = Kit, C = K.C;
  const e = (id, x, y) => K.g(id, x, y, `<circle r="8" fill="${C.electron}"/>`, "fade");
  const svg = `
    ${K.g("zn", 220, 190, `<circle id="znC" r="36" fill="${C.grey}"/><text id="znT" class="nuc-sym" style="font-size:22px">Zn</text>`)}
    ${K.g("cu", 780, 190, `<circle id="cuC" r="36" fill="${C.ion}"/><text id="cuT" class="nuc-sym" style="font-size:20px">Cu²⁺</text>`)}
    ${e("e1", 275, 178)}${e("e2", 275, 204)}
    ${K.t(500, 300, "Zn + Cu²⁺ → Zn²⁺ + Cu", "atom-name fade")}
    <g id="halves" opacity="0">
      ${K.t(500, 350, "oxidation:  Zn → Zn²⁺ + 2e⁻", "molecule-label", `style="fill:${C.heat}"`)}
      ${K.t(500, 386, "reduction:  Cu²⁺ + 2e⁻ → Cu", "molecule-label", `style="fill:${C.electron}"`)}
    </g>
    ${K.t(500, 436, "", "graph-label", 'id="chk"')}`;

  K.page({
    id: "half-equations",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Half-equations",
    description: "A grey zinc atom on the left and a blue copper two plus ion on the right, with two blue electrons beside the zinc, and the overall equation below. Tapping sends the two electrons across: the zinc becomes a zinc two plus ion and the copper ion becomes a copper atom, and two half-equations appear, oxidation of zinc and reduction of copper. Tapping again adds them up: the electrons cancel and the charges balance.",
    svg, bounds: [160, 130, 840, 460], tapLabel: "Tap to move the electrons",
    steps: [
      { caption: "When zinc metal is put into a solution of copper(II) ions, a reaction happens: Zn + Cu²⁺ → Zn²⁺ + Cu. The zinc dissolves, and copper metal appears.",
        footnote: "Written as one equation it doesn't show the electrons, which are the whole point of a redox reaction." },
      { caption: "Look at what each species does. Zinc loses two electrons: that's oxidation. The copper(II) ion gains them: that's reduction. Splitting the reaction in two shows the electron transfer, and each part is a half-equation.",
        booklet: "§19 standard reduction potentials: Zn²⁺ + 2e⁻ → Zn −0.76 V; Cu²⁺ + 2e⁻ → Cu +0.34 V.",
        to: { "#e1": { x: 728, y: 178 }, "#e2": { x: 728, y: 204, delay: 0.15 }, "#halves": { opacity: 1, delay: 0.8 }, "#znC": { fill: C.ion }, "#cuC": { fill: C.heat } },
        text: { "#znT": "Zn²⁺", "#cuT": "Cu" }, dur: 1.5 },
      { caption: "Add the two half-equations together and the electrons on each side cancel out, leaving the overall equation again. Check both atoms and charge balance: 0 + 2+ on the left, 2+ + 0 on the right.",
        to: { "#e1": { opacity: 0 }, "#e2": { opacity: 0 } }, text: { "#chk": "charge: 0 + (2+) = (2+) + 0 ✓" } }
    ]
  });
})();
;
/* ---- pages/r3-09-group-reactivity.js ---- */
// Reactivity down a group: alkali metals lose electrons more easily going down (ionization energy falls),
// halogens are weaker oxidizing agents going down (E° falls). So chlorine oxidizes bromide ions.

(() => {
  const K = Kit, C = K.C;
  const BASE = 390;
  const bars = (items, xs, colour, scale, fmt, w) => items.map(([sym, v], i) => `
    <rect x="${xs(i) - w / 2}" y="${BASE - v * scale}" width="${w}" height="${v * scale}" rx="4" fill="${colour}"/>
    ${K.t(xs(i), BASE - v * scale - 10, fmt(v), "graph-label")}${K.t(xs(i), 418, sym, "atom-name", 'style="font-size:22px"')}`).join("");
  const IE = [["Li", 520], ["Na", 496], ["K", 419], ["Rb", 403], ["Cs", 376]];
  const EO = [["F₂", 2.87], ["Cl₂", 1.36], ["Br₂", 1.09], ["I₂", 0.54]];
  const tube = (x, liquid) => `<path d="M ${x - 45} 130 L ${x - 45} 300 Q ${x - 45} 340 ${x} 340 Q ${x + 45} 340 ${x + 45} 300 L ${x + 45} 130" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path d="M ${x - 43} 200 L ${x - 43} 300 Q ${x - 43} 338 ${x} 338 Q ${x + 43} 338 ${x + 43} 300 L ${x + 43} 200 Z" fill="${liquid}"/>`;

  const svg = `
    <g id="gM" class="fade">${bars(IE, i => 210 + i * 145, C.ion, 0.5, v => v, 70)}${K.t(150, 96, "first ionization energy, kJ mol⁻¹", "graph-label", 'style="text-anchor:start"')}
      ${K.arrow(150, 444, 850, 444, C.heat, 4)}${K.t(500, 470, "easier to oxidize: more reactive down the group", "molecule-label")}</g>
    <g id="gH" opacity="0">${bars(EO, i => 250 + i * 165, C.product, 80, v => v.toFixed(2), 80)}${K.t(150, 96, "standard reduction potential, E° / V (as an oxidizing agent)", "graph-label", 'style="text-anchor:start"')}${K.arrow(150, 444, 850, 444, C.product, 4)}${K.t(500, 470, "weaker oxidizing agents down the group", "molecule-label")}</g>
    <g id="gT" opacity="0">${tube(300, "#FFFDF8")}${tube(700, "#F2A33C")}${K.arrow(400, 250, 590, 250, "var(--ink)", 4)}
      ${K.t(300, 112, "bromide ions, Br⁻(aq)", "molecule-label")}${K.t(700, 112, "orange: bromine, Br₂", "molecule-label")}${K.t(495, 232, "+ chlorine", "graph-label")}
      ${K.t(500, 405, "Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂", "atom-name")}${K.t(500, 445, "Cl₂ (1.36 V) oxidizes Br⁻ because it is a stronger oxidizing agent than Br₂ (1.09 V)", "graph-label")}</g>`;

  K.page({
    id: "group-reactivity",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Who gets oxidized? Reactivity down a group",
    description: "A bar chart of the first ionization energies of lithium, sodium, potassium, rubidium and caesium, falling steadily from 520 to 376 kilojoules per mole, with an arrow beneath. Tapping swaps it for a chart of the standard reduction potentials of fluorine, chlorine, bromine and iodine, falling from 2.87 to 0.54 volts. Tapping again shows two test tubes: colourless bromide solution, and orange bromine formed when chlorine is added.",
    svg, bounds: [120, 80, 890, 470], tapLabel: "Tap to compare the halogens",
    steps: [
      { caption: "Down group 1, the outer electron is further from the nucleus and shielded by more inner shells, so the first ionization energy falls. The metal loses its electron (is oxidized) more easily, so the alkali metals get more reactive down the group.",
        booklet: "§9 first ionization energies: Li 520, Na 496, K 419, Rb 403, Cs 376 kJ mol⁻¹." },
      { caption: "Group 17 goes the other way. A halogen is an oxidizing agent: it takes electrons. The atoms get bigger down the group, so the incoming electron is held less tightly, and the elements become weaker oxidizing agents. Fluorine is the strongest.",
        booklet: "§19: ½F₂ + e⁻ → F⁻ +2.87 V; ½Cl₂ +1.36 V; ½Br₂ +1.09 V; ½I₂ +0.54 V.",
        to: { "#gM": { opacity: 0 }, "#gH": { opacity: 1 } }, dur: 0.7 },
      { caption: "That predicts displacement reactions. Chlorine is a stronger oxidizing agent than bromine, so chlorine water added to bromide ions takes their electrons: chlorine is reduced to chloride, and bromide is oxidized to orange bromine.",
        to: { "#gH": { opacity: 0 }, "#gT": { opacity: 1 } }, dur: 0.7 }
    ]
  });
})();
;
/* ---- pages/r3-10-metals-in-acid.js ---- */
// Metals in acid: magnesium fizzes fast, zinc slower, copper not at all. Metals with a negative standard
// electrode potential (below hydrogen) reduce H+ to H2: Mg + 2H+ -> Mg2+ + H2.

(() => {
  const K = Kit, C = K.C;
  const TUBES = [
    { x: 250, name: "magnesium", e: "−2.37 V", metal: "#B9BCC2", n: 12, dur: [0.7, 1.2] },
    { x: 500, name: "zinc", e: "−0.76 V", metal: "#9AA3AE", n: 5, dur: [1.6, 2.4] },
    { x: 750, name: "copper", e: "+0.34 V", metal: "#C97B4A", n: 0, dur: [1, 1] }
  ];
  const TOP = 190, BOT = 350;
  const rand = K.rng(51);
  const tube = t => `<path class="fade" d="M ${t.x - 50} 120 L ${t.x - 50} 320 Q ${t.x - 50} ${BOT + 4} ${t.x} ${BOT + 4} Q ${t.x + 50} ${BOT + 4} ${t.x + 50} 320 L ${t.x + 50} 120" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
    <path class="fade" d="M ${t.x - 48} ${TOP} L ${t.x - 48} 320 Q ${t.x - 48} ${BOT} ${t.x} ${BOT} Q ${t.x + 48} ${BOT} ${t.x + 48} 320 L ${t.x + 48} ${TOP} Z" fill="#DCEBFA"/>
    <rect class="fade" x="${t.x - 10}" y="${TOP + 30}" width="20" height="120" rx="3" fill="${t.metal}"/>
    ${K.t(t.x, 400, t.name, "atom-name fade", 'style="font-size:22px"')}${K.t(t.x, 428, "E° = " + t.e, "graph-label fade")}`;
  let bubbles = "";
  TUBES.forEach((t, ti) => { for (let i = 0; i < t.n; i++) bubbles += `<circle class="bub b${ti}" cx="${(t.x - 30 + rand() * 60).toFixed(1)}" cy="${(BOT - 20 - rand() * 100).toFixed(1)}" r="${(3 + rand() * 3).toFixed(1)}" fill="#fff" stroke="var(--ink)" stroke-width="1.5" opacity="0"/>`; });

  const svg = `${TUBES.map(tube).join("")}${bubbles}
    ${K.t(500, 100, "dilute hydrochloric acid", "molecule-label fade")}
    <g id="eqn" opacity="0">${K.t(500, 462, "Mg + 2H⁺ → Mg²⁺ + H₂   (H⁺: 0.00 V)", "molecule-label")}</g>`;

  K.page({
    id: "metals-in-acid",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Metals in acid: where the hydrogen comes from",
    description: "Three test tubes of dilute hydrochloric acid, each with a strip of metal in it: magnesium, zinc and copper, labelled with their standard electrode potentials, minus 2.37, minus 0.76 and plus 0.34 volts. Tapping makes bubbles rise: a stream from the magnesium, fewer from the zinc, and none from the copper. Tapping again shows the ionic equation: magnesium reduces hydrogen ions to hydrogen gas.",
    svg, bounds: [190, 90, 810, 470], tapLabel: "Tap to add the acid",
    setup(ctx) {
      const d = ctx.data, rand2 = K.rng(52);
      d.bub = [];
      ctx.$$(".bub").forEach(b => {
        const ti = +b.getAttribute("class").match(/b(\d)/)[1], t = TUBES[ti];
        const tl = gsap.timeline({ repeat: -1, paused: true, delay: rand2() * 1.5 });
        tl.fromTo(b, { attr: { cy: BOT - 14 } }, { attr: { cy: TOP + 6 }, duration: t.dur[0] + rand2() * (t.dur[1] - t.dur[0]), ease: "none" });
        d.bub.push(tl);
      });
    },
    steps: [
      { caption: "Drop strips of three metals into dilute acid. Will they react? The answer depends on where each metal sits relative to hydrogen in the electrochemical series.",
        booklet: "§19 standard reduction potentials: Mg²⁺/Mg −2.37 V, Zn²⁺/Zn −0.76 V, Cu²⁺/Cu +0.34 V, H⁺/H₂ 0.00 V." },
      { caption: "Magnesium fizzes furiously, zinc more slowly, and copper doesn't react at all. The bubbles are hydrogen gas.",
        to: { ".bub": { opacity: 1 } }, dur: 0.6,
        run(ctx, tl, dir) { ctx.data.bub.forEach(t => { if (dir === "fwd" && !ctx.reduceMotion) t.play(); else t.pause(0); }); } },
      { caption: "Metals with a negative electrode potential are easier to oxidize than hydrogen, so they push electrons onto H⁺ ions: the metal is oxidized and the hydrogen ions are reduced to H₂. Copper, with a positive potential, isn't a strong enough reducing agent.",
        footnote: "The more negative the potential, the stronger the reducing agent, and the faster the fizzing.",
        to: { "#eqn": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r3-11-rechargeable.js ---- */
// Rechargeable (secondary) cells: discharging, the redox reaction is spontaneous and powers a lamp.
// Charging, an external supply pushes the electrons back the other way and reverses the reaction.

(() => {
  const K = Kit, C = K.C;
  const WIRE = [[300, 190], [300, 100], [700, 100], [700, 190]];
  const start = 'style="text-anchor:start"';

  const svg = `
    <rect class="fade" x="322" y="190" width="356" height="200" fill="#EAF3FF"/>
    <rect class="fade" x="290" y="190" width="32" height="200" fill="${C.grey}"/><rect class="fade" x="678" y="190" width="32" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 300 190 L 300 100 L 470 100 M 530 100 L 700 100 L 700 190" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g id="lamp" class="fade"><circle cx="500" cy="100" r="26" fill="#FFF3B0" stroke="var(--ink)" stroke-width="4"/>${K.l(482, 82, 518, 118, "var(--ink)", 3)}${K.l(518, 82, 482, 118, "var(--ink)", 3)}</g>
    <g id="charger" opacity="0">${K.l(470, 100, 486, 100, "var(--ink)", 5)}${K.l(486, 78, 486, 122, "var(--ink)", 5)}${K.l(514, 88, 514, 112, "var(--ink)", 5)}${K.l(514, 100, 530, 100, "var(--ink)", 5)}${K.t(500, 66, "power supply", "graph-label")}</g>
    ${K.t(306, 168, "−", "atom-name fade", 'style="font-size:34px"')}${K.t(694, 168, "+", "atom-name fade", 'style="font-size:34px"')}
    ${K.t(500, 300, "electrolyte", "graph-label fade")}
    <g id="electrons"></g><g id="ions"></g>
    ${K.t(500, 430, "discharging: the cell powers the lamp", "atom-name fade", 'id="mode"')}
    <g id="cmp" opacity="0">
      ${K.t(500, 468, "primary cell: can't be reversed, thrown away  ·  secondary cell: can be recharged", "graph-label")}
    </g>`;

  const kill = d => { (d.flows || []).forEach(f => f.kill()); d.flows = []; };
  function flows(ctx, dir) {
    const d = ctx.data; kill(d);
    if (ctx.reduceMotion) return;
    const el = ctx.$("#electrons"), io = ctx.$("#ions");
    el.innerHTML = ""; io.innerHTML = "";
    const path = dir > 0 ? WIRE : WIRE.slice().reverse();
    for (let i = 0; i < 5; i++) {
      const dot = document.createElementNS(K.NS, "circle");
      dot.setAttribute("r", 7); dot.setAttribute("fill", C.electron); el.appendChild(dot);
      gsap.set(dot, { x: path[0][0], y: path[0][1], opacity: 0 });
      const f = gsap.timeline({ repeat: -1, delay: i * 0.55 });
      f.set(dot, { x: path[0][0], y: path[0][1], opacity: 1 });
      for (let s = 1; s < path.length; s++) f.to(dot, { x: path[s][0], y: path[s][1], duration: 0.7, ease: "none" });
      d.flows.push(f);
      const ion = document.createElementNS(K.NS, "circle");
      ion.setAttribute("r", 9); ion.setAttribute("fill", C.heat); ion.setAttribute("stroke", "#fff"); ion.setAttribute("stroke-width", 2); io.appendChild(ion);
      const y = 215 + i * 34, x0 = dir > 0 ? 340 : 660, x1 = dir > 0 ? 660 : 340;
      gsap.set(ion, { x: x0, y, opacity: 0 });
      const g = gsap.timeline({ repeat: -1, delay: i * 0.5 });
      g.set(ion, { x: x0, y, opacity: 1 }).to(ion, { x: x1, y, duration: 2.2, ease: "none" });
      d.flows.push(g);
    }
  }

  K.page({
    id: "rechargeable",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Rechargeable cells",
    description: "A cell with a negative electrode on the left and a positive electrode on the right in an electrolyte, joined by a wire over the top with a lamp. Electrons flow along the wire from the negative to the positive electrode while ions drift across the electrolyte: the cell is discharging. Tapping swaps the lamp for a power supply and both flows reverse: the cell is charging, and the reaction is being reversed. Tapping again compares primary cells, which can't be recharged, with secondary cells.",
    svg, bounds: [270, 50, 730, 470], tapLabel: "Tap to recharge the cell",
    idle(ctx) { flows(ctx, 1); },
    steps: [
      { caption: "In a cell, a spontaneous redox reaction pushes electrons round a circuit. This cell is discharging: electrons leave the negative electrode, where oxidation happens, and travel round the wire to power the lamp, while ions move through the electrolyte to complete the circuit.",
        footnote: "The arrows of electron flow point from − to + outside the cell." },
      { caption: "In a rechargeable (secondary) cell, the reaction can be reversed. Swap the lamp for a power supply that pushes electrons the opposite way and the chemistry runs backwards: charging turns the products back into reactants, using electrical energy to do it.",
        footnote: "In a lithium-ion cell, charging pushes lithium ions back through the electrolyte from the positive electrode to the negative one.",
        to: { "#lamp": { opacity: 0 }, "#charger": { opacity: 1 } }, text: { "#mode": "charging: electrical energy reverses the reaction" }, dur: 0.8,
        run(ctx, tl, dir) { tl.call(() => flows(ctx, dir === "fwd" ? -1 : 1), null, 0.4); } },
      { caption: "A primary cell has a reaction that can't be reversed in this way, so once the reactants are used up, the cell is thrown away. A secondary cell can go through many discharge and recharge cycles, though not for ever.",
        to: { "#cmp": { opacity: 1 } } }
    ]
  });
})();
;
/* ---- pages/r3-12-electrolysis.js ---- */
// Electrolysis of molten sodium chloride: a power supply forces a non-spontaneous reaction.
// Cathode (−): Na+ + e− -> Na (reduction). Anode (+): 2Cl− -> Cl2 + 2e− (oxidation).

(() => {
  const K = Kit, C = K.C;
  // A checkerboard of ions in the melt (so no two labels overlap), each with its final place beside an electrode.
  let ions = "", nn = 0, cn = 0;
  for (let k = 0; k < 12; k++) {
    const col = k % 4, row = Math.floor(k / 4), x = 410 + col * 60, y = 270 + row * 50;
    if ((col + row) % 2 === 0) {
      ions += K.g("", x, y, `<circle r="15" fill="${C.ion}"/><text class="nuc-sym" style="font-size:12px">Na⁺</text>`, "fade na", `data-fx="${372 + (nn % 2) * 36}" data-fy="${270 + Math.floor(nn / 2) * 44}"`); nn++;
    } else {
      ions += K.g("", x, y, `<circle r="18" fill="${C.product}"/><text class="nuc-sym" style="font-size:12px">Cl⁻</text>`, "fade cl", `data-fx="${628 - (cn % 2) * 36}" data-fy="${270 + Math.floor(cn / 2) * 44}"`); cn++;
    }
  }
  const svg = `
    <path class="fade" d="M 300 230 L 312 430 L 688 430 L 700 230" fill="#F8E7C7" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <rect class="fade" x="338" y="200" width="22" height="200" fill="${C.grey}"/><rect class="fade" x="640" y="200" width="22" height="200" fill="${C.grey}"/>
    <path class="fade" d="M 349 200 L 349 110 L 450 110 M 550 110 L 651 110 L 651 200" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="fade">${K.l(450, 84, 450, 136, "var(--ink)", 6)}${K.l(472, 96, 472, 124, "var(--ink)", 6)}${K.l(500, 84, 500, 136, "var(--ink)", 6)}${K.l(522, 96, 522, 124, "var(--ink)", 6)}${K.l(472, 110, 500, 110, "var(--ink)", 3)}${K.l(522, 110, 550, 110, "var(--ink)", 3)}</g>
    ${K.t(435, 78, "−", "atom-name fade", 'style="font-size:30px"')}${K.t(565, 78, "+", "atom-name fade", 'style="font-size:30px"')}
    ${ions}
    <g id="products" opacity="0">
      <ellipse cx="349" cy="404" rx="30" ry="10" fill="#B8BEC6" stroke="var(--ink)" stroke-width="2"/>
      ${[0, 1, 2, 3].map(i => `<circle cx="${640 + (i % 2) * 24}" cy="${190 - i * 12}" r="8" fill="#fff" stroke="${C.product}" stroke-width="3"/>`).join("")}
    </g>
    ${K.t(349, 172, "cathode", "molecule-label fade")}${K.t(651, 172, "anode", "molecule-label fade")}
    ${K.t(500, 460, "molten sodium chloride: Na⁺ and Cl⁻ ions", "graph-label fade", 'id="tag"')}
    <g id="eqs" opacity="0">
      ${K.t(175, 240, "Na⁺ + e⁻ → Na", "molecule-label", 'style="fill:#0B44A8"')}${K.t(175, 268, "reduction", "graph-label")}
      ${K.t(830, 240, "2Cl⁻ → Cl₂ + 2e⁻", "molecule-label", 'style="fill:#E05A2B"')}${K.t(830, 268, "oxidation", "graph-label")}
    </g>`;

  K.page({
    id: "electrolysis",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Electrolysis: pushing a reaction uphill",
    description: "A beaker of molten sodium chloride with two electrodes joined over the top to a power supply, negative on the left and positive on the right, with grey sodium ions and green chloride ions moving about in the melt. Tapping switches the current on: sodium ions drift towards the negative cathode and chloride ions to the positive anode. Tapping again shows the products: a blob of sodium metal at the cathode and bubbles of chlorine at the anode, with the half-equations at each.",
    svg, bounds: [140, 60, 860, 480], tapLabel: "Tap to switch on the current",
    steps: [
      { caption: "Sodium chloride melts at a high temperature, and molten NaCl is full of free-moving Na⁺ and Cl⁻ ions. On its own nothing happens. Now put two electrodes in the melt and connect them to a power supply.",
        footnote: "An electrolytic cell is the opposite of the cells before it: electrical energy drives a non-spontaneous reaction, instead of a spontaneous reaction making electricity." },
      { caption: "The power supply makes one electrode negative and the other positive. Opposite charges attract: the positive Na⁺ ions (cations) drift towards the negative electrode, the cathode, and the negative Cl⁻ ions (anions) towards the positive electrode, the anode.",
        to: { ".na": { x: (i, el) => +el.dataset.fx, y: (i, el) => +el.dataset.fy, stagger: 0.06 }, ".cl": { x: (i, el) => +el.dataset.fx, y: (i, el) => +el.dataset.fy, stagger: 0.06 } }, dur: 1.4,
        text: { "#tag": "ions drift to the electrode of opposite charge" } },
      { caption: "At the cathode, sodium ions gain electrons (reduction) and turn into sodium metal. At the anode, chloride ions lose electrons (oxidation) and become chlorine gas. Reduction at the cathode, oxidation at the anode, as always.",
        footnote: "The reaction is driven uphill: it needs a voltage of at least about 4.07 V, from the difference between the two electrode potentials.",
        booklet: "§19: Na⁺ + e⁻ → Na −2.71 V; ½Cl₂ + e⁻ → Cl⁻ +1.36 V.",
        to: { "#products": { opacity: 1 }, "#eqs": { opacity: 1, delay: 0.3 } }, text: { "#tag": "sodium at the cathode, chlorine at the anode" } }
    ]
  });
})();
;
/* ---- pages/r3-13-organic-redox.js ---- */
// Oxidizing and reducing organic molecules: ethanol -> ethanal -> ethanoic acid with acidified dichromate(VI),
// and the reduction of ethene by hydrogen. Skeletal formulas.

(() => {
  const K = Kit, C = K.C;
  const red = (x, y, s) => K.t(x, y, s, "atom-name", 'style="fill:#D2352C;font-size:22px"');
  const ethanol = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(0, -14, 50, 20, "var(--ink)", 6, "") + red(70, 42, "OH");
  const ethanal = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(-3, -18, 48, 14, "var(--ink)", 4, "") + K.l(4, -10, 55, 24, "var(--ink)", 4, "") + red(64, 44, "O");
  const acid = K.l(-62, 22, 0, -14, "var(--ink)", 6, "") + K.l(-5, -14, -5, -62, "var(--ink)", 4, "") + K.l(5, -14, 5, -62, "var(--ink)", 4, "") + K.l(0, -14, 50, 20, "var(--ink)", 6, "") + red(0, -78, "O") + red(70, 42, "OH");
  const ethene = K.l(-45, -5, 45, -5, "var(--ink)", 6, "") + K.l(-45, 7, 45, 7, "var(--ink)", 6, "");
  const ethane = K.l(-45, 0, 45, 0, "var(--ink)", 6, "");
  const cap = (t, s) => K.t(0, 90, t, "molecule-label") + K.t(0, 116, s, "graph-label");

  const svg = `
    ${K.g("m1", 210, 200, ethanol + cap("ethanol", "alcohol"))}
    ${K.g("m2", 500, 200, ethanal + cap("ethanal", "aldehyde"), "", 'opacity="0"')}
    ${K.g("m3", 790, 200, acid + cap("ethanoic acid", "carboxylic acid"), "", 'opacity="0"')}
    <g id="ar1" opacity="0">${K.arrow(300, 190, 420, 190, "var(--ink)", 5)}${K.t(360, 165, "[O]", "atom-name", 'style="font-size:22px"')}</g>
    <g id="ar2" opacity="0">${K.arrow(590, 190, 710, 190, "var(--ink)", 5)}${K.t(650, 165, "[O]", "atom-name", 'style="font-size:22px"')}</g>
    <g id="reag" opacity="0"><circle id="chip" cx="330" cy="372" r="13" fill="#E0791F" stroke="var(--ink)" stroke-width="2"/>${K.t(360, 378, "acidified potassium dichromate(VI): orange → green", "graph-label", 'style="text-anchor:start"')}</g>
    ${K.g("m4", 260, 200, ethene + K.t(0, 90, "ethene", "molecule-label"), "", 'opacity="0"')}
    ${K.g("m5", 740, 200, ethane + K.t(0, 90, "ethane", "molecule-label"), "", 'opacity="0"')}
    <g id="ar3" opacity="0">${K.arrow(340, 195, 660, 195, "var(--ink)", 5)}${K.t(500, 168, "H₂, nickel catalyst", "molecule-label")}</g>`;

  K.page({
    id: "organic-redox",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Oxidizing and reducing organic molecules",
    description: "A skeletal drawing of ethanol, an alcohol. Tapping adds an arrow marked oxygen and ethanal, an aldehyde, with a coloured dot for the orange dichromate turning green. Tapping again adds an arrow to ethanoic acid, a carboxylic acid. Tapping a last time swaps these for the reduction of ethene, a double bond, to ethane, a single bond, with hydrogen and a nickel catalyst.",
    svg, bounds: [120, 80, 900, 450], tapLabel: "Tap to oxidize, then reduce",
    steps: [
      { caption: "Organic molecules can be oxidized and reduced too. Ethanol is a primary alcohol. Heat it with an oxidizing agent, acidified potassium dichromate(VI), and it's oxidized.",
        footnote: "[O] is a shorthand for the oxygen supplied by the oxidizing agent." },
      { caption: "First it loses hydrogen to become ethanal, an aldehyde. The orange dichromate(VI) ions are reduced to green chromium(III) ions, which is how you can tell it happened.",
        to: { "#m2": { opacity: 1, delay: 0.3 }, "#ar1": { opacity: 1 }, "#reag": { opacity: 1 }, "#chip": { fill: "#3E9B57", delay: 0.8 } }, dur: 1.0 },
      { caption: "Keep heating with more oxidizing agent (under reflux, so nothing escapes) and the aldehyde gains an oxygen to become ethanoic acid, a carboxylic acid. Each step is an oxidation.",
        footnote: "A secondary alcohol is oxidized to a ketone and stops there.",
        to: { "#m3": { opacity: 1, delay: 0.3 }, "#ar2": { opacity: 1 } }, dur: 1.0 },
      { caption: "Reduction goes the other way, by gaining hydrogen. Ethene, with a C=C double bond, reacts with hydrogen over a nickel catalyst to give ethane: the double bond is gone, so the degree of unsaturation is lowered.",
        to: { "#m1": { opacity: 0 }, "#m2": { opacity: 0 }, "#m3": { opacity: 0 }, "#ar1": { opacity: 0 }, "#ar2": { opacity: 0 }, "#reag": { opacity: 0 },
              "#m4": { opacity: 1, delay: 0.5 }, "#ar3": { opacity: 1, delay: 0.5 }, "#m5": { opacity: 1, delay: 0.9 } }, dur: 1.0 }
    ]
  });
})();
;
/* ---- pages/r3-14-radicals.js ---- */
// Radicals: UV light splits Cl2 by homolytic fission into two chlorine radicals, which then carry a chain
// reaction with methane (propagation) until two radicals meet (termination).

(() => {
  const K = Kit, C = K.C;
  const dot = (x, y, cls) => `<circle class="${cls}" cx="${x}" cy="${y}" r="6" fill="${C.heat}" opacity="0"/>`;
  const wave = `<path d="M 500 70 l 12 12 l -24 12 l 24 12 l -24 12 l 12 12" fill="none" stroke="#6A2BD9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${K.arrow(500, 128, 500, 150, "#6A2BD9", 5)}`;
  const svg = `
    <line id="bond" class="fade" x1="420" y1="200" x2="580" y2="200" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>
    ${K.atom("cl1", 420, 200, 36, "Cl", C.product)}${K.atom("cl2", 580, 200, 36, "Cl", C.product)}
    <g id="uv" class="fade">${wave}${K.t(545, 108, "UV light", "molecule-label", 'style="text-anchor:start;fill:#6A2BD9"')}</g>
    ${dot(338, 200, "rad")}${dot(662, 200, "rad")}
    <g id="prop" opacity="0">
      ${K.t(500, 310, "Cl• + CH₄ → HCl + •CH₃", "atom-name")}${K.t(500, 358, "•CH₃ + Cl₂ → CH₃Cl + Cl•", "atom-name")}
    </g>
    <g id="term" opacity="0">
      ${K.t(500, 310, "Cl• + Cl• → Cl₂", "molecule-label")}${K.t(500, 346, "•CH₃ + •CH₃ → C₂H₆", "molecule-label")}${K.t(500, 382, "•CH₃ + Cl• → CH₃Cl", "molecule-label")}
    </g>
    ${K.t(500, 440, "chlorine molecule, Cl₂", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "radicals",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Radicals: a lone electron looking for trouble",
    description: "A chlorine molecule, two green atoms joined by a line, with a purple zigzag arrow of UV light shining on it. Tapping breaks the bond: the two atoms move apart and each gets an orange dot, an unpaired electron: chlorine radicals. Tapping again lists the two propagation steps, where a chlorine radical takes a hydrogen from methane and the resulting methyl radical takes a chlorine from another chlorine molecule, making more chlorine radicals. A last tap lists termination steps, where two radicals meet.",
    svg, bounds: [280, 60, 720, 460], tapLabel: "Tap to follow the chain reaction",
    steps: [
      { caption: "A radical is a species with an unpaired electron, which makes it very reactive. They can be made by shining UV light on a chlorine molecule, which has enough energy to break the Cl–Cl bond.",
        footnote: "The chlorination of methane in sunlight is the standard example of a radical substitution." },
      { caption: "The bond breaks evenly, with one electron going to each atom. That's homolytic fission, and it leaves two chlorine radicals, Cl•, each with an unpaired electron (shown as a dot).",
        to: { "#cl1": { x: 300 }, "#cl2": { x: 700 }, "#bond": { opacity: 0 }, "#uv": { opacity: 0 }, ".rad": { opacity: 1, delay: 0.9 } }, text: { "#tag": "two chlorine radicals, Cl•" }, dur: 1.2 },
      { caption: "Now the chain reaction. A chlorine radical takes a hydrogen atom from methane, making HCl and a methyl radical. The methyl radical then takes a chlorine atom from a chlorine molecule, making chloromethane and a new chlorine radical, which can start the cycle again. That's propagation.",
        to: { "#prop": { opacity: 1 }, ".rad": { opacity: 0 }, "#cl1": { opacity: 0 }, "#cl2": { opacity: 0 } }, text: { "#tag": "propagation: radical in, radical out" }, dur: 0.8 },
      { caption: "The chain ends when two radicals meet and pair up their electrons, leaving no radical behind. That's termination. Each of these is rare, since radicals are few and far between, so a single chain can run for thousands of cycles first.",
        to: { "#prop": { opacity: 0 }, "#term": { opacity: 1 } }, text: { "#tag": "termination: two radicals combine" }, dur: 0.8 }
    ]
  });
})();
;
/* ---- pages/r3-15-nucleophilic-substitution.js ---- */
// Nucleophilic substitution: hydroxide attacks the δ+ carbon of bromoethane, and the C–Br bond breaks so
// that bromine takes both electrons (heterolytic fission). Curly arrows show the movement of electron pairs.

(() => {
  const K = Kit, C = K.C;
  const BR = "#9C4A2A";
  // A curly arrow: a curve with a small arrowhead on the end, following the curve's final direction.
  function curly(x1, y1, cx, cy, x2, y2) {
    const a = Math.atan2(y2 - cy, x2 - cx), h = 13;
    const p = d => `${(x2 - Math.cos(a + d) * h).toFixed(1)},${(y2 - Math.sin(a + d) * h).toFixed(1)}`;
    return `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round"/><polygon points="${x2},${y2} ${p(0.5)} ${p(-0.5)}" fill="${C.heat}"/>`;
  }
  const hAt = (id, x, y) => K.g(id, x, y, `<circle r="15" fill="${C.pale}"/><text class="nuc-sym" style="fill:#1B1A22;font-size:14px">H</text>`);
  const svg = `
    ${K.l(480, 235, 430, 300, "var(--ink)", 6, 'class="fade"')}${K.l(480, 235, 480, 320, "var(--ink)", 6, 'class="fade"')}${K.l(480, 235, 530, 300, "var(--ink)", 6, 'class="fade"')}
    ${K.l(480, 235, 640, 235, "var(--ink)", 6, 'id="cbr" class="fade"')}
    <line id="newBond" x1="352" y1="235" x2="470" y2="235" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    ${hAt("hA", 482, 330)}${hAt("hB", 536, 308)}
    ${K.atom("me", 424, 308, 30, "CH₃", C.grey)}
    ${K.atom("cc", 480, 235, 24, "C", C.grey)}
    ${K.g("br", 650, 235, `<circle r="32" fill="${BR}"/><text id="brT" class="nuc-sym" style="font-size:22px">Br</text>`)}
    ${K.g("oh", 190, 235, `<circle r="32" fill="${C.proton}"/><text id="ohT" class="nuc-sym" style="font-size:20px">OH⁻</text><circle cx="40" cy="-6" r="4.5" fill="#fff"/><circle cx="40" cy="6" r="4.5" fill="#fff"/>`)}
    <g id="dl"><g class="fade">${K.t(500, 190, "δ+", "molecule-label")}${K.t(645, 188, "δ−", "molecule-label")}</g></g>
    <g id="curly" opacity="0">${curly(238, 224, 340, 130, 448, 214)}${curly(560, 222, 606, 176, 630, 208)}</g>
    ${K.t(500, 420, "bromoethane, and hydroxide ions in solution", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "nucleophilic-substitution",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Nucleophilic substitution",
    description: "A bromoethane molecule: a grey carbon in the middle joined to a brown bromine atom on the right, a CH3 group and two hydrogens, with delta plus over the carbon and delta minus over the bromine. A red hydroxide ion approaches from the left. Tapping draws two curly arrows: one from the hydroxide's lone pair to the carbon, one from the carbon-bromine bond to the bromine. Tapping again shows the products: hydroxide now joined to the carbon as ethanol, and a bromide ion leaving.",
    svg, bounds: [140, 130, 720, 450], tapLabel: "Tap to follow the electrons",
    steps: [
      { caption: "In bromoethane the C–Br bond is polar: bromine is more electronegative, so the carbon is slightly positive (δ+). A nucleophile, a species with a lone pair to donate, is attracted to a δ+ carbon. Hydroxide ions are nucleophiles.",
        footnote: "In this drawing hydroxide comes in from the side opposite the bromine, which is where it has to attack from." },
      { caption: "Curly arrows show electrons moving. One arrow goes from hydroxide's lone pair to the carbon, forming a new C–O bond. Another goes from the C–Br bond to bromine, showing the bond breaking with both its electrons going to bromine.",
        to: { "#curly": { opacity: 1 } }, text: { "#tag": "each curly arrow is a pair of electrons moving" }, dur: 0.8 },
      { caption: "The hydroxide has replaced the bromine: ethanol and a bromide ion, Br⁻. That's nucleophilic substitution. The bond broke unevenly, one atom keeping both electrons, which is called heterolytic fission (unlike the even split in radicals).",
        to: { "#curly": { opacity: 0 }, "#dl": { opacity: 0 }, "#oh": { x: 322 }, "#newBond": { opacity: 1, delay: 1.0 }, "#br": { x: 800, y: 190 }, "#cbr": { opacity: 0 } },
        text: { "#ohT": "OH", "#brT": "Br⁻", "#tag": "ethanol, CH₃CH₂OH, and a bromide ion" }, dur: 1.4 }
    ]
  });
})();
;
/* ---- pages/r3-16-electrophilic-addition.js ---- */
// Electrophilic addition: ethene + Br2. The electron-rich C=C attacks the δ+ end of an approaching bromine
// molecule; the Br–Br bond breaks heterolytically; the bromide ion then attacks the carbocation.

(() => {
  const K = Kit, C = K.C;
  const BR = "#9C4A2A";
  function curly(x1, y1, cx, cy, x2, y2) {
    const a = Math.atan2(y2 - cy, x2 - cx), h = 13;
    const p = d => `${(x2 - Math.cos(a + d) * h).toFixed(1)},${(y2 - Math.sin(a + d) * h).toFixed(1)}`;
    return `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${C.heat}" stroke-width="4.5" stroke-linecap="round"/><polygon points="${x2},${y2} ${p(0.5)} ${p(-0.5)}" fill="${C.heat}"/>`;
  }
  const svg = `
    <ellipse id="pi" class="fade" cx="500" cy="262" rx="100" ry="34" fill="${C.violet}" fill-opacity="0.18"/>
    ${K.l(430, 256, 570, 256, "var(--ink)", 6, 'id="d1" class="fade"')}${K.l(430, 268, 570, 268, "var(--ink)", 6, 'id="d2" class="fade"')}
    <line id="cBr1" x1="430" y1="262" x2="430" y2="170" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    <line id="cBr2" x1="570" y1="262" x2="570" y2="170" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" opacity="0"/>
    ${K.atom("c1", 430, 262, 26, "CH₂", C.grey)}${K.atom("c2", 570, 262, 26, "CH₂", C.grey)}
    ${K.l(500, 100, 500, 150, "var(--ink)", 6, 'id="brBond" class="fade"')}
    ${K.g("brA", 500, 150, `<circle r="26" fill="${BR}"/><text class="nuc-sym" style="font-size:20px">Br</text>`)}
    ${K.g("brB", 500, 84, `<circle r="26" fill="${BR}"/><text id="brBT" class="nuc-sym" style="font-size:20px">Br</text>`)}
    <g id="dl" class="fade">${K.t(548, 156, "δ+", "molecule-label")}${K.t(548, 90, "δ−", "molecule-label")}</g>
    <g id="curly" opacity="0">${curly(500, 240, 470, 200, 484, 168)}${curly(512, 128, 560, 112, 528, 90)}</g>
    ${K.t(612, 236, "+", "atom-name", 'id="plus" opacity="0" style="font-size:36px"')}
    ${K.t(500, 420, "ethene and bromine approaching", "molecule-label fade", 'id="tag"')}`;

  K.page({
    id: "electrophilic-addition",
    topic: "Reactivity 3 — What are the mechanisms of chemical change?",
    title: "Electrophilic addition to alkenes",
    description: "Ethene drawn as two CH2 groups joined by a double bond with a purple cloud of pi electrons around it, and a bromine molecule approaching from above, its nearer atom marked delta plus and its far atom delta minus. Tapping draws two curly arrows: from the pi bond to the near bromine, and from the bromine-bromine bond to the far bromine. Tapping again shows the bromide ion leaving, a bromine joined to one carbon and a plus sign on the other. A last tap shows the bromide ion joining the second carbon: 1,2-dibromoethane.",
    svg, bounds: [380, 50, 760, 450], tapLabel: "Tap to follow the electrons",
    steps: [
      { caption: "The C=C double bond in an alkene is a region of high electron density, the π bond. It attracts electron-poor species called electrophiles: species that accept a pair of electrons. Here a bromine molecule approaches; the alkene's electrons push the electrons in the Br–Br bond away, so the nearer bromine becomes δ+.",
        footnote: "Bromine on its own is non-polar. It's the approaching alkene that makes it polar." },
      { caption: "Curly arrows: the pair of electrons in the π bond attacks the δ+ bromine, and the Br–Br bond breaks with both its electrons going to the far bromine. The far bromine leaves as a bromide ion, Br⁻.",
        to: { "#curly": { opacity: 1 } }, dur: 0.7 },
      { caption: "Now one carbon is joined to a bromine, and the other has lost its share of the π electrons: it's a carbocation, with a positive charge and only three bonds.",
        to: { "#curly": { opacity: 0 }, "#brA": { x: 430, y: 170 }, "#brBond": { opacity: 0 }, "#dl": { opacity: 0 }, "#pi": { opacity: 0 }, "#d2": { opacity: 0 }, "#cBr1": { opacity: 1, delay: 0.9 }, "#brB": { x: 720, y: 130, delay: 0.3 }, "#plus": { opacity: 1, delay: 0.9 } },
        text: { "#brBT": "Br⁻", "#tag": "a carbocation, and a bromide ion leaving" }, dur: 1.4 },
      { caption: "The negative bromide ion is attracted to the positive carbocation and uses a lone pair to bond to it. The result is 1,2-dibromoethane: bromine has added across the double bond. This reaction is also the test for a C=C: bromine water is decolourized.",
        to: { "#brB": { x: 570, y: 170 }, "#cBr2": { opacity: 1, delay: 1.0 }, "#plus": { opacity: 0 } }, text: { "#brBT": "Br", "#tag": "1,2-dibromoethane" }, dur: 1.4 }
    ]
  });
})();
