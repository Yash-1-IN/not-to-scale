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
