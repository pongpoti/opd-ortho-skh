import { Flex } from "@chakra-ui/react";

import { AnimatedLogo } from "@/components/animated-logo";

export default function Home() {
  return (
    <Flex h="full" minH="65vh" align="center" justify="center">
      <AnimatedLogo style={{ width: "100%", maxWidth: "64rem" }} />
    </Flex>
  );
}
