"use client"

import { useEffect } from "react"

export function ScrollToTop() {
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }
    window.scrollTo(0, 0)
  }, [])

  return null
}
