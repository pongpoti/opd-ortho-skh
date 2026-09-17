"use client"

import * as React from "react"
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

// Navigation uses plain <a>, not next/link. A client-side navigation scrolls
// to the top programmatically, and on iOS 26 a programmatic scroll doesn't
// re-expand the collapsed address bar — leaving the page at scrollY 0 with the
// bar floating over the top ~100px of content. A real page load resets it.
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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load is the point, see note above */}
        <a
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
        >
          <Bone className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="hidden truncate min-[380px]:inline md:hidden">{siteConfig.shortName}</span>
          <span className="hidden truncate md:inline">{siteConfig.name}</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {item.title}
              </a>
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
                  <a
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
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <UserMenu />
        </div>
      </div>
    </header>
  )
}
