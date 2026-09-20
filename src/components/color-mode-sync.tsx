"use client";

import { useEffect } from "react";

import { applyColorMode, getStoredColorMode } from "@/lib/color-mode";

export function ColorModeSync() {
  useEffect(() => {
    if (getStoredColorMode()) return; // manual override in place — don't follow the OS

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    applyColorMode(mql.matches ? "dark" : "light");

    function handleChange(e: MediaQueryListEvent) {
      if (!getStoredColorMode()) applyColorMode(e.matches ? "dark" : "light");
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return null;
}
