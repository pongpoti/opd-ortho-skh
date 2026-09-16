"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// iOS Safari/Chrome (WebKit) can fail to paint the top strip of the page on
// initial load — confirmed on this app via computed layout: the element
// sitting there has entirely correct position/size/visibility/opacity, it
// just isn't painted, and it reliably reappears once the user manually
// scrolls or drags. A scrollTo(0, 1)-then-back nudge reproduces that motion,
// but only when the page has scrollable overflow — many of this app's pages
// are close to (or exactly) one viewport tall, making the nudge a no-op.
// Force the repaint directly instead: toggling `display` off and on forces
// a synchronous reflow, which is unpainted-state-independent and works
// whether or not the page can actually scroll.
function forceRepaint() {
  const { body } = document
  const previousDisplay = body.style.display
  body.style.display = "none"
  // Reading a layout property forces the browser to apply the change
  // synchronously before the next line runs, instead of batching it into
  // the next paint (where the "hidden" frame could become visible).
  void body.offsetHeight
  body.style.display = previousDisplay
}

function resetScroll() {
  window.scrollTo(0, 0)
  requestAnimationFrame(() => {
    forceRepaint()
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
