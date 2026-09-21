// TEMPLATE for a new page. This file is NOT loaded by the book.
//
// To add a page:
//   1. Copy this file to pages/02-something.js  (the number is just for tidiness)
//   2. Change `id` (must be unique), `title`, and `topic`. To make it replace a "coming soon" line
//      on the contents page, use exactly the same title and topic as in pages/00-planned.js.
//   3. Change the captions and the drawing.
//   4. Add one line to index.html, after the other pages:
//        <script src="pages/02-something.js"></script>
//   5. Refresh the browser.
//
// Read the numbers in the drawing as positions on a 1000 wide by 480 tall canvas.

Book.register({
  id: "template",
  topic: "Structure 1 — Models of the particulate nature of matter",
  title: "A tiny example page",
  description: "A blue circle. Tapping it makes it grow.",   // read out by screen readers

  // The drawing. Anything with class="fade" fades in when the page appears.
  svg: `
    <circle class="fade" id="dot" cx="500" cy="240" r="50" fill="#0B44A8"/>
    <circle class="hit" id="dotHit" cx="500" cy="240" r="90"/>   <!-- invisible, this is what gets tapped -->
  `,

  // Tappable things. `selector` points at the invisible circle above.
  hotspots: [{ id: "dot", selector: "#dotHit", label: "Tap the circle" }],

  start: "first",           // the state the page begins in
  states: {
    first: {
      caption: "This is a circle. Tap it.",
      // Tapping the hotspot moves to the "second" state and runs this animation:
      tap: {
        hotspot: "dot", to: "second", sound: "pop",
        play: () => gsap.to("#dot", { attr: { r: 110 }, duration: 0.8, ease: "back.out(2)" })
      }
    },
    second: {
      caption: "Now it's a bigger circle.",
      footnote: "Small notes in the 'not to scale' voice go here.",
      final: true            // the last state of the page: Next now turns to the next page
    }
  }
});
