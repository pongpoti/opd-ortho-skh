"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bone, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { UserMenu } from "@/components/user-menu"

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  // viewport-check renders its own replica header to measure — see that page.
  if (pathname === "/signin" || pathname === "/viewport-check") {
    return null
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bone className="size-4.5" aria-hidden="true" />
          </span>
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

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="เปิดเมนู">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Bone className="size-4.5" aria-hidden="true" />
                  </span>
                  {siteConfig.name}
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="เมนูหลัก" className="flex flex-col gap-1 px-3">
                {siteConfig.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{item.title}</span>
                    {item.comingSoon ? (
                      <Badge variant="secondary" className="font-normal">
                        เร็ว ๆ นี้
                      </Badge>
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
  )
}
