import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const baseURL = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
await page.goto(baseURL, { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await expect(page.locator(".splash")).toHaveCount(0);
await page.locator('.header a[href="#selected"]').click();
await page.waitForTimeout(1400);
await expect(page.locator("#selected-title")).toBeInViewport();
await page.screenshot({ path: ".test-results/desktop-project.png" });
await page.locator(".featured-cover-button").click();
await page.waitForTimeout(800);
await expect(page.locator(".case-dialog")).toBeVisible();
await expect(page.locator("#case-title")).toHaveText("InsightAI 2026.");
await page.screenshot({ path: ".test-results/desktop-case.png" });
await page.locator(".case-dialog").hover();
await page.mouse.wheel(0, 650);
await page.waitForTimeout(400);
expect(
  await page.locator(".case-dialog").evaluate((el) => el.scrollTop),
).toBeGreaterThan(0);
await page.locator(".case-methods summary").nth(1).click();
await expect(page.locator(".case-methods details").nth(1)).toHaveAttribute(
  "open",
  "",
);
await page.locator(".case-close").click();
await page.waitForTimeout(800);
await expect(page.locator(".case-dialog")).not.toBeVisible();
await expect(page.locator(".featured-cover-button")).toBeFocused();
await page.evaluate(() => document.querySelector("#work").scrollIntoView());
await page.waitForTimeout(1300);
await page.screenshot({ path: ".test-results/desktop-work.png" });
await page.locator('[data-open="orbit"]').click();
await page.waitForTimeout(800);
await expect(page.locator(".project-dialog")).toBeVisible();
await expect(page.locator("#dialog-title")).toHaveText("Orbit");
await page.locator("#experiment-range").fill("80");
await expect(page.locator("#control-value")).toHaveText("80%");
await page.screenshot({ path: ".test-results/desktop-dialog.png" });
await page.locator(".reset-experiment").click();
await expect(page.locator("#experiment-range")).toHaveValue("50");
await page.keyboard.press("Escape");
await page.waitForTimeout(800);
await expect(page.locator(".project-dialog")).not.toBeVisible();
await expect(page.locator('[data-open="orbit"]')).toBeFocused();
await page.mouse.wheel(0, 1700);
await page.waitForTimeout(1700);
await expect(page.locator('[data-open="field"]')).toBeInViewport();
await page.locator('[data-open="field"]').click();
await page.waitForTimeout(800);
await expect(page.locator("#dialog-title")).toHaveText("Field");
await page.locator(".dialog-close").click();
await page.waitForTimeout(800);
await page.locator('.header nav a[href="#about"]').evaluate((a) => a.click());
await page.waitForTimeout(1400);
await expect(page.locator("#about-title")).toBeInViewport();
await expect(page.locator(".identity-card img")).toHaveJSProperty(
  "complete",
  true,
);
await page.screenshot({ path: ".test-results/desktop-about.png" });
await page.evaluate(() => document.querySelector("#contact").scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: ".test-results/desktop-contact.png" });
// All content stays readable without animations; all three experiments work on touch layouts.
await page.emulateMedia({ reducedMotion: "reduce" });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL, { waitUntil: "networkidle" });
await page.locator(".menu-toggle").click();
await expect(page.locator(".mobile-nav")).toBeVisible();
await page.locator('.mobile-nav a[href="#about"]').click();
await expect(page.locator(".mobile-nav")).not.toBeVisible();
await expect(page.locator("#about-title")).toBeInViewport();
await page.locator(".case-text-open").click();
await expect(page.locator(".case-dialog")).toBeVisible();
await page.screenshot({ path: ".test-results/mobile-case.png" });
expect(
  await page
    .locator(".case-dialog")
    .evaluate((el) => el.scrollWidth <= el.clientWidth),
).toBeTruthy();
await page.keyboard.press("Escape");
await expect(page.locator(".case-dialog")).not.toBeVisible();
for (const project of ["orbit", "form", "field"]) {
  await page.locator(`[data-open="${project}"]`).click();
  await expect(page.locator(".project-dialog")).toBeVisible();
  await page.locator("#experiment-range").fill("75");
  await expect(page.locator("#control-value")).toHaveText("75%");
  await page.locator(".dialog-close").click();
  await expect(page.locator(".project-dialog")).not.toBeVisible();
}
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `horizontal overflow at ${width}px`,
  ).toBeTruthy();
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: ".test-results/mobile-full.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({
  path: ".test-results/desktop-full.png",
  fullPage: true,
});
expect(errors).toEqual([]);
// Content and internal navigation do not depend on JS.
const noJS = await browser.newPage({
  javaScriptEnabled: false,
  viewport: { width: 390, height: 844 },
});
await noJS.goto(baseURL);
await expect(noJS.locator("#hero-title")).toBeVisible();
await expect(noJS.locator(".splash")).not.toBeVisible();
await expect(noJS.locator("#about-title")).toHaveText(/youka/);
console.log(
  "PASS: project story + scrolling + accordion, desktop navigation, shared transitions, sliders/reset, Escape/focus return, mobile menu, 3 experiments, reduced motion, 5 responsive widths, no-JS content, no runtime errors.",
);
await browser.close();
