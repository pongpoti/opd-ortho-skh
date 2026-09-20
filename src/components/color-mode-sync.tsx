"use client";

import { useEffect } from "react";

export function ColorModeSync() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(matches: boolean) {
      document.documentElement.classList.toggle("dark", matches);
    }

    apply(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      apply(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return null;
}
