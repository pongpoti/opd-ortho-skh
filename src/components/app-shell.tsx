import NextLink from "next/link";
import { Box, Container, Flex, HStack, Link as ChakraLink } from "@chakra-ui/react";

import { modules } from "@/lib/modules";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh" direction="column">
      <Box borderBottomWidth="1px">
        <Container maxW="5xl" py="4">
          <HStack gap="6">
            <ChakraLink asChild fontWeight="semibold" fontSize="lg" _hover={{ textDecoration: "none" }}>
              <NextLink href="/">OPD Ortho SKH</NextLink>
            </ChakraLink>
            <HStack gap="4">
              {modules.map((mod) => (
                <ChakraLink asChild key={mod.slug} color="fg.muted">
                  <NextLink href={mod.href}>{mod.name}</NextLink>
                </ChakraLink>
              ))}
            </HStack>
          </HStack>
        </Container>
      </Box>
      <Container maxW="5xl" py="8" flex="1">
        {children}
      </Container>
    </Flex>
  );
}
