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
  // Book.plan() appends, so each subject's plan file can add its own topics. A topic's `subject` is
  // "chemistry" (the default when missing) or "physics"; a page belongs to the subject of its topic.
  function setPlan(list) { plan = plan.concat(list); list.forEach(t => topicSubject.set(t.topic, t.subject || "chemistry")); }
  const SUBJECTS = [["chemistry", "Chemistry"], ["physics", "Physics"]];
  const subjectName = s => (SUBJECTS.find(x => x[0] === s) || [s, s])[1];
  const topicSubject = new Map();
  const subjectOf = p => (p && topicSubject.get(p.topic)) || "chemistry";
  // The pages of one subject are contiguous in the book (sortByPlan puts them in plan order).
  const subjectStart = s => pages.findIndex(p => subjectOf(p) === s);
  const subjectCount = s => pages.filter(p => subjectOf(p) === s).length;
  const subjectEnd = s => pages.length - 1 - [...pages].reverse().findIndex(p => subjectOf(p) === s);
  const lastOfSubject = () => pageIndex >= subjectEnd(subjectOf(page()));
  const firstOfSubject = () => pageIndex <= subjectStart(subjectOf(page()));
  let shownSubject = "chemistry";     // which tab the contents page is showing

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
  // Next on a subject's last page opens that subject's contents (it never rolls over into the other subject);
  // Back on a subject's first page has nothing to go back to.
  const canNext = () => !!state().next || !!state().final;
  const canBack = () => !!state().back || !firstOfSubject(); // no `back` defined: Back turns to the previous page

  function updateUI() {
    const s = started ? state() : null;
    el.nextBtn.hidden = !started || !canNext();
    el.backBtn.hidden = !started || !canBack();
    el.replayBtn.hidden = !started || !s.replay;
    [el.nextBtn, el.backBtn, el.replayBtn].forEach(b => { b.disabled = busy; });
    el.topbar.hidden = !started;
    const sub = subjectOf(page()), first = subjectStart(sub);
    el.counter.textContent = pageIndex - first + 1 + " / " + subjectCount(sub) + " · " + subjectName(sub);
    el.nextBtn.textContent = started && state().final && !state().next && lastOfSubject() ? "Contents" : "Next →";
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
      if (kind === "next" && s.final) { if (lastOfSubject()) openContents(subjectOf(p)); else turnPage(pageIndex + 1); }
      else if (kind === "back" && !firstOfSubject()) turnPage(pageIndex - 1);
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

  // A plan item is a title, or [title, syllabus code] — the code is shown beside it. The contents page has one
  // tab per subject; each tab lists that subject's topics, with "coming soon" for pages not built yet.
  function buildContents() {
    const topics = plan.map(t => ({
      name: t.topic,
      subject: t.subject || "chemistry",
      items: t.items.map(item => {
        const [title, code] = [].concat(item);
        return { title, code, index: pages.findIndex(p => p.title === title && p.topic === t.topic) };
      })
    }));
    pages.forEach((p, i) => {
      if (topics.some(t => t.items.some(it => it.index === i))) return;
      let t = topics.find(x => x.name === p.topic);
      if (!t) { t = { name: p.topic || "Other", subject: subjectOf(p), items: [] }; topics.push(t); }
      t.items.push({ title: p.title, index: i });
    });

    el.tocBody.innerHTML = "";
    const tabs = document.createElement("div");
    tabs.className = "toc-tabs"; tabs.setAttribute("role", "tablist");
    SUBJECTS.forEach(([sub, label]) => {
      const tab = document.createElement("button");
      tab.type = "button"; tab.className = "toc-tab"; tab.dataset.subject = sub; tab.id = "tab-" + sub;
      tab.setAttribute("role", "tab"); tab.textContent = label;
      tab.addEventListener("click", () => showSubject(sub, true));
      tabs.appendChild(tab);
      const section = document.createElement("div");
      section.className = "toc-subject"; section.dataset.subject = sub; section.hidden = true;
      section.setAttribute("role", "tabpanel"); section.setAttribute("aria-labelledby", tab.id);
      const first = subjectStart(sub);
      topics.filter(t => t.subject === sub).forEach(t => {
        const h = document.createElement("h3");
        h.textContent = t.name;
        const ul = document.createElement("ul");
        t.items.forEach(it => {
          const li = document.createElement("li");
          if (it.index >= 0) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "toc-item";
            b.textContent = it.index - first + 1 + ". " + it.title;
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
        section.append(h, ul);
      });
      el.tocBody.appendChild(section);
    });
    el.tocBody.parentNode.insertBefore(tabs, el.tocBody);
    showSubject(shownSubject);
  }
  function showSubject(sub, fromTab) {
    shownSubject = sub;
    document.querySelectorAll(".toc-tab").forEach(t => {
      const on = t.dataset.subject === sub;
      t.setAttribute("aria-selected", on); t.classList.toggle("active", on); t.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".toc-subject").forEach(s => { s.hidden = s.dataset.subject !== sub; });
    emit("subject", sub);
    if (fromTab) emit("contents");
  }
  function openContents(sub) {
    showSubject(sub || subjectOf(page()));
    el.contents.hidden = false;
    emit("contents");
    el.page.setAttribute("inert", "");
    el.nav.setAttribute("inert", "");
    const first = el.tocBody.querySelector(".toc-subject:not([hidden]) button") || document.querySelector(".toc-tab.active");
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
  function startBook(then) {
    el.page.removeAttribute("inert");
    const p = page();

    const finish = () => {
      started = true;
      emit("show", pageIndex);
      if (p.idle && !reduceMotion) p.idle(ctx);
      enterState(p.start);
      if (then) then();
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
      "topbar", "counter", "contentsBtn", "contents", "tocBody", "mute", "cover", "openBook", "openPhysics", "lab", "labLink", "labClose",
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

    // The cover has one button per subject. A link to a page (#ionic, #p-orbits) opens at that page, unless the
    // button chosen is the other subject's, which opens at its first page. A subject with no pages yet opens
    // straight onto its contents.
    const openSubject = sub => {
      Sound.unlock();
      const first = subjectStart(sub);
      if (first >= 0 && subjectOf(page()) !== sub) { unloadPage(); loadPage(first); writeHash(first); }
      const then = first < 0 ? () => openContents(sub) : null;
      if (reduceMotion) { el.cover.hidden = true; startBook(then); return; }
      playSound("page");
      gsap.to(el.cover, { opacity: 0, duration: 0.6, onComplete: () => { el.cover.hidden = true; startBook(then); } });
    };
    el.openBook.addEventListener("click", () => openSubject("chemistry"));
    el.openPhysics.addEventListener("click", () => openSubject("physics"));
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

  // Which subject the reader is in: the contents tab while Contents is open, otherwise the current page's.
  const activeSubject = () => (el.contents && !el.contents.hidden ? shownSubject : subjectOf(pages[pageIndex]));

  return { register, plan: setPlan, boot, pages, debug, on, goTo, subjects: SUBJECTS, subjectOf, subjectName, subjectStart, subjectEnd, subjectCount, activeSubject };
})();
