import type { Metadata } from "next";
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
          pt-[var(--chrome-inset,0px)]: reserves space below the browser's
          own chrome overlay when ChromeInset detects one — see that file. */}
      <body className="flex min-h-[calc(100%_+_4px)] flex-col bg-background pt-[var(--chrome-inset,0px)]">
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
