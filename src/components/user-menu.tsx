"use client"

import { LogIn, LogOut } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" aria-hidden="true" />
  }

  if (!session) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => signIn("line")}
        aria-label="เข้าสู่ระบบด้วย LINE"
      >
        <LogIn />
        <span className="hidden sm:inline">เข้าสู่ระบบด้วย LINE</span>
        <span className="hidden min-[380px]:inline sm:hidden">เข้าสู่ระบบ</span>
      </Button>
    )
  }

  const displayName = session.user?.name ?? "ผู้ใช้งาน"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="เมนูบัญชีผู้ใช้"
        >
          <Avatar>
            <AvatarImage src={session.user?.image ?? undefined} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
