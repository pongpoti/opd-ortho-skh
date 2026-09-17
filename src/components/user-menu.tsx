"use client"

import { LogIn, LogOut } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import { Button } from "@tremor/react"

import { cn } from "@/lib/utils"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div
        className="size-8 shrink-0 animate-pulse rounded-tremor-full bg-tremor-background-subtle dark:bg-dark-tremor-background-subtle"
        aria-hidden="true"
      />
    )
  }

  if (!session) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={LogIn}
        onClick={() => signIn("line")}
        aria-label="เข้าสู่ระบบด้วย LINE"
      >
        <span className="hidden sm:inline">เข้าสู่ระบบด้วย LINE</span>
        <span className="hidden min-[380px]:inline sm:hidden">เข้าสู่ระบบ</span>
      </Button>
    )
  }

  const displayName = session.user?.name ?? "ผู้ใช้งาน"
  const initial = displayName.charAt(0).toUpperCase()
  const image = session.user?.image

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="rounded-tremor-full outline-none focus-visible:ring-2 focus-visible:ring-tremor-brand/50"
        aria-label="เมนูบัญชีผู้ใช้"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={displayName} className="size-8 rounded-tremor-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-tremor-full bg-tremor-brand text-sm font-medium text-tremor-brand-inverted dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted">
            {initial}
          </span>
        )}
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-50 mt-2 w-56 rounded-tremor-default border border-tremor-border bg-tremor-background p-1 shadow-tremor-dropdown outline-none dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:shadow-dark-tremor-dropdown"
      >
        <div className="truncate px-3 py-2 text-sm font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
          {displayName}
        </div>
        <div className="my-1 h-px bg-tremor-border dark:bg-dark-tremor-border" />
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={() => signOut()}
              className={cn(
                "flex w-full items-center gap-2 rounded-tremor-small px-3 py-2 text-sm text-red-600 dark:text-red-400",
                focus && "bg-red-50 dark:bg-red-950/40"
              )}
            >
              <LogOut className="size-4" aria-hidden="true" />
              ออกจากระบบ
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}
