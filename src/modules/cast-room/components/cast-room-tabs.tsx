"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Button, HStack } from "@chakra-ui/react";

import { castRoomSubpages } from "@/lib/cast-room-subpages";
import { MODULE_ICONS } from "@/lib/module-icons";

function isTabActive(pathname: string, href: string) {
  if (href === "/cast-room") return pathname === "/cast-room";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CastRoomTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const tabs = castRoomSubpages.filter((tab) => !tab.adminOnly || isAdmin);
  // Highlight the destination immediately on click; fall back once the route catches up.
  const activePath =
    pendingHref !== null && !isTabActive(pathname, pendingHref) ? pendingHref : pathname;

  return (
    <HStack
      gap={2}
      flexWrap="wrap"
      pb={4}
      borderBottomWidth="1px"
      borderColor="glass.border"
      mx={{ base: -1, sm: 0 }}
    >
      {tabs.map((tab) => {
        const Icon = MODULE_ICONS[tab.icon];
        const active = isTabActive(activePath, tab.href);

        return (
          <Button
            key={tab.slug}
            asChild
            size="sm"
            variant={active ? "subtle" : "ghost"}
            colorPalette="brand"
            fontWeight={active ? "semibold" : "medium"}
            transition="background-color 0.12s ease"
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
              <Icon size={16} />
              {tab.name}
            </NextLink>
          </Button>
        );
      })}
    </HStack>
  );
}
