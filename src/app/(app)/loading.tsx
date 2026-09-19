import { Flex, Spinner } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Flex align="center" justify="center" minH="200px">
      <Spinner colorPalette="brand" size="lg" />
    </Flex>
  );
}
