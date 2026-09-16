"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bone, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserMenu } from "@/components/user-menu"

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  if (pathname === "/signin") {
    return null
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      {/* iOS 26 floats its translucent chrome over the page instead of above
          it: the viewport spans the full screen (visualViewport reports the
          whole 852pt screen with offsetTop 0), so a header at top:0 is
          painted underneath the address bar rather than below it. That's why
          it looks missing until a scroll collapses the bar. Pad by the safe
          area inset so the bar's height is reserved; the spacer below then
          matches the header's total height, since fixed takes it out of
          normal flow. */}
      <header
        className="fixed inset-x-0 top-0 z-40 [transform:translateZ(0)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* iOS 26's "Liquid Glass" toolbar tinting scans fixed/sticky
            elements for background-color/backdrop-filter and can misrender
            the element when those live on it directly, so keep them on this
            backing layer instead. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        />
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
          >
            <Bone className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="hidden truncate min-[380px]:inline md:hidden">{siteConfig.shortName}</span>
            <span className="hidden truncate md:inline">{siteConfig.name}</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 md:flex">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="เปิดเมนู">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bone className="size-5 text-primary" aria-hidden="true" />
                    {siteConfig.name}
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="เมนูหลัก" className="flex flex-col gap-1 px-2">
                  {siteConfig.nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive(item.href) ? "bg-accent text-accent-foreground" : "text-foreground"
                      )}
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1">{item.title}</span>
                      {item.comingSoon ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          เร็ว ๆ นี้
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <UserMenu />
          </div>
        </div>
      </header>
      <div
        aria-hidden="true"
        style={{ height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      />
    </>
  )
}
