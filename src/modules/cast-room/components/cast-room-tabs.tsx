"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, Text } from "@chakra-ui/react";

import { castRoomSubpages } from "@/lib/cast-room-subpages";
import { MODULE_ICONS } from "@/lib/module-icons";

function isTabActive(pathname: string, href: string) {
  if (href === "/cast-room") return pathname === "/cast-room";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Equal-width segmented subnav — one row on mobile for all cast-room subpages.
 */
export function CastRoomTabs({ showDashboard }: { showDashboard: boolean }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const tabs = castRoomSubpages.filter((tab) => !tab.adminOnly || showDashboard);

  // Nurses only have one subpage — skip the tab row so the form is the focus.
  if (tabs.length <= 1) return null;

  // Optimistic highlight while the route transition catches up.
  const activePath =
    pendingHref !== null && !isTabActive(pathname, pendingHref) ? pendingHref : pathname;

  return (
    <Box pb={4}>
      <Flex
        w="full"
        p="4px"
        gap="4px"
        borderRadius="xl"
        bg="bg.muted"
        borderWidth="1px"
        borderColor="glass.border"
        role="tablist"
        aria-label="เมนูย่อยเวรห้องเฝือก"
      >
        {tabs.map((tab) => {
          const Icon = MODULE_ICONS[tab.icon];
          const active = isTabActive(activePath, tab.href);

          return (
            <Flex
              key={tab.slug}
              asChild
              flex="1"
              minW={0}
              direction="column"
              align="center"
              justify="center"
              gap={1}
              minH="52px"
              px={1}
              py={2}
              borderRadius="lg"
              bg={active ? "brand.subtle" : "transparent"}
              color={active ? "brand.fg" : "fg.muted"}
              fontWeight={active ? "semibold" : "medium"}
              transition="background-color 0.12s ease, color 0.12s ease"
              _hover={{ color: active ? "brand.fg" : "fg" }}
              role="tab"
              aria-selected={active}
            >
              <NextLink
                href={tab.href}
                prefetch
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  if (isTabActive(pathname, tab.href)) return;
                  setPendingHref(tab.href);
                }}
              >
                <Icon size={16} aria-hidden />
                <Text
                  fontSize="xs"
                  lineHeight="1.2"
                  textAlign="center"
                  w="full"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {tab.name}
                </Text>
              </NextLink>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
