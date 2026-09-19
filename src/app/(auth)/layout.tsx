import { Flex } from "@chakra-ui/react";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex align="center" justify="center" overflowY="auto" p={6} minH="var(--app-vh)">
      {children}
    </Flex>
  );
}
