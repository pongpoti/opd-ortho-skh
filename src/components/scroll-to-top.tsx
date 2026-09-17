"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// This used to nudge the scroll position to 1px and back, on the theory that
// a programmatic scroll could make iOS re-collapse its floating address bar.
// Device measurements (see chrome-inset.tsx) disproved it: the page sits at
// scrollY 0 with a correctly positioned layout, and the browser simply paints
// its chrome over the top. Worse, the nudge parked the page a pixel down,
// which blocked ChromeInset from ever re-measuring. Plain reset only.
function resetScroll() {
  window.scrollTo(0, 0)
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
