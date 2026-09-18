"use client"

import { LogIn, LogOut } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Avatar, Box, Button, Menu, Portal } from "@chakra-ui/react"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Box boxSize="9" flexShrink="0" borderRadius="full" bg="bg.muted" aria-hidden="true" />
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
        <LogIn size={16} />
        <Box display={{ base: "none", sm: "inline" }}>เข้าสู่ระบบด้วย LINE</Box>
      </Button>
    )
  }

  const displayName = session.user?.name ?? "ผู้ใช้งาน"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          type="button"
          variant="plain"
          p="0"
          borderRadius="full"
          aria-label="เมนูบัญชีผู้ใช้"
        >
          <Avatar.Root>
            <Avatar.Image src={session.user?.image ?? undefined} alt={displayName} />
            <Avatar.Fallback>{initial}</Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="56">
            <Box px="2" py="1.5" fontSize="sm" fontWeight="medium" truncate>
              {displayName}
            </Box>
            <Menu.Separator />
            <Menu.Item value="sign-out" color="fg.error" onSelect={() => signOut()}>
              <LogOut size={16} />
              ออกจากระบบ
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
