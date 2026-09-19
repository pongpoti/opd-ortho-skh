import NextLink from "next/link";
import { Avatar, Box, Button, Flex, HStack, Link as ChakraLink, Text } from "@chakra-ui/react";
import { Bone } from "lucide-react";

import { auth } from "@/auth";
import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";
import { MobileDock } from "@/components/mobile-dock";

const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  doctor: "แพทย์",
  nurse: "พยาบาล",
};

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <Box display="flex" flexDirection="column" overflow="hidden" height="var(--app-vh)">
      <Box
        flexShrink={0}
        bg="glass.bg"
        borderBottomWidth="1px"
        borderColor="glass.border"
        backdropFilter="blur(16px)"
        boxShadow="sm"
      >
        <Flex mx="auto" w="full" maxW="5xl" align="center" gap={2} px={6} py={3}>
          <ChakraLink asChild fontWeight="semibold" fontSize="lg" color="fg" _hover={{ textDecoration: "none" }}>
            <NextLink href="/">
              <HStack gap={2}>
                <Bone size={20} />
                <span>OPD Ortho SKH</span>
              </HStack>
            </NextLink>
          </ChakraLink>

          <HStack gap={1} display={{ base: "none", sm: "flex" }}>
            {modules.map((mod) => {
              const Icon = MODULE_ICONS[mod.icon];
              return (
                <Button key={mod.slug} asChild variant="ghost" size="sm" colorPalette="brand">
                  <NextLink href={mod.href}>
                    <Icon size={16} />
                    {mod.name}
                  </NextLink>
                </Button>
              );
            })}
          </HStack>

          {session?.user?.isRegistered && (
            <HStack ml="auto" gap={3}>
              {session.user.lineImage && (
                <Avatar.Root size="sm">
                  <Avatar.Image src={session.user.lineImage} alt="" />
                  <Avatar.Fallback />
                </Avatar.Root>
              )}
              <Text fontSize="sm">
                {session.user.firstName ?? session.user.lineDisplayName}
                {session.user.role && ` (${ROLE_LABEL[session.user.role]})`}
              </Text>
            </HStack>
          )}
        </Flex>
      </Box>

      <Box as="main" mx="auto" w="full" minH={0} maxW="5xl" flex="1" overflowY="auto" px={6} py={8}>
        {children}
      </Box>

      <MobileDock />
    </Box>
  );
}
