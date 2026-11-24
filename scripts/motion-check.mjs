import { chromium, expect } from "@playwright/test";

const url = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const watchCover = new MutationObserver(() => {
      if (!document.documentElement?.classList.contains("open-cover")) return;
      window.openedJournalCover = true;
      watchCover.disconnect();
    });
    watchCover.observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => window.openedJournalCover)).toBe(true);
  await expect(page.locator(".opening-cover")).toBeHidden({ timeout: 4000 });
  await page.reload();
  expect(await page.evaluate(() => window.openedJournalCover)).toBeUndefined();

  await page.evaluate(() => scrollTo({ top: 360, behavior: "instant" }));
  await expect.poll(() => page.locator("#hero-title").evaluate(el =>
    new DOMMatrix(getComputedStyle(el).transform).a)).toBeLessThan(.99);
  await expect.poll(() => page.locator(".photo-negative").evaluate(el =>
    new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(1.02);

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
  for (const selector of ["#top", "#project", ".notes-cover", "#contact"]) {
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

  const mobile = await browser.newPage({
    viewport: {width:390, height:844}, isMobile:true, hasTouch:true,
  });
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(url + "#perspectives");
  await expect(mobile.locator(".opening-cover")).toBeHidden();
  const mobilePrint = mobile.locator("#lens-panel-research .note-print");
  await mobilePrint.scrollIntoViewIfNeeded();
  const startScroll = await mobile.evaluate(() => scrollY);
  const startOffset = await yOffset(mobilePrint);
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 700 }] });
  for (let i=1; i<=12; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 700 - i * 23 }] });
    await mobile.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => mobile.evaluate(() => scrollY)).toBeGreaterThan(startScroll + 150);
  await expect.poll(() => yOffset(mobilePrint)).toBeLessThan(startOffset - 3);
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
  console.log("PASS: opening, project reading and accordion, site-wide terrain response, layered photo parallax, native touch scrolling, and reduced motion.");
} finally { await browser.close(); }
