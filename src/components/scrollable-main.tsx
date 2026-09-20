"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Box } from "@chakra-ui/react";

export function ScrollableMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <Box
      as="main"
      ref={ref}
      mx="auto"
      w="full"
      minH={0}
      maxW="5xl"
      flex="1"
      overflowY="auto"
      px={6}
      pt={8}
      pb={{ base: "calc(2rem + var(--dock-h, 5.5rem))", sm: 8 }}
    >
      {children}
    </Box>
  );
}
