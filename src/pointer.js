import "../pointer.css";

const fineHover = matchMedia(
  "(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)",
);

function pointIn(element, event) {
  const bounds = element.getBoundingClientRect();
  const unit = (value) => Math.max(0, Math.min(1, value));
  return {
    x: unit((event.clientX - bounds.left) / bounds.width),
    y: unit((event.clientY - bounds.top) / bounds.height),
  };
}

function setupPhoto(figure) {
  const frame = figure.querySelector(".photo-frame");
  if (!frame) return;
  const hint = figure.querySelector("[data-photo-hint]");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "photo-toggle";
  toggle.setAttribute("aria-label", "放大山湖照片");
  toggle.setAttribute("aria-description", "放大后可用方向键查看不同位置，按 Esc 收起。");
  frame.append(toggle);

  let zoomed = false;
  let x = 0.5;
  let y = 0.5;
  function aim(atX, atY) {
    x = Math.max(0, Math.min(1, atX));
    y = Math.max(0, Math.min(1, atY));
    frame.style.setProperty("--photo-x", `${x * 100}%`);
    frame.style.setProperty("--photo-y", `${y * 100}%`);
  }
  function setZoom(value) {
    zoomed = value;
    frame.classList.toggle("is-zoomed", value);
    toggle.setAttribute("aria-pressed", String(value));
    if (hint) hint.textContent = value ? "再点照片收起" : "点照片看细节";
  }
  setZoom(false);

  toggle.addEventListener("click", (event) => {
    if (!zoomed) {
      const point = event.detail ? pointIn(frame, event) : { x: 0.5, y: 0.5 };
      aim(point.x, point.y);
    }
    setZoom(!zoomed);
  });
  toggle.addEventListener("keydown", (event) => {
    if (!zoomed) return;
    if (event.key === "Escape") {
      setZoom(false);
      return;
    }
    const step = 0.15;
    switch (event.key) {
      case "ArrowLeft":
        aim(x - step, y);
        break;
      case "ArrowRight":
        aim(x + step, y);
        break;
      case "ArrowUp":
        aim(x, y - step);
        break;
      case "ArrowDown":
        aim(x, y + step);
        break;
      default:
        return;
    }
    event.preventDefault();
  });
  toggle.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !fineHover.matches) return;
    const point = pointIn(frame, event);
    aim(point.x, point.y);
    frame.classList.add("is-pointing");
  });
  const clearViewfinder = () => frame.classList.remove("is-pointing");
  toggle.addEventListener("pointerleave", clearViewfinder);
  toggle.addEventListener("pointercancel", clearViewfinder);
  fineHover.addEventListener("change", clearViewfinder);
}

function setupMagneticLink(link) {
  const mark =
    link.querySelector(":scope > [aria-hidden='true'], :scope > .btn-arrow") ||
    link.querySelector(":scope > span");
  if (!mark) return;
  mark.classList.add("magnetic-detail");
  link.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !fineHover.matches) return;
    const point = pointIn(link, event);
    mark.style.setProperty("--magnet-x", `${(point.x - 0.5) * 12}px`);
    mark.style.setProperty("--magnet-y", `${(point.y - 0.5) * 8}px`);
  });
  const reset = () => {
    mark.style.removeProperty("--magnet-x");
    mark.style.removeProperty("--magnet-y");
  };
  link.addEventListener("pointerleave", reset);
  link.addEventListener("pointercancel", reset);
  fineHover.addEventListener("change", reset);
}

export function setupPointerDetails() {
  const figure = document.querySelector(".hero-photo");
  if (figure) setupPhoto(figure);
  document.querySelectorAll("[data-magnetic]").forEach(setupMagneticLink);
}
