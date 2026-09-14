"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bone } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { UserMenu } from "@/components/user-menu"

export function SiteHeader() {
  const pathname = usePathname()

  if (pathname === "/signin") {
    return null
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
        >
          <Bone className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="hidden truncate min-[380px]:inline sm:hidden">{siteConfig.shortName}</span>
          <span className="hidden truncate sm:inline">{siteConfig.name}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="เมนูหลัก" className="flex items-center gap-1">
            {siteConfig.nav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                </Link>
              )
            })}
          </nav>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
