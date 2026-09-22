import { Flex, Spinner } from "@chakra-ui/react";

export default function CastRoomLoading() {
  return (
    <Flex align="center" justify="center" minH="200px" py={8}>
      <Spinner colorPalette="brand" size="lg" />
    </Flex>
  );
}
