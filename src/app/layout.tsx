import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ChromeInset } from "@/components/chrome-inset";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SiteHeader } from "@/components/site-header";
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
            on a later navigation. Duplicates that file's threshold/reserve
            values — see it for why they're set the way they are. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var c=window.innerHeight-document.documentElement.clientHeight>20;document.documentElement.style.setProperty('--chrome-inset',c?'96px':'0px')}catch(e){}})();",
          }}
        />
      </head>
      {/* +4px over 100%: guarantees a sliver of scrollable overflow on even
          the shortest page, so ScrollToTop's scroll nudge (see that file)
          always has somewhere to move instead of silently no-oping.
          pt-[var(--chrome-inset,0px)]: reserves space below the browser's
          own chrome overlay when ChromeInset detects one — see that file. */}
      <body className="flex min-h-[calc(100%_+_4px)] flex-col pt-[var(--chrome-inset,0px)] bg-tremor-background-muted dark:bg-dark-tremor-background-muted">
        <ChromeInset />
        <ScrollToTop />
        <AuthProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
