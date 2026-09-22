import { Box, type BoxProps } from "@chakra-ui/react";

type GlassCardProps = BoxProps & {
  /** Frosted chrome for pickers; solid for dense forms on mobile. */
  variant?: "frosted" | "solid";
};

export function GlassCard({ variant = "frosted", ...props }: GlassCardProps) {
  const solid = variant === "solid";

  return (
    <Box
      bg={solid ? "glass.solid" : "glass.bg"}
      borderWidth="1px"
      borderColor="glass.border"
      backdropFilter={solid ? "blur(8px)" : "blur(16px)"}
      boxShadow={solid ? "sm" : "0 8px 32px rgba(15, 23, 32, 0.10)"}
      borderRadius="2xl"
      {...props}
    />
  );
}
