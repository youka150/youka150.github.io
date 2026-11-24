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
  function refreshReading() {
    measure();
    ScrollTrigger.refresh(true);
  }
  eligible.addEventListener("change", refreshReading);
  document.fonts.ready.then(refreshReading);
  return index => {
    if (!distance) return;
    const start = window.scrollY + reader.getBoundingClientRect().top - top;
    window.scrollTo({top: start + distance * index / (scenes.length - 1), behavior: "instant"});
  };
}
