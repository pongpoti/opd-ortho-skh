"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Breadcrumb, Circle, Flex, HStack, Heading } from "@chakra-ui/react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

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
                  <Heading as="span" size="lg" textShadow="heading">
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
