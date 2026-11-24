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
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/open-cover/);
  await expect(page.locator(".opening-cover")).toBeHidden({ timeout: 4000 });
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/open-cover/);

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

  const musicTab = page.locator("#lens-tab-music");
  await musicTab.hover();
  await expect(page.locator(".print-preview")).toHaveAttribute("src", /notes-music/);
  await expect(page.locator(".print-preview")).toBeVisible();
  await expect(page.locator("#lens-tab-research")).toHaveAttribute("aria-selected","true");
  await expect.poll(() => page.locator(".tab-marker").evaluate(el =>
    el.getBoundingClientRect().left - el.parentElement.getBoundingClientRect().left)).toBeGreaterThan(30);
  await expect.poll(() => page.locator(".notes-cover").evaluate(el => el.style.getPropertyValue("--light-x"))).toBeTruthy();
  await musicTab.click();
  await expect(page.locator("#lens-panel-music")).toBeVisible();
  await page.locator(".print-track").focus();
  await page.keyboard.press("End");
  await expect(page.locator("#lens-tab-court")).toHaveAttribute("aria-selected","true");

  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(reader).not.toHaveClass(/pinned-reader/);
  await expect.poll(() => page.locator(".photo-negative").evaluate(el => getComputedStyle(el).transform)).toBe("none");
  await page.locator("#lens-tab-research").click();
  await expect(page.locator("#lens-panel-research")).toBeVisible();
  const mobile = await browser.newPage({
    viewport: {width:390, height:844}, isMobile:true, hasTouch:true, reducedMotion:"reduce",
  });
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(url + "#perspectives");
  await expect(mobile.locator(".opening-cover")).toBeHidden();
  const track = mobile.locator(".print-track");
  await track.scrollIntoViewIfNeeded();
  const rect = await track.boundingBox();
  const y = Math.round(rect.y + rect.height / 2);
  const start = Math.round(rect.x + rect.width * .88);
  const end = Math.round(rect.x + rect.width * .12);
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:start,y}]});
  for (let i=1; i<=12; i++) {
    await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:start+(end-start)*i/12,y}]});
    await mobile.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect(mobile.locator("#lens-tab-research")).toHaveAttribute("aria-selected","false");
  const selected = await mobile.locator(".lens-switcher [aria-selected=true]").getAttribute("data-lens-tab");
  await expect(mobile.locator("#lens-panel-"+selected)).toBeVisible();
  expect(errors).toEqual([]);
  console.log("PASS: opening, scroll transforms, accordion, hover preview, moving underline, keyboard, touch snap, and reduced motion.");
} finally { await browser.close(); }
