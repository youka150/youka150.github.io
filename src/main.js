import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const desktopWorkbenchQuery = matchMedia("(min-width: 1025px)");
const finePointerQuery = matchMedia("(pointer: fine)");

document.documentElement.classList.add("js");

const yearEl = $("#year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

/* ==========================================================================
   1. Smooth Scrolling, Scroll Progress & Header Navigation
   ========================================================================== */
let lenis;

function syncMotionMode() {
  lenis?.destroy();
  lenis = undefined;

  const reduced = motionQuery.matches;
  document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  document.documentElement.style.scrollBehavior = reduced ? "auto" : "";

  if (!reduced) {
    lenis = new Lenis({
      duration: 0.9,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -88 },
    });
    lenis.on("scroll", ScrollTrigger.update);
  }
}

syncMotionMode();
gsap.ticker.add((time) => {
  lenis?.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

const siteHeader = $("#site-header");
const scrollProgress = $("#scroll-progress");
const primaryNavLinks = $$(".primary-nav .nav-link");
const trackedSections = ["project", "perspectives", "contact"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

function updateHeaderAndProgress() {
  const scrolled = window.scrollY > 16;
  siteHeader?.classList.toggle("is-scrolled", scrolled);

  if (scrollProgress) {
    const scrollable = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
    scrollProgress.style.transform = `scaleX(${ratio.toFixed(4)})`;
  }

  const probeY = window.innerHeight * 0.35;
  let activeId = "";
  for (const section of trackedSections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= probeY && rect.bottom >= 120) {
      activeId = section.id;
      break;
    }
  }
  primaryNavLinks.forEach((link) => {
    link.classList.toggle(
      "is-active",
      Boolean(activeId) && link.getAttribute("href") === `#${activeId}`,
    );
  });
}

window.addEventListener("scroll", updateHeaderAndProgress, { passive: true });
window.addEventListener("resize", updateHeaderAndProgress, { passive: true });
updateHeaderAndProgress();

/* Mobile Drawer */
const menuToggle = $("#menu-toggle");
const mobileNav = $("#mobile-nav");

function closeMobileNav({ restoreFocus = false } = {}) {
  if (!menuToggle || !mobileNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "打开菜单");
  mobileNav.hidden = true;
  if (restoreFocus) menuToggle.focus();
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    menuToggle.setAttribute("aria-label", willOpen ? "关闭菜单" : "打开菜单");
    mobileNav.hidden = !willOpen;
  });

  $$("a", mobileNav).forEach((link) => {
    link.addEventListener("click", () => closeMobileNav());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileNav.hidden) {
      closeMobileNav({ restoreFocus: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (
      !mobileNav.hidden &&
      !mobileNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMobileNav();
    }
  });

  matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) closeMobileNav();
  });
}

/* Magnetic Tactile Buttons (desktop fine pointer only) */
if (finePointerQuery.matches) {
  $$("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    el.addEventListener("pointermove", (event) => {
      if (motionQuery.matches) return;
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.14;
      const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.2;
      xTo(dx);
      yTo(dy);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* Keyboard Roving Tab Helper */
function bindTabKeyboard(tabs, onActivate) {
  tabs.forEach((tab, idx) => {
    tab.addEventListener("keydown", (event) => {
      let nextIdx = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIdx = (idx + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIdx = 0;
      } else if (event.key === "End") {
        nextIdx = tabs.length - 1;
      }
      if (nextIdx < 0) return;
      event.preventDefault();
      tabs[nextIdx].focus();
      onActivate(tabs[nextIdx]);
    });
  });
}

/* HiDPI Canvas Sizing Utility */
function setupResponsiveCanvas(canvas, onResize) {
  if (!canvas) return () => ({ width: 0, height: 0, ctx: null, resize: () => {} });
  const ctx = canvas.getContext("2d");
  const state = {
    width: canvas.clientWidth || Number(canvas.getAttribute("width")) || 600,
    height: canvas.clientHeight || Number(canvas.getAttribute("height")) || 400,
    ctx,
    resize: () => {},
  };
  let ready = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    state.width = rect.width;
    state.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ready) {
      onResize?.(state.width, state.height, ctx);
    }
  }

  resize();
  ready = true;
  state.resize = resize;

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  return () => state;
}

/* ==========================================================================
   2. Hero Canvas — Interactive Signal & Resonance Field
   ========================================================================== */
const heroCanvas = $("#hero-canvas");
const heroPulseBtn = $("#hero-pulse-btn");
let renderHeroSnapshot = () => {};
let syncHeroLoop = () => {};

if (heroCanvas) {
  const palette = ["#dd5a2c", "#257275", "#1e333b"];
  const nodeCount = 36;
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (i / nodeCount) * Math.PI * 2;
    const band = 0.13 + ((i * 7) % 12) * 0.027;
    return {
      nx: 0.5 + Math.cos(angle) * band * 1.12,
      ny: 0.48 + Math.sin(angle) * band,
      vx: 0,
      vy: 0,
      phaseX: i * 0.83 + 0.4,
      phaseY: i * 1.17 + 1.1,
      speed: 0.36 + (i % 5) * 0.08,
      radius: i % 5 === 0 ? 6.2 : 3.2 + (i % 3) * 1.05,
      family: i % 3,
      x: 0,
      y: 0,
    };
  });

  const ripples = [];
  const pointer = { x: 0, y: 0, active: false };
  let heroVisible = true;
  let heroTicking = false;
  let simTime = 1.8;

  const getSurface = setupResponsiveCanvas(heroCanvas, () => {
    drawHeroFrame(0);
  });

  function spawnRipple(x, y, strength = 1) {
    const { width, height } = getSurface();
    const rx = x ?? width * (0.38 + Math.random() * 0.24);
    const ry = y ?? height * (0.38 + Math.random() * 0.24);
    ripples.push({ x: rx, y: ry, r: 6, maxR: Math.max(width, height) * 0.62, alpha: 0.85 });

    nodes.forEach((n) => {
      const dx = n.x - rx;
      const dy = n.y - ry;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 210) {
        const push = ((1 - dist / 210) * 3.4 * strength) / dist;
        n.vx += dx * push;
        n.vy += dy * push;
      }
    });

    if (motionQuery.matches) {
      drawHeroFrame(0);
    }
  }

  function drawHeroFrame(dt) {
    const { width, height, ctx } = getSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.48;
    const minDim = Math.min(width, height);

    // Subtle concentric orbital guides
    ctx.save();
    ctx.strokeStyle = "rgba(24, 38, 43, 0.065)";
    ctx.lineWidth = 1;
    [0.2, 0.34, 0.47].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * ratio, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();

    if (!motionQuery.matches && dt > 0) {
      simTime += dt;
    }

    // Update node positions
    nodes.forEach((n, idx) => {
      const anchorX =
        width * n.nx + Math.sin(simTime * n.speed + n.phaseX) * (width * 0.065);
      const anchorY =
        height * n.ny + Math.cos(simTime * n.speed * 0.9 + n.phaseY) * (height * 0.065);

      if (motionQuery.matches || dt === 0) {
        n.x = anchorX + n.vx * 6;
        n.y = anchorY + n.vy * 6;
        n.vx *= 0.6;
        n.vy *= 0.6;
      } else {
        n.vx += (anchorX - n.x) * 0.045;
        n.vy += (anchorY - n.y) * 0.045;

        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 165 && dist > 8) {
            const pull = (1 - dist / 165) * 0.22;
            n.vx += (dx / dist) * pull;
            n.vy += (dy / dist) * pull;
          }
        }

        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x = (n.x || anchorX) + n.vx;
        n.y = (n.y || anchorY) + n.vy;
      }

      // Keep inside soft padding
      const pad = 26;
      n.x = Math.max(pad, Math.min(width - pad, n.x || anchorX));
      n.y = Math.max(pad, Math.min(height - pad, n.y || anchorY));
      n.index = idx;
    });

    // Draw proximity connections & traveling signal pulses
    const maxEdgeDist = minDim * 0.29;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxEdgeDist) continue;

        const closeness = 1 - dist / maxEdgeDist;
        let nearPointer = false;
        if (pointer.active) {
          const midX = (a.x + b.x) * 0.5;
          const midY = (a.y + b.y) * 0.5;
          nearPointer = Math.hypot(midX - pointer.x, midY - pointer.y) < 130;
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = nearPointer ? 1.35 : 0.9;
        ctx.strokeStyle = nearPointer
          ? `rgba(221, 90, 44, ${(0.22 + closeness * 0.45).toFixed(3)})`
          : `rgba(28, 52, 58, ${(0.06 + closeness * 0.24).toFixed(3)})`;
        ctx.stroke();

        // Subtle signal packet along select resonant pairs
        if ((i + j) % 9 === 0 && closeness > 0.35 && !motionQuery.matches) {
          const t = (simTime * 0.55 + i * 0.13) % 1;
          const px = a.x + dx * t;
          const py = a.y + dy * t;
          ctx.beginPath();
          ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(221, 90, 44, 0.72)";
          ctx.fill();
        }
      }
    }

    // Draw expanding ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(221, 90, 44, ${(rp.alpha * 0.48).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!motionQuery.matches) {
        rp.r += 3.6;
        rp.alpha *= 0.965;
        if (rp.alpha < 0.03 || rp.r > rp.maxR) {
          ripples.splice(i, 1);
        }
      } else {
        ripples.splice(i, 1);
      }
    }

    // Draw nodes
    nodes.forEach((n) => {
      const color = palette[n.family];
      const highlight =
        pointer.active && Math.hypot(n.x - pointer.x, n.y - pointer.y) < 120;

      if (n.radius > 4.5 || highlight) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (highlight ? 6.5 : 4.5), 0, Math.PI * 2);
        ctx.fillStyle =
          n.family === 0
            ? "rgba(221, 90, 44, 0.14)"
            : "rgba(37, 114, 117, 0.13)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, highlight ? n.radius * 1.2 : n.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  let prevHeroTime = performance.now();
  function tickHero() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prevHeroTime) / 1000);
    prevHeroTime = now;
    drawHeroFrame(dt);
  }

  syncHeroLoop = () => {
    const shouldRun =
      heroVisible && !motionQuery.matches && !document.hidden;
    if (shouldRun && !heroTicking) {
      prevHeroTime = performance.now();
      gsap.ticker.add(tickHero);
      heroTicking = true;
    } else if (!shouldRun && heroTicking) {
      gsap.ticker.remove(tickHero);
      heroTicking = false;
    }
  };

  renderHeroSnapshot = () => drawHeroFrame(0);

  heroCanvas.addEventListener("pointermove", (event) => {
    const rect = heroCanvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    if (motionQuery.matches) drawHeroFrame(0);
  });

  heroCanvas.addEventListener("pointerleave", () => {
    pointer.active = false;
    if (motionQuery.matches) drawHeroFrame(0);
  });

  heroCanvas.addEventListener("click", (event) => {
    const rect = heroCanvas.getBoundingClientRect();
    spawnRipple(event.clientX - rect.left, event.clientY - rect.top, 1.15);
  });

  heroPulseBtn?.addEventListener("click", () => {
    spawnRipple(undefined, undefined, 1.25);
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0].isIntersecting;
        syncHeroLoop();
      },
      { threshold: 0.05 },
    );
    io.observe(heroCanvas);
  }

  drawHeroFrame(0);
  syncHeroLoop();
}

/* ==========================================================================
   3. Project Showcase — Scrollytelling & Three Live Algorithm Stages
   ========================================================================== */
const stageTabs = $$("[data-stage-tab]");
const stageScenes = $$("[data-scene]");
const chapterCards = $$("[data-chapter]");
let activeStage = 0;
let manualStageLockUntil = 0;
let agentAutoPlayed = false;

/* --- Scene 0: Interactive Directed Weighted Network --- */
const networkCanvas = $("#network-canvas");
const networkTooltip = $("#network-tooltip");
const influenceSlider = $("#influence-slider");
const topologyOutput = $("#topology-share");
const qualityOutput = $("#quality-share");
const weightPresetBtns = $$("[data-weight-preset]");
let syncNetworkLoop = () => {};
let drawNetworkStatic = () => {};

if (networkCanvas) {
  const communityColors = ["#6ec6c2", "#e8a86b", "#dfd9cc"];
  const netNodes = [
    { id: 0, label: "算子核心答主", group: 0, nx: 0.34, ny: 0.38, topo: 0.94, qual: 0.88, desc: "高频解答算子编译与精度调优，连接度与代码块深度俱佳" },
    { id: 1, label: "跨圈排障桥梁", group: 1, nx: 0.54, ny: 0.48, topo: 0.97, qual: 0.64, desc: "高介数中心性枢纽，串联底层框架与上层应用讨论圈" },
    { id: 2, label: "深度教程作者", group: 2, nx: 0.72, ny: 0.31, topo: 0.58, qual: 0.98, desc: "发帖量适中但长文结构严谨，附完整复现表格与脚本" },
    { id: 3, label: "推理部署实践者", group: 0, nx: 0.22, ny: 0.25, topo: 0.68, qual: 0.79, desc: "聚焦模型量化与端云协同，获赞转化率稳定" },
    { id: 4, label: "框架维护协作者", group: 0, nx: 0.25, ny: 0.6, topo: 0.83, qual: 0.74, desc: "稳定跟进版本迁移疑问，入度权重靠前" },
    { id: 5, label: "日志诊断达人", group: 1, nx: 0.47, ny: 0.74, topo: 0.79, qual: 0.71, desc: "擅长定位驱动与环境报错，回应速度极快" },
    { id: 6, label: "案例评测博主", group: 2, nx: 0.81, ny: 0.57, topo: 0.51, qual: 0.92, desc: "输出多篇性能基准对比报告，内容创新度评分突出" },
    { id: 7, label: "社区活跃提问者", group: 1, nx: 0.62, ny: 0.73, topo: 0.73, qual: 0.42, desc: "发起大量真实业务场景讨论，激发多轮互动" },
    { id: 8, label: "内核调优探索者", group: 0, nx: 0.14, ny: 0.44, topo: 0.46, qual: 0.84, desc: "专注细分算子流水线优化，单篇技术密度高" },
    { id: 9, label: "入门引导志愿者", group: 2, nx: 0.68, ny: 0.16, topo: 0.64, qual: 0.66, desc: "高频整理新手常见配置清单，友善度评分高" },
    { id: 10, label: "多模态实验者", group: 2, nx: 0.86, ny: 0.36, topo: 0.42, qual: 0.81, desc: "分享视觉与语音模型移植踩坑记录" },
    { id: 11, label: "环境适配贡献者", group: 1, nx: 0.38, ny: 0.62, topo: 0.62, qual: 0.58, desc: "连接容器镜像与多卡通信排障话题" },
    { id: 12, label: "活跃开发者 A", group: 0, nx: 0.36, ny: 0.18, topo: 0.49, qual: 0.52, desc: "持续参与算子专题问答互动" },
    { id: 13, label: "活跃开发者 B", group: 1, nx: 0.52, ny: 0.26, topo: 0.56, qual: 0.48, desc: "跨板块跟进版本更新讨论" },
  ];

  const netEdges = [
    [3, 0, 0.9], [8, 0, 0.75], [12, 0, 0.6], [4, 0, 0.85],
    [0, 1, 0.95], [4, 11, 0.7], [11, 1, 0.8], [5, 1, 0.88],
    [7, 5, 0.75], [7, 1, 0.7], [13, 1, 0.65], [13, 0, 0.55],
    [1, 2, 0.82], [9, 2, 0.78], [10, 2, 0.74], [6, 2, 0.86],
    [6, 1, 0.6], [10, 6, 0.68], [12, 13, 0.5], [11, 5, 0.65],
  ];

  let topoWeight = 0.52;
  let hoveredNodeId = -1;
  let netTime = 0;
  let projectInView = false;
  let netTicking = false;

  netNodes.forEach((n) => {
    n.curRadius = 8;
  });

  const getNetSurface = setupResponsiveCanvas(networkCanvas, () => {
    renderNetwork(0);
  });

  function computeRankedNodes() {
    const scored = netNodes.map((n) => ({
      ...n,
      score: topoWeight * n.topo + (1 - topoWeight) * n.qual,
    }));
    scored.sort((a, b) => b.score - a.score);
    const rankMap = new Map();
    scored.forEach((item, idx) => rankMap.set(item.id, { rank: idx + 1, score: item.score }));
    return rankMap;
  }

  function renderNetwork(dt) {
    const { width, height, ctx } = getNetSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);
    if (!motionQuery.matches && dt > 0) netTime += dt;

    const rankMap = computeRankedNodes();

    // Compute pixel positions with gentle breathing
    netNodes.forEach((n, idx) => {
      const driftX = motionQuery.matches ? 0 : Math.sin(netTime * 0.9 + idx * 1.3) * 3.2;
      const driftY = motionQuery.matches ? 0 : Math.cos(netTime * 0.8 + idx * 0.9) * 3.2;
      n.x = width * n.nx + driftX;
      n.y = height * (0.16 + n.ny * 0.76) + driftY;

      const info = rankMap.get(n.id);
      const targetR = 4.5 + info.score * 10.5 + (info.rank <= 3 ? 2.5 : 0);
      n.curRadius = motionQuery.matches
        ? targetR
        : n.curRadius + (targetR - n.curRadius) * 0.16;
    });

    // Soft Louvain community regions
    const clusterCenters = [
      { x: width * 0.26, y: height * 0.42, r: Math.min(width, height) * 0.27, color: "rgba(110, 198, 194, 0.06)" },
      { x: width * 0.51, y: height * 0.61, r: Math.min(width, height) * 0.25, color: "rgba(232, 168, 107, 0.06)" },
      { x: width * 0.76, y: height * 0.39, r: Math.min(width, height) * 0.24, color: "rgba(223, 217, 204, 0.05)" },
    ];
    clusterCenters.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
    });

    // Directed weighted edges
    netEdges.forEach(([srcId, dstId, w], edgeIdx) => {
      const a = netNodes[srcId];
      const b = netNodes[dstId];
      const isConnected =
        hoveredNodeId === -1 || hoveredNodeId === srcId || hoveredNodeId === dstId;

      ctx.beginPath();
      const midX = (a.x + b.x) * 0.5 - (b.y - a.y) * 0.08;
      const midY = (a.y + b.y) * 0.5 + (b.x - a.x) * 0.08;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);

      const baseAlpha = hoveredNodeId === -1 ? 0.16 + topoWeight * 0.24 : isConnected ? 0.68 : 0.06;
      ctx.strokeStyle =
        hoveredNodeId !== -1 && isConnected
          ? `rgba(110, 198, 194, ${baseAlpha.toFixed(3)})`
          : `rgba(224, 232, 230, ${(baseAlpha * w).toFixed(3)})`;
      ctx.lineWidth = isConnected && hoveredNodeId !== -1 ? 1.7 : 1 + w * 0.6;
      ctx.stroke();

      // Traveling signal particle along active edges
      if (!motionQuery.matches && edgeIdx % 3 === 0 && isConnected) {
        const t = (netTime * (0.36 + w * 0.2) + edgeIdx * 0.21) % 1;
        const inv = 1 - t;
        const px = inv * inv * a.x + 2 * inv * t * midX + t * t * b.x;
        const py = inv * inv * a.y + 2 * inv * t * midY + t * t * b.y;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(110, 198, 194, 0.8)";
        ctx.fill();
      }
    });

    // Draw nodes & top-3 badges
    netNodes.forEach((n) => {
      const info = rankMap.get(n.id);
      const isTop3 = info.rank <= 3;
      const isHovered = hoveredNodeId === n.id;
      const dimmed =
        hoveredNodeId !== -1 &&
        !isHovered &&
        !netEdges.some(
          ([s, d]) =>
            (s === hoveredNodeId && d === n.id) ||
            (d === hoveredNodeId && s === n.id),
        );

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.28 : 1;

      if (isTop3 || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.curRadius + (isHovered ? 8 : 5.5), 0, Math.PI * 2);
        ctx.strokeStyle = isHovered
          ? "rgba(232, 168, 107, 0.75)"
          : "rgba(110, 198, 194, 0.42)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.curRadius, 0, Math.PI * 2);
      ctx.fillStyle = communityColors[n.group];
      ctx.fill();

      if (isTop3 || isHovered) {
        ctx.font = '600 11.5px "Manrope", "PingFang SC", sans-serif';
        ctx.fillStyle = "#f4f0e8";
        ctx.textAlign = "center";
        ctx.fillText(
          `#${info.rank} ${n.label}`,
          n.x,
          n.y - n.curRadius - 9,
        );
      }

      ctx.restore();
    });
  }

  let prevNetTime = performance.now();
  function tickNetwork() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prevNetTime) / 1000);
    prevNetTime = now;
    renderNetwork(dt);
  }

  syncNetworkLoop = () => {
    const shouldRun =
      projectInView &&
      activeStage === 0 &&
      !motionQuery.matches &&
      !document.hidden;
    if (shouldRun && !netTicking) {
      prevNetTime = performance.now();
      gsap.ticker.add(tickNetwork);
      netTicking = true;
    } else if (!shouldRun && netTicking) {
      gsap.ticker.remove(tickNetwork);
      netTicking = false;
    }
  };

  drawNetworkStatic = () => {
    getNetSurface().resize();
    renderNetwork(0);
  };

  function setWeightValue(rawPercent) {
    const pct = Math.min(90, Math.max(10, Number(rawPercent) || 52));
    topoWeight = pct / 100;
    if (influenceSlider) {
      influenceSlider.value = String(pct);
      influenceSlider.setAttribute(
        "aria-valuetext",
        `网络拓扑权重 ${pct}%，内容质量权重 ${100 - pct}%`,
      );
    }
    if (topologyOutput) topologyOutput.textContent = `${pct}%`;
    if (qualityOutput) qualityOutput.textContent = `${100 - pct}%`;

    weightPresetBtns.forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.weightPreset) === pct);
    });

    renderNetwork(0);
  }

  influenceSlider?.addEventListener("input", () => {
    setWeightValue(influenceSlider.value);
  });

  weightPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setWeightValue(btn.dataset.weightPreset);
    });
  });

  function handleNetworkPointer(clientX, clientY) {
    const rect = networkCanvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let found = -1;
    let bestDist = 28;
    netNodes.forEach((n) => {
      const d = Math.hypot(mx - (n.x || 0), my - (n.y || 0));
      if (d < bestDist) {
        bestDist = d;
        found = n.id;
      }
    });

    if (found !== hoveredNodeId) {
      hoveredNodeId = found;
      if (networkTooltip) {
        if (found >= 0) {
          const rankMap = computeRankedNodes();
          const info = rankMap.get(found);
          networkTooltip.textContent = `${netNodes[found].label}（综合 #${info.rank}）：${netNodes[found].desc}`;
        } else {
          networkTooltip.textContent = "悬停节点查看角色特征 · 当前高亮综合排名前三";
        }
      }
      renderNetwork(0);
    }
  }

  networkCanvas.addEventListener("pointermove", (e) => {
    handleNetworkPointer(e.clientX, e.clientY);
  });
  networkCanvas.addEventListener("click", (e) => {
    handleNetworkPointer(e.clientX, e.clientY);
  });
  networkCanvas.addEventListener("pointerleave", () => {
    hoveredNodeId = -1;
    if (networkTooltip) {
      networkTooltip.textContent = "悬停节点查看角色特征 · 当前高亮综合排名前三";
    }
    renderNetwork(0);
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        projectInView = entries[0].isIntersecting;
        syncNetworkLoop();
      },
      { threshold: 0.05 },
    );
    io.observe($(".project-shell") || networkCanvas);
  }

  setWeightValue(52);
}

/* --- Scene 1: Interactive PCA + KMeans Behavioral × Semantic Projection --- */
const clusterCanvas = $("#cluster-canvas");
const clusterModeBtns = $$("[data-cluster-mode]");
const personaChips = $$("[data-persona]");
const clusterBadge = $("#cluster-badge");
const clusterInsightText = $("#cluster-insight-text");
let drawClusterStatic = () => {};

if (clusterCanvas) {
  const personaMeta = [
    {
      name: "算子与框架深耕",
      color: "#6ec6c2",
      cx: 0.25,
      cy: 0.34,
      insight: "算子与框架深耕群：发帖中代码块与底层 API 引用密集，语义高度聚焦编译优化与算子迁移。",
    },
    {
      name: "工程排障桥梁",
      color: "#e8a86b",
      cx: 0.73,
      cy: 0.32,
      insight: "工程排障桥梁群：跨帖回复频次高，语义覆盖环境部署、驱动兼容与多卡通信报错。",
    },
    {
      name: "实践案例分享",
      color: "#df7a52",
      cx: 0.31,
      cy: 0.73,
      insight: "实践案例分享群：长文比例与获赞均值突出，围绕端侧推理、模型微调输出完整复现流程。",
    },
    {
      name: "高潜新星",
      color: "#b8d4a3",
      cx: 0.71,
      cy: 0.72,
      insight: "高潜新星群：近期注册或总帖量尚少，但语义向量与核心答主高度邻近，具备成长为社区骨干的潜力。",
    },
  ];

  // Deterministic pseudo-random points for crisp reproducible layout
  const clusterPoints = Array.from({ length: 44 }, (_, i) => {
    const group = i % 4;
    const angle = ((i * 137.5) % 360) * (Math.PI / 180);
    const radial = 0.035 + ((i * 19) % 10) * 0.011;
    const meta = personaMeta[group];

    // Fused 2D PCA coordinates (well-separated semantic-behavioral clusters)
    const fx = meta.cx + Math.cos(angle) * radial * 1.25;
    const fy = meta.cy + Math.sin(angle) * radial;

    // Behavior-only coordinates (mixed diagonal activity band where personas overlap!)
    const activityT = 0.14 + ((i * 23) % 41) / 54;
    const bx = activityT;
    const by = 0.78 - activityT * 0.56 + (((i * 17) % 11) - 5) * 0.028;

    return {
      group,
      fx,
      fy,
      bx,
      by,
      size: 4 + (i % 3) * 1.3,
    };
  });

  const blendState = { t: 1 }; // 1 = fused, 0 = behavior-only
  let selectedPersona = -1;
  let clusterTween;

  const getClusterSurface = setupResponsiveCanvas(clusterCanvas, () => {
    renderClusters();
  });

  function renderClusters() {
    const { width, height, ctx } = getClusterSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);
    const t = blendState.t;

    // Subtle projection axes
    ctx.save();
    ctx.strokeStyle = "rgba(244, 240, 232, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(38, height - 30);
    ctx.lineTo(width - 28, height - 30);
    ctx.moveTo(38, height - 30);
    ctx.lineTo(38, 26);
    ctx.stroke();

    ctx.font = '500 11.5px "Manrope", "PingFang SC", sans-serif';
    ctx.fillStyle = "rgba(190, 206, 208, 0.62)";
    ctx.fillText(
      t > 0.5 ? "PCA 主成分 1（行为 × 语义融合）" : "行为维度：发帖与回复频次 →",
      50,
      height - 11,
    );
    ctx.restore();

    // Cluster hulls & labels when in fused mode
    if (t > 0.08) {
      personaMeta.forEach((meta, gIdx) => {
        const isHighlighted = selectedPersona === -1 || selectedPersona === gIdx;
        const alpha = t * (isHighlighted ? 0.13 : 0.03);
        const strokeAlpha = t * (isHighlighted ? 0.42 : 0.1);
        const cx = width * meta.cx;
        const cy = height * meta.cy;
        const rx = width * 0.155;
        const ry = height * 0.165;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = meta.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        ctx.globalAlpha = strokeAlpha;
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = t * (isHighlighted ? 0.92 : 0.32);
        ctx.font = '600 12px "Manrope", "PingFang SC", sans-serif';
        ctx.fillStyle = "#f4f0e8";
        ctx.textAlign = "center";
        ctx.fillText(meta.name, cx, cy - ry - 7);
        ctx.restore();
      });
    }

    // Draw user points
    clusterPoints.forEach((pt) => {
      const nx = pt.bx + (pt.fx - pt.bx) * t;
      const ny = pt.by + (pt.fy - pt.by) * t;
      const x = width * nx;
      const y = height * ny;

      const isFocused = selectedPersona === -1 || selectedPersona === pt.group;
      ctx.save();
      ctx.globalAlpha = isFocused ? 0.92 : 0.18;
      ctx.beginPath();
      ctx.arc(x, y, isFocused && selectedPersona === pt.group ? pt.size + 1.5 : pt.size, 0, Math.PI * 2);
      ctx.fillStyle =
        t < 0.25 && selectedPersona === -1
          ? "#9fb6b9"
          : personaMeta[pt.group].color;
      ctx.fill();
      ctx.restore();
    });
  }

  drawClusterStatic = () => {
    getClusterSurface().resize();
    renderClusters();
  };

  function setClusterMode(mode) {
    const target = mode === "fused" ? 1 : 0;
    clusterModeBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.clusterMode === mode);
    });

    if (clusterBadge) {
      clusterBadge.textContent =
        mode === "fused"
          ? "PCA 降维 + KMeans 融合视图"
          : "纯行为统计视图（语义未介入时的回退基线）";
    }

    if (clusterInsightText && selectedPersona === -1) {
      clusterInsightText.textContent =
        mode === "fused"
          ? "融合 384 维句向量后，原本在活跃度上相近的用户会按真实讨论领域自然分离，便于识别细分领域的答疑核心与潜力贡献者。"
          : "仅按发帖频次与获赞统计时，不同技术方向的开发者混杂在同一条活跃度带上，难以区分各自的专长角色。";
    }

    clusterTween?.kill();
    if (motionQuery.matches) {
      blendState.t = target;
      renderClusters();
    } else {
      clusterTween = gsap.to(blendState, {
        t: target,
        duration: 0.68,
        ease: "power3.inOut",
        onUpdate: renderClusters,
      });
    }
  }

  function selectPersona(idx) {
    selectedPersona = idx;
    personaChips.forEach((chip) => {
      chip.classList.toggle("is-active", Number(chip.dataset.persona) === idx);
    });

    if (clusterInsightText) {
      if (idx >= 0 && personaMeta[idx]) {
        clusterInsightText.textContent = personaMeta[idx].insight;
      } else {
        const isFused = blendState.t >= 0.5;
        clusterInsightText.textContent = isFused
          ? "融合 384 维句向量后，原本在活跃度上相近的用户会按真实讨论领域自然分离，便于识别细分领域的答疑核心与潜力贡献者。"
          : "仅按发帖频次与获赞统计时，不同技术方向的开发者混杂在同一条活跃度带上，难以区分各自的专长角色。";
      }
    }
    renderClusters();
  }

  clusterModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setClusterMode(btn.dataset.clusterMode));
  });

  personaChips.forEach((chip) => {
    chip.addEventListener("click", () => selectPersona(Number(chip.dataset.persona)));
  });

  clusterCanvas.addEventListener("click", (event) => {
    if (blendState.t < 0.5) return;
    const rect = clusterCanvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;
    let hit = -1;
    personaMeta.forEach((meta, idx) => {
      if (Math.hypot(mx - meta.cx, my - meta.cy) < 0.18) hit = idx;
    });
    selectPersona(hit === selectedPersona ? -1 : hit);
  });

  renderClusters();
}

/* --- Scene 2: Reflective Trend Agent Simulator --- */
const agentTopicBtns = $$("[data-agent-topic]");
const agentNodes = $$("[data-agent-step]");
const agentTraceLog = $("#agent-trace-log");
const agentReplayBtn = $("#agent-replay-btn");
let activeAgentTopic = 0;
let agentTimeline;

const agentScenarios = [
  {
    steps: [
      "<strong>01 维度拆解：</strong>围绕「昇腾算子迁移痛点」拆出动态 Shape 适配、精度对齐与报错排查三个子维度。",
      "<strong>02 社区与外部检索：</strong>聚合昇腾板块高赞问答与外部技术博客，定位高频算子编译耗时讨论。",
      "<strong>03 反思补搜闭环：</strong>自检发现缺少近期版本工具链对比证据，自动追加检索 msit 精度比对实测反馈。",
      "<strong>04 SSE 流式交付：</strong>生成结构化洞察报告——置顶动态 Shape 排障清单与文档改进优先级建议。",
    ],
  },
  {
    steps: [
      "<strong>01 维度拆解：</strong>围绕「鸿蒙端侧推理实践」拆出轻量化部署、NPU 调用延迟与内存占用三个观察切面。",
      "<strong>02 社区与外部检索：</strong>提取华为开发者社区端侧 AI 高互动帖，汇总量化压缩常见问答。",
      "<strong>03 反思补搜闭环：</strong>检测到端侧多模态场景样本偏少，触发二次补搜，补充语音与图像小模型落地案例。",
      "<strong>04 SSE 流式交付：</strong>完成趋势报告流式输出，标记近期快速升温的端侧推理开发模板需求。",
    ],
  },
];

function playAgentSimulation() {
  if (!agentNodes.length || !agentTraceLog) return;
  agentTimeline?.kill();

  const lines = agentScenarios[activeAgentTopic]?.steps || agentScenarios[0].steps;
  agentNodes.forEach((node) => node.classList.remove("is-running", "is-done"));
  agentTraceLog.innerHTML = "";

  const finalize = () => {
    agentNodes.forEach((node) => {
      node.classList.remove("is-running");
      node.classList.add("is-done");
    });
    agentTraceLog.innerHTML = lines.map((line) => `<p>${line}</p>`).join("");
    if (agentReplayBtn) agentReplayBtn.disabled = false;
  };

  if (motionQuery.matches) {
    finalize();
    return;
  }

  if (agentReplayBtn) agentReplayBtn.disabled = true;
  agentTimeline = gsap.timeline({ onComplete: finalize });

  lines.forEach((htmlLine, idx) => {
    agentTimeline.call(
      () => {
        if (idx > 0) {
          agentNodes[idx - 1]?.classList.replace("is-running", "is-done");
        }
        agentNodes[idx]?.classList.add("is-running");
        const p = document.createElement("p");
        p.innerHTML = htmlLine;
        agentTraceLog.appendChild(p);
        gsap.fromTo(
          p,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
        );
      },
      [],
      idx * 0.52,
    );
  });
  agentTimeline.to({}, { duration: 0.45 });
}

agentTopicBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeAgentTopic = Number(btn.dataset.agentTopic) || 0;
    agentTopicBtns.forEach((b) =>
      b.classList.toggle("is-active", b === btn),
    );
    playAgentSimulation();
  });
});

agentReplayBtn?.addEventListener("click", playAgentSimulation);

/* Stage Switching & Scroll Sync */
function showStage(index, { animate = true } = {}) {
  if (!stageScenes[index]) return;
  const changed = activeStage !== index;
  activeStage = index;

  stageTabs.forEach((tab) => {
    const selected = Number(tab.dataset.stageTab) === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  chapterCards.forEach((card) => {
    card.classList.toggle("is-active", Number(card.dataset.chapter) === index);
  });

  stageScenes.forEach((scene, sIdx) => {
    scene.hidden = sIdx !== index;
  });

  syncNetworkLoop();
  if (index === 0) requestAnimationFrame(drawNetworkStatic);
  if (index === 1) requestAnimationFrame(drawClusterStatic);
  if (index === 2 && !agentAutoPlayed) {
    agentAutoPlayed = true;
    playAgentSimulation();
  }

  if (changed && animate && !motionQuery.matches) {
    gsap.fromTo(
      stageScenes[index],
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.36, ease: "power2.out", clearProps: "opacity,transform" },
    );
  }
}

stageTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    manualStageLockUntil = performance.now() + 1200;
    showStage(Number(tab.dataset.stageTab));
  });
});
bindTabKeyboard(stageTabs, (tab) => {
  manualStageLockUntil = performance.now() + 1200;
  showStage(Number(tab.dataset.stageTab));
});

chapterCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    manualStageLockUntil = performance.now() + 1000;
    showStage(Number(card.dataset.chapter));
  });
});

// Sync sticky stage with chapter reading position on wide screens
const responsiveMedia = gsap.matchMedia();
responsiveMedia.add("(min-width: 1025px)", () => {
  chapterCards.forEach((card) => {
    ScrollTrigger.create({
      trigger: card,
      start: "top 56%",
      end: "bottom 44%",
      onToggle: (self) => {
        if (self.isActive && performance.now() > manualStageLockUntil) {
          showStage(Number(card.dataset.chapter));
        }
      },
    });
  });
});

showStage(0, { animate: false });

/* ==========================================================================
   4. Personal Studio — Three Everyday Lenses
   ========================================================================== */
const lensTabs = $$("[data-lens-tab]");
const lensPanels = $$("[data-lens-panel]");
let currentLens = "research";
let activeViewTransition;

/* --- Lens 1: Stratified Regression / Simpson's Paradox Canvas --- */
const regressionCanvas = $("#regression-canvas");
const regressionToggleBtn = $("#regression-toggle-btn");
const regressionReadout = $("#regression-readout");
let drawRegressionStatic = () => {};

if (regressionCanvas) {
  const strata = [
    { name: "轻度参与组", color: "#257275", cx: 0.27, cy: 0.67 },
    { name: "常规活跃组", color: "#dd5a2c", cx: 0.51, cy: 0.48 },
    { name: "核心深耕组", color: "#263840", cx: 0.75, cy: 0.29 },
  ];

  // Construct classic Simpson's paradox: each group slopes DOWN in canvas-Y?
  // Note: Canvas Y grows downward (top=high Y-value, bottom=low Y-value).
  // Pooled trend: higher X -> higher value (smaller canvas Y, upward right!).
  // Within each stratum: higher X -> LOWER value (larger canvas Y, downward right!).
  const regPoints = [];
  strata.forEach((s, gIdx) => {
    for (let k = 0; k < 12; k++) {
      const offset = (k - 5.5) / 5.5; // -1 .. 1
      const jitter = (((k * 13 + gIdx * 7) % 9) - 4) * 0.011;
      const nx = s.cx + offset * 0.125;
      // Within group: as nx increases, canvas ny increases -> downward slope in math coordinates!
      const ny = s.cy + offset * 0.082 + jitter;
      regPoints.push({ group: gIdx, nx, ny });
    }
  });

  const regState = { stratified: false, mix: 0 };
  let regTween;

  const getRegSurface = setupResponsiveCanvas(regressionCanvas, () => {
    renderRegression();
  });

  function renderRegression() {
    const { width, height, ctx } = getRegSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);
    const m = regState.mix;

    const padL = 54;
    const padR = 34;
    const padT = 34;
    const padB = 46;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const toX = (nx) => padL + nx * plotW;
    const toY = (ny) => padT + ny * plotH;

    // Subtle horizontal reference lines (NOT a grid wallpaper)
    ctx.save();
    ctx.strokeStyle = "rgba(24, 38, 43, 0.07)";
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((r) => {
      const y = padT + plotH * r;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.stroke();
    });

    // Axes
    ctx.strokeStyle = "rgba(24, 38, 43, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, height - padB);
    ctx.lineTo(width - padR, height - padB);
    ctx.stroke();

    ctx.font = '500 12px "Manrope", "PingFang SC", sans-serif';
    ctx.fillStyle = "rgba(92, 108, 112, 0.9)";
    ctx.fillText("观测变量 X", width - padR - 68, height - 15);
    ctx.fillText("结果指标 Y", padL + 10, padT + 12);
    ctx.restore();

    // Pooled OLS upward line (fades back when stratified)
    ctx.save();
    ctx.globalAlpha = 1 - m * 0.76;
    ctx.strokeStyle = "#dd5a2c";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(toX(0.11), toY(0.79));
    ctx.lineTo(toX(0.9), toY(0.18));
    ctx.stroke();
    ctx.setLineDash([]);

    if (m < 0.65) {
      ctx.font = '600 12.5px "Manrope", "PingFang SC", sans-serif';
      ctx.fillStyle = "#dd5a2c";
      ctx.fillText("混合拟合：表象呈正相关 ↗", toX(0.52), toY(0.36));
    }
    ctx.restore();

    // Stratified group ellipses & within-group negative slope lines
    if (m > 0.04) {
      strata.forEach((s) => {
        ctx.save();
        ctx.globalAlpha = m * 0.1;
        ctx.beginPath();
        ctx.ellipse(
          toX(s.cx),
          toY(s.cy),
          plotW * 0.16,
          plotH * 0.13,
          0.36,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = s.color;
        ctx.fill();

        ctx.globalAlpha = m * 0.92;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(toX(s.cx - 0.14), toY(s.cy - 0.092));
        ctx.lineTo(toX(s.cx + 0.14), toY(s.cy + 0.092));
        ctx.stroke();

        ctx.font = '600 12px "Manrope", "PingFang SC", sans-serif';
        ctx.fillStyle = s.color;
        ctx.fillText(s.name, toX(s.cx - 0.08), toY(s.cy - 0.135));
        ctx.restore();
      });
    }

    // Data points
    regPoints.forEach((pt) => {
      const x = toX(pt.nx);
      const y = toY(pt.ny);
      ctx.beginPath();
      ctx.arc(x, y, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = m > 0.35 ? strata[pt.group].color : "#374c53";
      ctx.globalAlpha = 0.86;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  drawRegressionStatic = () => {
    getRegSurface().resize();
    renderRegression();
  };

  function toggleStratified() {
    regState.stratified = !regState.stratified;
    const active = regState.stratified;

    if (regressionToggleBtn) {
      regressionToggleBtn.setAttribute("aria-pressed", String(active));
      const labelSpan = $(".btn-label", regressionToggleBtn);
      if (labelSpan) {
        labelSpan.textContent = active ? "回到混合样本视角" : "引入分组控制变量";
      }
    }

    if (regressionReadout) {
      regressionReadout.textContent = active
        ? "控制分组变量后：三个子群内部的真实斜率全部反转向下（辛普森悖论），机制与表象截然不同。"
        : "当前为混合样本回归：忽略个体异质性时，整体拟合线呈现明显的正向趋势。";
    }

    regTween?.kill();
    if (motionQuery.matches) {
      regState.mix = active ? 1 : 0;
      renderRegression();
    } else {
      regTween = gsap.to(regState, {
        mix: active ? 1 : 0,
        duration: 0.62,
        ease: "power3.inOut",
        onUpdate: renderRegression,
      });
    }
  }

  regressionToggleBtn?.addEventListener("click", toggleStratified);
  regressionCanvas.addEventListener("click", toggleStratified);
  renderRegression();
}

/* --- Lens 2: Harmonic Strings & Waveform Canvas --- */
const musicCanvas = $("#music-canvas");
const tempoSlider = $("#tempo-slider");
const tempoOutput = $("#tempo-output");
const tempoPresetBtns = $$("[data-tempo-preset]");
const musicToggleBtn = $("#music-toggle-btn");
let syncMusicLoop = () => {};
let drawMusicStatic = () => {};
let updateMusicButtonState = () => {};

if (musicCanvas) {
  let tempoValue = 58;
  let musicPaused = false;
  let musicInView = false;
  let musicTicking = false;
  let wavePhase = 1.4;
  let pluckBoost = 0;
  let pluckX = 0.5;

  const getMusicSurface = setupResponsiveCanvas(musicCanvas, () => {
    renderMusic(0);
  });

  function renderMusic(dt) {
    const { width, height, ctx } = getMusicSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);

    if (!motionQuery.matches && dt > 0) {
      wavePhase += dt * (tempoValue / 24);
      pluckBoost *= 0.94;
    }

    const midY = height * 0.5;
    const padX = 36;
    const usableW = width - padX * 2;

    // Background vertical resonance bars
    const barCount = 34;
    const step = usableW / (barCount - 1);
    for (let i = 0; i < barCount; i++) {
      const norm = i / (barCount - 1);
      const env = Math.sin(norm * Math.PI);
      const localBoost =
        1 + pluckBoost * Math.exp(-Math.pow((norm - pluckX) * 5.5, 2));
      const amp =
        (10 +
          Math.abs(
            Math.sin(i * 0.42 - wavePhase) * Math.cos(i * 0.19 + wavePhase * 0.4),
          ) *
            (height * 0.27) *
            env) *
        localBoost;

      const x = padX + i * step;
      ctx.fillStyle = "rgba(37, 114, 117, 0.13)";
      ctx.beginPath();
      ctx.roundRect(x - 2.5, midY - amp * 0.5, 5, amp, 3);
      ctx.fill();
    }

    // Three layered harmonic strings
    const ribbons = [
      { color: "#dd5a2c", alpha: 0.85, freq: 2.2, amp: 0.18, speed: 1.0, width: 2.2 },
      { color: "#257275", alpha: 0.72, freq: 3.1, amp: 0.13, speed: -0.75, width: 1.8 },
      { color: "#243840", alpha: 0.35, freq: 1.5, amp: 0.09, speed: 0.5, width: 1.3 },
    ];

    ribbons.forEach((rb) => {
      ctx.save();
      ctx.beginPath();
      const samples = 90;
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const windowEnv = Math.sin(u * Math.PI);
        const pointerEnv =
          1 + pluckBoost * 0.85 * Math.exp(-Math.pow((u - pluckX) * 4.5, 2));
        const y =
          midY +
          Math.sin(u * Math.PI * 2 * rb.freq + wavePhase * rb.speed) *
            (height * rb.amp) *
            windowEnv *
            pointerEnv;
        const x = padX + u * usableW;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rb.color;
      ctx.globalAlpha = rb.alpha;
      ctx.lineWidth = rb.width;
      ctx.stroke();
      ctx.restore();
    });
  }

  let prevMusicTime = performance.now();
  function tickMusic() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prevMusicTime) / 1000);
    prevMusicTime = now;
    renderMusic(dt);
  }

  syncMusicLoop = () => {
    const shouldRun =
      currentLens === "music" &&
      musicInView &&
      !musicPaused &&
      !motionQuery.matches &&
      !document.hidden;
    if (shouldRun && !musicTicking) {
      prevMusicTime = performance.now();
      gsap.ticker.add(tickMusic);
      musicTicking = true;
    } else if (!shouldRun && musicTicking) {
      gsap.ticker.remove(tickMusic);
      musicTicking = false;
    }
  };

  drawMusicStatic = () => {
    getMusicSurface().resize();
    renderMusic(0);
  };

  updateMusicButtonState = () => {
    if (!musicToggleBtn) return;
    const isStopped = musicPaused || motionQuery.matches;
    musicToggleBtn.setAttribute("aria-pressed", String(isStopped));
    musicToggleBtn.disabled = motionQuery.matches;
    const labelSpan = $(".btn-label", musicToggleBtn);
    const iconSpan = $(".btn-icon", musicToggleBtn);
    if (labelSpan) {
      labelSpan.textContent = motionQuery.matches
        ? "已随系统设置保持静止"
        : musicPaused
          ? "继续律动画面"
          : "暂停律动画面";
    }
    if (iconSpan) {
      iconSpan.textContent = isStopped ? "▶" : "Ⅱ";
    }
  };

  function setTempo(val) {
    tempoValue = Math.min(100, Math.max(20, Number(val) || 58));
    if (tempoSlider) {
      tempoSlider.value = String(tempoValue);
      tempoSlider.setAttribute("aria-valuetext", `${tempoValue} BPM`);
    }
    if (tempoOutput) tempoOutput.textContent = `${tempoValue} BPM`;
    tempoPresetBtns.forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.tempoPreset) === tempoValue);
    });
    if (motionQuery.matches || musicPaused) {
      wavePhase = tempoValue / 14;
      renderMusic(0);
    }
  }

  tempoSlider?.addEventListener("input", () => setTempo(tempoSlider.value));
  tempoPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => setTempo(btn.dataset.tempoPreset));
  });

  musicToggleBtn?.addEventListener("click", () => {
    musicPaused = !musicPaused;
    updateMusicButtonState();
    syncMusicLoop();
  });

  musicCanvas.addEventListener("pointermove", (event) => {
    const rect = musicCanvas.getBoundingClientRect();
    pluckX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pluckBoost = Math.min(1.1, pluckBoost + 0.24);
    if (motionQuery.matches || musicPaused) renderMusic(0);
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        musicInView = entries[0].isIntersecting;
        syncMusicLoop();
      },
      { threshold: 0.05 },
    );
    const musicPanel = $("#lens-panel-music");
    if (musicPanel) io.observe(musicPanel);
  }

  setTempo(58);
  updateMusicButtonState();
}

/* --- Lens 3: Aerodynamic Badminton Court Canvas --- */
const courtCanvas = $("#court-canvas");
const shotTypeBtns = $$("[data-shot-type]");
const rallyPlayBtn = $("#rally-play-btn");
const courtReadout = $("#court-readout");
let drawCourtStatic = () => {};
let activeRallyTween;

if (courtCanvas) {
  const rallies = {
    clear: {
      label: "高远球拉吊：后场深区大角度对拉，紧接一拍斜线劈吊调动步伐。",
      shots: [
        { from: [0.22, 0.72], to: [0.81, 0.24], loft: 0.22 },
        { from: [0.81, 0.24], to: [0.19, 0.28], loft: 0.21 },
        { from: [0.19, 0.28], to: [0.64, 0.74], loft: 0.13 },
      ],
    },
    drop: {
      label: "劈吊接挑球：后场收力轻吊网前甜区，对手跨步挑回底线。",
      shots: [
        { from: [0.21, 0.26], to: [0.57, 0.42], loft: 0.1 },
        { from: [0.57, 0.42], to: [0.43, 0.64], loft: 0.07 },
        { from: [0.43, 0.64], to: [0.82, 0.76], loft: 0.19 },
      ],
    },
    drive: {
      label: "中场平抽挡：球速快、弧度平，考验连续封网与手腕变线。",
      shots: [
        { from: [0.28, 0.56], to: [0.73, 0.47], loft: 0.05 },
        { from: [0.73, 0.47], to: [0.31, 0.38], loft: 0.05 },
        { from: [0.31, 0.38], to: [0.76, 0.66], loft: 0.06 },
      ],
    },
  };

  let currentShotKey = "clear";
  let activeSegments = rallies.clear.shots;
  const shuttleState = { segIndex: 0, segT: 1, completed: true };

  const getCourtSurface = setupResponsiveCanvas(courtCanvas, () => {
    renderCourt();
  });

  function getCourtBox(width, height) {
    const marginX = width * 0.11;
    const marginY = height * 0.13;
    return {
      x: marginX,
      y: marginY,
      w: width - marginX * 2,
      h: height - marginY * 2,
    };
  }

  function renderCourt() {
    const { width, height, ctx } = getCourtSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);
    const box = getCourtBox(width, height);

    // Court surface mat
    ctx.save();
    ctx.fillStyle = "#e2ece8";
    ctx.beginPath();
    ctx.roundRect(box.x - 14, box.y - 14, box.w + 28, box.h + 28, 12);
    ctx.fill();

    ctx.fillStyle = "#d5e4df";
    ctx.fillRect(box.x, box.y, box.w, box.h);

    // Standard court geometry
    ctx.strokeStyle = "rgba(24, 52, 54, 0.48)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // Singles sidelines & back service lines
    const alleyY = box.h * 0.085;
    const backServiceX = box.w * 0.065;
    const shortServiceOffset = box.w * 0.15;
    const netX = box.x + box.w * 0.5;
    const midY = box.y + box.h * 0.5;

    ctx.beginPath();
    // Horizontal singles lines
    ctx.moveTo(box.x, box.y + alleyY);
    ctx.lineTo(box.x + box.w, box.y + alleyY);
    ctx.moveTo(box.x, box.y + box.h - alleyY);
    ctx.lineTo(box.x + box.w, box.y + box.h - alleyY);
    // Back doubles service lines
    ctx.moveTo(box.x + backServiceX, box.y);
    ctx.lineTo(box.x + backServiceX, box.y + box.h);
    ctx.moveTo(box.x + box.w - backServiceX, box.y);
    ctx.lineTo(box.x + box.w - backServiceX, box.y + box.h);
    // Short service lines
    ctx.moveTo(netX - shortServiceOffset, box.y);
    ctx.lineTo(netX - shortServiceOffset, box.y + box.h);
    ctx.moveTo(netX + shortServiceOffset, box.y);
    ctx.lineTo(netX + shortServiceOffset, box.y + box.h);
    // Center service lines
    ctx.moveTo(box.x, midY);
    ctx.lineTo(netX - shortServiceOffset, midY);
    ctx.moveTo(netX + shortServiceOffset, midY);
    ctx.lineTo(box.x + box.w, midY);
    ctx.stroke();

    // Net line
    ctx.strokeStyle = "#18262b";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(netX, box.y - 8);
    ctx.lineTo(netX, box.y + box.h + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const toCourtXY = ([ux, uy]) => [box.x + ux * box.w, box.y + uy * box.h];

    // Draw completed & active trajectory arcs
    activeSegments.forEach((seg, idx) => {
      if (idx > shuttleState.segIndex && !shuttleState.completed) return;

      const [sx, sy] = toCourtXY(seg.from);
      const [ex, ey] = toCourtXY(seg.to);
      const progress =
        shuttleState.completed || idx < shuttleState.segIndex
          ? 1
          : shuttleState.segT;

      // Aerodynamic drag easing: rapid racket exit, gentle deceleration
      const eased = 1 - Math.pow(1 - progress, 2.2);
      const ctrlX = (sx + ex) * 0.5;
      const ctrlY = (sy + ey) * 0.5 - box.h * seg.loft;

      // Draw full ghost path
      ctx.save();
      ctx.strokeStyle = "rgba(37, 114, 117, 0.22)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw traveled glowing arc up to `eased`
      ctx.strokeStyle = idx === shuttleState.segIndex || shuttleState.completed ? "#dd5a2c" : "rgba(221, 90, 44, 0.5)";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const u = (s / steps) * eased;
        const inv = 1 - u;
        const px = inv * inv * sx + 2 * inv * u * ctrlX + u * u * ex;
        const py = inv * inv * sy + 2 * inv * u * ctrlY + u * u * ey;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Landing marker when segment finishes
      if (progress >= 0.98) {
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(221, 90, 44, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw shuttlecock at current tip
      if (
        (!shuttleState.completed && idx === shuttleState.segIndex) ||
        (shuttleState.completed && idx === activeSegments.length - 1)
      ) {
        const inv = 1 - eased;
        const px = inv * inv * sx + 2 * inv * eased * ctrlX + eased * eased * ex;
        const py = inv * inv * sy + 2 * inv * eased * ctrlY + eased * eased * ey;

        // Ground shadow
        const groundY = sy + (ey - sy) * eased;
        ctx.beginPath();
        ctx.ellipse(px, groundY + 4, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(24, 38, 43, 0.16)";
        ctx.fill();

        // Shuttlecock cork + halo
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(221, 90, 44, 0.18)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = "#dd5a2c";
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawCourtStatic = () => {
    getCourtSurface().resize();
    renderCourt();
  };

  function runRally(segments, description) {
    activeRallyTween?.kill();
    activeSegments = segments;

    if (courtReadout && description) {
      courtReadout.textContent = description;
    }

    if (motionQuery.matches) {
      shuttleState.segIndex = segments.length - 1;
      shuttleState.segT = 1;
      shuttleState.completed = true;
      if (rallyPlayBtn) rallyPlayBtn.disabled = false;
      renderCourt();
      return;
    }

    shuttleState.completed = false;
    shuttleState.segIndex = 0;
    shuttleState.segT = 0;
    if (rallyPlayBtn) rallyPlayBtn.disabled = true;

    const tl = gsap.timeline({
      onComplete: () => {
        shuttleState.completed = true;
        if (rallyPlayBtn) rallyPlayBtn.disabled = false;
        renderCourt();
      },
    });

    segments.forEach((_, idx) => {
      tl.call(() => {
        shuttleState.segIndex = idx;
        shuttleState.segT = 0;
      });
      tl.to(shuttleState, {
        segT: 1,
        duration: 0.56,
        ease: "none",
        onUpdate: renderCourt,
      });
    });

    activeRallyTween = tl;
  }

  shotTypeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentShotKey = btn.dataset.shotType || "clear";
      shotTypeBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      const preset = rallies[currentShotKey] || rallies.clear;
      runRally(preset.shots, preset.label);
    });
  });

  rallyPlayBtn?.addEventListener("click", () => {
    const preset = rallies[currentShotKey] || rallies.clear;
    runRally(preset.shots, preset.label);
  });

  // Click anywhere on the court to hit directly to that target spot!
  courtCanvas.addEventListener("click", (event) => {
    const { width, height } = getCourtSurface();
    const box = getCourtBox(width, height);
    const rect = courtCanvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const ux = Math.min(0.96, Math.max(0.04, (mx - box.x) / box.w));
    const uy = Math.min(0.94, Math.max(0.06, (my - box.y) / box.h));

    const fromRight = ux < 0.5;
    const origin = fromRight ? [0.78, 0.52] : [0.22, 0.52];
    const distFromNet = Math.abs(ux - 0.5);
    const zoneLabel =
      distFromNet < 0.16
        ? "网前小球落点：轻巧过网，迫使对手上网挑球。"
        : distFromNet > 0.34
          ? "底线深区落点：充分拉开场地空间，到位干脆。"
          : "中场结合部落点：追身平抽节奏紧凑。";

    runRally(
      [{ from: origin, to: [ux, uy], loft: 0.08 + distFromNet * 0.24 }],
      zoneLabel,
    );
  });

  renderCourt();
}

/* Lens Switcher with Optional View Transitions */
function applyLens(key) {
  currentLens = key;
  lensTabs.forEach((tab) => {
    const selected = tab.dataset.lensTab === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  lensPanels.forEach((panel) => {
    const selected = panel.dataset.lensPanel === key;
    panel.hidden = !selected;
    const stage = $(".lens-stage", panel);
    if (stage) {
      stage.style.viewTransitionName = selected ? "lens-visual" : "none";
    }
  });

  syncMusicLoop();
  if (key !== "court" && activeRallyTween) {
    activeRallyTween.kill();
    if (rallyPlayBtn) rallyPlayBtn.disabled = false;
  }

  requestAnimationFrame(() => {
    if (key === "research") drawRegressionStatic();
    if (key === "music") drawMusicStatic();
    if (key === "court") drawCourtStatic();
    ScrollTrigger.refresh();
  });
}

function switchLens(tab) {
  const key = tab.dataset.lensTab;
  if (!key || key === currentLens) return;

  activeViewTransition?.skipTransition();
  if (document.startViewTransition && !motionQuery.matches) {
    activeViewTransition = document.startViewTransition(() => {
      applyLens(key);
    });
    activeViewTransition.ready.catch(() => {});
    activeViewTransition.finished.catch(() => {});
  } else {
    applyLens(key);
    const targetPanel = $(`[data-lens-panel="${key}"]`);
    if (targetPanel && !motionQuery.matches) {
      gsap.fromTo(
        targetPanel,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.34, ease: "power2.out", clearProps: "opacity,transform" },
      );
    }
  }
}

lensTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchLens(tab));
});
bindTabKeyboard(lensTabs, switchLens);
applyLens("research");

/* ==========================================================================
   5. Entrance & Scroll-Linked Reveal Choreography
   ========================================================================== */
responsiveMedia.add("(prefers-reduced-motion: no-preference)", () => {
  const heroLines = $$("#hero-title .reveal-line > span");
  if (heroLines.length) {
    gsap.from(heroLines, {
      yPercent: 105,
      duration: 0.85,
      stagger: 0.1,
      ease: "power3.out",
      clearProps: "transform",
    });
  }

  const revealBlocks = $$("[data-reveal]");
  if (revealBlocks.length) {
    ScrollTrigger.batch(revealBlocks, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.72,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        );
      },
    });
  }
});

/* Live Reduced-Motion & Visibility Listeners */
document.addEventListener("visibilitychange", () => {
  syncHeroLoop();
  syncNetworkLoop();
  syncMusicLoop();
});

motionQuery.addEventListener("change", () => {
  syncMotionMode();
  if (motionQuery.matches) {
    activeViewTransition?.skipTransition();
    agentTimeline?.kill();
    if (agentReplayBtn) agentReplayBtn.disabled = false;
    activeRallyTween?.kill();
    if (rallyPlayBtn) rallyPlayBtn.disabled = false;
  }
  updateMusicButtonState();
  syncHeroLoop();
  syncNetworkLoop();
  syncMusicLoop();
  renderHeroSnapshot();
  drawNetworkStatic();
  drawClusterStatic();
  drawRegressionStatic();
  drawMusicStatic();
  drawCourtStatic();
  ScrollTrigger.refresh();
});

document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
