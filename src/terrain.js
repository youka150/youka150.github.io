const fineMotion = matchMedia(
  "(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)",
);

function elevation(x, y) {
  const westRidge = (x + .02 + .15 * Math.sin(y * 5 - 1)) / .43;
  const eastRidge = (x - .95 - .15 * Math.sin(y * 4.5)) / .47;
  const west = Math.exp(-(westRidge ** 2 + ((y - .33) / .62) ** 2));
  const east = Math.exp(-(eastRidge ** 2 + ((y - .72) / .65) ** 2));
  return west + .99 * east + .075 * Math.sin(x * 11 + y * 7) + .036 * Math.cos(x * 19 - y * 13);
}

// Interpolate each elevation where it crosses a cell edge (marching squares).
function traceContours(width, height) {
  const step = 12;
  const margin = 64;
  const columns = Math.ceil((width + margin * 2) / step) + 1;
  const rows = Math.ceil((height + margin * 2) / step) + 1;
  const samples = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      elevation((column * step - margin) / width, (row * step - margin) / height),
    ),
  );
  const levels = Array.from({ length: 15 }, (_, index) => .14 + index * .062);
  const bands = [[], []];

  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const x = column * step - margin;
      const y = row * step - margin;
      const a = samples[row][column];
      const b = samples[row][column + 1];
      const c = samples[row + 1][column + 1];
      const d = samples[row + 1][column];
      const min = Math.min(a, b, c, d);
      const max = Math.max(a, b, c, d);

      levels.forEach((level, index) => {
        if (level <= min || level > max) return;
        const edges = [];
        if ((a >= level) !== (b >= level)) edges.push([x + step * (level - a) / (b - a), y]);
        if ((b >= level) !== (c >= level)) edges.push([x + step, y + step * (level - b) / (c - b)]);
        if ((d >= level) !== (c >= level)) edges.push([x + step * (level - d) / (c - d), y + step]);
        if ((a >= level) !== (d >= level)) edges.push([x, y + step * (level - a) / (d - a)]);

        // For a saddle, use the center height to decide how to join the edges.
        if (edges.length === 4 && (a >= level) !== ((a + b + c + d) / 4 >= level)) {
          edges.push(edges.shift());
        }
        bands[Number(index % 4 === 0)].push(...edges.flat());
      });
    }
  }
  return bands;
}

export function setupTerrain() {
  const canvas = document.querySelector("#site-terrain");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let bands = [];
  let frame = 0;
  let previousTime = 0;
  const target = { x: 0, y: 0, active: false };
  const focus = { x: 0, y: 0, amount: 0 };
  const ripples = [];
  const rippleDuration = 920;

  function queueDraw() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    const ease = 1 - Math.exp(-Math.min(now - previousTime, 45) / 66);
    previousTime = now;
    focus.x += (target.x - focus.x) * ease;
    focus.y += (target.y - focus.y) * ease;
    focus.amount += (Number(target.active) - focus.amount) * ease;
    if (!target.active && focus.amount < .012) focus.amount = 0;
    while (ripples.length && now - ripples[0].started >= rippleDuration) ripples.shift();

    const waves = ripples.map((ripple) => {
      const age = Math.max(0, (now - ripple.started) / rippleDuration);
      return { x: ripple.x, y: ripple.y, reach: 16 + 310 * age, force: ripple.force * (1 - age) ** 2 };
    });
    const radius = Math.min(250, width * .22);
    const driftX = fineMotion.matches ? 22 * Math.sin(scrollY / 670) : 0;
    const driftY = fineMotion.matches ? 32 * Math.sin(scrollY / 1060) : 0;
    ctx.clearRect(0, 0, width, height);

    bands.forEach((points, band) => {
      const opacity = band ? .34 : .23;
      const ink = `rgba(111, 136, 108, ${opacity})`;
      ctx.strokeStyle = ink;
      if (focus.amount && radius > 12) {
        const tint = ctx.createRadialGradient(focus.x, focus.y, 12, focus.x, focus.y, radius);
        tint.addColorStop(0, `rgba(165, 118, 73, ${opacity + focus.amount * .37})`);
        tint.addColorStop(1, ink);
        ctx.strokeStyle = tint;
      }
      ctx.lineWidth = band ? 1.15 : .8;
      ctx.lineCap = "round";
      ctx.beginPath();

      for (let index = 0; index < points.length; index += 2) {
        const x = points[index] + driftX;
        const y = points[index + 1] + driftY;
        let offsetX = 0;
        let offsetY = 0;
        if (focus.amount) {
          const dx = x - focus.x;
          const dy = y - focus.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const falloff = Math.max(0, 1 - distance / radius);
          const push = 125 * focus.amount * falloff ** 2 / Math.max(38, distance);
          offsetX = dx * push;
          offsetY = dy * push;
        }
        for (const wave of waves) {
          const dx = x - wave.x;
          const dy = y - wave.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const crest = (distance - wave.reach) / 53;
          if (Math.abs(crest) >= 1) continue;
          const push = Math.cos(crest * Math.PI) * (1 - Math.abs(crest)) * wave.force / Math.max(1, distance);
          offsetX += dx * push;
          offsetY += dy * push;
        }
        if (index % 4 === 0) ctx.moveTo(x + offsetX, y + offsetY);
        else ctx.lineTo(x + offsetX, y + offsetY);
      }
      ctx.stroke();
    });

    const moving = target.active && Math.abs(target.x - focus.x) + Math.abs(target.y - focus.y) > .35;
    const fading = Math.abs(Number(target.active) - focus.amount) >= .012;
    if (moving || fading || ripples.length) queueDraw();
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (width < 1 || height < 1) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3_000_000 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    bands = traceContours(width, height);
    queueDraw();
  }

  function follow(event, pressing = false) {
    if (!fineMotion.matches || event.pointerType === "touch") return;
    const now = performance.now();
    const last = ripples.at(-1);
    target.x = event.clientX;
    target.y = event.clientY;
    if (!target.active) {
      focus.x = target.x;
      focus.y = target.y;
    }
    target.active = true;
    const moved = !last || (now - last.started > 100 && Math.hypot(last.x - target.x, last.y - target.y) > 64);
    if (pressing || moved) {
      ripples.push({ x: target.x, y: target.y, started: now, force: pressing ? 40 : 27 });
      if (ripples.length > 3) ripples.shift();
    }
    queueDraw();
  }

  function release() {
    target.active = false;
    queueDraw();
  }

  function clearMotion() {
    focus.amount = 0;
    ripples.length = 0;
    release();
  }

  window.addEventListener("pointermove", follow, { passive: true });
  window.addEventListener("pointerdown", (event) => follow(event, true), { passive: true });
  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) release();
  }, { passive: true });
  window.addEventListener("blur", release);
  window.addEventListener("scroll", () => {
    if (fineMotion.matches) queueDraw();
  }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  fineMotion.addEventListener("change", clearMotion);
  document.addEventListener("visibilitychange", clearMotion);
  resize();
}
