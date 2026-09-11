/* Live backdrop: soft drifting coin-glints rising through a dark green field. */
(function () {
  const canvas = document.getElementById("backdrop-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w, h, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  const COUNT = Math.round((window.innerWidth < 700 ? 26 : 46));
  const particles = Array.from({ length: COUNT }, () => spawn(true));

  function spawn(initial) {
    const r = 1.2 + Math.random() * 3.2;
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + r * 4,
      r,
      speed: 0.15 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.3,
      hue: Math.random() > 0.35 ? "mint" : "brass",
      alpha: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    };
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);

    // soft mesh glow blobs
    const g1 = ctx.createRadialGradient(w * 0.18, h * 0.15, 0, w * 0.18, h * 0.15, w * 0.55);
    g1.addColorStop(0, "rgba(60,203,127,0.10)");
    g1.addColorStop(1, "rgba(60,203,127,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(
      w * (0.8 + Math.sin(t * 0.0003) * 0.05),
      h * (0.75 + Math.cos(t * 0.0002) * 0.05),
      0,
      w * 0.8,
      h * 0.8,
      w * 0.5
    );
    g2.addColorStop(0, "rgba(201,162,39,0.08)");
    g2.addColorStop(1, "rgba(201,162,39,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // particles
    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.phase + t * 0.001) * p.drift;
      if (p.y < -10) Object.assign(p, spawn(false));

      const color = p.hue === "mint" ? "140,230,176" : "240,213,115";
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color},${p.alpha})`;
      ctx.shadowColor = `rgba(${color},${p.alpha})`;
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    t += 16;
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  if (reduceMotion) {
    draw(); // paint one static frame
  } else {
    requestAnimationFrame(draw);
  }
})();
