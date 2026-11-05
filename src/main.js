import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const desktopStory = matchMedia("(min-width: 981px)");
const media = gsap.matchMedia();
let lenis, rallyTween, agentTimeline, atlasTransition;
let musicInViewport = false;
let musicTicking = false;
let musicPaused = false;
let pendingAtlas;

// All prose is present before enhancement; animations never gate the content.
document.documentElement.classList.add("js");
if ($("#year")) $("#year").textContent = String(new Date().getFullYear());
function configureScrolling() {
  lenis?.destroy();
  lenis = undefined;
  // A single scroll animator avoids native smooth-scroll competing with Lenis.
  document.documentElement.style.scrollBehavior = "auto";
  document.documentElement.dataset.motion = motionPreference.matches
    ? "reduced"
    : "full";
  if (!motionPreference.matches) {
    lenis = new Lenis({
      duration: 0.95,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -100 },
    });
    lenis.on("scroll", ScrollTrigger.update);
  }
}
configureScrolling();
gsap.ticker.add((time) => lenis?.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// A session-only curtain, deliberately without a simulated loading percentage.
const splash = $(".splash");
let firstVisit = false;
try {
  firstVisit = !sessionStorage.getItem("youka-journal-v2");
  sessionStorage.setItem("youka-journal-v2", "visited");
} catch {
  /* Skip the curtain when session storage is unavailable. */
}
if (splash) {
  if (firstVisit && !motionPreference.matches) {
    splash.classList.add("active");
    gsap
      .timeline({ onComplete: () => splash.remove() })
      .from(".splash-word", {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      })
      .to(
        splash,
        { clipPath: "inset(0 0 100% 0)", duration: 0.85, ease: "power4.inOut" },
        0.65,
      );
  } else splash.remove();
}

const menuButton = $(".menu-toggle");
const mobileNav = $(".mobile-nav");
function closeMenu({ restoreFocus = false } = {}) {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "打开导航");
  mobileNav.hidden = true;
  if (restoreFocus) menuButton.focus();
}
if (menuButton && mobileNav) {
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    mobileNav.hidden = !open;
  });
  $$("a", mobileNav).forEach((link) =>
    link.addEventListener("click", () => closeMenu()),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileNav.hidden)
      closeMenu({ restoreFocus: true });
  });
  document.addEventListener("click", (event) => {
    if (
      !mobileNav.hidden &&
      !mobileNav.contains(event.target) &&
      !menuButton.contains(event.target)
    )
      closeMenu();
  });
  matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });
}
const header = $(".header");
function updateHeader() {
  header?.classList.toggle("is-scrolled", scrollY > 24);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// InsightAI's diagrams can be selected directly as well as through the narrative.
const projectTabs = $$("[data-project-tab]");
const projectScenes = $$("[data-scene]");
const projectSteps = $$("[data-step]");
let currentScene = -1;
let manuallySelectedUntil = 0;
let projectNavigationTimer;
let projectNavigationToken = 0;
let agentHasPlayed = false;
function showProjectScene(index, { animate = true } = {}) {
  if (!projectScenes[index] || currentScene === index) return;
  const previous = projectScenes[currentScene];
  currentScene = index;
  projectTabs.forEach((tab) => {
    const selected = Number(tab.dataset.projectTab) === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle("is-active", selected);
  });
  projectSteps.forEach((step) =>
    step.classList.toggle("is-active", Number(step.dataset.step) === index),
  );
  projectScenes.forEach((scene, sceneIndex) => {
    gsap.killTweensOf(scene);
    gsap.set(scene, { clearProps: "opacity,transform,visibility" });
    scene.hidden = sceneIndex !== index;
    scene.classList.toggle("is-active", sceneIndex === index);
  });
  const stage = projectScenes[index].closest(".project-visual");
  if (stage) stage.dataset.activeScene = String(index);
  if ($(".scene-counter"))
    $(".scene-counter").textContent =
      `${String(index + 1).padStart(2, "0")} / 03`;
  if (previous && animate && !motionPreference.matches) {
    gsap.fromTo(
      projectScenes[index],
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.48,
        ease: "power2.out",
        clearProps: "opacity,transform",
      },
    );
  }
  if (index === 2 && !agentHasPlayed && !motionPreference.matches) {
    agentHasPlayed = true;
    replayAgent();
  }
}
function syncProjectSceneToReadingPosition() {
  if (!desktopStory.matches) return;
  const readingLine = innerHeight * 0.52;
  const chapters = projectSteps.map((step) => ({
    step,
    bounds: step.getBoundingClientRect(),
  }));
  const current =
    chapters.find(
      ({ bounds }) => bounds.top <= readingLine && bounds.bottom >= readingLine,
    ) ||
    chapters
      .filter(({ bounds }) => bounds.bottom > 100 && bounds.top < innerHeight)
      .sort(
        (left, right) =>
          Math.abs(left.bounds.top - readingLine) -
          Math.abs(right.bounds.top - readingLine),
      )[0];
  if (current) showProjectScene(Number(current.step.dataset.step));
}
function finishProjectNavigation() {
  clearTimeout(projectNavigationTimer);
  manuallySelectedUntil = 0;
  requestAnimationFrame(syncProjectSceneToReadingPosition);
}
function scrollToProjectStep(index) {
  const step = projectSteps.find(
    (element) => Number(element.dataset.step) === index,
  );
  if (!step || !desktopStory.matches) return;
  clearTimeout(projectNavigationTimer);
  const navigationToken = ++projectNavigationToken;
  manuallySelectedUntil = performance.now() + 1200;
  const finish = () => {
    if (navigationToken === projectNavigationToken) finishProjectNavigation();
  };
  projectNavigationTimer = setTimeout(finish, 1150);
  const offset = -Math.min(180, innerHeight * 0.2);
  if (lenis)
    lenis.scrollTo(step, { offset, duration: 0.9, onComplete: finish });
  else {
    window.scrollTo({
      top: scrollY + step.getBoundingClientRect().top + offset,
      behavior: "instant",
    });
    requestAnimationFrame(finish);
  }
}
function interruptProjectNavigation() {
  if (!manuallySelectedUntil) return;
  ++projectNavigationToken;
  lenis?.reset();
  finishProjectNavigation();
}
window.addEventListener("wheel", interruptProjectNavigation, {
  passive: true,
  capture: true,
});
window.addEventListener("touchstart", interruptProjectNavigation, {
  passive: true,
  capture: true,
});
window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "].includes(event.key))
    interruptProjectNavigation();
});
window.addEventListener(
  "scroll",
  () => {
    // Native anchor jumps or assistive navigation must also interrupt an animated jump.
    if (
      manuallySelectedUntil &&
      lenis &&
      Math.abs(scrollY - lenis.animatedScroll) > 5
    )
      interruptProjectNavigation();
  },
  { passive: true },
);
function addTabKeyboardNavigation(tabs, activate) {
  tabs.forEach((tab, index) =>
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft")
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      activate(tabs[next]);
    }),
  );
}
function activateProjectTab(tab) {
  const index = Number(tab.dataset.projectTab);
  showProjectScene(index);
  scrollToProjectStep(index);
}
projectTabs.forEach((tab) =>
  tab.addEventListener("click", () => activateProjectTab(tab)),
);
addTabKeyboardNavigation(projectTabs, activateProjectTab);
showProjectScene(0, { animate: false });

// This control modifies an explanatory graph, not a made-up community ranking.
const influenceWeight = $("#influence-weight");
const networkNodes = $$(".network-node");
const baseRadii = networkNodes.map(
  (node) => Number(node.getAttribute("r")) || 7,
);
function updateInfluenceWeight({ animate = false } = {}) {
  if (!influenceWeight) return;
  const networkShare = Number(influenceWeight.value);
  if ($("#network-weight"))
    $("#network-weight").textContent = `${networkShare}%`;
  if ($("#content-weight"))
    $("#content-weight").textContent = `${100 - networkShare}%`;
  influenceWeight.setAttribute(
    "aria-valuetext",
    `关系权重 ${networkShare}%，内容权重 ${100 - networkShare}%`,
  );
  const intensity = networkShare / 100;
  networkNodes.forEach((node, index) => {
    const radius =
      baseRadii[index] * (0.74 + intensity * (index % 3 === 0 ? 0.8 : 0.25));
    const values = { attr: { r: radius }, opacity: 0.48 + intensity * 0.52 };
    if (animate && !motionPreference.matches)
      gsap.to(node, { ...values, duration: 0.3, overwrite: true });
    else gsap.set(node, values);
  });
  const edges = $$(".network-edge");
  if (edges.length)
    gsap.to(edges, {
      opacity: 0.2 + intensity * 0.5,
      duration: motionPreference.matches ? 0 : 0.3,
      overwrite: true,
    });
}
influenceWeight?.addEventListener("input", () =>
  updateInfluenceWeight({ animate: true }),
);
updateInfluenceWeight();

function replayAgent() {
  const steps = $$(".agent-step");
  const button = $("[data-agent-replay]");
  const status = $("#agent-status");
  if (!steps.length) return;
  agentTimeline?.kill();
  gsap.set(steps, { clearProps: "opacity,transform" });
  steps.forEach((step) => step.classList.remove("is-running", "is-complete"));
  const finish = () => {
    steps.forEach((step) => {
      step.classList.remove("is-running");
      step.classList.add("is-complete");
    });
    if (button) button.disabled = false;
    if (status) status.textContent = "从规划到报告，每一步都有迹可循。";
  };
  if (motionPreference.matches) {
    finish();
    return;
  }
  if (button) button.disabled = true;
  if (status) status.textContent = "正在演示分析流程。";
  agentTimeline = gsap.timeline({ onComplete: finish });
  steps.forEach((step, index) => {
    agentTimeline.call(
      () => {
        steps[index - 1]?.classList.replace("is-running", "is-complete");
        step.classList.add("is-running");
      },
      [],
      index * 0.42,
    );
    agentTimeline.fromTo(
      step,
      { opacity: 0.4, x: -6 },
      {
        opacity: 1,
        x: 0,
        duration: 0.36,
        ease: "power2.out",
        clearProps: "opacity,transform",
      },
      index * 0.42,
    );
  });
}
$("[data-agent-replay]")?.addEventListener("click", replayAgent);

// Three personal lenses occupy the same spread, with one shared visual transition.
const atlasTabs = $$("[data-atlas-tab]");
const atlasPanels = $$("[data-atlas-panel]");
let currentAtlas = atlasTabs[0]?.dataset.atlasTab;
function commitAtlas(key) {
  currentAtlas = key;
  atlasTabs.forEach((tab) => {
    const selected = tab.dataset.atlasTab === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle("is-active", selected);
  });
  atlasPanels.forEach((panel) => {
    const selected = panel.dataset.atlasPanel === key;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
    const visual = $(".atlas-art, .atlas-visual", panel);
    if (visual)
      visual.style.viewTransitionName = selected ? "atlas-scene" : "none";
  });
  const atlas = $(".atlas");
  if (atlas) atlas.dataset.activeAtlas = key;
  syncMusicTicker();
  if (key !== "court" && rallyTween?.isActive()) {
    rallyTween.kill();
    const button = $("[data-rally]");
    if (button) button.disabled = false;
    if ($("#rally-status"))
      $("#rally-status").textContent = "再来一拍，感受球的轨迹。";
  }
  requestAnimationFrame(() => ScrollTrigger.refresh());
}
function activateAtlas(tab) {
  const key = tab.dataset.atlasTab;
  if (key === currentAtlas && !pendingAtlas) return;
  atlasTransition?.skipTransition();
  const nextPanel = atlasPanels.find(
    (panel) => panel.dataset.atlasPanel === key,
  );
  if (!nextPanel) return;
  pendingAtlas = key;
  if (document.startViewTransition && !motionPreference.matches) {
    atlasTransition = document.startViewTransition(() => {
      if (pendingAtlas === key) commitAtlas(key);
    });
    // Skipping an in-flight transition rejects ready even though finished resolves.
    atlasTransition.ready.catch(() => {});
    atlasTransition.updateCallbackDone.catch(() => {});
    atlasTransition.finished
      .catch(() => {})
      .finally(() => {
        if (pendingAtlas === key) pendingAtlas = undefined;
      });
  } else {
    commitAtlas(key);
    pendingAtlas = undefined;
    if (!motionPreference.matches)
      gsap.fromTo(
        nextPanel,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          clearProps: "opacity,transform",
          overwrite: true,
        },
      );
  }
}
atlasTabs.forEach((tab) =>
  tab.addEventListener("click", () => activateAtlas(tab)),
);
addTabKeyboardNavigation(atlasTabs, activateAtlas);
if (currentAtlas) commitAtlas(currentAtlas);

const researchToggle = $("[data-research-toggle]");
const researchToggleLabel = researchToggle?.textContent.trim();
researchToggle?.addEventListener("click", () => {
  const showContext = researchToggle.getAttribute("aria-pressed") !== "true";
  researchToggle.setAttribute("aria-pressed", String(showContext));
  researchToggle.textContent = showContext
    ? "回到单一关系 ↺"
    : researchToggleLabel;
  $(".research-graphic")?.classList.toggle("show-context", showContext);
  if ($("#research-status"))
    $("#research-status").textContent = showContext
      ? "把背景条件放进来，再理解变量之间的关系。"
      : "先观察两个变量之间的关系。";
});

const rhythmRange = $("#rhythm-range");
const soundGroup = $(".sound-bars");
if (soundGroup && !$(".sound-bar", soundGroup)) {
  for (let index = 0; index < 37; index++) {
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.classList.add("sound-bar");
    bar.setAttribute("x", String(92 + index * 13));
    bar.setAttribute("width", "8");
    bar.setAttribute("rx", "4");
    soundGroup.append(bar);
  }
}
const soundBars = $$(".sound-bar");
function drawSound(phase) {
  soundBars.forEach((bar, index) => {
    const envelope = Math.sin(
      (index / Math.max(1, soundBars.length - 1)) * Math.PI,
    );
    const height =
      10 +
      Math.abs(
        Math.sin(index * 0.47 - phase) * Math.cos(index * 0.17 + phase * 0.3),
      ) *
        204 *
        (0.3 + envelope * 0.7);
    bar.setAttribute("height", height.toFixed(2));
    bar.setAttribute("y", (215 - height / 2).toFixed(2));
  });
}
function tickMusic(time) {
  drawSound((time * Number(rhythmRange?.value || 60)) / 34);
}
function syncMusicTicker() {
  const shouldTick =
    currentAtlas === "music" &&
    musicInViewport &&
    !musicPaused &&
    !motionPreference.matches &&
    !document.hidden;
  if (shouldTick && !musicTicking) {
    gsap.ticker.add(tickMusic);
    musicTicking = true;
  } else if (!shouldTick && musicTicking) {
    gsap.ticker.remove(tickMusic);
    musicTicking = false;
  }
}
function updateRhythm() {
  if (!rhythmRange) return;
  const value = Number(rhythmRange.value);
  if ($("#rhythm-value"))
    $("#rhythm-value").textContent = `${value} / ${rhythmRange.max}`;
  rhythmRange.setAttribute(
    "aria-valuetext",
    `视觉节奏 ${value}，上限 ${rhythmRange.max}，不播放声音`,
  );
  drawSound(value / 18);
}
rhythmRange?.addEventListener("input", updateRhythm);
updateRhythm();
const musicPanel = $("[data-atlas-panel='music']");
if (musicPanel && "IntersectionObserver" in window) {
  const musicObserver = new IntersectionObserver(
    (entries) => {
      musicInViewport = entries[0].isIntersecting;
      syncMusicTicker();
    },
    { threshold: 0.05 },
  );
  musicObserver.observe(musicPanel);
}
document.addEventListener("visibilitychange", syncMusicTicker);
const musicToggle = $("[data-music-toggle]");
function updateMusicToggle() {
  if (!musicToggle) return;
  const paused = musicPaused || motionPreference.matches;
  musicToggle.setAttribute("aria-pressed", String(paused));
  musicToggle.disabled = motionPreference.matches;
  musicToggle.textContent = motionPreference.matches
    ? "已按系统设置静止"
    : musicPaused
      ? "继续视觉节奏"
      : "暂停视觉节奏";
}
musicToggle?.addEventListener("click", () => {
  musicPaused = !musicPaused;
  updateMusicToggle();
  syncMusicTicker();
});
updateMusicToggle();

const rallyPath = $("#rally-path");
const shuttle = $("#shuttle-point");
const rallyButton = $("[data-rally]");
function placeShuttle(progress) {
  if (!rallyPath || !shuttle) return;
  const length = rallyPath.getTotalLength();
  const point = rallyPath.getPointAtLength(length * progress);
  const previous = rallyPath.getPointAtLength(
    Math.max(0, length * progress - 1),
  );
  const next = rallyPath.getPointAtLength(
    Math.min(length, length * progress + 1),
  );
  const angle =
    (Math.atan2(next.y - previous.y, next.x - previous.x) * 180) / Math.PI;
  shuttle.setAttribute(
    "transform",
    `translate(${point.x} ${point.y}) rotate(${angle})`,
  );
}
placeShuttle(0);
rallyButton?.addEventListener("click", () => {
  rallyTween?.kill();
  const status = $("#rally-status");
  const progress = { value: 0 };
  const finish = () => {
    rallyButton.disabled = false;
    if (status) status.textContent = "这一拍，专注当下。再来一次？";
  };
  if (motionPreference.matches) {
    placeShuttle(1);
    finish();
    return;
  }
  rallyButton.disabled = true;
  if (status) status.textContent = "起拍、飞行、落点。让注意力回到这一刻。";
  placeShuttle(0);
  rallyTween = gsap.to(progress, {
    value: 1,
    duration: 1.8,
    ease: "power1.inOut",
    onUpdate: () => placeShuttle(progress.value),
    onComplete: finish,
  });
});

media.add("(min-width: 981px)", () => {
  projectSteps.forEach((step) =>
    ScrollTrigger.create({
      trigger: step,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => {
        if (self.isActive && performance.now() > manuallySelectedUntil)
          showProjectScene(Number(step.dataset.step));
      },
    }),
  );
});
media.add("(prefers-reduced-motion: no-preference)", () => {
  const titleLines = $$("#hero-title .line > *");
  if (titleLines.length)
    gsap.from(titleLines, {
      yPercent: 110,
      rotate: 2,
      duration: 1.05,
      stagger: 0.12,
      delay: firstVisit ? 0.9 : 0.06,
      ease: "power3.out",
      clearProps: "transform",
    });
  const heroPhoto = $(".hero-photo img, .hero-art img");
  if (heroPhoto)
    gsap.to(heroPhoto, {
      yPercent: 9,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
      },
    });
  const heroOrbit = $(".hero-orbit");
  if (heroOrbit)
    gsap.to(heroOrbit, {
      rotation: 22,
      y: -20,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
      },
    });
  const revealElements = $$(
    "[data-reveal], .project-title-row, .project-intro-row, .atlas-heading, .atlas-bottom, .contact > p, .contact h2",
  );
  if (revealElements.length)
    ScrollTrigger.batch(revealElements, {
      start: "top 94%",
      once: true,
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        ),
    });
  const perspective = $(".reveal-text");
  if (perspective)
    gsap.fromTo(
      perspective,
      { opacity: 0.45, scale: 0.94 },
      {
        opacity: 1,
        scale: 1,
        transformOrigin: "left center",
        ease: "none",
        scrollTrigger: {
          trigger: perspective,
          start: "top 92%",
          end: "center 58%",
          scrub: 0.6,
        },
      },
    );
  const contactMark = $(".contact-star, .contact-mark");
  if (contactMark)
    gsap.to(contactMark, {
      rotation: 100,
      ease: "none",
      scrollTrigger: {
        trigger: "#contact",
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      },
    });
});

motionPreference.addEventListener("change", () => {
  configureScrolling();
  if (motionPreference.matches) {
    atlasTransition?.skipTransition();
    rallyTween?.kill();
    if (rallyButton) rallyButton.disabled = false;
    placeShuttle(1);
    if ($("#rally-status"))
      $("#rally-status").textContent = "减少动态效果已开启，当前显示落点。";
    agentTimeline?.kill();
    gsap.set($$(".agent-step"), { clearProps: "opacity,transform" });
    $$(".agent-step").forEach((step) => {
      step.classList.remove("is-running");
      step.classList.add("is-complete");
    });
    if ($("#agent-status"))
      $("#agent-status").textContent =
        "减少动态效果已开启，当前展示完整分析路径。";
    gsap.killTweensOf(projectScenes);
    gsap.set(projectScenes, { clearProps: "opacity,transform,visibility" });
    const button = $("[data-agent-replay]");
    if (button) button.disabled = false;
    splash?.remove();
  }
  updateRhythm();
  updateMusicToggle();
  syncMusicTicker();
  ScrollTrigger.refresh();
});
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
