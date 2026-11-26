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
function watchErrors(page) {
  page.on("pageerror", (error) => failures.push(`PageError: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") failures.push(`ConsoleError: ${msg.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.status()}: ${response.url()}`);
    }
  });
}

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
watchErrors(page);
const audioRequests = [];
page.on("request", (request) => {
  if (request.resourceType() === "media") audioRequests.push(request.url());
});

const capture = (name, fullPage = false) =>
  page.screenshot({ path: `.test-results/${name}.png`, fullPage });

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });

  await expect(page.locator("#hero-title")).toContainText(/Curious\s*by nature\./i);
  const photo = page.locator("button.photo-toggle");
  await expect(photo).toHaveAttribute("aria-pressed", "false");
  await photo.focus();
  await page.keyboard.press("Space");
  await expect(photo).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator(".photo-frame img").evaluate((img) =>
    img.getBoundingClientRect().width / img.offsetWidth,
  )).toBeGreaterThan(1.02);
  await page.keyboard.press("Escape");
  await expect(photo).toHaveAttribute("aria-pressed", "false");
  await expect(photo).toBeFocused();
  await photo.click();
  await expect(photo).toHaveAttribute("aria-pressed", "true");
  await photo.click();
  await expect(photo).toHaveAttribute("aria-pressed", "false");
  await capture("desktop-hero");

  await page.locator("#cover-scroll").click();
  await expect(page).toHaveURL(/#field-intro$/);
  await expect(page.locator("#field-pulse")).toBeInViewport();
  await capture("desktop-field");

  // Navigate to Project showcase
  await page.locator("#nav-project").click();
  await expect(page.locator("#project-title")).toBeInViewport();

  // Stage 0: Network weights & presets
  await page.locator("#stage-tab-0").click();
  await page.locator("#preset-topology").click();
  await expect(page.locator("#topology-share")).toHaveText("82%");
  await expect(page.locator("#quality-share")).toHaveText("18%");
  await page.locator("#influence-slider").fill("35");
  await expect(page.locator("#topology-share")).toHaveText("35%");
  await expect(page.locator("#quality-share")).toHaveText("65%");
  const network = page.locator("#network-canvas");
  const networkNote = page.locator("#network-tooltip");
  await page.mouse.move(0, 0);
  const idleNote = await networkNote.innerText();
  await network.focus();
  await page.keyboard.press("ArrowRight");
  await expect(networkNote).not.toHaveText(idleNote);
  await page.keyboard.press("Escape");
  await expect(networkNote).toHaveText(idleNote);
  await capture("desktop-project-network");

  // The selected method changes its text and diagram together.
  await page.locator("#stage-tab-1").click();
  await expect(page.locator('[data-chapter="1"]')).toBeVisible();
  await expect(page.locator('[data-chapter="0"]')).toBeHidden();
  await expect(page.locator("#stage-tab-1")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#scene-1")).toBeVisible();
  await page.locator("#cluster-mode-behavior").click();
  await page.waitForTimeout(450);
  await page.locator("#cluster-mode-fused").click();
  await page.locator("#persona-chip-3").click();
  await expect(page.locator("#cluster-insight-text")).toContainText("潜力用户");
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

  const mixedReadout = await page.locator("#regression-readout").innerText();
  await page.locator("#regression-toggle-btn").click();
  await expect(page.locator("#regression-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#regression-readout")).not.toHaveText(mixedReadout);
  await page.waitForTimeout(700);
  await capture("desktop-lens-regression");

  // The chapter links use native anchors, and the player loads only on demand.
  await page.locator('.notes-index a[href="#lens-panel-music"]').click();
  await expect(page).toHaveURL(/#lens-panel-music$/);
  await expect(page.locator("#lens-panel-music")).toBeInViewport();
  expect(audioRequests).toEqual([]);
  const audio = page.locator("#soundtrack-audio");
  const track = page.locator("#soundtrack-track");
  await expect(audio).toHaveJSProperty("paused", true);
  await audio.scrollIntoViewIfNeeded();
  await audio.click({ position: { x: 26, y: 22 } });
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(0);
  await track.selectOption({ index: 1 });
  await expect(audio).toHaveJSProperty("paused", false);
  await expect.poll(() => audio.evaluate((element) => element.currentSrc)).toMatch(/windswept\.mp3$/);
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(0);
  await expect(page.locator("#soundtrack-source")).toHaveAttribute("href", /USUAN1100757/);
  await audio.click({ position: { x: 26, y: 22 } });
  await expect(audio).toHaveJSProperty("paused", true);
  await track.selectOption({ index: 0 });
  await expect(audio).toHaveJSProperty("paused", true);

  // The visual strings retain their controls independently of audio.
  await page.locator("#tempo-bright").click();
  await expect(page.locator("#tempo-output")).toHaveText("86 BPM");
  await page.locator("#music-toggle-btn").click();
  await expect(page.locator("#music-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const pausedFrame = await page.locator("#music-canvas").evaluate((el) => el.toDataURL());
  await page.waitForTimeout(160);
  expect(await page.locator("#music-canvas").evaluate((el) => el.toDataURL())).toBe(pausedFrame);
  await page.locator("#music-toggle-btn").click();
  await expect(page.locator("#music-toggle-btn")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.waitForTimeout(300);
  await capture("desktop-lens-music");

  // Third note: badminton court.
  await page.locator('.notes-index a[href="#lens-panel-court"]').click();
  await expect(page.locator("#lens-panel-court")).toBeInViewport();
  await page.locator("#shot-drop").click();
  await expect(page.locator("#rally-play-btn")).toBeEnabled({ timeout: 5000 });
  const court = page.locator("#court-canvas");
  const rallyNote = await page.locator("#court-readout").innerText();
  const bounds = await court.boundingBox();
  await court.click({ position: { x: bounds.width * 0.75, y: bounds.height * 0.45 } });
  await expect(page.locator("#court-readout")).not.toHaveText(rallyNote);
  await capture("desktop-lens-court");

  const researchLink = page.locator('.notes-index a[href="#lens-panel-research"]');
  await researchLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#lens-panel-research$/);
  await expect(page.locator("#lens-panel-research")).toBeInViewport();

  // Live reduced-motion toggle & mobile checks
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  watchErrors(mobile);
  await mobile.goto(baseURL, { waitUntil: "networkidle" });
  const mobilePhoto = mobile.locator("button.photo-toggle");
  await mobilePhoto.tap();
  await expect(mobilePhoto).toHaveAttribute("aria-pressed", "true");
  await mobilePhoto.tap();
  await expect(mobilePhoto).toHaveAttribute("aria-pressed", "false");

  await mobile.locator("#menu-toggle").tap();
  await expect(mobile.locator("#mobile-nav")).toBeVisible();
  await mobile.keyboard.press("Escape");
  await expect(mobile.locator("#mobile-nav")).not.toBeVisible();
  await expect(mobile.locator("#menu-toggle")).toBeFocused();

  await mobile.locator("#menu-toggle").tap();
  await mobile.locator("#mobile-nav-project").tap();
  await expect(mobile.locator("#mobile-nav")).not.toBeVisible();
  await expect(mobile.locator("#project-title")).toBeInViewport();
  await expect(mobile.locator(".project-reader")).toHaveClass(/inline-reader/);
  for (const index of [0, 1, 2]) {
    await expect(mobile.locator(`#scene-${index} [data-chapter="${index}"]`)).toBeVisible();
  }
  await mobile.locator('[data-stage-bookmark="2"]').tap();
  await expect(mobile).toHaveURL(/#scene-2$/);
  await expect(mobile.locator("#scene-2 h3")).toBeInViewport();
  const mobileReplay = mobile.locator("#agent-replay-btn");
  await mobileReplay.tap();
  await expect(mobileReplay).toBeEnabled();
  await expect(mobile.locator(".agent-node.is-done")).toHaveCount(4);
  await mobile.close();

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

  // No-JS graceful degradation check
  const noJS = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  watchErrors(noJS);
  await noJS.goto(baseURL);
  await expect(noJS.locator("#hero-title")).toBeVisible();
  const staticPhoto = noJS.locator(".hero-photo img");
  await expect(staticPhoto).toBeVisible();
  await expect.poll(() => staticPhoto.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await noJS.locator("#cover-scroll").click();
  await expect(noJS.locator("#hero-cta-project")).toBeInViewport();
  await noJS.locator("#hero-cta-project").click();
  await expect(noJS.locator("#project-title")).toBeInViewport();
  for (const index of [0, 1, 2]) {
    await expect(noJS.locator(`#scene-${index} h3`)).toBeVisible();
  }
  for (const key of ["research", "music", "court"]) {
    await expect(noJS.locator(`#lens-panel-${key}`)).toBeVisible();
    const print = noJS.locator(`#lens-panel-${key} .note-print img`);
    await print.scrollIntoViewIfNeeded();
    await expect.poll(() => print.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(noJS.locator("#soundtrack-audio")).toHaveJSProperty("controls", true);
  expect(
    await noJS.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "no-JS mobile overflow",
  ).toBeTruthy();
  await noJS.close();
  expect(failures).toEqual([]);

  console.log(
    "PASS: Photo zoom, project and note controls, audio playback and track selection, keyboard navigation, touch, reduced motion, responsive layouts and no-JS reading.",
  );
} finally {
  await browser.close();
}
