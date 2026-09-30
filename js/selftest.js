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

    gsap.globalTimeline.timeScale(1);
    clearInterval(pump);
    Sound.setMuted(wasMuted);
    report.pass = report.pages.every(p => !p.problems.length) && opened && returned;
    window.__selftest = report;
    panel.update(report, true);
    console.log("Self-test " + (report.pass ? "PASS" : "FAIL"), report);
  }

  window.addEventListener("load", () => setTimeout(run, 100));
})();
