import type { Metadata } from "next";
import { IBM_Plex_Sans, Sarabun } from "next/font/google";
import "./globals.css";

import { ViewportHeightSync } from "@/components/viewport-height-sync";
import { Provider } from "@/components/ui/provider";
import { BackgroundGradient } from "@/components/ui/background-gradient";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OPD Ortho SKH",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${sarabun.variable} ${plexSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Provider>
          <BackgroundGradient />
          <ViewportHeightSync />
          {children}
        </Provider>
      </body>
    </html>
  );
}
