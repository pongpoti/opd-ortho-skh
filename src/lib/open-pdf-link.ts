import { liff } from "@/lib/liff-client";

function inLineClient(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}

/**
 * Open a PDF whose signed link is still being created. Call it straight from a
 * click handler: in an ordinary browser the new tab is opened before the
 * first await, so popup blockers let it through and the page underneath (with
 * its unsaved state) stays put. Inside LINE the link goes to the external
 * browser, because LINE's WebView cannot save files.
 *
 * Returns the error text from `createUrl`, or null once the PDF is opening.
 */
export async function openPdfLink(createUrl: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>): Promise<string | null> {
  const external = inLineClient();
  const tab = external ? null : window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const result = await createUrl();
    if (!result.ok) {
      tab?.close();
      return result.error;
    }
    const url = new URL(result.url, window.location.origin).toString();
    if (external) {
      liff.openWindow({ url, external: true });
    } else if (tab) {
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }
    return null;
  } catch {
    tab?.close();
    return "เปิด PDF ไม่สำเร็จ กรุณาลองอีกครั้ง";
  }
}
