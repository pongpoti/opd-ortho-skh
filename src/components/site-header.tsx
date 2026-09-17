"use client"

import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"
import { Box, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react"

import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

// Mobile navigation lives in a bottom bar, not the top header.
//
// iOS WebKit browsers can paint their status bar and address bar over the
// top of the page on load, without any of the standard APIs
// (env(safe-area-inset-top), visualViewport, innerHeight/clientHeight)
// reliably reporting how much they cover — see the history of this file for
// the failed attempts at measuring it. Rather than keep guessing at a pixel
// offset, navigation simply doesn't live up there on mobile: a bottom bar
// is always inside the visible band. Desktop, which never had the problem,
// keeps the top header.
export function SiteHeader() {
  const pathname = usePathname()

  if (pathname === "/signin") {
    return null
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      <Box as="header" hideBelow="md" position="sticky" top="0" zIndex="40" borderBottomWidth="1px" bg="bg">
        <Flex mx="auto" h="14" w="full" maxW="5xl" align="center" justify="space-between" gap="4" px="6">
          <ChakraLink asChild fontWeight="semibold" letterSpacing="tight" outline="none" _focusVisible={{ ring: "3px", ringColor: "brand.focusRing/50" }}>
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
                <Text truncate>{siteConfig.name}</Text>
              </HStack>
            </NextLink>
          </ChakraLink>

          <HStack gap="2">
            <HStack as="nav" aria-label="เมนูหลัก" gap="1">
              {siteConfig.nav.map((item) => (
                <ChakraLink
                  key={item.href}
                  asChild
                  h="9"
                  display="inline-flex"
                  alignItems="center"
                  whiteSpace="nowrap"
                  borderRadius="md"
                  px="3"
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
                    {item.title}
                  </NextLink>
                </ChakraLink>
              ))}
            </HStack>
            <UserMenu />
          </HStack>
        </Flex>
      </Box>

      {/*
        The nav itself is NOT position:fixed against the raw viewport.
        Measured on the reporter's phone (Chrome for iOS): on a cold load,
        window.innerHeight optimistically reports the viewport as if
        Safari's chrome were already collapsed (852px) while it is still
        painted expanded, with only 665px (document.documentElement.
        clientHeight) actually visible — a `fixed; bottom: 0` element gets
        positioned against that wrong 852px frame and lands underneath the
        real, still-onscreen toolbar. It self-corrects after a scroll or a
        reload, once innerHeight catches up to clientHeight.

        `svh` (small viewport height) is defined to always report the
        smallest guaranteed-visible height regardless of chrome state, so
        anchoring against it instead of raw `bottom: 0` should place the
        nav correctly even before Safari's chrome settles. This wrapper is
        the fixed, full-height, invisible frame; flex pushes the actual
        nav to its bottom edge, which lands at the safe height. The wrapper
        ignores pointer events everywhere except where the nav itself is.
      */}
      <Box
        hideFrom="md"
        position="fixed"
        insetX="0"
        top="0"
        height="100svh"
        zIndex="40"
        display="flex"
        flexDir="column"
        justifyContent="flex-end"
        pointerEvents="none"
      >
        <Flex
          as="nav"
          aria-label="เมนูหลัก"
          pointerEvents="auto"
          borderTopWidth="1px"
          bg="bg"
          pb="env(safe-area-inset-bottom, 0px)"
        >
          <Flex mx="auto" h="16" w="full" maxW="5xl" align="stretch">
            {siteConfig.nav.map((item) => (
              <ChakraLink
                key={item.href}
                asChild
                flex="1"
                display="flex"
                flexDir="column"
                alignItems="center"
                justifyContent="center"
                gap="1"
                px="1"
                outline="none"
                textDecoration="none"
                color={isActive(item.href) ? "brand.fg" : "fg.muted"}
                _focusVisible={{ bg: "bg.muted" }}
              >
                <NextLink href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  <Box position="relative">
                    <item.icon size={20} aria-hidden="true" />
                    {item.comingSoon ? (
                      <Box
                        position="absolute"
                        top="-0.5"
                        right="-1"
                        boxSize="1.5"
                        borderRadius="full"
                        bg="fg.subtle"
                      />
                    ) : null}
                  </Box>
                  <Text w="full" truncate textAlign="center" fontSize="10px" fontWeight="medium" lineHeight="1">
                    {item.title}
                  </Text>
                </NextLink>
              </ChakraLink>
            ))}
            <Flex flex="1" flexDir="column" align="center" justify="center" gap="1">
              <UserMenu />
            </Flex>
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
