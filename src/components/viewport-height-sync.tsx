"use client";

import { useEffect } from "react";

// Used by the (auth) route group's centering layout (login/register), which
// still needs a real pixel height to vertically center against. The main
// app shell no longer depends on this -- see app-shell.tsx.
export function ViewportHeightSync() {
  useEffect(() => {
    function setAppHeight() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${height}px`);
    }

    setAppHeight();

    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("scroll", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("scroll", setAppHeight);
    };
  }, []);

  return null;
}
