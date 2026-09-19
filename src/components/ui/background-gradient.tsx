import { Box } from "@chakra-ui/react";

const LIGHT_GRADIENT =
  "radial-gradient(circle at 15% 10%, #a9e8e2 0%, transparent 45%), " +
  "radial-gradient(circle at 85% 15%, #bcd9f5 0%, transparent 50%), " +
  "radial-gradient(circle at 50% 90%, #cdeee6 0%, transparent 55%), " +
  "linear-gradient(160deg, #eafbfa 0%, #eef5fb 50%, #f2f9fc 100%)";

const DARK_GRADIENT =
  "radial-gradient(circle at 15% 10%, #0f3d3a 0%, transparent 45%), " +
  "radial-gradient(circle at 85% 15%, #123049 0%, transparent 50%), " +
  "radial-gradient(circle at 50% 90%, #0d332e 0%, transparent 55%), " +
  "linear-gradient(160deg, #06171d 0%, #081b23 50%, #0b1720 100%)";

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
