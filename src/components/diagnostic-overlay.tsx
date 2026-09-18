"use client"

import * as React from "react"

// TEMPORARY. The "restore the +4px overflow sliver" fix did not resolve the
// report of the dashboard loading with its top hidden and the bottom nav
// bar not showing on Chrome for iOS. Rather than guess again, measure.
//
// Plain inline styles throughout — no Chakra, no Emotion — so this renders
// identically regardless of whether the app's own CSS has loaded, and so it
// can't be the thing under test.
//
// - TOP RULER: fixed to the true visual viewport's top. Each band is
//   labelled with its offset; whichever band is the first one fully
//   visible tells us exactly how many px are covered, same technique as
//   the old /viewport-check page.
// - BOTTOM STRIPE: fixed to the true visual viewport's bottom, in a color
//   nothing else on the page uses. If this shows but the real nav bar
//   doesn't, the nav bar has its own bug, not the viewport one. If neither
//   shows, position:fixed itself is anchored to the wrong viewport.
// - METRICS: live-updating numbers, so a single screenshot captures them.

const BANDS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]
const BAND_COLORS = ["#fca5a5", "#fdba74"]

type Metrics = Record<string, string>

function readMetrics(): Metrics {
  const doc = document.documentElement
  const vv = window.visualViewport
  const header = document.querySelector("header")
  const r = (n: number | undefined) => (n === undefined ? "?" : String(Math.round(n)))

  const envProbe = document.createElement("div")
  envProbe.style.cssText =
    "position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)"
  document.body.appendChild(envProbe)
  const envStyle = getComputedStyle(envProbe)
  const safeTop = envStyle.paddingTop
  const safeBottom = envStyle.paddingBottom
  envProbe.remove()

  const navRects = Array.from(document.querySelectorAll('nav[aria-label="เมนูหลัก"]')).map((el) =>
    el.getBoundingClientRect()
  )

  const vhProbe = document.createElement("div")
  vhProbe.style.cssText = "position:absolute;visibility:hidden;width:0"
  document.body.appendChild(vhProbe)
  const measure = (unit: string) => {
    vhProbe.style.height = `100${unit}`
    return vhProbe.getBoundingClientRect().height
  }
  const svh = measure("svh")
  const lvh = measure("lvh")
  const dvh = measure("dvh")
  vhProbe.remove()

  return {
    "inner/client": `${window.innerHeight}/${doc.clientHeight}`,
    "svh/lvh/dvh": `${r(svh)}/${r(lvh)}/${r(dvh)}`,
    "outer/screen": `${window.outerHeight}/${window.screen.height}`,
    "scrollY": r(window.scrollY),
    "scrollHeight": String(doc.scrollHeight),
    "vv h/off/page": vv ? `${r(vv.height)}/${r(vv.offsetTop)}/${r(vv.pageTop)}` : "none",
    "SAFE t/b": `${safeTop}/${safeBottom}`,
    "header rect": header ? `top ${r(header.getBoundingClientRect().top)} h ${r(header.getBoundingClientRect().height)}` : "NOT FOUND",
    "nav count": String(navRects.length),
    "nav rects": navRects.map((rect) => `top ${r(rect.top)} bottom ${r(rect.bottom)}`).join(" | ") || "NOT FOUND",
    "UA": navigator.userAgent.slice(0, 60),
  }
}

export function DiagnosticOverlay() {
  const [metrics, setMetrics] = React.useState<Metrics>({})

  React.useEffect(() => {
    const update = () => setMetrics(readMetrics())
    update()
    const id = window.setInterval(update, 500)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("orientationchange", update)
    window.addEventListener("pageshow", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
      window.removeEventListener("orientationchange", update)
      window.removeEventListener("pageshow", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2147483647, pointerEvents: "none" }}>
        {BANDS.map((offset, index) => (
          <div
            key={offset}
            style={{
              height: 20,
              background: BAND_COLORS[index % 2],
              color: "#000",
              font: "700 11px ui-monospace, monospace",
              lineHeight: "20px",
              paddingLeft: 6,
            }}
          >
            TOP {offset}px
          </div>
        ))}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 24,
          background: "#d946ef",
          color: "#fff",
          font: "700 12px ui-monospace, monospace",
          lineHeight: "24px",
          paddingLeft: 6,
          zIndex: 2147483647,
          pointerEvents: "none",
        }}
      >
        BOTTOM STRIPE (diagnostic — should always be visible)
      </div>

      <div
        style={{
          position: "fixed",
          top: 210,
          left: 4,
          right: 4,
          zIndex: 2147483647,
          background: "rgba(0,0,0,0.88)",
          color: "#fff",
          font: "600 11px ui-monospace, monospace",
          padding: "6px 8px",
          lineHeight: 1.5,
          borderRadius: 6,
          maxHeight: "50vh",
          overflow: "auto",
          pointerEvents: "none",
        }}
      >
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} style={{ wordBreak: "break-all" }}>
            <span style={{ color: "#7dd3fc" }}>{key}</span> {value}
          </div>
        ))}
      </div>
    </>
  )
}
