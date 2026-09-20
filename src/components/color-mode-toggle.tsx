"use client";

import { Box, IconButton } from "@chakra-ui/react";
import { Moon, Sun } from "lucide-react";

import { setStoredColorMode } from "@/lib/color-mode";

export function ColorModeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    setStoredColorMode(isDark ? "light" : "dark");
  }

  return (
    <IconButton aria-label="สลับโหมดสี" size="sm" variant="ghost" borderRadius="full" onClick={toggle}>
      <Box display="block" _dark={{ display: "none" }}>
        <Moon size={18} />
      </Box>
      <Box display="none" _dark={{ display: "block" }}>
        <Sun size={18} />
      </Box>
    </IconButton>
  );
}
