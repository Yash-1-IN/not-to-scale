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
