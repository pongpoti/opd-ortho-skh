import type { Browser } from "puppeteer-core";

import { loadPosterCss, renderDutyPrintHtml } from "./duty-print-html";
import { fetchDutyMonthData, fetchOpdWeeklySchedule } from "./duty-repository";

/** A4 portrait at 96 dpi CSS pixels; landscape sheets set their own @page size. */
const VIEWPORT = { width: 794, height: 1123 } as const;

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
    defaultViewport: VIEWPORT,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/**
 * Render the printable duty schedule as a PDF: the staff poster (portrait)
 * followed by OPD ท่าฉลอม/เกตุม, intern and ห้องเฝือก month sheets (landscape).
 */
export async function buildDutySchedulePdf(year: number, month: number): Promise<Uint8Array> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Invalid year/month");
  }

  const [data, opd, css] = await Promise.all([
    fetchDutyMonthData(year, month),
    fetchOpdWeeklySchedule(),
    loadPosterCss(),
  ]);
  const html = renderDutyPrintHtml({ year, month, data, opd }, css);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const probe = document.createElement("span");
      probe.textContent = "กขค";
      probe.style.fontFamily = '"Sarabun", sans-serif';
      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      document.body.appendChild(probe);
      void probe.offsetWidth;
      probe.remove();
    });

    // preferCSSPageSize lets the poster stay portrait and the sheets landscape.
    return await page.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}

export function dutyPrintFilename(year: number, month: number): string {
  const m = String(month + 1).padStart(2, "0");
  return `ortho-schedule-${year + 543}-${m}.pdf`;
}
