"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Flex, Text, VStack } from "@chakra-ui/react";
import { Home } from "lucide-react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

export function MobileDock() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "หน้าแรก", Icon: Home },
    ...modules.map((mod) => ({
      href: mod.href,
      label: mod.name,
      Icon: MODULE_ICONS[mod.icon],
    })),
  ];

  return (
    <Flex
      flexShrink={0}
      display={{ base: "flex", sm: "none" }}
      bg="dock.bg"
      borderTopWidth="1px"
      borderColor="dock.border"
      backdropFilter="blur(16px)"
      justify="space-around"
      align="center"
      py={2}
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <VStack
            key={href}
            asChild
            gap={1}
            flex="1"
            py={1}
            color={active ? "brand.fg" : "fg.muted"}
          >
            <NextLink href={href}>
              <Circle size={10} bg={active ? "brand.subtle" : "transparent"}>
                <Icon size={20} />
              </Circle>
              <Text fontSize="xs" fontWeight={active ? "semibold" : "medium"}>
                {label}
              </Text>
            </NextLink>
          </VStack>
        );
      })}
    </Flex>
  );
}
