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
  let capCur = 0;                   // which of the two caption layers is showing
  const chimed = new Set();
  const el = {};

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
  const captionHTML = s => "<p>" + s.caption + "</p>" + (s.footnote ? '<p class="footnote">' + s.footnote + "</p>" : "");

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

    (page().hotspots || []).forEach(h => {
      const e = ctx.hotspotEls[h.id];
      if (!e) return;
      const on = started && !busy && s.tap && s.tap.hotspot === h.id;
      e.setAttribute("tabindex", on ? "0" : "-1");
      e.style.pointerEvents = on ? "auto" : "none";
    });
  }

  function startHints() {
    const s = state();
    (page().hotspots || []).forEach(h => {
      if (s.tap && s.tap.hotspot === h.id && h.hint) h.hint.start(ctx, false);
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
    const tr = kind === "tap" ? s.tap : s[kind];

    if (!tr) {
      if (kind === "next" && s.final) turnPage(pageIndex + 1);
      else if (kind === "back") turnPage(pageIndex - 1);
      return;
    }
    if (kind === "tap" && tr.hotspot !== hotspotId) return;

    busy = true;
    clearAttention();
    stopHints();
    updateUI();
    if (tr.before) tr.before(ctx);

    const targetName = typeof tr.to === "function" ? tr.to(ctx) : tr.to;
    const target = p.states[targetName];
    const out = tr.captionOut ?? 0;
    const at = tr.captionAt ?? 0.3;

    playSound(tr.sound);
    const tl = gsap.timeline({ onComplete: () => { busy = false; enterState(targetName); } });
    ctx.track(tl);
    if (tr.play) tl.add(tr.play(ctx), 0);
    addCaptionSwap(tl, target, out, at);

    const hadLegend = s.legend !== false && !!p.legend;
    const wantLegend = target.legend !== false && !!p.legend;
    if (hadLegend !== wantLegend) tl.to(el.legend, { opacity: wantLegend ? 1 : 0, duration: 0.5 }, wantLegend ? at : 0);

    if (reduceMotion) tl.timeScale(12); // zooms become quick crossfades
  }

  // ---------- Page turns ----------
  function turnPage(index) {
    if (busy || index < 0 || index >= pages.length || index === pageIndex) return;
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
        const tl = gsap.timeline({ onComplete: () => { busy = false; if (p.idle) p.idle(ctx); enterState(p.start); } });
        tl.to(el.capA, { opacity: 1, duration: 0.7 }, 0);
        tl.add(p.intro ? p.intro(ctx) : defaultIntro(), 0.2);
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
    const kind = s.tap ? "tap" : canNext() ? "next" : null;
    const key = page().id + ":" + stateName;
    if (!kind || chimed.has(key)) return;
    idleTimer = setTimeout(() => {
      chimed.add(key);
      Sound.tindin();
      if (kind === "tap") {
        const h = (page().hotspots || []).find(x => x.id === s.tap.hotspot);
        if (h && h.hint) h.hint.start(ctx, true);
      } else {
        el.nextBtn.classList.add("attn");
      }
    }, 8000);
  }

  // ---------- Contents page ----------
  function buildContents() {
    const topics = plan.map(t => ({
      name: t.topic,
      items: t.items.map(title => ({ title, index: pages.findIndex(p => p.title === title && p.topic === t.topic) }))
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
          b.addEventListener("click", () => { closeContents(); turnPage(it.index); });
          li.appendChild(b);
        } else {
          li.className = "toc-soon";
          li.textContent = it.title;
          const tag = document.createElement("span");
          tag.textContent = " coming soon";
          li.appendChild(tag);
        }
        ul.appendChild(li);
      });
      el.tocBody.append(h, ul);
    });
  }
  function openContents() {
    el.contents.hidden = false;
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

  // ---------- Opening the book ----------
  function startBook() {
    el.page.removeAttribute("inert");
    const p = page();

    const finish = () => {
      started = true;
      if (p.idle) p.idle(ctx);
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
      .add(p.intro ? p.intro(ctx) : defaultIntro(), "-=0.1");
    if (p.legend) tl.to(el.legend, { opacity: 1, duration: 0.5 }, "-=0.2");
  }

  // ---------- Setup ----------
  function boot() {
    ["scene", "page", "title", "captions", "capA", "capB", "legend", "nav", "backBtn", "nextBtn", "replayBtn",
      "topbar", "counter", "contentsBtn", "contents", "tocBody", "mute", "cover", "openBook", "lab", "labLink", "labClose"
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
    document.addEventListener("keydown", e => {
      if (!started) return;
      if (e.key === "Escape") { if (!el.contents.hidden) closeContents(); return; }
      if (!el.lab.hidden || !el.contents.hidden) return;
      if (e.key === "ArrowRight") go("next");
      else if (e.key === "ArrowLeft") go("back");
    });
    ["pointerdown", "keydown"].forEach(evt => document.addEventListener(evt, armAttention));

    if (!pages.length) { console.warn("No pages registered."); return; }
    buildContents();
    loadPage(0);

    el.openBook.addEventListener("click", () => {
      Sound.unlock();
      if (reduceMotion) { el.cover.hidden = true; startBook(); return; }
      playSound("page");
      gsap.to(el.cover, { opacity: 0, duration: 0.6, onComplete: () => { el.cover.hidden = true; startBook(); } });
    });
  }

  return { register, plan: setPlan, boot, pages };
})();
