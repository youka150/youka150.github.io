import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await page.screenshot({ path: ".test-results/desktop-hero.png" });
await page.screenshot({
  path: ".test-results/desktop-full.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    errors,
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    images: await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.map((i) => ({
          src: i.getAttribute("src"),
          loaded: i.complete && i.naturalWidth > 0,
        })),
      ),
  }),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: ".test-results/mobile-hero.png" });
await page.screenshot({
  path: ".test-results/mobile-full.png",
  fullPage: true,
});
console.log(
  JSON.stringify({
    mobileOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  }),
);
await browser.close();
