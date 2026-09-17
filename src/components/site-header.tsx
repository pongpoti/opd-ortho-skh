"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bone, Menu, X } from "lucide-react"
import { Badge, Button, Dialog, DialogPanel } from "@tremor/react"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
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
    <header className="sticky top-0 z-40 border-b border-tremor-border bg-tremor-background dark:border-dark-tremor-border dark:bg-dark-tremor-background">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-semibold tracking-tight text-tremor-content-strong dark:text-dark-tremor-content-strong"
        >
          <Bone className="size-5 shrink-0 text-tremor-brand dark:text-dark-tremor-brand" aria-hidden="true" />
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
                  "inline-flex h-10 items-center whitespace-nowrap rounded-tremor-default px-3 text-sm font-medium transition-colors hover:bg-tremor-background-subtle dark:hover:bg-dark-tremor-background-subtle",
                  isActive(item.href)
                    ? "bg-tremor-background-subtle text-tremor-content-strong dark:bg-dark-tremor-background-subtle dark:text-dark-tremor-content-strong"
                    : "text-tremor-content dark:text-dark-tremor-content"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <Button
            type="button"
            variant="light"
            icon={Menu}
            aria-label="เปิดเมนู"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          />

          <UserMenu />
        </div>
      </div>

      <Dialog open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <DialogPanel className="absolute inset-x-4 top-16 max-w-none p-2 sm:inset-x-auto sm:right-6 sm:w-72">
          <div className="mb-1 flex items-center justify-between px-2 py-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
              <Bone className="size-4 text-tremor-brand dark:text-dark-tremor-brand" aria-hidden="true" />
              {siteConfig.name}
            </span>
            <Button
              type="button"
              variant="light"
              icon={X}
              aria-label="ปิดเมนู"
              onClick={() => setMobileNavOpen(false)}
            />
          </div>
          <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-tremor-default px-3 py-2.5 text-sm font-medium transition-colors hover:bg-tremor-background-subtle dark:hover:bg-dark-tremor-background-subtle",
                  isActive(item.href)
                    ? "bg-tremor-background-subtle text-tremor-content-strong dark:bg-dark-tremor-background-subtle dark:text-dark-tremor-content-strong"
                    : "text-tremor-content dark:text-dark-tremor-content"
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.title}</span>
                {item.comingSoon ? (
                  <Badge size="xs" color="slate">
                    เร็ว ๆ นี้
                  </Badge>
                ) : null}
              </Link>
            ))}
          </nav>
        </DialogPanel>
      </Dialog>
    </header>
  )
}
