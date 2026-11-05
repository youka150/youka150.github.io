import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
await mkdir(".test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const failures = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => failures.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    failures.push(`${response.status()}: ${response.url()}`);
});
const capture = (name, fullPage = false) =>
  page.screenshot({ path: `.test-results/${name}.png`, fullPage });
try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await expect(page.locator(".splash")).toHaveCount(0, { timeout: 5000 });
  await page.waitForTimeout(700);
  await expect(page.locator("#hero-title")).toContainText("Curious");
  await capture("desktop-hero");
  await page.locator('.header a[href="#selected"]').click();
  await expect(page.locator("#selected-title")).toBeInViewport();
  await page.locator('[data-project-tab="0"]').click();
  await expect(page.locator('[data-scene="0"]')).toBeVisible();
  await page.locator("#influence-weight").fill("75");
  await expect(page.locator("#network-weight")).toHaveText("75%");
  await expect(page.locator("#content-weight")).toHaveText("25%");
  await page.waitForTimeout(500);
  await capture("desktop-project");
  // Scroll-driven narration must actually follow the visible chapter.
  await page
    .locator('[data-step="1"]')
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(page.locator('[data-project-tab="1"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator('[data-scene="1"]')).toBeVisible();
  await page.locator('[data-project-tab="2"]').click();
  await expect(page.locator('[data-scene="2"]')).toBeVisible();
  await expect(page.locator("[data-agent-replay]")).toBeEnabled({
    timeout: 5000,
  });
  await page.locator("[data-agent-replay]").click();
  await expect(page.locator("[data-agent-replay]")).toBeEnabled({
    timeout: 5000,
  });
  await capture("desktop-agent");
  await page.locator('[data-project-tab="2"]').focus();
  await page.keyboard.press("Home");
  await expect(page.locator('[data-project-tab="0"]')).toBeFocused();
  await expect(page.locator('[data-scene="0"]')).toBeVisible();

  await page.locator('.header a[href="#about"]').click();
  await expect(page.locator("#about-title")).toBeInViewport();
  await page.locator("[data-research-toggle]").click();
  await expect(page.locator("[data-research-toggle]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("[data-research-toggle]").click();
  await expect(page.locator("[data-research-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await capture("desktop-atlas");
  await page.locator('[data-atlas-tab="music"]').click();
  await expect(page.locator("#atlas-music")).toBeVisible();
  await expect(page.locator("#atlas-research")).not.toBeVisible();
  await page.locator("#rhythm-range").fill("82");
  await expect(page.locator("#rhythm-value")).toContainText("82");
  await expect(page.locator(".sound-bar")).toHaveCount(37);
  await page.locator("[data-music-toggle]").click();
  await expect(page.locator("[data-music-toggle]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const stillWave = await page
    .locator(".sound-bar")
    .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("height")));
  await page.waitForTimeout(180);
  expect(
    await page
      .locator(".sound-bar")
      .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("height"))),
  ).toEqual(stillWave);
  await page.locator("[data-music-toggle]").click();
  await expect(page.locator("[data-music-toggle]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await capture("desktop-music");
  await page.locator('[data-atlas-tab="court"]').click();
  await expect(page.locator("#atlas-court")).toBeVisible();
  await page.locator("[data-rally]").click();
  await expect(page.locator("#rally-status")).toContainText("这一拍", {
    timeout: 5000,
  });
  await capture("desktop-court");
  await page.locator('[data-atlas-tab="court"]').focus();
  await page.keyboard.press("Home");
  await expect(page.locator('[data-atlas-tab="research"]')).toBeFocused();
  await expect(page.locator("#atlas-research")).toBeVisible();

  // Live preference changes must stop decorative motion without breaking controls.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await capture("mobile-hero");
  await page.locator(".menu-toggle").click();
  await expect(page.locator(".mobile-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".mobile-nav")).not.toBeVisible();
  await expect(page.locator(".menu-toggle")).toBeFocused();
  await page.locator(".menu-toggle").click();
  await page.locator('.mobile-nav a[href="#selected"]').click();
  await expect(page.locator(".mobile-nav")).not.toBeVisible();
  await expect(page.locator("#selected-title")).toBeInViewport();
  await page.locator('[data-project-tab="2"]').click();
  await expect(page.locator('[data-scene="2"]')).toBeVisible();
  await page.locator("[data-agent-replay]").click();
  await expect(page.locator("[data-agent-replay]")).toBeEnabled();
  await capture("mobile-project");
  await page.locator('[data-atlas-tab="music"]').click();
  await page.locator("#rhythm-range").fill("35");
  await expect(page.locator("#rhythm-value")).toContainText("35");
  await page.locator('[data-atlas-tab="court"]').click();
  await page.locator("[data-rally]").click();
  await expect(page.locator("#rally-status")).toContainText("这一拍");
  await capture("mobile-court");
  await page.locator('[data-atlas-tab="research"]').click();

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `horizontal overflow at ${width}px`,
    ).toBeTruthy();
  }
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture("desktop-full", true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await capture("mobile-full", true);
  expect(failures).toEqual([]);

  const noJS = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await noJS.goto(baseURL);
  await expect(noJS.locator("#hero-title")).toBeVisible();
  await expect(noJS.locator(".splash")).not.toBeVisible();
  await expect(noJS.locator(".story-chapter")).toHaveCount(3);
  for (const interest of ["research", "music", "court"]) {
    await expect(noJS.locator(`#atlas-${interest}`)).toBeVisible();
  }
  expect(
    await noJS.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no-JS mobile overflow",
  ).toBeTruthy();
  await noJS.close();
  console.log(
    "PASS: scroll narrative, project/atlas tabs and keyboard access, weights, agent replay, research lens, music control, rally replay, mobile navigation, live reduced-motion change, 320–1440px layouts, no-JS content, images and runtime errors.",
  );
} finally {
  await browser.close();
}
