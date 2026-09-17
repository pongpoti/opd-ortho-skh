"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

// Temporary diagnostic overlay. Renders on ANY page when ?vp=1 is in the
// URL, so the real dashboard can be measured rather than a stand-in page —
// /viewport-check reports a covered viewport while the dashboard apparently
// does not, and that difference is the whole bug.
//
// Samples over time, because the leading suspicion is timing: the browser
// enters its covering state after the inset has already been computed, and
// the later re-measures don't catch it. Anchored to the BOTTOM of the
// screen, since the top is exactly the part that goes missing.

type Sample = { at: string; inner: number; client: number; gap: number; inset: string }

function readSample(at: string): Sample {
  const inset = getComputedStyle(document.documentElement).getPropertyValue("--chrome-inset").trim()
  return {
    at,
    inner: window.innerHeight,
    client: document.documentElement.clientHeight,
    gap: window.innerHeight - document.documentElement.clientHeight,
    inset: inset || "unset",
  }
}

function ProbeOverlay() {
  const [samples, setSamples] = React.useState<Sample[]>([])
  const [live, setLive] = React.useState<Sample | null>(null)
  const [headerTop, setHeaderTop] = React.useState<string>("?")

  React.useEffect(() => {
    const collected: Sample[] = []

    // What the pre-paint inline script in layout.tsx saw, stashed by it.
    const boot = (window as unknown as { __chromeInsetBoot?: string }).__chromeInsetBoot
    if (boot) collected.push({ at: "inline", inner: 0, client: 0, gap: -1, inset: boot })

    const timers = [0, 250, 800, 2000, 4000].map((delay) =>
      window.setTimeout(() => {
        collected.push(readSample(delay === 0 ? "mount" : `${delay}ms`))
        setSamples([...collected])
      }, delay)
    )

    function tick() {
      setLive(readSample("live"))
      const header = document.querySelector("header")
      setHeaderTop(header ? String(Math.round(header.getBoundingClientRect().top)) : "none")
    }
    tick()
    const interval = window.setInterval(tick, 400)

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(interval)
    }
  }, [])

  const rows = live ? [...samples, live] : samples

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        color: "#fff",
        font: "600 12px ui-monospace, monospace",
        padding: "6px 8px",
        lineHeight: 1.45,
      }}
    >
      <div style={{ color: "#7dd3fc" }}>
        scrollY {typeof window !== "undefined" ? Math.round(window.scrollY) : "?"} · headerTop {headerTop}
      </div>
      {rows.map((s, i) => (
        <div key={`${s.at}-${i}`}>
          {s.at.padEnd(7)} {s.gap < 0 ? "—" : `${s.inner}/${s.client} gap ${s.gap}`} → {s.inset}
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
