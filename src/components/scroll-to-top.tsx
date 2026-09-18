"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// The document itself no longer scrolls (see globalCss in theme.ts) — only
// the #app-scroll region RootLayout wraps `children` in does, and it
// persists across client-side navigations, so without this its scroll
// position from the previous page would carry over to the next one.
function resetScroll() {
  document.getElementById("app-scroll")?.scrollTo(0, 0)
}

export function ScrollToTop() {
  const pathname = usePathname()

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
