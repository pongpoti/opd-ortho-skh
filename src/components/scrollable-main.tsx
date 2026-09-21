"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Box } from "@chakra-ui/react";

export function ScrollableMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <Box as="main" mx="auto" w="full" maxW="5xl" px={6} pt={8} pb={{ base: "calc(2rem + var(--dock-h, 5.5rem))", sm: 8 }}>
      {children}
    </Box>
  );
}
