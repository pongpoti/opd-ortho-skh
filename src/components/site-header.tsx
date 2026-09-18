"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"
import { Box, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react"

import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

// A single sticky top header at every screen width — no fixed-to-viewport
// bottom bar.
//
// This app used to put navigation in a fixed bottom bar on mobile,
// specifically to dodge a real iOS WebKit quirk: right after a cold load,
// window.innerHeight can briefly report a larger, wrong viewport height
// before Safari's chrome settles, and a `position: fixed` element computed
// against that wrong frame lands in the wrong place — hidden under the
// chrome, or (once anchored to a value that itself changes on scroll)
// stuck floating above a gap. Every attempt at that fixed-position math
// (see git history: chrome-inset.tsx, then svh-anchoring, then dvh) fixed
// one symptom and re-exposed another, because the root instability is in
// `position: fixed`'s relationship to a viewport that's still settling.
//
// `position: sticky` doesn't have that problem: it's part of normal
// document flow (just "sticks" once scrolled to), computed relative to the
// page's own layout rather than re-anchored against a live, transiently
// wrong viewport measurement. This is the same positioning the desktop
// header already used throughout every round of this — never once
// reported as broken. Using it everywhere, instead of chasing the fixed
// bottom bar's edge cases further, is the fix.
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
      position="sticky"
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
