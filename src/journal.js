import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function openJournal() {
  const root = document.documentElement;
  if (root.classList.contains("open-cover")) {
    const cover = document.querySelector(".opening-cover");
    const stop = new AbortController();
    function dismiss() {
      root.classList.remove("open-cover", "cover-ready");
      stop.abort();
    }
    cover.addEventListener("animationend", event => {
      if (event.animationName === "lift-cover") dismiss();
    }, {signal: stop.signal});
    for (const event of ["keydown", "pointerdown", "wheel", "pagehide"]) {
      window.addEventListener(event, dismiss, {once: true, passive: true, signal: stop.signal});
    }
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", dismiss, {signal: stop.signal});
    Promise.allSettled([document.fonts.ready, document.querySelector(".photo-frame img").decode()]).then(() => {
      if (!stop.signal.aborted) root.classList.add("cover-ready");
    });
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
    const timeline = gsap.timeline({
      scrollTrigger: {trigger: ".hero", start: "top top", end: "bottom top", scrub: true}
    });
    timeline.to("#hero-title", {scale: .86, transformOrigin: "left center", ease: "none"}, 0)
      .to(".hero-photo", {yPercent: 12, rotation: -1.8, ease: "none"}, 0)
      .to(".photo-negative", {scale: 1.16, yPercent: -2, ease: "none"}, 0);
    const print = document.querySelector(".notes-prints");
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        print.classList.add("is-entering");
        observer.disconnect();
      }
    }, {threshold: .18});
    observer.observe(print);
    return () => { observer.disconnect(); print.classList.remove("is-entering"); };
  });
}

export function setupNotebook(choose) {
  const cover = document.querySelector(".notes-cover");
  const list = cover.querySelector(".lens-switcher");
  const tabs = [...list.querySelectorAll("button")];
  const track = cover.querySelector(".print-track");
  const prints = [...track.querySelectorAll("[data-print]")];
  const preview = cover.querySelector(".print-preview");
  const hover = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const marker = document.createElement("span");
  marker.className = "tab-marker";
  marker.setAttribute("aria-hidden", "true");
  list.append(marker);
  list.classList.add("has-marker");
  let index = 0;
  let timer;
  let browsing = false;

  function mark(i) {
    marker.style.width = tabs[i].offsetWidth + "px";
    marker.style.transform = "translateX(" + tabs[i].offsetLeft + "px)";
  }
  function restore() {
    preview.hidden = true;
    mark(index);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("pointerenter", event => {
      if (event.pointerType === "touch" || !hover.matches) return;
      mark(i);
      if (i === index) { preview.hidden = true; return; }
      preview.src = prints[i].src;
      preview.hidden = false;
    });
  });
  list.addEventListener("pointerleave", restore);
  hover.addEventListener("change", restore);
  const left = i => Math.min(
    prints[i].offsetLeft - prints[0].offsetLeft,
    track.scrollWidth - track.clientWidth,
  );
  function sync(key) {
    index = prints.findIndex(print => print.dataset.print === key);
    browsing = false;
    clearTimeout(timer);
    track.scrollLeft = left(index);
    preview.style.left = (prints[index].offsetLeft - track.scrollLeft) + "px";
    restore();
  }
  function settle() {
    if (!browsing) return;
    browsing = false;
    let nearest = 0;
    for (let i = 1; i < prints.length; i++) {
      if (Math.abs(left(i) - track.scrollLeft) < Math.abs(left(nearest) - track.scrollLeft)) nearest = i;
    }
    choose(prints[nearest].dataset.print);
  }
  track.addEventListener("keydown", event => {
    const next = {ArrowLeft: Math.max(0, index - 1), ArrowRight: Math.min(prints.length - 1, index + 1), Home: 0, End: prints.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(prints[next].dataset.print);
  });
  for (const event of ["pointerdown", "wheel"]) {
    track.addEventListener(event, () => { browsing = true; }, {passive: true});
  }
  track.addEventListener("scroll", () => {
    if (!browsing || "onscrollend" in track) return;
    clearTimeout(timer);
    timer = setTimeout(settle, 170);
  }, {passive: true});
  track.addEventListener("scrollend", settle);

  function resetLight() {
    cover.style.removeProperty("--light-x");
    cover.style.removeProperty("--light-y");
  }
  cover.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || !hover.matches || !motion.matches) return;
    const rect = cover.getBoundingClientRect();
    cover.style.setProperty("--light-x", (event.clientX - rect.left) + "px");
    cover.style.setProperty("--light-y", (event.clientY - rect.top) + "px");
  }, {passive: true});
  cover.addEventListener("pointerleave", resetLight);
  motion.addEventListener("change", resetLight);
  const resize = new ResizeObserver(() => sync(prints[index].dataset.print));
  resize.observe(track);
  resize.observe(list);
  return sync;
}

// Pin only when every method fits below the masthead, including at text zoom.
export function setupProjectReading(scenes, show) {
  const reader = document.querySelector(".project-reader");
  const header = document.querySelector(".site-header");
  const tabs = reader.querySelector(".stage-tabs");
  const eligible = matchMedia("(min-width: 981px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  let top = 0;
  let distance = 0;
  let frame = 0;
  function read() {
    frame = 0;
    if (!distance) return;
    const offset = top - reader.getBoundingClientRect().top;
    if (offset < -1 || offset > distance + 1) return;
    show(Math.round(Math.max(0, Math.min(1, offset / distance)) * (scenes.length - 1)));
  }
  function measure() {
    distance = 0;
    reader.classList.remove("pinned-reader");
    if (!eligible.matches) return;
    top = header.offsetHeight + 8;
    const heights = scenes.map(scene => {
      const hidden = scene.hidden;
      scene.hidden = false;
      const height = scene.offsetHeight;
      scene.hidden = hidden;
      return height;
    });
    const pageHeight = tabs.offsetHeight + Math.max(...heights);
    if (pageHeight + top + 12 > innerHeight) return;
    distance = Math.round(innerHeight * 1.12);
    reader.style.setProperty("--reader-top", top + "px");
    reader.style.setProperty("--reader-page", pageHeight + "px");
    reader.style.setProperty("--reader-distance", distance + "px");
    reader.classList.add("pinned-reader");
    read();
  }
  window.addEventListener("scroll", () => {
    if (!frame && distance) frame = requestAnimationFrame(read);
  }, {passive: true});
  window.addEventListener("resize", measure);
  eligible.addEventListener("change", measure);
  document.fonts.ready.then(measure);
  return index => {
    if (!distance) return;
    const start = window.scrollY + reader.getBoundingClientRect().top - top;
    window.scrollTo({top: start + distance * index / (scenes.length - 1), behavior: "instant"});
  };
}
