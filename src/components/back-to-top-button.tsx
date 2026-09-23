"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { ArrowUp } from "lucide-react";

/** Show once the page has scrolled past roughly one viewport of content. */
const SHOW_AFTER_PX = 280;

/**
 * Fixed bottom-right control to return to the top of the document.
 * Sized for a ≥44px touch target, labeled in Thai, and respects
 * prefers-reduced-motion. Sits above the mobile dock via --dock-h.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  if (!visible) return null;

  return (
    <IconButton
      aria-label="กลับสู่ด้านบน"
      title="กลับสู่ด้านบน"
      onClick={scrollToTop}
      colorPalette="brand"
      variant="solid"
      borderRadius="full"
      boxSize="12"
      minW="12"
      minH="12"
      position="fixed"
      // Above the mobile dock on small screens; standard inset on desktop.
      bottom={{
        base: "calc(var(--dock-h, 5.5rem) + 1rem)",
        sm: "1.5rem",
      }}
      right={{ base: "1rem", sm: "1.5rem" }}
      zIndex={18}
      boxShadow="md"
    >
      <ArrowUp size={22} strokeWidth={2.5} aria-hidden />
    </IconButton>
  );
}
