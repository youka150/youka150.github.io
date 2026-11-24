// Positions on the journal plate, from the low branches to the upper ridge.
const sites = [
  [.04, .68], [.14, .65], [.10, .45], [.21, .40], [.23, .58], [.28, .78],
  [.16, .86], [.32, .51], [.36, .68], [.38, .86], [.31, .27], [.18, .21],
  [.42, .37], [.48, .56], [.49, .73], [.52, .93], [.56, .34], [.45, .16],
  [.60, .15], [.66, .28], [.66, .48], [.61, .69], [.74, .76], [.73, .60],
  [.81, .43], [.78, .26], [.73, .08], [.89, .17], [.95, .33], [.91, .58],
  [.85, .78], [.68, .89],
];
const hubs = new Set([4, 13, 19, 24]);
const forest = "#354f3c";
const sage = "#829477";
const clay = "#a75435";
const fullTurn = Math.PI * 2;
const waveDuration = 1.45;

export function setupFieldNetwork(canvas) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = sites.map(([u, v], index) => ({
    u, v, x: 0, y: 0, pullX: 0, pullY: 0, light: 0, hub: hubs.has(index),
  }));
  let width = 0;
  let height = 0;
  let scale = 1;
  let elapsed = 0;
  let pointer;
  let waves = [];
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let stillTimer;

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, fullTurn);
  }

  function drawGuides() {
    ctx.save();
    ctx.translate(width * .51, height * .51);
    const radius = Math.min(width * .43, height * .54);
    ctx.rotate(-.26);
    ctx.lineWidth = .75;
    ctx.strokeStyle = "rgba(65, 91, 65, .16)";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * .91, 0, 0, fullTurn);
    ctx.stroke();
    // Short calibration ticks around the outside of the drawing.
    for (let i = 0; i < 60; i++) {
      const angle = i * fullTurn / 60;
      const length = i % 5 === 0 ? 6 : 2.5;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo((radius + 3) * x, (radius * .91 + 3) * y);
      ctx.lineTo((radius + 3 + length) * x, (radius * .91 + 3 + length) * y);
      ctx.stroke();
    }
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = "rgba(65, 91, 65, .18)";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * .74, radius * .67, 0, 0, fullTurn);
    ctx.stroke();
    ctx.restore();
  }

  function positionNodes(dt) {
    const unit = Math.min(width, height);
    const reach = Math.min(165, unit * .41);
    const ease = 1 - Math.exp(-dt * 10);
    nodes.forEach((node, i) => {
      const drift = reduced.matches ? 0 : unit * .023;
      const x = width * node.u + drift * Math.sin(elapsed * .39 + i * 1.23);
      const y = height * node.v + drift * Math.cos(elapsed * .31 + i * 1.74);
      const dx = pointer ? pointer.x - x : 0;
      const dy = pointer ? pointer.y - y : 0;
      const distance = Math.hypot(dx, dy);
      const near = pointer ? Math.max(0, 1 - distance / reach) : 0;
      node.light = near;
      node.pullX += (dx * near * .65 - node.pullX) * ease;
      node.pullY += (dy * near * .65 - node.pullY) * ease;
      node.x = x + (reduced.matches ? 0 : node.pullX);
      node.y = y + (reduced.matches ? 0 : node.pullY);
      for (const wave of waves) {
        const wx = x - wave.x;
        const wy = y - wave.y;
        const length = Math.hypot(wx, wy) || 1;
        const crest = Math.max(0, 1 - Math.abs(length - wave.radius) / (unit * .11));
        const force = crest * crest * (1 - wave.progress);
        node.light = Math.max(node.light, force);
        if (!reduced.matches) {
          node.x += wx / length * force * unit * .045;
          node.y += wy / length * force * unit * .045;
        }
      }
    });
  }

  function drawLinks() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx / width, dy / height * .83);
        const strength = Math.max(0, 1 - distance / .26);
        if (!strength) continue;
        const light = (a.light + b.light) / 2;
        ctx.strokeStyle = light > .15 ? clay : forest;
        ctx.globalAlpha = Math.min(.8, strength * (1.1 + light * 1.3));
        ctx.lineWidth = .85 + light;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if ((i + j) % 8 === 0 && strength > .25 && !reduced.matches) {
          const t = (elapsed * .26 + j * .17) % 1;
          circle(a.x + dx * t, a.y + dy * t, 1.55);
          ctx.globalAlpha = .77 * Math.sin(Math.PI * t);
          ctx.fillStyle = clay;
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw(dt = 0) {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    elapsed += dt;
    const waveReach = Math.min(Math.max(width, height) * .65, 420);
    waves = waves.filter(wave => {
      wave.progress = reduced.matches ? .12 : (elapsed - wave.start) / waveDuration;
      wave.radius = 4 + waveReach * (1 - (1 - wave.progress) ** 1.35);
      return wave.progress < 1;
    });
    positionNodes(dt);
    drawGuides();
    drawLinks();

    for (const wave of waves) {
      ctx.strokeStyle = clay;
      ctx.globalAlpha = .72 * (1 - wave.progress) ** 1.5;
      ctx.lineWidth = 1.4;
      circle(wave.x, wave.y, wave.radius);
      ctx.stroke();
      ctx.globalAlpha *= .4;
      circle(wave.x, wave.y, wave.radius * .82);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    nodes.forEach((node, i) => {
      const radius = (node.hub ? 4.6 : 2 + i % 3 * .48) + node.light * 1.5;
      const ink = node.light > .4 || i === 13 ? clay : (node.hub || i % 3 === 0 ? forest : sage);
      if (node.hub || node.light > .25) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = .95;
        ctx.globalAlpha = .46 + node.light * .25;
        circle(node.x, node.y, radius + 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      circle(node.x, node.y, radius);
      ctx.fillStyle = ink;
      ctx.fill();
    });
  }

  function tick(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    draw(dt);
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    waves = [];
    pointer = undefined;
    if (visible && !document.hidden) {
      draw();
      if (!reduced.matches) frame = requestAnimationFrame(tick);
    }
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!w || !h || (width === w && height === h && scale === dpr)) return;
    width = w;
    height = h;
    scale = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waves = [];
    draw();
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height,
    };
  }

  function pulse(point = { x: width * .48, y: height * .56 }) {
    if (!visible || document.hidden) return;
    waves.push({ ...point, start: elapsed });
    if (waves.length > 5) waves.shift();
    if (reduced.matches) {
      draw();
      clearTimeout(stillTimer);
      stillTimer = setTimeout(() => { waves = []; draw(); }, 350);
    }
  }

  canvas.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    pointer = localPoint(event);
    if (reduced.matches) draw();
  });
  canvas.addEventListener("pointerleave", () => {
    pointer = undefined;
    if (reduced.matches) draw();
  });
  canvas.addEventListener("click", event => pulse(localPoint(event)));
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }).observe(canvas);
  document.addEventListener("visibilitychange", syncPlayback);
  reduced.addEventListener("change", syncPlayback);
  resize();
  return { pulse };
}
