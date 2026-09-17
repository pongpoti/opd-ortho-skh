import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

// Clinical teal, carried over from the previous design's oklch palette
// (primary oklch(0.55 0.088 196) in light mode, oklch(0.72 0.1 196) in dark).
// Dark mode's accent is intentionally *lighter* than light mode's, so text
// painted on a solid "brand" fill needs to flip from white to near-black
// between the two — see the `solid`/`contrast` semantic tokens below.
const brand = {
  50: { value: "oklch(0.97 0.015 196)" },
  100: { value: "oklch(0.94 0.025 196)" },
  200: { value: "oklch(0.88 0.04 196)" },
  300: { value: "oklch(0.8 0.055 196)" },
  400: { value: "oklch(0.72 0.07 196)" },
  500: { value: "oklch(0.63 0.08 196)" },
  600: { value: "oklch(0.55 0.088 196)" },
  700: { value: "oklch(0.47 0.085 196)" },
  800: { value: "oklch(0.39 0.075 196)" },
  900: { value: "oklch(0.32 0.06 196)" },
  950: { value: "oklch(0.22 0.04 196)" },
}

const config = defineConfig({
  cssVarsPrefix: "opd",
  globalCss: {
    "html, body": {
      minHeight: "100dvh",
    },
    body: {
      bg: "bg",
      color: "fg",
      // Mobile only, where navigation lives in a fixed bottom bar (see
      // site-header.tsx) instead of a top header. paddingBottom clears that
      // bar; paddingTop clears real hardware safe areas (notch, Dynamic
      // Island) only — not the browser's own collapsing toolbar, which no
      // web API reports reliably, so this deliberately doesn't try to guess it.
      paddingBottom: { base: "calc(4rem + env(safe-area-inset-bottom, 0px))", md: 0 },
      paddingTop: { base: "env(safe-area-inset-top, 0px)", md: 0 },
    },
    // Thai text sets tone marks above the ascender; the default leading
    // clips them in tight rows like buttons and table headers.
    ":lang(th)": {
      lineHeight: 1.7,
    },
  },
  theme: {
    tokens: {
      colors: { brand },
      fonts: {
        body: { value: "var(--font-noto-sans-thai), sans-serif" },
        heading: { value: "var(--font-noto-sans-thai), sans-serif" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          contrast: { value: { _light: "white", _dark: "{colors.brand.950}" } },
          fg: { value: { _light: "{colors.brand.700}", _dark: "{colors.brand.300}" } },
          subtle: { value: { _light: "{colors.brand.50}", _dark: "{colors.brand.950}" } },
          muted: { value: { _light: "{colors.brand.100}", _dark: "{colors.brand.900}" } },
          emphasized: { value: { _light: "{colors.brand.200}", _dark: "{colors.brand.800}" } },
          solid: { value: { _light: "{colors.brand.600}", _dark: "{colors.brand.400}" } },
          focusRing: { value: { _light: "{colors.brand.600}", _dark: "{colors.brand.400}" } },
          border: { value: { _light: "{colors.brand.500}", _dark: "{colors.brand.400}" } },
        },
      },
    },
    recipes: {
      button: {
        base: {
          gap: "2",
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
