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
page.on("pageerror", (error) => failures.push(`PageError: ${error.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") failures.push(`ConsoleError: ${msg.text()}`);
});
page.on("response", (response) => {
  if (response.status() >= 400) {
    failures.push(`${response.status()}: ${response.url()}`);
  }
});

const capture = (name, fullPage = false) =>
  page.screenshot({ path: `.test-results/${name}.png`, fullPage });

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(950);

  await expect(page.locator("#hero-title")).toContainText("把好奇心");
  await page.locator("#hero-pulse-btn").click();
  await page.waitForTimeout(200);
  await capture("desktop-hero");

  // Navigate to Project showcase
  await page.locator("#nav-project").click();
  await expect(page.locator("#project-title")).toBeInViewport();

  // Stage 0: Network weights & presets
  await page.locator("#preset-topology").click();
  await expect(page.locator("#topology-share")).toHaveText("82%");
  await expect(page.locator("#quality-share")).toHaveText("18%");
  await page.locator("#influence-slider").fill("35");
  await expect(page.locator("#topology-share")).toHaveText("35%");
  await expect(page.locator("#quality-share")).toHaveText("65%");
  await page.waitForTimeout(300);
  await capture("desktop-project-network");

  // Scroll-driven chapter sync -> Stage 1 (Cluster)
  await page
    .locator("#chapter-1")
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(page.locator("#stage-tab-1")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#scene-1")).toBeVisible();
  await page.locator("#cluster-mode-behavior").click();
  await page.waitForTimeout(450);
  await page.locator("#cluster-mode-fused").click();
  await page.locator("#persona-chip-3").click();
  await expect(page.locator("#cluster-insight-text")).toContainText("高潜新星");
  await page.waitForTimeout(550);
  await capture("desktop-project-cluster");

  // Stage 2: Reflective Trend Agent
  await page.locator("#stage-tab-2").click();
  await expect(page.locator("#scene-2")).toBeVisible();
  await expect(page.locator("#agent-replay-btn")).toBeEnabled({ timeout: 5000 });
  await page.locator("#agent-query-1").click();
  await expect(page.locator("#agent-replay-btn")).toBeEnabled({ timeout: 5000 });
  await expect(page.locator("#agent-trace-log")).toContainText("鸿蒙端侧推理");
  await capture("desktop-project-agent");

  // Keyboard navigation on stage tabs
  await page.locator("#stage-tab-2").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#stage-tab-0")).toBeFocused();
  await expect(page.locator("#scene-0")).toBeVisible();

  // Navigate to Personal Studio
  await page.locator("#nav-perspectives").click();
  await expect(page.locator("#perspectives-title")).toBeInViewport();

  // Lens 1: Stratified Regression (Simpson's Paradox) & child icon preservation check
  await page.locator("#regression-toggle-btn").click();
  await expect(page.locator("#regression-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#regression-toggle-btn .btn-icon")).toBeVisible();
  await expect(page.locator("#regression-readout")).toContainText("辛普森悖论");
  await page.waitForTimeout(700);
  await capture("desktop-lens-regression");

  // Lens 2: Harmonic Music Strings
  await page.locator("#lens-tab-music").click();
  await expect(page.locator("#lens-panel-music")).toBeVisible();
  await page.locator("#tempo-bright").click();
  await expect(page.locator("#tempo-output")).toHaveText("86 BPM");
  await page.locator("#music-toggle-btn").click();
  await expect(page.locator("#music-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#music-toggle-btn .btn-icon")).toHaveText("▶");
  await page.locator("#music-toggle-btn").click();
  await expect(page.locator("#music-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.waitForTimeout(300);
  await capture("desktop-lens-music");

  // Lens 3: Aerodynamic Badminton Court
  await page.locator("#lens-tab-court").click();
  await expect(page.locator("#lens-panel-court")).toBeVisible();
  await page.locator("#shot-drop").click();
  await expect(page.locator("#rally-play-btn")).toBeEnabled({ timeout: 5000 });
  await capture("desktop-lens-court");

  // Keyboard navigation on lens tabs
  await page.locator("#lens-tab-court").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#lens-tab-research")).toBeFocused();
  await expect(page.locator("#lens-panel-research")).toBeVisible();

  // Live reduced-motion toggle & mobile checks
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await capture("mobile-hero");

  await page.locator("#menu-toggle").click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).not.toBeVisible();
  await expect(page.locator("#menu-toggle")).toBeFocused();

  await page.locator("#menu-toggle").click();
  await page.locator("#mobile-nav-project").click();
  await expect(page.locator("#mobile-nav")).not.toBeVisible();
  await expect(page.locator("#project-title")).toBeInViewport();

  // Responsive overflow sweep across 320px–1440px
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `horizontal overflow at ${width}px`,
    ).toBeTruthy();
  }

  // Full-page captures
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(950);
  await capture("desktop-full", true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.waitForTimeout(950);
  await capture("mobile-full", true);

  expect(failures).toEqual([]);

  // No-JS graceful degradation check
  const noJS = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  await noJS.goto(baseURL);
  await expect(noJS.locator("#hero-title")).toBeVisible();
  await expect(noJS.locator(".chapter-card")).toHaveCount(3);
  for (const key of ["research", "music", "court"]) {
    await expect(noJS.locator(`#lens-panel-${key}`)).toBeVisible();
  }
  expect(
    await noJS.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "no-JS mobile overflow",
  ).toBeTruthy();
  await noJS.close();

  console.log(
    "PASS: All interactive canvases, scrollytelling stages, keyboard navigation, mobile drawer, reduced-motion live switch, 320–1440px responsive layouts, and no-JS fallback passed with zero errors.",
  );
} finally {
  await browser.close();
}
