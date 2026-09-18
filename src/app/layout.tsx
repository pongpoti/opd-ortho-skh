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
            <Box colorPalette="brand" display="flex" minH="100svh" flexDir="column">
              <SiteHeader />
              <Box display="flex" flex="1" flexDir="column">
                {children}
              </Box>
            </Box>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
