"use client"

import { useEffect, useState } from "react"

export default function DebugPage() {
  const [info, setInfo] = useState("กำลังตรวจสอบ...")

  useEffect(() => {
    function describeEl(el: Element | null) {
      if (!el) return "(none)"
      const tag = el.tagName.toLowerCase()
      const id = el.id ? `#${el.id}` : ""
      const cls = el.className && typeof el.className === "string" ? `.${el.className.trim().replace(/\s+/g, ".")}` : ""
      return `<${tag}${id}${cls}>`.slice(0, 120)
    }

    function collect() {
      const header = document.querySelector("header")
      const rect = header?.getBoundingClientRect()
      const cs = header ? getComputedStyle(header) : null
      const vv = window.visualViewport

      // What element is actually on top at points inside the "missing"
      // region — reveals an overlay/covering element the header-only check
      // above can't see (ad blocker, injected banner, extension, etc).
      const hitPoints: [number, number][] = [
        [20, 25],
        [370, 25],
        [200, 25],
        [200, 100],
      ]
      const hits = hitPoints.map(([x, y]) => `(${x},${y}) -> ${describeEl(document.elementFromPoint(x, y))}`)

      const bodyChildren = Array.from(document.body.children).map(
        (el, i) => `[${i}] ${describeEl(el)}`
      )

      const bodyCs = getComputedStyle(document.body)
      const htmlCs = getComputedStyle(document.documentElement)

      // env() values aren't readable directly, so measure them via a probe
      // element sized by each inset. These say how much of the page the
      // browser's floating chrome is overlapping.
      function measureInset(name: string) {
        const probe = document.createElement("div")
        probe.style.cssText = `position:absolute;visibility:hidden;height:env(${name}, 0px)`
        document.body.appendChild(probe)
        const h = probe.getBoundingClientRect().height
        probe.remove()
        return h
      }

      const insets = [
        "safe-area-inset-top",
        "safe-area-inset-bottom",
        "safe-area-inset-left",
        "safe-area-inset-right",
      ].map((n) => `${n}: ${measureInset(n)}`)

      const viewportMeta = document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute("content")

      const lines = [
        `เวลา: ${new Date().toLocaleTimeString()}`,
        `UA: ${navigator.userAgent}`,
        "",
        "--- window ---",
        `scrollY: ${window.scrollY}`,
        `innerWidth x innerHeight: ${window.innerWidth} x ${window.innerHeight}`,
        `devicePixelRatio: ${window.devicePixelRatio}`,
        `docEl clientWidth x clientHeight: ${document.documentElement.clientWidth} x ${document.documentElement.clientHeight}`,
        `docEl scrollHeight: ${document.documentElement.scrollHeight}`,
        `body scrollHeight: ${document.body.scrollHeight}`,
        "",
        "--- visualViewport ---",
        vv
          ? `width=${vv.width} height=${vv.height} offsetTop=${vv.offsetTop} offsetLeft=${vv.offsetLeft} scale=${vv.scale}`
          : "ไม่รองรับ",
        "",
        "--- safe area insets (chrome overlap) ---",
        ...insets,
        `viewport meta: ${viewportMeta ?? "(none)"}`,
        `screen: ${window.screen.width} x ${window.screen.height}`,
        "",
        "--- elementFromPoint (what's actually on top) ---",
        ...hits,
        "",
        "--- body direct children ---",
        ...bodyChildren,
        "",
        "--- body / html computed ---",
        `body: display=${bodyCs.display} position=${bodyCs.position} overflow=${bodyCs.overflow} background=${bodyCs.backgroundColor} filter=${bodyCs.filter}`,
        `html: display=${htmlCs.display} position=${htmlCs.position} overflow=${htmlCs.overflow} background=${htmlCs.backgroundColor} filter=${htmlCs.filter}`,
        "",
        "--- header element ---",
        header ? "found: yes" : "found: NO <header> ELEMENT IN DOM",
        rect
          ? `rect: top=${rect.top.toFixed(1)} left=${rect.left.toFixed(1)} width=${rect.width.toFixed(1)} height=${rect.height.toFixed(1)} bottom=${rect.bottom.toFixed(1)}`
          : "",
        cs
          ? `position=${cs.position} display=${cs.display} visibility=${cs.visibility} opacity=${cs.opacity} transform=${cs.transform} zIndex=${cs.zIndex}`
          : "",
        cs ? `height(computed)=${cs.height} top(computed)=${cs.top}` : "",
      ]

      setInfo(lines.join("\n"))
    }

    collect()
    const raf = requestAnimationFrame(collect)
    const t1 = setTimeout(collect, 300)
    const t2 = setTimeout(collect, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      {/* Canary: plain element, inline styles only, no Tailwind, no
          sticky/fixed/transform. If even this fails to show up, the cause
          isn't our CSS — something else is covering this region entirely. */}
      <div style={{ background: "#ff0000", color: "#ffffff", fontSize: 24, fontWeight: 700, padding: 12 }}>
        CANARY TEST 123
      </div>
      <h1 className="mb-1 text-xl font-semibold">หน้าตรวจสอบชั่วคราว</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        กรุณาแคปหน้าจอนี้ทั้งหมด (รวมส่วนบนสุด) แล้วส่งกลับมาให้ดู
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-white p-4 text-xs leading-relaxed">
        {info}
      </pre>
    </main>
  )
}
