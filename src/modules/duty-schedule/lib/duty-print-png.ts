import type { Browser } from "puppeteer-core";

import { buildDutyPosterHtml } from "./duty-print-html";

/** A4 page at 96 dpi CSS pixels; 4× scale → ~3176×4492 (high-res for LINE). */
const VIEWPORT = { width: 794, height: 1123 } as const;
const DEVICE_SCALE_FACTOR = 4;

/**
 * LINE image messages need:
 * - original ≤ 10 MB
 * - preview ≤ 1 MB
 * A 4× JPEG at quality 88 is ~0.65 MB — sharp in the chat bubble and when opened,
 * and small enough to use for BOTH original and preview (one URL, one render).
 */
const JPEG_QUALITY = 88;

export type DutyPrintImage = {
  bytes: Buffer;
  contentType: "image/jpeg";
  extension: "jpg";
};

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
 * Render the ortho-schedule A4 poster as a 4× JPEG for LINE Messaging API.
 */
export async function buildDutyScheduleImage(
  year: number,
  month: number
): Promise<DutyPrintImage> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Invalid year/month");
  }

  const { html } = await buildDutyPosterHtml(year, month);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const probe = document.createElement("span");
      probe.textContent = "กขค";
      probe.style.fontFamily = '"IBM Plex Sans Thai Looped", "Bai Jamjuree", sans-serif';
      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      document.body.appendChild(probe);
      void probe.offsetWidth;
      probe.remove();
    });

    const el = await page.$(".page");
    if (!el) throw new Error("Poster .page element not found");

    const bytes = Buffer.from(
      await el.screenshot({ type: "jpeg", quality: JPEG_QUALITY })
    );
    return { bytes, contentType: "image/jpeg", extension: "jpg" };
  } finally {
    await browser.close();
  }
}

/** @deprecated Prefer buildDutyScheduleImage. */
export async function buildDutySchedulePng(
  year: number,
  month: number
): Promise<Buffer> {
  const image = await buildDutyScheduleImage(year, month);
  return image.bytes;
}

export function dutyPrintFilename(year: number, month: number): string {
  const m = String(month + 1).padStart(2, "0");
  return `ortho-schedule-${year + 543}-${m}.jpg`;
}
