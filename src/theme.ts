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
        },
        card: {
          bg: { value: { _light: "rgba(250, 244, 231, 0.75)", _dark: "rgba(46, 39, 29, 0.68)" } },
          border: { value: { _light: "rgba(200, 172, 122, 0.35)", _dark: "rgba(214, 188, 140, 0.16)" } },
          solid: { value: { _light: "#fffaf0", _dark: "#3a3020" } },
          cell: { value: { _light: "#fdf9f0", _dark: "#2a2318" } },
        },
        weekend: {
          fg: { value: { _light: "#4d76b0", _dark: "#8fb3e0" } },
          subtle: { value: { _light: "#dee8f5", _dark: "#16283b" } },
        },
        holiday: {
          fg: { value: { _light: "#cc5a26", _dark: "#e8935e" } },
          subtle: { value: { _light: "#f8ddc9", _dark: "#3a2617" } },
        },
      },
      shadows: {
        heading: {
          value: {
            _light: "0 1px 3px rgba(15, 23, 32, 0.18)",
            _dark: "0 1px 4px rgba(0, 0, 0, 0.45)",
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
