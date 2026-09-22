"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Breadcrumb, Circle, Flex, HStack, Heading } from "@chakra-ui/react";

import { MODULE_ICONS } from "@/lib/module-icons";
import type { AppModule } from "@/lib/modules";

export function SecondaryNav({ modules }: { modules: AppModule[] }) {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const activeModule = modules.find(
    (mod) => pathname === mod.href || pathname.startsWith(`${mod.href}/`)
  );

  if (!activeModule) return null;

  // Module-root subpages (e.g. cast-room "บันทึกข้อมูล") only match exactly so
  // they don't steal child routes like /cast-room/dashboard.
  const activeSubitem = activeModule.subitems
    ?.filter((sub) => {
      if (pathname === sub.href) return true;
      if (sub.href === activeModule.href) return false;
      return pathname.startsWith(`${sub.href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];

  const CurrentIcon = MODULE_ICONS[activeSubitem?.icon ?? activeModule.icon];

  return (
    <Box flexShrink={0} bg="glass.bg" borderBottomWidth="1px" borderColor="glass.border" backdropFilter="blur(10px)">
      <Flex mx="auto" w="full" maxW="5xl" align="center" px={6} py={4}>
        <Breadcrumb.Root>
          <Breadcrumb.List alignItems="center" gap={3}>
            {activeSubitem && (
              <>
                <Breadcrumb.Item>
                  <Breadcrumb.Link
                    asChild
                    fontSize="md"
                    color="fg.muted"
                    fontWeight="medium"
                    _hover={{ color: "brand.fg" }}
                  >
                    <NextLink href={activeModule.href}>{activeModule.name}</NextLink>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
              </>
            )}
            <Breadcrumb.Item>
              <Breadcrumb.CurrentLink asChild>
                <HStack gap={2}>
                  <Circle size={8} bg="brand.subtle" color="brand.fg">
                    <CurrentIcon size={16} />
                  </Circle>
                  <Heading as="span" size="lg">
                    {activeSubitem ? activeSubitem.name : activeModule.name}
                  </Heading>
                </HStack>
              </Breadcrumb.CurrentLink>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </Flex>
    </Box>
  );
}
