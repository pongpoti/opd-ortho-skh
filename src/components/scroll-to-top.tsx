"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Some in-app browsers (notably LINE's) re-assert a previously restored
// scroll offset a frame after the page settles, which wins a race against a
// single synchronous `scrollTo(0, 0)`. Scheduling a follow-up call on the
// next frame reliably beats that late restore.
function resetScroll() {
  window.scrollTo(0, 0)
  requestAnimationFrame(() => window.scrollTo(0, 0))
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
