import { chromium, expect } from "@playwright/test";

const url = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

// Detect a circular wave in the painted pixels. Drifting nodes and connecting
// lines alone cannot cover most angles at the same radius around the tap.
async function rippleRadius(canvas, point) {
  return canvas.evaluate((el, { x, y }) => {
    const scale = el.width / el.clientWidth;
    const limit = Math.min(120, x - 2, y - 2, el.clientWidth - x - 2, el.clientHeight - y - 2);
    const { data } = el.getContext("2d").getImageData(0, 0, el.width, el.height);
    for (let radius = 9; radius < limit; radius += 2) {
      let covered = 0;
      for (let index = 0; index < 48; index++) {
        const angle = index * Math.PI / 24;
        for (const delta of [-1, 0, 1]) {
          const px = Math.round((x + (radius + delta) * Math.cos(angle)) * scale);
          const py = Math.round((y + (radius + delta) * Math.sin(angle)) * scale);
          if (data[(py * el.width + px) * 4 + 3] > 30) {
            covered++;
            break;
          }
        }
      }
      if (covered > 36) return radius;
    }
    return 0;
  }, point);
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener("animationstart", event => {
      if (event.animationName === "lift-cover") {
        event.target.getAnimations().find(animation => animation.animationName === "lift-cover").pause();
      }
    });
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const opening = page.locator(".opening-cover");
  await expect(opening).toHaveCSS("animation-name", "lift-cover");
  await expect.poll(() => opening.evaluate(element =>
    element.getAnimations().some(animation => animation.playState === "paused"),
  )).toBe(true);
  const lifted = await opening.evaluate(element => {
    const animation = element.getAnimations().find(item => item.animationName === "lift-cover");
    const { delay, activeDuration } = animation.effect.getComputedTiming();
    animation.currentTime = delay + activeDuration / 2;
    const clip = getComputedStyle(element).clipPath;
    animation.play();
    return parseFloat(clip.match(/([\d.]+)%/)?.[1]);
  });
  expect(lifted).toBeGreaterThan(5);
  expect(lifted).toBeLessThan(95);
  await expect(opening).toBeHidden();
  await page.reload({ waitUntil: "networkidle" });
  await expect(opening).toHaveCSS("display", "none");
  const stage = page.locator(".cover-stage");
  await expect(page.locator("#site-header")).toHaveClass(/over-landscape/);
  const cover = await stage.boundingBox();
  expect(cover.y).toBeCloseTo(0, 0);
  expect(cover.width).toBe(1280);
  expect(cover.height).toBe(800);
  expect(await page.locator(".photo-frame").boundingBox()).toEqual(cover);

  await page.evaluate(() => scrollTo({ top: 360, behavior: "instant" }));
  await expect.poll(() => page.locator(".photo-negative").evaluate(el =>
    new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(1.02);
  await expect.poll(() => page.locator("#hero-title").evaluate(el =>
    Number(getComputedStyle(el).opacity))).toBeLessThan(.9);
  await expect.poll(() => page.locator(".lake-rings").evaluate(el =>
    Number(getComputedStyle(el).opacity))).toBeGreaterThan(.05);

  const field = page.locator(".field-canvas");
  await page.locator("#field-intro").evaluate(section => scrollTo({
    top: scrollY + section.getBoundingClientRect().top, behavior: "instant",
  }));
  await expect(stage).not.toBeInViewport();
  await expect(page.locator("#site-header")).not.toHaveClass(/over-landscape/);
  await expect(field).toBeInViewport();
  const size = await field.boundingBox();
  const point = { x: Math.round(size.width * .38), y: Math.round(size.height * .42) };
  // Nearby links change from green to clay as the pointer approaches.
  const warmInk = () => field.evaluate((el, {x, y}) => {
    const scale = el.width / el.clientWidth;
    const pixels = el.getContext("2d").getImageData(
      (x - 55) * scale, (y - 55) * scale, 110 * scale, 110 * scale,
    ).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > pixels[i + 1] + 35 && pixels[i + 3] > 55) count++;
    }
    return count;
  }, point);
  const idleInk = await warmInk();
  await field.hover({ position: point });
  await expect.poll(warmInk).toBeGreaterThan(idleInk + 80);
  expect(await rippleRadius(field, point)).toBeLessThan(20);
  await field.click({ position: point });
  await expect.poll(() => rippleRadius(field, point), {intervals: [16, 24]}).toBeGreaterThan(20);

  const reader = page.locator(".project-reader");
  await expect(reader).toHaveClass(/pinned-reader/);
  for (const [step, fraction] of [[0,.06], [1,.50], [2,.92], [1,.47]]) {
    await reader.evaluate((el, at) => {
      const style = getComputedStyle(el);
      const top = scrollY + el.getBoundingClientRect().top - parseFloat(style.getPropertyValue("--reader-top"));
      scrollTo({top: top + at * parseFloat(style.getPropertyValue("--reader-distance")), behavior: "instant"});
    }, fraction);
    await expect(page.locator("#stage-tab-" + step)).toHaveAttribute("aria-selected", "true");
  }

  const accordion = page.locator(".project-build details");
  await accordion.nth(0).locator("summary").click();
  await accordion.nth(1).locator("summary").click();
  await expect(accordion.nth(1)).toHaveJSProperty("open", true);
  await expect(accordion.nth(0)).toHaveJSProperty("open", false);

  const terrain = page.locator("#site-terrain");
  await expect(terrain).toHaveCSS("pointer-events", "none");
  const terrainHash = () => terrain.evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0;
    for (let i = 0; i < pixels.length; i += 31) hash = (Math.imul(hash, 31) + pixels[i]) | 0;
    return hash;
  });
  for (const selector of ["#project", ".notes-cover", "#contact"]) {
    const point = await page.locator(selector).evaluate((el) => {
      scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: "instant" });
      const { top, bottom } = el.getBoundingClientRect();
      return { x: 135, y: (Math.max(90, top) + Math.min(innerHeight, bottom)) / 2 };
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const still = await terrainHash();
    expect(still).not.toBe(0);
    await page.mouse.move(point.x, point.y);
    await expect.poll(terrainHash, { message: `Terrain responds at ${selector}` }).not.toBe(still);
  }

  const firstNote = page.locator("#lens-panel-research");
  const print = firstNote.locator(".note-print");
  const image = print.locator("img");
  const yOffset = (locator) => locator.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42);
  await firstNote.evaluate((el) => scrollTo({
    top: scrollY + el.getBoundingClientRect().top - 360, behavior: "instant",
  }));
  await expect.poll(() => yOffset(print)).toBeGreaterThan(8);
  const startPrint = await yOffset(print);
  const startImage = await yOffset(image);
  await page.evaluate(() => scrollBy({ top: 450, behavior: "instant" }));
  await expect.poll(() => yOffset(print)).toBeLessThan(startPrint - 20);
  await expect.poll(() => yOffset(image)).toBeGreaterThan(startImage + 15);

  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(reader).not.toHaveClass(/pinned-reader/);
  await expect.poll(() => page.locator(".photo-negative").evaluate(el => getComputedStyle(el).transform)).toBe("none");
  await expect.poll(() => yOffset(print)).toBe(0);
  await expect(image).toHaveCSS("transform", "none");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const reducedTerrain = await terrainHash();
  await page.mouse.move(240, 300);
  await page.evaluate(() => scrollBy({ top: 150, behavior: "instant" }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await terrainHash()).toBe(reducedTerrain);

  await field.scrollIntoViewIfNeeded();
  const staticField = () => field.evaluate(el => el.toDataURL());
  const still = await staticField();
  await page.waitForTimeout(160);
  expect(await staticField()).toBe(still);
  await page.locator("#field-pulse").focus();
  await page.keyboard.press("Enter");
  await expect.poll(staticField, {intervals: [16, 24]}).not.toBe(still);

  const mobile = await browser.newPage({
    viewport: {width:390, height:844}, isMobile:true, hasTouch:true,
  });
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(url + "#field-intro", { waitUntil: "networkidle" });
  await expect(mobile.locator(".opening-cover")).toHaveCSS("display", "none");
  const mobileField = mobile.locator(".field-canvas");
  await mobileField.scrollIntoViewIfNeeded();
  const mobileSize = await mobileField.boundingBox();
  const tap = {x: Math.round(mobileSize.width * .4), y: Math.round(mobileSize.height * .46)};
  await mobileField.tap({position: tap});
  await expect.poll(() => rippleRadius(mobileField, tap), {intervals: [16, 24]}).toBeGreaterThan(20);
  const cdp = await mobile.context().newCDPSession(mobile);
  async function swipeUp(x, y) {
    await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x, y}]});
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x, y: y - step * 19}]});
      await mobile.waitForTimeout(30);
    }
    await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  }
  const startFieldScroll = await mobile.evaluate(() => scrollY);
  await swipeUp(mobileSize.x + tap.x, mobileSize.y + tap.y);
  await expect.poll(() => mobile.evaluate(() => scrollY)).toBeGreaterThan(startFieldScroll + 100);

  const mobilePrint = mobile.locator("#lens-panel-research .note-print");
  await mobilePrint.scrollIntoViewIfNeeded();
  const startScroll = await mobile.evaluate(() => scrollY);
  const startOffset = await yOffset(mobilePrint);
  await swipeUp(190, 700);
  await expect.poll(() => mobile.evaluate(() => scrollY)).toBeGreaterThan(startScroll + 150);
  await expect.poll(() => yOffset(mobilePrint)).toBeLessThan(startOffset - 3);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
  console.log("PASS: full-screen landscape and scroll transition, mouse/touch ripples, keyboard pulse, still field under reduced motion, project reading, terrain, note parallax, and native touch scrolling.");
} finally { await browser.close(); }
