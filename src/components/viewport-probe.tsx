"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

// Temporary diagnostic overlay, rendered on any page via ?vp=1.
//
// The first round of this probe disproved the model every fix on this branch
// was built on. On the dashboard the reporter's phone reports
// innerHeight 669 against clientHeight 665 — a gap of 4, flat across the
// whole timeline — so there is no size mismatch to detect, yet ~104px of the
// page is still covered. Meanwhile the header reports rect.top 0, and this
// overlay (position:fixed, bottom:0) rendered ~98px ABOVE the browser's
// bottom toolbar.
//
// That points at a layout viewport of the right SIZE in the wrong PLACE:
// shifted up so its top sits behind the status bar and address bar, and its
// bottom stops short of the toolbar. This round measures the offset itself —
// screenY/outerHeight and the visualViewport fields — plus the rects of the
// header, the heading and this overlay, so the shift can be derived rather
// than guessed at.

type Row = { k: string; v: string }

function ProbeOverlay() {
  const selfRef = React.useRef<HTMLDivElement>(null)
  const [rows, setRows] = React.useState<Row[]>([])

  React.useEffect(() => {
    function read(): Row[] {
      const doc = document.documentElement
      const vv = window.visualViewport
      const header = document.querySelector("header")
      const heading = document.querySelector("h1")
      const selfRect = selfRef.current?.getBoundingClientRect()
      const r = (n: number | undefined) => (n === undefined ? "?" : String(Math.round(n)))

      return [
        { k: "inner/client", v: `${window.innerHeight}/${doc.clientHeight}` },
        { k: "outer/screen", v: `${window.outerHeight}/${window.screen.height}` },
        { k: "screenY/Top", v: `${r(window.screenY)}/${r(window.screenTop)}` },
        { k: "avail", v: `${window.screen.availHeight}` },
        {
          k: "vv h/off/page",
          v: vv ? `${r(vv.height)}/${r(vv.offsetTop)}/${r(vv.pageTop)}` : "none",
        },
        { k: "vv scale", v: vv ? String(vv.scale) : "none" },
        { k: "scrollY", v: r(window.scrollY) },
        {
          k: "header t/h",
          v: header
            ? `${r(header.getBoundingClientRect().top)}/${r(header.getBoundingClientRect().height)}`
            : "none",
        },
        { k: "h1 top", v: heading ? r(heading.getBoundingClientRect().top) : "none" },
        { k: "probe top", v: r(selfRect?.top) },
        { k: "inset", v: getComputedStyle(doc).getPropertyValue("--chrome-inset").trim() || "unset" },
      ]
    }

    const id = window.setInterval(() => setRows(read()), 400)
    const first = window.setTimeout(() => setRows(read()), 0)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(first)
    }
  }, [])

  return (
    <div
      ref={selfRef}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.9)",
        color: "#fff",
        font: "600 13px ui-monospace, monospace",
        padding: "6px 8px",
        lineHeight: 1.5,
      }}
    >
      {rows.map((row) => (
        <div key={row.k}>
          <span style={{ color: "#7dd3fc" }}>{row.k}</span> {row.v}
        </div>
      ))}
    </div>
  )
}

export function ViewportProbe() {
  const searchParams = useSearchParams()
  if (searchParams.get("vp") !== "1") return null
  return <ProbeOverlay />
}
