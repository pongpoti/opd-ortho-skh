"use client";

import { usePathname } from "next/navigation";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export function SecondaryNav() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const activeModule = modules.find(
    (mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`)
  );

  if (!activeModule) return null;

  const activeSubitem = activeModule.subitems?.find(
    (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
  );

  const Icon = MODULE_ICONS[activeModule.icon];
  const hasSubitems = !!activeModule.subitems?.length;

  return (
    <Box flexShrink={0} bg="glass.bg" borderBottomWidth="1px" borderColor="glass.border" backdropFilter="blur(10px)">
      <Flex mx="auto" w="full" maxW="5xl" align="center" px={6} py={2}>
        {hasSubitems ? (
          activeSubitem ? (
            <PageBreadcrumb
              items={[
                { label: "หน้าแรก", href: "/" },
                { label: activeModule.name, href: activeModule.href },
              ]}
              current={activeSubitem.name}
            />
          ) : (
            <PageBreadcrumb items={[{ label: "หน้าแรก", href: "/" }]} current={activeModule.name} />
          )
        ) : (
          <HStack gap={2} color="fg.muted" fontSize="sm" fontWeight="medium">
            <Icon size={14} />
            <Text>{activeModule.name}</Text>
          </HStack>
        )}
      </Flex>
    </Box>
  );
}
