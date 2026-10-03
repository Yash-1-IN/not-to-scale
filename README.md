# Not to Scale

An interactive picture book of IB Chemistry, 84 pages following the school's G12 chemistry syllabus, from states of matter and the hydrogen atom
to organic reaction mechanisms. Open `index.html` (double-click it). No install needed; it needs internet the first time
for the fonts and GSAP.

- **Link to one page:** add `#` and the page's id, e.g. `index.html#ionic` or
  `https://your-username.github.io/not-to-scale/#maxwell`. The browser's Back button turns pages too.
- **Check everything still works:** open `index.html?test`. The book taps through every page on its
  own, sped up, and shows PASS or a list of problems in the corner. Takes about 15 seconds.

## How it's organised
- `index.html` — the page shell. Lists the page files at the bottom.
- `js/engine.js` — runs the book: page turns, Back/Next/Replay, keyboard arrows, page counter,
  contents page, About panel, captions, attention chime, tappable things.
- `js/camera.js` — zooming. `js/hint.js` — the gold "tap this" ring, shared by every page.
  `js/particles.js` — the bouncing-particle-box physics shared by a few pages.
  `js/selftest.js` — the automated test (only runs with `?test` in the address).
  `js/sound.js` — the four synthesised sounds. `js/lab.js` — the sound lab.
- `pages/01-hydrogen.js` — the first page. Every page is one file like this; see `pages/` for the rest.
- `pages/00-planned.js` — the plan for the whole book (shown as "coming soon" on the contents page for
  anything not yet written).
- `pages/_template.js` — copy this to start a new page.
- `FACTS.md` — every fact shown on screen and where it was checked. `BUILDLOG.md` — what was built when.
- `PROJECT.md` — the full handover: how everything works, lessons learned, known issues, ideas.

## Adding a page
0. Shortcut: most pages are written with the shared toolkit in `js/kit.js` (`Kit.page({...})`: an SVG
   string plus a list of steps). Copy a small page such as `pages/r3-02-ph-scale.js` to start.
1. Copy `pages/_template.js` to `pages/02-something.js`.
2. Change `id`, `title`, `topic`, the captions and the drawing. (Same `title` and `topic` as a line in
   `pages/00-planned.js` switches that "coming soon" line on.)
3. Add `<script src="pages/02-something.js"></script>` to `index.html`, after the hydrogen page.
4. Refresh the browser.

The drawing is SVG on a 1000 x 480 canvas. A page is a list of *states* (for example: start, zoomed in,
revealed). Each state has a caption and says what Next, Back, Replay or tapping a hotspot does.


