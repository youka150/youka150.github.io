import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(".test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:5173/", {
    waitUntil: "networkidle",
  });
  for (const [width, height, name] of [
    [1440, 1000, "desktop"],
    [390, 844, "mobile"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.test-results/${name}-hero.png` });
    await page.screenshot({
      path: `.test-results/${name}-full.png`,
      fullPage: true,
    });
    console.log(
      JSON.stringify({
        viewport: name,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      }),
    );
  }
} finally {
  await browser.close();
}
