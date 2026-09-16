"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// iOS Safari/Chrome (WebKit) can leave sticky/fixed elements unpainted on
// initial load — confirmed on this app by the header only reappearing once
// the user manually scrolls down and back up. Asserting scrollTo(0, 0) when
// the page is already at (0, 0) is a no-op with no scroll delta, so it can't
// trigger the repaint a real scroll does. Nudge the position away from 0 and
// immediately back to reproduce that motion programmatically.
function resetScroll() {
  window.scrollTo(0, 0)
  requestAnimationFrame(() => {
    window.scrollTo(0, 1)
    requestAnimationFrame(() => window.scrollTo(0, 0))
  })
}

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }
  }, [])

  useEffect(() => {
    resetScroll()
  }, [pathname])

  useEffect(() => {
    // In-app browsers can restore a previously scrolled position for this
    // URL when returning from an external redirect, such as the LINE Login
    // OAuth round-trip. That restore happens outside React's render cycle
    // (no pathname change fires), so re-assert the scroll reset on
    // `pageshow`, which fires on those handoffs too.
    window.addEventListener("pageshow", resetScroll)
    return () => window.removeEventListener("pageshow", resetScroll)
  }, [])

  return null
}
