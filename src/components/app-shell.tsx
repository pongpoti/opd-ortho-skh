import NextLink from "next/link";
import { Avatar, Box, Flex, HStack, Link as ChakraLink } from "@chakra-ui/react";
import { Bone } from "lucide-react";

import { auth } from "@/auth";
import { ColorModeToggle } from "@/components/color-mode-toggle";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileDock } from "@/components/mobile-dock";
import { ScrollableMain } from "@/components/scrollable-main";
import { SecondaryNav } from "@/components/secondary-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <Box minH="100dvh">
      {/*
       * Header + secondary nav are a single sticky group rather than flex
       * children of a fixed-height, overflow:hidden shell. The previous
       * shell forced all scrolling into a nested div sized from JS
       * (visualViewport/innerHeight), which this app's target in-app
       * webview doesn't reliably shrink for an open keyboard -- so that
       * inner scroll container never actually got smaller, leaving a gap
       * above the keyboard no amount of padding could fix. Letting the
       * real document scroll hands keyboard-avoidance to the browser
       * engine itself, which always knows exactly where the keyboard is.
       */}
      <Box position="sticky" top={0} zIndex={15}>
        <Box
          bg="glass.bg"
          borderBottomWidth="1px"
          borderColor="glass.border"
          backdropFilter="blur(16px)"
          boxShadow="sm"
        >
          <Flex mx="auto" w="full" maxW="5xl" align="center" gap={2} px={6} py={3}>
            <ChakraLink asChild fontWeight="semibold" fontSize="lg" color="fg" _hover={{ textDecoration: "none" }}>
              <NextLink href="/">
                <HStack gap={2}>
                  <Bone size={20} />
                  <span>OPD Ortho SKH</span>
                </HStack>
              </NextLink>
            </ChakraLink>

            <DesktopNav />

            <HStack ml="auto" gap={2}>
              {session?.user?.isRegistered && session.user.lineImage && (
                <Avatar.Root size="sm">
                  <Avatar.Image src={session.user.lineImage} alt="" />
                  <Avatar.Fallback />
                </Avatar.Root>
              )}
              <ColorModeToggle />
            </HStack>
          </Flex>
        </Box>

        <SecondaryNav />
      </Box>

      <ScrollableMain>{children}</ScrollableMain>

      <MobileDock />
    </Box>
  );
}
