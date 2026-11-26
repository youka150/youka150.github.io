import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function openJournal() {
  const root = document.documentElement;
  if (root.classList.contains("open-cover")) {
    const opening = document.querySelector(".opening-cover");
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    function dismiss() {
      root.classList.remove("open-cover");
      listeners.abort();
    }
    opening.addEventListener("animationend", event => {
      if (event.animationName === "lift-cover") dismiss();
    }, options);
    for (const event of ["keydown", "pointerdown", "wheel", "pagehide"]) {
      window.addEventListener(event, dismiss, { ...options, passive: true });
    }
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", dismiss, options);
  }

  const cover = document.querySelector("#top");
  const header = document.querySelector("#site-header");

  function syncMasthead() {
    header.classList.toggle("over-landscape", cover.getBoundingClientRect().bottom > header.offsetHeight);
  }
  syncMasthead();
  window.addEventListener("scroll", syncMasthead, { passive: true });
  window.addEventListener("resize", syncMasthead);
  window.addEventListener("pageshow", syncMasthead);

  gsap.registerPlugin(ScrollTrigger);
  const motion = gsap.matchMedia();
  motion.add({
    enabled: "(prefers-reduced-motion: no-preference)",
    touch: "(pointer: coarse)",
  }, ({ conditions: { enabled, touch } }) => {
    if (!enabled) return;
    const coverStage = cover.querySelector(".cover-stage");
    // A shorter travel on touch lets the first swipe carry the ripple across the lake.
    const crossing = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: cover,
        start: "top top",
        end: touch ? () => `+=${Math.round(coverStage.offsetHeight * .7)}` : "bottom top",
        scrub: true,
      },
    });
    crossing.to(".photo-negative", { scale: touch ? 1.16 : 1.19, yPercent: touch ? 5 : 7, duration: 1 }, 0)
      .to("#hero-title", { yPercent: -38, opacity: 0, duration: .55 }, 0)
      .to(".cover-greeting", { y: -18, opacity: 0, duration: .24 }, 0)
      .fromTo(".lake-rings", { scale: .12 }, { scale: 3.6, duration: .85 }, .015)
      .to(".lake-rings", { opacity: touch ? .84 : .68, duration: .18 }, .015)
      .to(".lake-rings", { opacity: 0, duration: .48 }, touch ? .34 : .25);
    if (touch) {
      crossing.fromTo(".lake-rings", { rotation: -7 }, { rotation: 8, duration: .85 }, .015)
        .to(".lake-glint", { "--lake-glint-angle": "-38deg", duration: .85 }, .015);
    }
  });
  motion.add("(prefers-reduced-motion: no-preference)", () => {
    const travel = () => innerWidth > 760 ? 58 : 19;
    for (const note of document.querySelectorAll(".notes-stories .lens-panel")) {
      const print = note.querySelector(".note-print");
      const image = print.querySelector("img");
      gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: note,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.45,
          invalidateOnRefresh: true,
        },
      })
        .fromTo(print,
          { "--print-offset": () => `${travel()}px` },
          { "--print-offset": () => `${-travel()}px` }, 0,
        )
        .fromTo(image, { yPercent: -7 }, { yPercent: 7 }, 0);
    }
  });
}

export function setupSoundtrack() {
  const audio = document.querySelector("#soundtrack-audio");
  const select = document.querySelector("#soundtrack-track");
  const source = document.querySelector("#soundtrack-source");
  select.hidden = false;
  select.addEventListener("change", () => {
    const track = select.selectedOptions[0];
    const wasPlaying = !audio.paused;
    audio.src = track.value;
    source.href = track.dataset.source;
    if (wasPlaying) audio.play().catch(() => {});
  });
}

export function setupProjectReading(scenes, show, onEnter) {
  const reader = document.querySelector(".project-reader");
  const header = document.querySelector(".site-header");
  const tabs = reader.querySelector(".stage-tabs");
  const tabButtons = [...tabs.querySelectorAll("[data-stage-tab]")];
  const bookmarks = reader.querySelector(".stage-bookmarks");
  const links = [...bookmarks.querySelectorAll("[data-stage-bookmark]")];
  const compact = matchMedia("(max-width: 980px), (pointer: coarse) and (orientation: portrait)");
  const touch = matchMedia("(pointer: coarse)");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const demos = scenes.map(scene => scene.querySelector("canvas, .agent-pipeline"));
  const entered = new Set();
  let inline;
  let currentBookmark = -1;
  let top = 0;
  let distance = 0;
  let frame = 0;
  const observer = new IntersectionObserver(entries => {
    if (!inline) return;
    for (const entry of entries) {
      if (entry.intersectionRatio < 0.35) continue;
      const index = demos.indexOf(entry.target);
      observer.unobserve(entry.target);
      if (entered.has(index)) continue;
      entered.add(index);
      onEnter(index);
    }
  }, { threshold: 0.35 });

  function setBookmark(index) {
    if (currentBookmark === index) return;
    links[currentBookmark]?.removeAttribute("aria-current");
    links[index].setAttribute("aria-current", "location");
    currentBookmark = index;
  }

  function read() {
    frame = 0;
    if (inline) {
      const line = readingLine();
      const index = scenes.findIndex(scene => {
        const bounds = scene.getBoundingClientRect();
        return bounds.top <= line && bounds.bottom > line;
      });
      if (index >= 0) setBookmark(index);
      return;
    }
    if (!distance) return;
    const offset = top - reader.getBoundingClientRect().top;
    if (offset < -1 || offset > distance + 1) return;
    show(Math.round(Math.max(0, Math.min(1, offset / distance)) * (scenes.length - 1)));
  }

  function readingLine() {
    return Math.max(header.offsetHeight + bookmarks.offsetHeight + 18, innerHeight * 0.36);
  }

  function selectedStage() {
    return tabButtons.findIndex(button => button.getAttribute("aria-selected") === "true");
  }

  function linkedStage() {
    return scenes.findIndex(scene => location.hash === "#" + scene.id);
  }

  function setLayout(stacked) {
    reader.classList.toggle("inline-reader", stacked);
    if (inline === stacked) return;

    const focus = document.activeElement;
    const focusedScene = scenes.findIndex(scene => scene.contains(focus));
    const focusedTab = tabButtons.indexOf(focus);
    const focusedBookmark = links.indexOf(focus);
    const previousStage = inline === undefined ? -1 : inline ? currentBookmark : selectedStage();
    const index = [focusedScene, focusedTab, focusedBookmark, previousStage, linkedStage(), 0]
      .find(candidate => candidate >= 0);

    inline = stacked;
    tabs.hidden = stacked;
    bookmarks.hidden = !stacked;
    scenes.forEach((scene, sceneIndex) => {
      if (stacked) {
        scene.hidden = false;
        scene.removeAttribute("role");
        scene.setAttribute("aria-labelledby", scene.querySelector("h3").id);
        gsap.killTweensOf(scene);
        gsap.set(scene, { clearProps: "transform" });
        if (!entered.has(sceneIndex)) observer.observe(demos[sceneIndex]);
      } else {
        scene.setAttribute("role", "tabpanel");
        scene.setAttribute("aria-labelledby", tabButtons[sceneIndex].id);
      }
    });
    if (stacked) {
      setBookmark(index);
      if (focusedTab >= 0) links[index].focus({ preventScroll: true });
    } else {
      observer.disconnect();
      show(index, { animate: false });
      if (focusedBookmark >= 0) tabButtons[index].focus({ preventScroll: true });
    }
    return index;
  }

  // Pin only when every method fits below the masthead, including at text zoom.
  function measure() {
    const wasPinned = distance > 0;
    const bounds = reader.getBoundingClientRect();
    const line = readingLine();
    const keepChapter = inline !== undefined && bounds.top < line && bounds.bottom > line;
    distance = 0;
    reader.classList.remove("pinned-reader");
    if (!compact.matches && motion.matches) {
      reader.classList.remove("inline-reader");
      top = header.offsetHeight + 8;
      const heights = scenes.map(scene => {
        const hidden = scene.hidden;
        scene.hidden = false;
        const height = scene.offsetHeight;
        scene.hidden = hidden;
        return height;
      });
      const tabsWereHidden = tabs.hidden;
      tabs.hidden = false;
      const pageHeight = tabs.offsetHeight + Math.max(...heights);
      tabs.hidden = tabsWereHidden;
      if (pageHeight + top + 12 <= innerHeight) {
        distance = Math.round(innerHeight * 1.12);
        reader.style.setProperty("--reader-top", top + "px");
        reader.style.setProperty("--reader-page", pageHeight + "px");
        reader.style.setProperty("--reader-distance", distance + "px");
        reader.classList.add("pinned-reader");
      }
    }
    const switchedStage = setLayout(compact.matches || (touch.matches && !distance));
    if (keepChapter && (switchedStage !== undefined || wasPinned !== (distance > 0))) {
      alignStage(switchedStage ?? selectedStage());
    }
    read();
  }
  window.addEventListener("scroll", () => {
    if (!frame && (inline || distance)) frame = requestAnimationFrame(read);
  }, {passive: true});
  window.addEventListener("resize", measure);
  function refreshReading() {
    measure();
    ScrollTrigger.refresh(true);
  }
  touch.addEventListener("change", refreshReading);
  motion.addEventListener("change", refreshReading);
  function goToStage(index) {
    if (!distance) return;
    const start = window.scrollY + reader.getBoundingClientRect().top - top;
    window.scrollTo({top: start + distance * index / (scenes.length - 1), behavior: "instant"});
  }
  function alignStage(index) {
    if (distance) goToStage(index);
    else scenes[index]?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function navigateToLinkedStage() {
    const index = linkedStage();
    if (inline || index < 0) return;
    show(index, { animate: false });
    alignStage(index);
  }
  measure();
  window.addEventListener("hashchange", navigateToLinkedStage);
  document.fonts.ready.then(() => {
    refreshReading();
    navigateToLinkedStage();
  });
  return goToStage;
}
