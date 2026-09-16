"use client"

import { useEffect, useState } from "react"

export default function DebugPage() {
  const [info, setInfo] = useState("กำลังตรวจสอบ...")

  useEffect(() => {
    function collect() {
      const header = document.querySelector("header")
      const rect = header?.getBoundingClientRect()
      const cs = header ? getComputedStyle(header) : null
      const vv = window.visualViewport

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
