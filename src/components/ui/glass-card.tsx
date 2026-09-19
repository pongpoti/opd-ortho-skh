import { Box, type BoxProps } from "@chakra-ui/react";

export function GlassCard(props: BoxProps) {
  return (
    <Box
      bg="glass.bg"
      borderWidth="1px"
      borderColor="glass.border"
      backdropFilter="blur(16px)"
      boxShadow="0 8px 32px rgba(15, 23, 32, 0.10)"
      borderRadius="2xl"
      {...props}
    />
  );
}
