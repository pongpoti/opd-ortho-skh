"use client";

import { useEffect } from "react";

// Larger than any address-bar-collapse height change, smaller than any real
// on-screen keyboard -- distinguishes "keyboard is covering part of the
// screen" from ordinary browser-chrome resizing.
const KEYBOARD_HEIGHT_THRESHOLD = 120;

export function ViewportHeightSync() {
  useEffect(() => {
    function setAppHeight() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${height}px`);

      const keyboardOpen = window.innerHeight - height > KEYBOARD_HEIGHT_THRESHOLD;
      document.documentElement.dataset.keyboardOpen = String(keyboardOpen);
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
