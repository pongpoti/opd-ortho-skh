import { Box } from "@chakra-ui/react";

const LIGHT_GRADIENT =
  "radial-gradient(circle at 15% 10%, #fde047 0%, transparent 45%), " +
  "radial-gradient(circle at 85% 15%, #fef08a 0%, transparent 50%), " +
  "radial-gradient(circle at 50% 90%, #facc15 0%, transparent 55%), " +
  "linear-gradient(160deg, #fef9c3 0%, #fef08a 50%, #fef9c3 100%)";

const DARK_GRADIENT =
  "radial-gradient(circle at 15% 10%, #55450b 0%, transparent 45%), " +
  "radial-gradient(circle at 85% 15%, #4d3f0b 0%, transparent 50%), " +
  "radial-gradient(circle at 50% 90%, #42370a 0%, transparent 55%), " +
  "linear-gradient(160deg, #211c06 0%, #292207 50%, #241e06 100%)";

export function BackgroundGradient() {
  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={-1}
      backgroundImage={{ base: LIGHT_GRADIENT, _dark: DARK_GRADIENT }}
    />
  );
}
