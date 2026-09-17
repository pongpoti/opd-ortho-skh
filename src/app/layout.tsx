import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ChromeInset } from "@/components/chrome-inset";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SiteHeader } from "@/components/site-header";
import { ViewportProbe } from "@/components/viewport-probe";
import { siteConfig } from "@/config/site";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: "แดชบอร์ดระบบงาน OPD ศัลยกรรมกระดูก โรงพยาบาลสมุทรสาคร",
};

// Measured on the reporter's phone: the browser hands this app a viewport
// anchored at screen y=0, with its own status bar and address bar painted
// over the first ~104px — the header, at rows 0-57, lands entirely inside
// that strip. That is edge-to-edge presentation, and without declaring
// viewport-fit=cover the browser does it anyway while reporting
// env(safe-area-inset-*) as 0, leaving the page no way to compensate.
// Declaring it is what makes those insets report real values, which the
// body rule in globals.css then pads by.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <head>
        {/* Runs before first paint, ahead of React hydration, so the page
            never flashes uninset before ChromeInset's own effect catches up
            on a later navigation. Mirrors that file's formula — see it for
            the device measurements the 0.65 share is derived from. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var g=window.innerHeight-document.documentElement.clientHeight;var v=(g>20?Math.round(g*0.65):0)+'px';document.documentElement.style.setProperty('--chrome-inset',v);window.__chromeInsetBoot=window.innerHeight+'/'+document.documentElement.clientHeight+' gap '+g+' -> '+v}catch(e){}})();",
          }}
        />
      </head>
      {/* +4px over 100%: guarantees a sliver of scrollable overflow on even
          the shortest page, so the browser always has somewhere to scroll.
          The top inset itself lives in globals.css, since it combines a
          CSS env() with a custom property — see the body rule there. */}
      <body className="flex min-h-[calc(100%_+_4px)] flex-col bg-background">
        <ChromeInset />
        <ScrollToTop />
        <AuthProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </AuthProvider>
        <Suspense>
          <ViewportProbe />
        </Suspense>
      </body>
    </html>
  );
}
