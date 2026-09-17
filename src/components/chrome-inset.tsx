"use client"

import { useEffect } from "react"

// iOS 26 draws its collapsed address bar floating over the page. Arriving at a
// page at scroll 0 with the bar collapsed — which the LINE login redirect
// leaves us in — puts the first ~100px of the page underneath it. No API
// reports that overlap: safe-area insets read 0 here, and visualViewport
// reports offsetTop 0 over the full screen height.
//
// What does report it is innerHeight exceeding documentElement.clientHeight:
// 852 against 665 on the reporter's iPhone when the page is covered, and equal
// when it isn't. That difference is the whole chrome, top plus bottom, so it
// over-reserves — but it's an upper bound on the part covering the top, so
// nothing can stay hidden, and it self-zeroes the moment the browser puts the
// page back in a viewport it isn't covering.
//
// Only measured at scroll 0: while scrolled the bar is collapsed by design and
// nothing is hidden, so reacting there would shift content under the reader.
export function ChromeInset() {
  useEffect(() => {
    let frame = 0

    function update() {
      if (window.scrollY > 0) return
      const overlap = window.innerHeight - document.documentElement.clientHeight
      document.documentElement.style.setProperty(
        "--chrome-inset",
        overlap > 0 ? `${overlap}px` : "0px"
      )
    }

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("pageshow", schedule)
    window.addEventListener("resize", schedule)
    window.addEventListener("scroll", schedule, { passive: true })
    window.visualViewport?.addEventListener("resize", schedule)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pageshow", schedule)
      window.removeEventListener("resize", schedule)
      window.removeEventListener("scroll", schedule)
      window.visualViewport?.removeEventListener("resize", schedule)
    }
  }, [])

  return null
}
