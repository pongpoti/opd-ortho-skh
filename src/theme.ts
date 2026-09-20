import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: "var(--font-sarabun), var(--font-plex-sans), sans-serif" },
        body: { value: "var(--font-sarabun), var(--font-plex-sans), sans-serif" },
      },
      colors: {
        brand: {
          50: { value: "#eefbfa" },
          100: { value: "#d3f3f0" },
          200: { value: "#a8e6e0" },
          300: { value: "#78d3ca" },
          400: { value: "#4bb8ae" },
          500: { value: "#1f8f86" },
          600: { value: "#167269" },
          700: { value: "#135c55" },
          800: { value: "#124a45" },
          900: { value: "#113d39" },
          950: { value: "#062220" },
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          contrast: { value: { _light: "white", _dark: "white" } },
          fg: { value: { _light: "{colors.brand.700}", _dark: "{colors.brand.300}" } },
          subtle: { value: { _light: "{colors.brand.100}", _dark: "{colors.brand.900}" } },
          muted: { value: { _light: "{colors.brand.200}", _dark: "{colors.brand.800}" } },
          emphasized: { value: { _light: "{colors.brand.300}", _dark: "{colors.brand.700}" } },
          solid: { value: { _light: "{colors.brand.600}", _dark: "{colors.brand.600}" } },
          focusRing: { value: { _light: "{colors.brand.500}", _dark: "{colors.brand.500}" } },
          border: { value: { _light: "{colors.brand.500}", _dark: "{colors.brand.400}" } },
        },
        glass: {
          bg: { value: { _light: "rgba(255, 255, 255, 0.55)", _dark: "rgba(15, 23, 32, 0.5)" } },
          border: {
            value: { _light: "rgba(255, 255, 255, 0.4)", _dark: "rgba(255, 255, 255, 0.08)" },
          },
          solid: {
            value: { _light: "rgba(255, 255, 255, 0.94)", _dark: "rgba(22, 32, 38, 0.94)" },
          },
        },
        dock: {
          border: { value: { _light: "rgba(31, 143, 134, 0.30)", _dark: "rgba(75, 196, 182, 0.22)" } },
        },
        weekend: {
          fg: { value: { _light: "#4d76b0", _dark: "#8fb3e0" } },
          subtle: { value: { _light: "#dee8f5", _dark: "#16283b" } },
        },
        holiday: {
          fg: { value: { _light: "#cc5a26", _dark: "#e8935e" } },
          subtle: { value: { _light: "#f8ddc9", _dark: "#3a2617" } },
        },
        duty: {
          d1: { value: { _light: "#2f6fb0", _dark: "#7cabe0" } },
          d2: { value: { _light: "#7c5cbf", _dark: "#b79ce8" } },
          d3: { value: { _light: "#b8842a", _dark: "#e0b45f" } },
          d4: { value: { _light: "#2f9e6b", _dark: "#6fcf9e" } },
          d5: { value: { _light: "#d1483f", _dark: "#f08a83" } },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
