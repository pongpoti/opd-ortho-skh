"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

// Mobile navigation lives in a bottom bar, not the top header.
//
// On the reporter's phone the browser hands this app a viewport anchored at
// screen y=0 and paints its status bar and address bar over the first ~104px
// of it — so a top header at rows 0-57 is completely covered on load. Nothing
// reports that offset: innerHeight/clientHeight differ by 4, and screenY,
// visualViewport.offsetTop/pageTop and env(safe-area-inset-top) (even with
// viewport-fit=cover declared) all read 0. Six attempts at detecting and
// compensating for it failed on the device.
//
// What did work, in every diagnostic screenshot across all of them, was the
// bottom-anchored probe overlay: position:fixed bottom:0 renders inside the
// visible band whether or not the top is covered. So put the navigation
// there on mobile rather than keep guessing at the offset. Desktop, which
// never had the problem, keeps the top header.
export function SiteHeader() {
  const pathname = usePathname()

  // viewport-check renders its own replica header to measure — see that page.
  if (pathname === "/signin" || pathname === "/viewport-check") {
    return null
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b bg-background md:block">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bone className="size-4.5" aria-hidden="true" />
            </span>
            <span className="truncate">{siteConfig.name}</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav aria-label="เมนูหลัก" className="flex items-center gap-1">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <UserMenu />
          </div>
        </div>
      </header>

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-stretch">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-1 outline-none transition-colors focus-visible:bg-muted",
                isActive(item.href) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <item.icon className="size-5" aria-hidden="true" />
                {item.comingSoon ? (
                  <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-muted-foreground/60" />
                ) : null}
              </span>
              <span className="w-full truncate text-center text-[10px] font-medium leading-none">
                {item.title}
              </span>
            </Link>
          ))}
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  )
}
