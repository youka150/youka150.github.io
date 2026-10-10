import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let lenis;
function configureScroll() {
  lenis?.destroy();
  lenis = undefined;
  if (!reduceMotion.matches) {
    lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
  }
}
configureScroll();
reduceMotion.addEventListener("change", configureScroll);
gsap.ticker.add((time) => lenis?.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
$("#year").textContent = new Date().getFullYear();

// A short, session-only curtain reveal. Content remains available if JS fails.
const splash = $(".splash");
let firstVisit = true;
try {
  firstVisit = !sessionStorage.getItem("youka-visited");
  sessionStorage.setItem("youka-visited", "1");
} catch {
  /* Storage can be disabled. */
}
if (firstVisit && !reduceMotion.matches) {
  splash.classList.add("active");
  const count = { value: 0 };
  gsap
    .timeline({ onComplete: () => splash.remove() })
    .to(
      count,
      {
        value: 100,
        duration: 0.9,
        ease: "power2.inOut",
        onUpdate: () =>
          ($(".splash-count").textContent = String(
            Math.round(count.value),
          ).padStart(2, "0")),
      },
      0,
    )
    .to(".splash-line", { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, 0)
    .to(
      splash,
      { clipPath: "inset(0 0 100% 0)", duration: 0.85, ease: "power4.inOut" },
      1,
    )
    .from(
      ".hero .line > span",
      {
        yPercent: 115,
        rotate: 3,
        duration: 1.15,
        stagger: 0.12,
        ease: "power3.out",
      },
      1.25,
    )
    .from(
      ".hero-art",
      { opacity: 0, y: 35, duration: 1.1, ease: "power2.out" },
      1.4,
    );
} else splash.remove();

const menuButton = $(".menu-toggle");
const mobileNav = $(".mobile-nav");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "打开导航");
  mobileNav.hidden = true;
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  mobileNav.hidden = !open;
});
$$("a", mobileNav).forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", (e) => {
  if (
    !mobileNav.hidden &&
    !mobileNav.contains(e.target) &&
    !menuButton.contains(e.target)
  )
    closeMenu();
});
matchMedia("(min-width: 701px)").addEventListener("change", (e) => {
  if (e.matches) closeMenu();
});

const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.to(".hero-art img", {
    yPercent: 15,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1,
    },
  });
  gsap.to(".photo-stamp", {
    rotation: -12,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 1,
    },
  });
  gsap.from(".manifesto-text", {
    opacity: 0.3,
    y: 24,
    ease: "none",
    scrollTrigger: {
      trigger: ".manifesto",
      start: "top 85%",
      end: "center 55%",
      scrub: 0.8,
    },
  });
  [
    ".section-row",
    ".community-cover",
    ".work-heading",
    ".about-heading",
    ".about-copy",
    ".contact-top",
    ".contact h2",
  ].forEach((selector) => {
    gsap.from(selector, {
      y: 36,
      opacity: 0,
      duration: 0.95,
      ease: "power3.out",
      scrollTrigger: { trigger: selector, start: "top 94%", once: true },
    });
  });
  gsap.fromTo(
    ".identity-card",
    { rotation: -4, y: 35 },
    {
      rotation: 2,
      y: -20,
      ease: "none",
      scrollTrigger: {
        trigger: ".about",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      },
    },
  );
  gsap.to(".contact-star", {
    rotation: 100,
    ease: "none",
    scrollTrigger: {
      trigger: ".contact",
      start: "top bottom",
      end: "bottom top",
      scrub: 1,
    },
  });
});
mm.add(
  "(min-width: 901px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)",
  () => {
    const track = $(".work-track");
    const wrap = $(".work-track-wrap");
    wrap.classList.add("scroll-enhanced");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: wrap,
        start: "center center",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          $(".work-progress span").style.transform =
            `translateX(${self.progress * 200}%)`;
          $(".work-counter").textContent =
            `0${Math.min(3, Math.floor(self.progress * 3) + 1)} — 03`;
        },
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      wrap.classList.remove("scroll-enhanced");
      $(".work-progress span").style.transform = "";
    };
  },
);
$(".work-track-wrap").addEventListener("scroll", (e) => {
  const wrap = e.currentTarget;
  if (wrap.classList.contains("scroll-enhanced")) return;
  const progress = wrap.scrollLeft / (wrap.scrollWidth - wrap.clientWidth || 1);
  $(".work-progress span").style.transform = `translateX(${progress * 200}%)`;
  $(".work-counter").textContent =
    `0${Math.min(3, Math.floor(progress * 3) + 1)} — 03`;
});

const experiments = {
  orbit: {
    title: "Orbit",
    category: "001 / 引力之间",
    description:
      "三个轨道，一颗小小的星球。改变旋转的角度，看熟悉的秩序如何展现另一种样子。",
    label: "轨道角度",
  },
  form: {
    title: "Soft Form",
    category: "002 / 柔软的边界",
    description:
      "形状未必需要标准答案。试着拉开层与层的距离，让一个安静的物体，慢慢舒展开来。",
    label: "形态舒展",
  },
  field: {
    title: "Field",
    category: "003 / 一片可能",
    description:
      "从一个点，到一片风景。改变点阵的密度，在疏与密之间寻找你喜欢的节奏。",
    label: "点阵密度",
  },
};
const dialog = $(".project-dialog");
const range = $("#experiment-range");
let activeProject;
let sourceArt;
let sourceButton;
let transitioning = false;
let activeTransition;
function transition(update) {
  if (document.startViewTransition && !reduceMotion.matches) {
    activeTransition = document.startViewTransition(update);
    return activeTransition.finished.catch(() => {});
  }
  update();
  return Promise.resolve();
}
function updateExperiment() {
  const value = Number(range.value);
  $("#control-value").value = `${value}%`;
  const art = $(".dialog-art");
  if (activeProject === "orbit")
    $(".orbit-graphic", art).style.transform =
      `rotate(${value * 3.6 - 180}deg)`;
  if (activeProject === "form") {
    $(".form-graphic", art).style.transform = `rotate(${value * 0.6 - 50}deg)`;
    $$(".form-graphic i", art).forEach(
      (item, i) => (item.style.top = `${i * (9 + value * 0.12)}%`),
    );
  }
  if (activeProject === "field") {
    const step = 9 + (100 - value) * 0.25;
    $(".field-graphic", art).style.backgroundSize = `${step}px ${step}px`;
    $(".field-graphic", art).style.transform = `rotate(${value * 0.6 - 45}deg)`;
  }
}
async function openExperiment(button) {
  if (transitioning || dialog.open) return;
  transitioning = true;
  activeProject = button.dataset.open;
  sourceButton = button;
  sourceArt = $(".project-art", button);
  const info = experiments[activeProject];
  $("#dialog-title").textContent = info.title;
  $("#dialog-category").textContent = info.category;
  $("#dialog-description").textContent = info.description;
  $("#control-label").textContent = info.label;
  range.value = "50";
  const clone = sourceArt.cloneNode(true);
  clone.removeAttribute("data-shared");
  $(".dialog-art").replaceChildren(clone);
  updateExperiment();
  sourceArt.style.viewTransitionName = "shared-art";
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
  try {
    await transition(() => {
      sourceArt.style.viewTransitionName = "";
      clone.style.viewTransitionName = "shared-art";
      dialog.showModal();
      $(".dialog-close").focus({ preventScroll: true });
    });
  } finally {
    sourceArt.style.viewTransitionName = "";
    clone.style.viewTransitionName = "";
    transitioning = false;
  }
}
async function closeExperiment() {
  if (transitioning || !dialog.open) return;
  transitioning = true;
  const art = $(".project-art", $(".dialog-art"));
  art.style.viewTransitionName = "shared-art";
  try {
    await transition(() => {
      art.style.viewTransitionName = "";
      sourceArt.style.viewTransitionName = "shared-art";
      dialog.close();
      document.documentElement.style.overflow = "";
    });
  } finally {
    sourceArt.style.viewTransitionName = "";
    lenis?.start();
    sourceButton.focus({ preventScroll: true });
    transitioning = false;
  }
}
$$("[data-open]").forEach((button) =>
  button.addEventListener("click", () => openExperiment(button)),
);
$(".dialog-close").addEventListener("click", closeExperiment);
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  if (transitioning) activeTransition?.skipTransition();
  else closeExperiment();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      closeExperiment();
  }
});
range.addEventListener("input", updateExperiment);
$(".reset-experiment").addEventListener("click", () => {
  range.value = "50";
  updateExperiment();
});
// Recalculate after image/font loading to keep pin positions correct.
window.addEventListener("load", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());

// The graduation-project story uses the same shared-surface transition as the experiments.
const caseDialog = $(".case-dialog");
let caseOpener;
let caseBusy = false;
let caseTransition;
async function openCase(button) {
  if (caseBusy || caseDialog.open) return;
  caseBusy = true;
  caseOpener = button;
  const cover = $(".featured .community-cover");
  const clone = cover.cloneNode(true);
  $(".case-art").replaceChildren(clone);
  cover.style.viewTransitionName = "shared-art";
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
  const update = () => {
    cover.style.viewTransitionName = "";
    clone.style.viewTransitionName = "shared-art";
    caseDialog.showModal();
    caseDialog.scrollTop = 0;
    $(".case-close").focus({ preventScroll: true });
  };
  try {
    if (document.startViewTransition && !reduceMotion.matches) {
      caseTransition = document.startViewTransition(update);
      await caseTransition.finished.catch(() => {});
    } else update();
  } finally {
    cover.style.viewTransitionName = "";
    clone.style.viewTransitionName = "";
    caseBusy = false;
  }
}
async function closeCase() {
  if (caseBusy || !caseDialog.open) return;
  caseBusy = true;
  const cover = $(".featured .community-cover");
  const clone = $(".case-art .community-cover");
  clone.style.viewTransitionName = "shared-art";
  const update = () => {
    clone.style.viewTransitionName = "";
    cover.style.viewTransitionName = "shared-art";
    caseDialog.close();
    document.documentElement.style.overflow = "";
  };
  try {
    if (document.startViewTransition && !reduceMotion.matches) {
      caseTransition = document.startViewTransition(update);
      await caseTransition.finished.catch(() => {});
    } else update();
  } finally {
    cover.style.viewTransitionName = "";
    clone.style.viewTransitionName = "";
    lenis?.start();
    caseOpener.focus({ preventScroll: true });
    caseBusy = false;
  }
}
$$("[data-case-open]").forEach((button) =>
  button.addEventListener("click", () => openCase(button)),
);
$(".case-close").addEventListener("click", closeCase);
caseDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  if (caseBusy) caseTransition?.skipTransition();
  else closeCase();
});
caseDialog.addEventListener("click", (e) => {
  if (e.target === caseDialog) {
    const r = caseDialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeCase();
  }
});
