import type { Metadata, Viewport } from "next";
import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { Provider } from "@/components/ui/provider";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={notoSansThai.variable} suppressHydrationWarning>
      <body>
        <Provider>
          <ScrollToTop />
          <AuthProvider>
            <Box colorPalette="brand" display="flex" h="100dvh" flexDir="column" overflow="hidden">
              <SiteHeader />
              {/* The one scrolling region in the whole app — see globalCss in
                  theme.ts. scroll-to-top.tsx resets this id on navigation.
                  SiteHeader is position:fixed and so contributes nothing to
                  flex sizing here — pt clears its rendered height instead
                  (safe-area inset + the h="14" flex row + its 1px border). */}
              <Box
                id="app-scroll"
                display="flex"
                flex="1"
                minH="0"
                flexDir="column"
                overflowY="auto"
                pt="calc(env(safe-area-inset-top, 0px) + 3.5rem + 1px)"
              >
                {children}
              </Box>
            </Box>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
