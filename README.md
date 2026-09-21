# Not to Scale

An interactive picture book of IB Chemistry. Open `index.html` (double-click it). No install needed;
it needs internet the first time for the fonts and GSAP.

## How it's organised
- `index.html` — the page shell. Lists the page files at the bottom.
- `js/engine.js` — runs the book: page turns, Back/Next/Replay, keyboard arrows, page counter,
  contents page, captions, attention chime, tappable things.
- `js/camera.js` — zooming. `js/sound.js` — the four synthesised sounds. `js/lab.js` — the sound lab.
- `pages/01-hydrogen.js` — the first page. Every page is one file like this.
- `pages/00-planned.js` — the plan for the whole book (shown as "coming soon" on the contents page).
- `pages/_template.js` — copy this to start a new page.
- `FACTS.md` — every fact shown on screen and where it was checked. `BUILDLOG.md` — what was built when.

## Adding a page
1. Copy `pages/_template.js` to `pages/02-something.js`.
2. Change `id`, `title`, `topic`, the captions and the drawing. (Same `title` and `topic` as a line in
   `pages/00-planned.js` switches that "coming soon" line on.)
3. Add `<script src="pages/02-something.js"></script>` to `index.html`, after the hydrogen page.
4. Refresh the browser.

The drawing is SVG on a 1000 x 480 canvas. A page is a list of *states* (for example: start, zoomed in,
revealed). Each state has a caption and says what Next, Back, Replay or tapping a hotspot does.
