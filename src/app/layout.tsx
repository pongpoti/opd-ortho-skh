import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Sans, Sarabun } from "next/font/google";
import "./globals.css";

import { ColorModeSync } from "@/components/color-mode-sync";
import { ViewportHeightSync } from "@/components/viewport-height-sync";
import { Provider } from "@/components/ui/provider";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { DeviceGate } from "@/components/device-gate";

const SET_INITIAL_COLOR_MODE = `
(function () {
  try {
    var stored = window.localStorage.getItem("opd-color-mode");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

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
        <Script id="set-initial-color-mode" strategy="beforeInteractive">
          {SET_INITIAL_COLOR_MODE}
        </Script>
        <Provider>
          <ColorModeSync />
          <BackgroundGradient />
          <ViewportHeightSync />
          <DeviceGate>{children}</DeviceGate>
        </Provider>
      </body>
    </html>
  );
}
