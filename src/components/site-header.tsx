"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"
import { Box, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react"

import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

// A single top header at every screen width — no fixed-to-viewport bottom
// bar, and no position:sticky/fixed on this element at all.
//
// Every past round of "header hidden on mobile" (fixed positioned against
// a viewport still settling after cold load; sticky+backdrop-filter
// WebKit paint bugs; iOS floating its collapsed address bar over the
// document after a client-side route change scrolls it programmatically)
// came from the same place: this header lived inside a document that
// could itself scroll. RootLayout now locks html/body from scrolling and
// gives this header a fixed-height, non-scrolling flex shell to sit in
// (see globalCss in theme.ts) — so the header is just a normal-flow flex
// child that's never behind anything or fighting a moving viewport, and
// doesn't need sticky/fixed positioning to stay visible.
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
      flexShrink="0"
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
