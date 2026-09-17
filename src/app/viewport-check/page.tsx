"use client"

import * as React from "react"

// Temporary diagnostic page for the "top of page hidden" bug. Public (see
// the middleware matcher in proxy.ts) so it can be opened without logging
// in. Remove once the bug is resolved.
//
// The ruler bands start at the very top of the document. Whichever band is
// the first one fully visible tells us exactly how many pixels the browser
// is covering — that number is what every previous fix attempt had to guess.

const BANDS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180]

type Metrics = Record<string, string>

export default function ViewportCheckPage() {
  const headerRef = React.useRef<HTMLDivElement>(null)
  const [metrics, setMetrics] = React.useState<Metrics>({})

  const measure = React.useCallback(() => {
    const doc = document.documentElement
    const vv = window.visualViewport
    const headerTop = headerRef.current?.getBoundingClientRect().top

    setMetrics({
      "inner/client": `${window.innerHeight} / ${doc.clientHeight}`,
      "MISMATCH": `${window.innerHeight - doc.clientHeight}`,
      "scrollY": `${Math.round(window.scrollY)}`,
      "vv h/top": vv ? `${Math.round(vv.height)} / ${Math.round(vv.offsetTop)}` : "none",
      "vv pageTop": vv ? `${Math.round(vv.pageTop)}` : "none",
      "vv scale": vv ? `${vv.scale}` : "none",
      "STICKY top": headerTop === undefined ? "?" : `${Math.round(headerTop)}`,
      "sticky pos": headerRef.current ? getComputedStyle(headerRef.current).position : "?",
      "--chrome-inset": getComputedStyle(doc).getPropertyValue("--chrome-inset").trim() || "(unset)",
      "body padTop": getComputedStyle(document.body).paddingTop,
      "screen h": `${window.screen.height}`,
      "dpr": `${window.devicePixelRatio}`,
    })
  }, [])

  React.useEffect(() => {
    measure()
    const onEvent = () => requestAnimationFrame(measure)
    window.addEventListener("scroll", onEvent, { passive: true })
    window.addEventListener("resize", onEvent)
    window.addEventListener("pageshow", onEvent)
    window.visualViewport?.addEventListener("resize", onEvent)
    window.visualViewport?.addEventListener("scroll", onEvent)
    return () => {
      window.removeEventListener("scroll", onEvent)
      window.removeEventListener("resize", onEvent)
      window.removeEventListener("pageshow", onEvent)
      window.visualViewport?.removeEventListener("resize", onEvent)
      window.visualViewport?.removeEventListener("scroll", onEvent)
    }
  }, [measure])

  return (
    <main className="font-mono text-black">
      {/* Ruler: first fully-visible band = how many px the browser covers. */}
      {BANDS.map((offset, index) => (
        <div
          key={offset}
          style={{
            height: 20,
            background: index % 2 === 0 ? "#fca5a5" : "#fdba74",
            fontSize: 12,
            lineHeight: "20px",
            paddingLeft: 6,
            fontWeight: 700,
          }}
        >
          {offset}px
        </div>
      ))}

      {/* Replica of the real sticky header, so its rect can be measured. */}
      <div
        ref={headerRef}
        className="sticky top-0 z-40 border-b border-black bg-lime-300"
        style={{ height: 40, fontSize: 13, fontWeight: 700, lineHeight: "40px", paddingLeft: 6 }}
      >
        STICKY HEADER
      </div>

      <div style={{ padding: 8 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}>
          <tbody>
            {Object.entries(metrics).map(([key, value]) => (
              <tr key={key}>
                <td style={{ border: "1px solid #999", padding: "2px 5px", whiteSpace: "nowrap" }}>{key}</td>
                <td style={{ border: "1px solid #999", padding: "2px 5px", fontWeight: 700 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
          ถ่ายภาพหน้าจอนี้ทันทีที่เปิด (อย่าเพิ่งเลื่อน) แล้วส่งกลับมา
          <br />
          จากนั้นเลื่อนลงแล้วเลื่อนขึ้น ถ่ายอีกรูปหนึ่ง
        </p>

        <div style={{ height: 900 }} />
        <p style={{ fontSize: 13 }}>จบหน้า — เลื่อนขึ้นด้านบนแล้วถ่ายภาพหน้าจอ</p>
      </div>
    </main>
  )
}
