import type { Browser } from "puppeteer-core";

import { buildDutyPosterHtml } from "./duty-print-html";

/** Zip export uses deviceScaleFactor 3 on a 794×1123 page → ~2382×3369 PNG. */
const VIEWPORT = { width: 794, height: 1123 } as const;
const DEVICE_SCALE_FACTOR = 3;

/**
 * Lazy-load Chromium only when rendering. Static imports of
 * `@sparticuz/chromium` can make Vercel rebuilds fail with ENOENT when a
 * cached binary path no longer exists on the build machine.
 */
async function launchBrowser(): Promise<Browser> {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  // Disable WebGL / GPU extras — not needed for static HTML → PNG.
  chromium.graphicsMode = false;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/**
 * Render the ortho-schedule A4 poster HTML to PNG (same pipeline as the zip's
 * Playwright export: screenshot `.page` at 3×).
 */
export async function buildDutySchedulePng(
  year: number,
  month: number,
  options?: { preview?: boolean }
): Promise<Buffer> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Invalid year/month");
  }

  const scale = options?.preview ? 1 : DEVICE_SCALE_FACTOR;
  const { html } = await buildDutyPosterHtml(year, month);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: scale,
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const el = await page.$(".page");
    if (!el) throw new Error("Poster .page element not found");

    const shot = await el.screenshot({ type: "png" });
    return Buffer.from(shot);
  } finally {
    await browser.close();
  }
}

export function dutyPrintFilename(year: number, month: number): string {
  const m = String(month + 1).padStart(2, "0");
  return `ortho-schedule-${year + 543}-${m}.png`;
}
