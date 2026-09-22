"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Button, HStack } from "@chakra-ui/react";

import { MODULE_ICONS } from "@/lib/module-icons";
import type { AppModule } from "@/lib/modules";

export function DesktopNav({ modules }: { modules: AppModule[] }) {
  const pathname = usePathname();

  return (
    <HStack gap={1} display={{ base: "none", sm: "flex" }}>
      {modules.map((mod) => {
        const Icon = MODULE_ICONS[mod.icon];
        const active = pathname === mod.href || pathname.startsWith(`${mod.href}/`);
        return (
          <Button
            key={mod.slug}
            asChild
            size="lg"
            variant={active ? "subtle" : "ghost"}
            colorPalette="brand"
            fontWeight={active ? "semibold" : "medium"}
          >
            <NextLink href={mod.href}>
              <Icon size={20} />
              {mod.name}
            </NextLink>
          </Button>
        );
      })}
    </HStack>
  );
}
