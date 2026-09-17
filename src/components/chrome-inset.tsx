"use client"

import { useEffect } from "react"

// iOS WebKit browsers can lay the page out in a viewport anchored to the
// physical top of the screen, which puts document y=0 behind the status bar
// and address bar. Measured on the reporter's iPhone (Chrome for iOS) via
// /viewport-check, in the two states:
//
//                      innerHeight / clientHeight   covered at top
//   on load (broken)        852 / 665                  ~104px
//   after a real scroll      665 / 665                     0px
//
// So the gap between innerHeight and clientHeight (187) is the browser's
// whole chrome, top bar plus bottom toolbar (104 + 83). A sticky header's
// getBoundingClientRect().top reads a correct, positive value throughout —
// the layout is right, the browser is simply painting its own UI over it,
// and no API reports that overlay: env(safe-area-inset-top) and
// visualViewport's offsetTop/pageTop all read 0 in both states.
//
// Nothing exposes the top/bottom split, so derive it from that measurement:
// ~0.56 of the gap is the top bar. Reserve a little more than that, since
// under-reserving leaves the header invisible while over-reserving only
// costs a thin strip above it — and the whole inset collapses back to 0 as
// soon as the browser hands back a viewport it isn't covering, which the
// good-state numbers above confirm happens on the first real scroll.
// Recalibrated against the dashboard, which is the page that actually breaks.
// Earlier versions took innerHeight - clientHeight as the amount to reserve;
// on the dashboard that difference is 4px while ~104px is covered, so they
// reserved nothing. The readings there were:
//
//   outerHeight 852  innerHeight 669  clientHeight 665  covered ~104
//
// outerHeight - innerHeight (183) is the browser's whole chrome, top bar plus
// bottom toolbar, and ~104 of it is the top — the same ~0.57 share seen on
// /viewport-check. So use innerHeight - clientHeight only as a yes/no signal
// that the viewport is being covered (4 here, 187 there, 0 once the browser
// hands back an uncovered viewport) and take the amount from outerHeight.
//
// This is best-effort only. It moves page headings clear of the chrome when
// it fires; the navigation does not depend on it, and lives in a bottom bar
// on mobile precisely because no signal here proved reliable.
const TOP_SHARE = 0.57
const MIN_GAP = 2
const MAX_INSET = 160

export function chromeInsetPx() {
  const covered = window.innerHeight - document.documentElement.clientHeight > MIN_GAP
  if (!covered) return 0
  const chrome = window.outerHeight - window.innerHeight
  return Math.min(Math.round(chrome * TOP_SHARE), MAX_INSET)
}

function updateInset() {
  // Only re-measure at rest, so the page never shifts under someone
  // mid-scroll. The tolerance matters: ScrollToTop can leave the page
  // parked a pixel down, and an exact `scrollY > 0` test would then block
  // every update — which is what defeated the previous attempt at this.
  if (window.scrollY > 4) return
  document.documentElement.style.setProperty("--chrome-inset", `${chromeInsetPx()}px`)
}

export function ChromeInset() {
  useEffect(() => {
    let frame = 0

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateInset)
    }

    schedule()
    // The chrome can settle into its covering state after first paint, and
    // that transition doesn't always fire an event we'd otherwise hear.
    const timers = [250, 800, 2000].map((delay) => window.setTimeout(schedule, delay))

    window.addEventListener("load", schedule)
    window.addEventListener("pageshow", schedule)
    window.addEventListener("resize", schedule)
    window.addEventListener("orientationchange", schedule)
    window.addEventListener("scroll", schedule, { passive: true })
    window.visualViewport?.addEventListener("resize", schedule)

    return () => {
      cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("load", schedule)
      window.removeEventListener("pageshow", schedule)
      window.removeEventListener("resize", schedule)
      window.removeEventListener("orientationchange", schedule)
      window.removeEventListener("scroll", schedule)
      window.visualViewport?.removeEventListener("resize", schedule)
    }
  }, [])

  return null
}
