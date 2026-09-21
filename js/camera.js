// The "camera": zooms are just scale transforms on SVG groups, so every page zooms the same way.

const Camera = (() => {
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // Zoom a group in or out around a point. Returns the tween.
  //   Camera.zoomTo("#cam", { scale: 5, origin: "470 240" })
  // Give `center: [x, y]` to also slide the zoom point to that spot on screen; leave it out to zoom in place.
  // (The maths is done here with a fixed "0 0" origin, so zooming to different points one after another is safe.)
  function zoomTo(target, { scale = 1, origin = "470 240", center = null, duration = 1.8, ease = "power2.inOut" } = {}) {
    const [ox, oy] = origin.split(" ").map(Number);
    const [cx, cy] = center || [ox, oy];
    return gsap.to(target, { scale, svgOrigin: "0 0", x: cx - scale * ox, y: cy - scale * oy, duration, ease });
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
