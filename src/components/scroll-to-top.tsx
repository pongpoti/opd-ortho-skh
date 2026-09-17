"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// iOS WebKit browsers (Safari and Chrome-for-iOS alike) can leave their
// address bar collapsed and floating over the top of the page when it's
// shown at scroll 0 without a real touch-scroll gesture — which is how every
// client-side navigation, and the LINE Login OAuth redirect, land here. A
// genuine scroll reconciles it; a bare scrollTo(0, 0) doesn't. Nudging the
// scroll position to 1px and back reproduces that reconciling motion, but
// only if the page actually has something to scroll — see the extra 4px of
// min-height on <body> in layout.tsx, which guarantees it does.
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
    // In-app browsers and OAuth redirect handoffs (LINE Login) can settle the
    // page's scroll state outside React's render cycle, so pathname alone
    // isn't a reliable enough signal. pageshow also fires on those handoffs.
    window.addEventListener("pageshow", resetScroll)
    return () => window.removeEventListener("pageshow", resetScroll)
  }, [])

  return null
}
