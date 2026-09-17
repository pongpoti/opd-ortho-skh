"use client"

import { useEffect } from "react"

// iOS WebKit browsers (Safari and Chrome-for-iOS) can paint their own address
// bar as an overlay on top of the page instead of pushing content down below
// it — confirmed by hit-testing in an earlier investigation: the covered
// elements are correctly laid out and topmost per the DOM, they're just
// covered by something outside the document entirely. No DOM/CSS API sees
// that overlay directly: env(safe-area-inset-top) and visualViewport both
// read as if nothing were covering the page.
//
// The one thing that does react is window.innerHeight, which stays pinned to
// the full screen height while the browser is in this state, against
// document.documentElement.clientHeight, which always reports the safe
// (uncovered) height. Comparing the two only tells us THAT the page is
// covered, not by how much — that number conflates the top overlap with the
// bottom toolbar's own height. Reserving that raw, uncapped number as padding
// was tried before and made things worse: it over-reserved by roughly the
// bottom toolbar's height, leaving a visibly oversized gap even when only a
// slim top bar needed clearing.
//
// So use the mismatch only as a yes/no signal, and reserve a fixed, modest
// amount when it fires — comfortably more than the header's own height so
// the page title clears too, but nowhere near the full, unbounded gap.
const RESERVE_PX = 96

function updateInset() {
  if (window.scrollY > 0) return
  const covered = window.innerHeight - document.documentElement.clientHeight > 20
  document.documentElement.style.setProperty("--chrome-inset", covered ? `${RESERVE_PX}px` : "0px")
}

export function ChromeInset() {
  useEffect(() => {
    let frame = 0

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateInset)
    }

    updateInset()
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
