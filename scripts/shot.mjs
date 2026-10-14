// Screenshot + audit with the system Chrome (playwright-core, no browser download).
// usage: node scripts/shot.mjs <url> <out.png> [width=390] [height=844] [--full] [--rm]
// prints JSON: horizontal overflow, console errors, failed requests, image KB.
import { chromium } from "playwright-core";

const [url, out, w = "390", h = "844", ...flags] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: +w, height: +h },
    deviceScaleFactor: +w < 800 ? 2 : 1,
    isMobile: +w < 800,
    hasTouch: +w < 800,
    reducedMotion: flags.includes("--rm") ? "reduce" : "no-preference",
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("requestfailed", (r) => errors.push(`FAILED ${r.url()}`));
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  // walk the page so lazy images and scroll reveals fire
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  const stats = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - innerWidth,
    imgKB: Math.round(
      performance
        .getEntriesByType("resource")
        .filter((e) => e.initiatorType === "img")
        .reduce((s, e) => s + e.transferSize, 0) / 1024,
    ),
  }));
  if (out) await page.screenshot({ path: out, fullPage: flags.includes("--full") });
  console.log(JSON.stringify({ url, ...stats, errors }));
} finally {
  await browser.close();
}
