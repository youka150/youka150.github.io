import { gsap } from "gsap";
import "../project.css";
import "../interests.css";
import { setupPointerDetails } from "./pointer.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");

document.documentElement.classList.add("js");

const yearEl = $("#year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function syncMotionMode() {
  document.documentElement.dataset.motion = motionQuery.matches ? "reduced" : "full";
}
syncMotionMode();

const sectionLinks = $$(".primary-nav .nav-link");
const navSections = sectionLinks.map((link) => document.querySelector(link.hash));
function updateCurrentSection() {
  const readingLine = window.innerHeight * 0.36;
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const current = atEnd ? navSections.at(-1) : navSections.find((section) => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= readingLine && bounds.bottom > readingLine;
  });
  for (const link of sectionLinks) {
    if (link.hash === `#${current?.id}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("scroll", updateCurrentSection, { passive: true });
window.addEventListener("resize", updateCurrentSection, { passive: true });
updateCurrentSection();

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

setupPointerDetails();

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
   3. Community — Interactive Method Notes
   ========================================================================== */
const stageTabs = $$("[data-stage-tab]");
const stageScenes = $$("[data-scene]");
let activeStage = 0;
let agentAutoPlayed = false;

/* --- Scene 0: Interactive Directed Weighted Network --- */
const networkCanvas = $("#network-canvas");
const networkTooltip = $("#network-tooltip");
const influenceSlider = $("#influence-slider");
const topologyOutput = $("#topology-share");
const qualityOutput = $("#quality-share");
const weightPresetBtns = $$("[data-weight-preset]");
let drawNetworkStatic = () => {};

if (networkCanvas) {
  const communityColors = ["#47634c", "#ab5839", "#6b737e"];
  const netNodes = [
    { id: 0, label: "算子答主", group: 0, nx: 0.34, ny: 0.38, topo: 0.94, qual: 0.88, desc: "常回答算子编译问题，也会贴出调试代码" },
    { id: 1, label: "跨组答疑者", group: 1, nx: 0.54, ny: 0.48, topo: 0.97, qual: 0.64, desc: "同时参与框架和应用讨论，把两边遇到的报错联系起来" },
    { id: 2, label: "教程作者", group: 2, nx: 0.72, ny: 0.31, topo: 0.58, qual: 0.98, desc: "发帖不多，教程里通常附有复现步骤和脚本" },
    { id: 3, label: "部署开发者", group: 0, nx: 0.22, ny: 0.25, topo: 0.68, qual: 0.79, desc: "分享量化模型在不同设备上的部署记录" },
    { id: 4, label: "框架维护者", group: 0, nx: 0.25, ny: 0.6, topo: 0.83, qual: 0.74, desc: "跟进版本迁移，经常收到其他用户的回复" },
    { id: 5, label: "日志分析者", group: 1, nx: 0.47, ny: 0.74, topo: 0.79, qual: 0.71, desc: "从调试日志里查找驱动与环境报错的原因" },
    { id: 6, label: "评测作者", group: 2, nx: 0.81, ny: 0.57, topo: 0.51, qual: 0.92, desc: "在相同条件下测试模型性能，分享对比记录" },
    { id: 7, label: "提问者", group: 1, nx: 0.62, ny: 0.73, topo: 0.73, qual: 0.42, desc: "描述自己遇到的问题，并在回复中补充测试结果" },
    { id: 8, label: "内核开发者", group: 0, nx: 0.14, ny: 0.44, topo: 0.46, qual: 0.84, desc: "记录算子流水线的性能瓶颈和调优方法" },
    { id: 9, label: "入门指南作者", group: 2, nx: 0.68, ny: 0.16, topo: 0.64, qual: 0.66, desc: "整理初次安装时容易漏掉的配置步骤" },
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

  let pointedNode = -1;
  let pinnedNode = -1;
  const initialHint = networkTooltip?.textContent.trim() || "指向或轻点一个节点，查看它连接了谁。";
  const surface = setupResponsiveCanvas(networkCanvas, drawNetwork);

  function drawNetwork() {
    const { width, height, ctx } = surface();
    if (!ctx || width < 10 || height < 10) return;
    ctx.clearRect(0, 0, width, height);

    const selected = pointedNode >= 0 ? pointedNode : pinnedNode;
    const neighbours = new Set([selected]);
    netEdges.forEach(([from, to]) => {
      if (from === selected) neighbours.add(to);
      if (to === selected) neighbours.add(from);
    });

    // One ink per community. A thin ring distinguishes the three highest scores.
    const unit = Math.min(1, width / 510);
    for (const n of netNodes) {
      n.x = width * n.nx;
      n.y = height * (0.06 + n.ny * 1.08);
      n.radius = unit * (3.5 + n.score * 8 + (n.rank <= 3 ? 1.5 : 0));
    }

    for (const [from, to, weight] of netEdges) {
      const a = netNodes[from];
      const b = netNodes[to];
      const highlighted = from === selected || to === selected;
      const bendX = (a.x + b.x) / 2 - (b.y - a.y) * 0.08;
      const bendY = (a.y + b.y) / 2 + (b.x - a.x) * 0.08;
      const angle = Math.atan2(b.y - bendY, b.x - bendX);
      const tipX = b.x - Math.cos(angle) * (b.radius + 3);
      const tipY = b.y - Math.sin(angle) * (b.radius + 3);

      ctx.strokeStyle = highlighted ? "#a6482e" : "#50634b";
      ctx.globalAlpha = highlighted ? 0.9 : selected < 0 ? 0.32 + weight * 0.25 : 0.12;
      ctx.lineWidth = highlighted ? 1.7 : 0.6 + weight * 0.75;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(bendX, bendY, tipX, tipY);
      ctx.stroke();
      const arrow = highlighted ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(tipX - arrow * Math.cos(angle - 0.55), tipY - arrow * Math.sin(angle - 0.55));
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX - arrow * Math.cos(angle + 0.55), tipY - arrow * Math.sin(angle + 0.55));
      ctx.stroke();
    }

    for (const n of netNodes) {
      const focus = n.id === selected;
      ctx.globalAlpha = selected < 0 || neighbours.has(n.id) ? 1 : 0.25;
      ctx.fillStyle = communityColors[n.group];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fill();
      if (focus || n.rank <= 3) {
        ctx.strokeStyle = focus ? "#a6482e" : communityColors[n.group];
        ctx.lineWidth = focus ? 2 : 0.9;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (focus ? 5 : 3), 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // On narrow diagrams label just the leading node. Any node can be inspected.
    const labelCount = width < 450 ? 1 : 3;
    const labelled = selected >= 0
      ? [netNodes[selected]]
      : netNodes.filter((node) => node.rank <= labelCount);
    ctx.font = '500 13px "DM Sans", "PingFang SC", sans-serif';
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    for (const n of labelled) {
      const text = n.label;
      const half = ctx.measureText(text).width / 2 + 2;
      const x = Math.max(half, Math.min(width - half, n.x));
      const y = Math.max(15, n.y - n.radius - 10);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f5f3e9";
      ctx.strokeText(text, x, y);
      ctx.fillStyle = "#243c30";
      ctx.fillText(text, x, y);
    }
  }

  function updateNodeReadout() {
    const node = netNodes[pointedNode >= 0 ? pointedNode : pinnedNode];
    if (!networkTooltip) return;
    const text = node
      ? `${node.label} · 综合第 ${node.rank} 位。${node.desc}。`
      : initialHint;
    if (networkTooltip.textContent !== text) networkTooltip.textContent = text;
  }

  function setWeightValue(percent) {
    const pct = Math.min(90, Math.max(10, Number(percent)));
    const topologyWeight = pct / 100;
    netNodes.forEach((n) => {
      n.score = topologyWeight * n.topo + (1 - topologyWeight) * n.qual;
    });
    [...netNodes].sort((a, b) => b.score - a.score).forEach((n, index) => {
      n.rank = index + 1;
    });
    if (influenceSlider) {
      influenceSlider.value = String(pct);
      influenceSlider.setAttribute("aria-valuetext", `网络 ${pct}%，内容 ${100 - pct}%`);
    }
    if (topologyOutput) topologyOutput.textContent = `${pct}%`;
    if (qualityOutput) qualityOutput.textContent = `${100 - pct}%`;
    weightPresetBtns.forEach((btn) => {
      const active = Number(btn.dataset.weightPreset) === pct;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    updateNodeReadout();
    drawNetwork();
  }

  function hitNode(event) {
    const rect = networkCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let found = -1;
    let nearest = Infinity;
    for (const n of netNodes) {
      const distance = Math.hypot(x - n.x, y - n.y);
      if (distance <= Math.max(17, n.radius + 7) && distance < nearest) {
        found = n.id;
        nearest = distance;
      }
    }
    return found;
  }

  function pointAt(id) {
    if (pointedNode === id) return;
    pointedNode = id;
    networkCanvas.style.cursor = id >= 0 ? "pointer" : "";
    updateNodeReadout();
    drawNetwork();
  }

  networkCanvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") pointAt(hitNode(event));
  });
  networkCanvas.addEventListener("pointerleave", () => pointAt(-1));
  networkCanvas.addEventListener("click", (event) => {
    const hit = hitNode(event);
    pinnedNode = pinnedNode === hit ? -1 : hit;
    pointedNode = -1;
    updateNodeReadout();
    drawNetwork();
  });
  networkCanvas.addEventListener("keydown", (event) => {
    const count = netNodes.length;
    const current = pointedNode >= 0 ? pointedNode : pinnedNode;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        pinnedNode = (current + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        pinnedNode = current < 0 ? count - 1 : (current + count - 1) % count;
        break;
      case "Home": pinnedNode = 0; break;
      case "End": pinnedNode = count - 1; break;
      case "Escape": pinnedNode = -1; break;
      default: return;
    }
    event.preventDefault();
    pointedNode = -1;
    updateNodeReadout();
    drawNetwork();
  });

  influenceSlider?.addEventListener("input", () => setWeightValue(influenceSlider.value));
  weightPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => setWeightValue(btn.dataset.weightPreset));
  });
  drawNetworkStatic = () => surface().resize();
  setWeightValue(influenceSlider?.value || 52);
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
      name: "算子研究",
      color: "#496b51",
      cx: 0.25,
      cy: 0.34,
      insight: "算子研究组，帖子常谈编译优化、底层接口和算子迁移。",
    },
    {
      name: "工程排障",
      color: "#ac7440",
      cx: 0.73,
      cy: 0.32,
      insight: "工程排障组，常跨帖解答环境部署、驱动兼容与多卡通信问题。",
    },
    {
      name: "案例分享",
      color: "#994c3b",
      cx: 0.31,
      cy: 0.73,
      insight: "案例分享组，常分享从环境配置到模型运行的完整步骤。",
    },
    {
      name: "潜力用户",
      color: "#67758a",
      cx: 0.71,
      cy: 0.72,
      insight: "潜力用户组，发帖还少，讨论的技术问题已经与核心答主相近。",
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
      size: 2.8 + (i % 3) * 1.1,
    };
  });

  const blendState = { t: 1 }; // 1 = fused, 0 = behavior-only
  let mode = "fused";
  let selectedPersona = -1;
  let pointedPersona = -1;
  let clusterTween;

  const getClusterSurface = setupResponsiveCanvas(clusterCanvas, () => {
    renderClusters();
  });

  function renderClusters() {
    const { width, height, ctx } = getClusterSurface();
    if (!ctx || width < 10) return;

    ctx.clearRect(0, 0, width, height);
    const t = blendState.t;
    const highlighted = pointedPersona >= 0 ? pointedPersona : selectedPersona;

    // Subtle projection axes
    ctx.save();
    ctx.strokeStyle = "#9ca58f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(38, height - 30);
    ctx.lineTo(width - 28, height - 30);
    ctx.moveTo(38, height - 30);
    ctx.lineTo(38, 26);
    ctx.stroke();

    ctx.font = '500 11.5px "Manrope", "PingFang SC", sans-serif';
    ctx.fillStyle = "#59695b";
    ctx.fillText(
      t > 0.5 ? "第一主成分" : "活跃度",
      50,
      height - 11,
    );
    ctx.restore();

    // Cluster hulls & labels when in fused mode
    if (t > 0.08) {
      personaMeta.forEach((meta, gIdx) => {
        const isHighlighted = highlighted === -1 || highlighted === gIdx;
        const alpha = t * (isHighlighted ? 0.045 : 0.015);
        const strokeAlpha = t * (isHighlighted ? 0.64 : 0.18);
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
        ctx.font = '500 13px "Manrope", "PingFang SC", sans-serif';
        ctx.fillStyle = "#243c30";
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

      const isFocused = highlighted === -1 || highlighted === pt.group;
      ctx.save();
      ctx.globalAlpha = isFocused ? 0.92 : 0.18;
      ctx.beginPath();
      ctx.arc(x, y, isFocused && highlighted === pt.group ? pt.size + 1.5 : pt.size, 0, Math.PI * 2);
      ctx.fillStyle =
        t < 0.25 && highlighted === -1
          ? "#657563"
          : personaMeta[pt.group].color;
      ctx.fill();
      ctx.restore();
    });
  }

  drawClusterStatic = () => {
    if (motionQuery.matches) {
      clusterTween?.kill();
      blendState.t = mode === "fused" ? 1 : 0;
    }
    getClusterSurface().resize();
  };

  function updateClusterReadout() {
    if (!clusterInsightText) return;
    clusterInsightText.textContent = personaMeta[selectedPersona]?.insight ||
      (mode === "fused"
        ? "加入帖子内容后，讨论相近话题的点聚在一起。点选一组，看看他们聊什么。"
        : "只看发帖和回复频次，不同话题的用户会挤在同一条带上。");
  }

  function setClusterMode(nextMode) {
    mode = nextMode;
    pointedPersona = -1;
    clusterCanvas.style.cursor = "";
    const target = mode === "fused" ? 1 : 0;
    clusterModeBtns.forEach((btn) => {
      const active = btn.dataset.clusterMode === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    if (clusterBadge) clusterBadge.textContent = mode === "fused"
      ? "按行为与讨论内容分组"
      : "仅按活跃度排列";
    updateClusterReadout();
    clusterTween?.kill();
    if (motionQuery.matches || blendState.t === target) {
      blendState.t = target;
      renderClusters();
    } else {
      clusterTween = gsap.to(blendState, {
        t: target, duration: 0.45, ease: "power2.inOut", onUpdate: renderClusters,
      });
    }
  }

  function selectPersona(idx) {
    selectedPersona = idx;
    personaChips.forEach((chip) => {
      const active = Number(chip.dataset.persona) === idx;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    updateClusterReadout();
    renderClusters();
  }

  clusterModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setClusterMode(btn.dataset.clusterMode));
  });
  personaChips.forEach((btn) => {
    btn.addEventListener("click", () => selectPersona(Number(btn.dataset.persona)));
  });

  function hitPersona(event) {
    if (mode !== "fused" || blendState.t < 0.94) return -1;
    const rect = clusterCanvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width;
    const my = (event.clientY - rect.top) / rect.height;
    return personaMeta.findIndex(({ cx, cy }) =>
      Math.hypot((mx - cx) / 0.155, (my - cy) / 0.165) <= 1);
  }

  clusterCanvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const hit = hitPersona(event);
    if (hit === pointedPersona) return;
    pointedPersona = hit;
    clusterCanvas.style.cursor = hit < 0 ? "" : "pointer";
    renderClusters();
  });
  clusterCanvas.addEventListener("pointerleave", () => {
    pointedPersona = -1;
    clusterCanvas.style.cursor = "";
    renderClusters();
  });
  clusterCanvas.addEventListener("click", (event) => {
    if (mode !== "fused") return;
    const hit = hitPersona(event);
    pointedPersona = -1;
    selectPersona(hit === selectedPersona ? -1 : hit);
  });

  selectPersona(-1);
  setClusterMode("fused");
}

/* --- Scene 2: Reflective Trend Agent Simulator --- */
const agentTopicBtns = $$("[data-agent-topic]");
const agentNodes = $$("[data-agent-step]");
const agentTraceLog = $("#agent-trace-log");
const agentReplayBtn = $("#agent-replay-btn");
let activeAgentTopic = 0;
let agentTimeline;

const agentScenarios = [
  [
    "把昇腾算子迁移拆成动态 Shape、精度对齐和报错排查三个问题。",
    "检索社区问答与技术文档，按问题整理讨论线索。",
    "发现工具链版本信息不足，再补查 msit 精度比对案例。",
    "将昇腾算子迁移的排障路径与证据写入报告，逐段返回。",
  ],
  [
    "从部署、调用延迟与内存占用三个角度梳理鸿蒙端侧推理。",
    "从开发者讨论中整理量化压缩的实践问题。",
    "图像与语音案例不足，带着这两个条件再检索一次。",
    "按场景整理鸿蒙端侧推理的实践案例，逐段返回报告。",
  ],
];

function playAgentSimulation() {
  if (!agentNodes.length || !agentTraceLog) return;
  agentTimeline?.kill();
  const steps = agentScenarios[activeAgentTopic];
  const showStep = (index, complete = false) => {
    agentNodes.forEach((node, stepIndex) => {
      node.classList.toggle("is-running", !complete && stepIndex === index);
      node.classList.toggle("is-done", complete || stepIndex < index);
    });
    agentTraceLog.textContent = steps[index];
  };
  const finish = () => {
    showStep(steps.length - 1, true);
    if (agentReplayBtn) agentReplayBtn.disabled = false;
  };
  if (motionQuery.matches) {
    finish();
    return;
  }
  if (agentReplayBtn) agentReplayBtn.disabled = true;
  agentTimeline = gsap.timeline({ onComplete: finish });
  steps.forEach((_, index) => {
    agentTimeline.call(() => showStep(index), [], index * 0.75);
  });
  agentTimeline.to({}, { duration: 0.55 });
}

function selectAgentTopic(index) {
  activeAgentTopic = index;
  agentTopicBtns.forEach((btn) => {
    const active = Number(btn.dataset.agentTopic) === index;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
agentTopicBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectAgentTopic(Number(btn.dataset.agentTopic));
    playAgentSimulation();
  });
});
selectAgentTopic(0);

agentReplayBtn?.addEventListener("click", playAgentSimulation);

/* Each tab opens one spread with its notes and diagram. */
function showStage(index, { animate = true } = {}) {
  if (!stageScenes[index]) return;
  const changed = activeStage !== index;
  activeStage = index;

  stageTabs.forEach((tab) => {
    const selected = Number(tab.dataset.stageTab) === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  stageScenes.forEach((scene, sIdx) => {
    gsap.killTweensOf(scene);
    gsap.set(scene, { clearProps: "opacity,transform" });
    scene.hidden = sIdx !== index;
  });

  if (index === 0) requestAnimationFrame(drawNetworkStatic);
  if (index === 1) requestAnimationFrame(drawClusterStatic);
  if (index === 2 && !agentAutoPlayed) {
    agentAutoPlayed = true;
    playAgentSimulation();
  }

  if (index !== 2 && agentTimeline?.isActive()) agentTimeline.progress(1);
  if (changed && animate && !motionQuery.matches) {
    gsap.fromTo(
      stageScenes[index],
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.36, ease: "power2.out", clearProps: "opacity,transform" },
    );
  }
}

function activateStageTab(tab) {
  showStage(Number(tab.dataset.stageTab));
}
stageTabs.forEach((tab) => tab.addEventListener("click", () => activateStageTab(tab)));
bindTabKeyboard(stageTabs, activateStageTab);
showStage(0, { animate: false });

/* ==========================================================================
   4. Personal Studio — Three Everyday Lenses
   ========================================================================== */
const lensTabs = $$("[data-lens-tab]");
const lensPanels = $$("[data-lens-panel]");
let currentLens = "research";

// Synthetic samples have opposite pooled and within-group slopes.
const regressionCanvas = $("#regression-canvas");
const regressionToggleBtn = $("#regression-toggle-btn");
const regressionReadout = $("#regression-readout");
let drawRegressionStatic = () => {};

if (regressionCanvas) {
  const strata = [
    { name: "A 组", color: "#526a4e", x: 0.27, y: 0.67 },
    { name: "B 组", color: "#a6482e", x: 0.51, y: 0.48 },
    { name: "C 组", color: "#344f5f", x: 0.75, y: 0.29 },
  ];
  const points = strata.flatMap((group, index) =>
    Array.from({ length: 12 }, (_, k) => {
      const offset = (k - 5.5) / 5.5;
      const jitter = (((k * 13 + index * 7) % 9) - 4) * 0.011;
      return { x: group.x + offset * 0.125, y: group.y + offset * 0.082 + jitter, index };
    }),
  );

  function fitLine(samples) {
    const meanX = samples.reduce((sum, p) => sum + p.x, 0) / samples.length;
    const meanY = samples.reduce((sum, p) => sum + p.y, 0) / samples.length;
    const covariance = samples.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
    const variance = samples.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
    return (x) => meanY + (covariance / variance) * (x - meanX);
  }

  const pooledFit = fitLine(points);
  const groupFits = strata.map((_, i) => fitLine(points.filter((p) => p.index === i)));
  const view = { grouped: false, mix: 0 };
  let fitTween;

  const surface = setupResponsiveCanvas(regressionCanvas, drawRegression);
  function drawRegression() {
    const { width, height, ctx } = surface();
    if (!ctx || width < 10) return;
    const left = width < 420 ? 24 : 40;
    const right = width - left;
    const top = 24;
    const base = height - 30;
    const xAt = (x) => left + x * (right - left);
    const yAt = (y) => top + y * (base - top);
    const mix = view.mix;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.font = '13px "DM Sans", sans-serif';
    ctx.fillStyle = "#59695b";
    ctx.fillText("Y", left - 6, top - 8);
    ctx.fillText("X", right - 6, base + 18);
    for (const fraction of [0.25, 0.5, 0.75]) {
      ctx.fillStyle = "#243c3016";
      ctx.fillRect(left, yAt(fraction), right - left, 1);
    }
    ctx.strokeStyle = "#788373";
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, base);
    ctx.lineTo(right, base);
    ctx.stroke();

    function drawFit(fit, x1, x2) {
      ctx.beginPath();
      ctx.moveTo(xAt(x1), yAt(fit(x1)));
      ctx.lineTo(xAt(x2), yAt(fit(x2)));
      ctx.stroke();
    }

    ctx.globalAlpha = 1 - mix * 0.8;
    ctx.strokeStyle = "#a6482e";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    drawFit(pooledFit, 0.08, 0.94);
    ctx.setLineDash([]);
    if (mix > 0) {
      ctx.globalAlpha = mix;
      strata.forEach((group, i) => {
        ctx.strokeStyle = group.color;
        drawFit(groupFits[i], group.x - 0.15, group.x + 0.15);
        ctx.fillStyle = group.color;
        ctx.fillText(group.name, xAt(group.x) - 10, yAt(group.y - 0.15));
      });
    }
    ctx.globalAlpha = 0.83;
    points.forEach((p) => {
      ctx.fillStyle = mix > 0.35 ? strata[p.index].color : "#334a37";
      ctx.beginPath();
      ctx.arc(xAt(p.x), yAt(p.y), width < 420 ? 3.3 : 4.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawRegressionStatic = () => {
    if (motionQuery.matches) {
      fitTween?.kill();
      view.mix = Number(view.grouped);
    }
    surface().resize();
    drawRegression();
  };

  function toggleGrouping() {
    view.grouped = !view.grouped;
    regressionToggleBtn.setAttribute("aria-pressed", String(view.grouped));
    $(".btn-label", regressionToggleBtn).textContent = view.grouped ? "合在一起看" : "分组看样本";
    regressionReadout.textContent = view.grouped
      ? "三组的拟合线都向下。这是一个辛普森悖论的例子。"
      : "现在显示全部样本的拟合线。";
    fitTween?.kill();
    if (motionQuery.matches) {
      view.mix = Number(view.grouped);
      drawRegression();
    } else {
      fitTween = gsap.to(view, { mix: Number(view.grouped), duration: 0.38, onUpdate: drawRegression });
    }
  }

  regressionToggleBtn.addEventListener("click", toggleGrouping);
  regressionCanvas.addEventListener("click", toggleGrouping);
  drawRegression();
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
  let musicInView = !("IntersectionObserver" in window);
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
      pluckBoost *= Math.exp(-dt * 4);
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
      ctx.fillStyle = "rgba(80, 99, 75, 0.15)";
      ctx.beginPath();
      ctx.roundRect(x - 2.5, midY - amp * 0.5, 5, amp, 3);
      ctx.fill();
    }

    // Three layered harmonic strings
    const ribbons = [
      { color: "#a6482e", alpha: 0.85, freq: 2.2, amp: 0.18, speed: 1.0, width: 2.2 },
      { color: "#50634b", alpha: 0.72, freq: 3.1, amp: 0.13, speed: -0.75, width: 1.8 },
      { color: "#243c30", alpha: 0.35, freq: 1.5, amp: 0.09, speed: 0.5, width: 1.3 },
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
          ? "继续律动"
          : "暂停律动";
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
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.tempoPreset) === tempoValue));
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

  function pluck(x) {
    pluckX = Math.min(1, Math.max(0, x));
    pluckBoost = Math.min(1.1, pluckBoost + 0.42);
    if (musicPaused || motionQuery.matches) wavePhase += 0.31;
    renderMusic(0);
  }
  function pluckAtPointer(event) {
    const rect = musicCanvas.getBoundingClientRect();
    pluck((event.clientX - rect.left) / rect.width);
  }
  musicCanvas.addEventListener("pointerdown", pluckAtPointer);
  musicCanvas.addEventListener("pointermove", (event) => {
    if (!motionQuery.matches && !musicPaused && event.pointerType !== "touch") pluckAtPointer(event);
  });
  musicCanvas.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      pluck(0.5);
    }
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

  let target = null;
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

    ctx.save();
    ctx.fillStyle = "#dce3d2";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = "#758671";
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
    ctx.strokeStyle = "#243c30";
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
      ctx.strokeStyle = "rgba(80, 99, 75, 0.27)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw the portion of the trajectory already traveled.
      ctx.strokeStyle = idx === shuttleState.segIndex || shuttleState.completed ? "#a6482e" : "rgba(166, 72, 46, 0.5)";
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
        ctx.strokeStyle = "rgba(166, 72, 46, 0.55)";
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
        ctx.fillStyle = "rgba(166, 72, 46, 0.16)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = "#a6482e";
        ctx.fill();
      }
      ctx.restore();
    });
    if (target) {
      const [x, y] = toCourtXY(target);
      ctx.save();
      ctx.strokeStyle = "#243c30";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x - 5, y);
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y - 5);
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x, y + 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCourtStatic = () => {
    if (motionQuery.matches) {
      shuttleState.completed = true;
      shuttleState.segT = 1;
      shuttleState.segIndex = activeSegments.length - 1;
    }
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
      shotTypeBtns.forEach((item) => item.setAttribute("aria-pressed", String(item === btn)));
      const preset = rallies[currentShotKey] || rallies.clear;
      runRally(preset.shots, preset.label);
    });
  });

  rallyPlayBtn?.addEventListener("click", () => {
    runRally(activeSegments, courtReadout.textContent);
  });

  function aimAtPointer(event) {
    const { width, height } = getCourtSurface();
    const box = getCourtBox(width, height);
    const rect = courtCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - box.x) / box.w;
    const y = (event.clientY - rect.top - box.y) / box.h;
    target = x < 0 || x > 1 || y < 0 || y > 1 ? null : [x, y];
    renderCourt();
  }

  function hitTarget() {
    if (!target) return;
    const [x, y] = target;
    const origin = x < 0.5 ? [0.78, 0.52] : [0.22, 0.52];
    const depth = Math.abs(x - 0.5);
    const zone = depth < 0.16 ? "网前" : depth > 0.34 ? "底线" : "中场";
    shotTypeBtns.forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    runRally([{ from: origin, to: [x, y], loft: 0.08 + depth * 0.24 }], "这一拍落在" + zone + "。");
  }

  courtCanvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") aimAtPointer(event);
  });
  courtCanvas.addEventListener("click", (event) => {
    aimAtPointer(event);
    hitTarget();
  });
  courtCanvas.addEventListener("focus", () => {
    target ??= [0.75, 0.5];
    renderCourt();
  });
  function clearTarget() {
    target = null;
    renderCourt();
  }
  courtCanvas.addEventListener("pointerleave", clearTarget);
  courtCanvas.addEventListener("blur", clearTarget);
  courtCanvas.addEventListener("keydown", (event) => {
    const directions = { ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      target ??= [0.75, 0.5];
      hitTarget();
    } else if (directions[event.key]) {
      event.preventDefault();
      const [x, y] = target || [0.75, 0.5];
      const [dx, dy] = directions[event.key];
      target = [Math.max(0.02, Math.min(0.98, x + dx)), Math.max(0.02, Math.min(0.98, y + dy))];
      renderCourt();
    }
  });

  renderCourt();
}

function applyLens(key, animate = false) {
  currentLens = key;
  lensTabs.forEach((tab) => {
    const selected = tab.dataset.lensTab === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  lensPanels.forEach((panel) => {
    panel.hidden = panel.dataset.lensPanel !== key;
  });
  if (key !== "court" && activeRallyTween) {
    activeRallyTween.progress(1).kill();
  }
  syncMusicLoop();

  const panel = document.getElementById("lens-panel-" + key);
  if (key === "research") drawRegressionStatic();
  if (key === "music") drawMusicStatic();
  if (key === "court") drawCourtStatic();
  if (animate && !motionQuery.matches) {
    gsap.fromTo($(".lens-figure", panel), { opacity: 0.45 }, {
      opacity: 1, duration: 0.24, overwrite: true, clearProps: "opacity",
    });
  }
}

function switchLens(tab) {
  const key = tab.dataset.lensTab;
  if (key && key !== currentLens) applyLens(key, true);
}

lensTabs.forEach((tab) => tab.addEventListener("click", () => switchLens(tab)));
bindTabKeyboard(lensTabs, switchLens);
applyLens("research");

/* Live Reduced-Motion & Visibility Listeners */
document.addEventListener("visibilitychange", () => {
  syncMusicLoop();
});

motionQuery.addEventListener("change", () => {
  syncMotionMode();
  if (motionQuery.matches) {
    if (agentTimeline?.isActive()) playAgentSimulation();
    activeRallyTween?.progress(1).kill();
    if (rallyPlayBtn) rallyPlayBtn.disabled = false;
  }
  updateMusicButtonState();
  syncMusicLoop();
  drawNetworkStatic();
  drawClusterStatic();
  drawRegressionStatic();
  drawMusicStatic();
  drawCourtStatic();
});
