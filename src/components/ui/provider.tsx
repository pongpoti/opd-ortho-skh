"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

import { EmotionRegistry } from "./emotion-registry";

export function Provider(props: React.PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={defaultSystem}>{props.children}</ChakraProvider>
    </EmotionRegistry>
  );
}
