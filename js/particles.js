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
