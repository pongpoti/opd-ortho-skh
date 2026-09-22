"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Button, HStack } from "@chakra-ui/react";

import { castRoomSubpages } from "@/lib/cast-room-subpages";
import { MODULE_ICONS } from "@/lib/module-icons";

export function CastRoomTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const tabs = castRoomSubpages.filter((tab) => !tab.adminOnly || isAdmin);

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
        const active =
          tab.href === "/cast-room"
            ? pathname === "/cast-room"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Button
            key={tab.slug}
            asChild
            size="sm"
            variant={active ? "subtle" : "ghost"}
            colorPalette="brand"
            fontWeight={active ? "semibold" : "medium"}
          >
            <NextLink href={tab.href}>
              <Icon size={16} />
              {tab.name}
            </NextLink>
          </Button>
        );
      })}
    </HStack>
  );
}
