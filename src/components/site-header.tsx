"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"
import { Box, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react"

import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

// position:fixed, pinned to the viewport — same mechanism pmcskh's nav
// bars use, and deliberately not the plain normal-flow header tried
// previously.
//
// That earlier attempt reasoned that locking html/body with
// overflow:hidden (see globalCss in theme.ts) meant nothing could scroll,
// so a header sitting in normal document flow could no longer be dragged
// away or hidden by anything. It still failed on a real device: iOS
// Safari doesn't fully honor overflow:hidden on the document the way
// Chromium does — the page can still rubber-band/bounce a little regardless
// — and a normal-flow header has zero protection against that residual
// motion, since it's just document content. A `position: fixed` header
// tracks the viewport directly, independent of any document scroll
// offset, so it stays put even if the document moves slightly underneath
// it. #app-scroll (RootLayout) pads its top to clear this header's
// height instead of sharing flex space with it, since fixed elements
// don't participate in flex/flow sizing.
export function SiteHeader() {
  const pathname = usePathname()

  if (pathname === "/signin") {
    return null
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <Box
      as="header"
      position="fixed"
      insetX="0"
      top="0"
      zIndex="40"
      borderBottomWidth="1px"
      bg="bg"
      pt="env(safe-area-inset-top, 0px)"
    >
      <Flex mx="auto" h="14" w="full" maxW="5xl" align="center" justify="space-between" gap="2" px={{ base: "3", sm: "6" }}>
        <ChakraLink
          asChild
          flexShrink="0"
          fontWeight="semibold"
          letterSpacing="tight"
          outline="none"
          _focusVisible={{ ring: "3px", ringColor: "brand.focusRing/50" }}
        >
          <NextLink href="/">
            <HStack gap="2.5" minW="0">
              <Flex
                boxSize="8"
                flexShrink="0"
                align="center"
                justify="center"
                borderRadius="md"
                bg="brand.solid"
                color="brand.contrast"
              >
                <Bone size={18} aria-hidden="true" />
              </Flex>
              <Text display={{ base: "none", sm: "block" }} truncate>
                {siteConfig.name}
              </Text>
            </HStack>
          </NextLink>
        </ChakraLink>

        <HStack gap={{ base: "0.5", sm: "1" }}>
          <HStack as="nav" aria-label="เมนูหลัก" gap={{ base: "0.5", sm: "1" }}>
            {siteConfig.nav.map((item) => (
              <ChakraLink
                key={item.href}
                asChild
                position="relative"
                h="9"
                display="inline-flex"
                alignItems="center"
                gap="1.5"
                whiteSpace="nowrap"
                borderRadius="md"
                px={{ base: "2", sm: "3" }}
                fontSize="sm"
                fontWeight="medium"
                outline="none"
                textDecoration="none"
                bg={isActive(item.href) ? "brand.muted" : undefined}
                color={isActive(item.href) ? "brand.fg" : "fg.muted"}
                _hover={{ bg: isActive(item.href) ? "brand.muted" : "bg.muted", color: isActive(item.href) ? "brand.fg" : "fg" }}
                _focusVisible={{ ring: "3px", ringColor: "brand.focusRing/50" }}
              >
                <NextLink href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  <item.icon size={18} aria-hidden="true" />
                  <Text display={{ base: "none", sm: "inline" }}>{item.title}</Text>
                  {item.comingSoon ? (
                    <Box
                      position="absolute"
                      top="1"
                      right="1"
                      boxSize="1.5"
                      borderRadius="full"
                      bg="fg.subtle"
                      hideFrom="sm"
                    />
                  ) : null}
                </NextLink>
              </ChakraLink>
            ))}
          </HStack>
          <UserMenu />
        </HStack>
      </Flex>
    </Box>
  )
}
